import io
import json
import os
import anthropic
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from supabase import Client
from typing import List

from backend.db.database import get_db
from backend.models.document import (
    ResumeBaseOut, ResumeVariantOut, CoverLetterOut, GenerateDocsRequest,
    SkillsSuggestRequest, DocumentUpdateRequest
)

router = APIRouter(prefix="/documents", tags=["documents"])

_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _extract_pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception:
        return ""


def _extract_docx_text(content: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs).strip()
    except Exception:
        return ""


@router.post("/resumes/upload", status_code=201)
async def upload_resume(file: UploadFile = File(...), db: Client = Depends(get_db)):
    filename = file.filename or "resume"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    text = _extract_pdf_text(content) if ext == "pdf" else _extract_docx_text(content)

    result = db.table("resume_bases").insert({"name": filename, "content": text}).execute()
    row = result.data[0]
    return {"id": row["id"], "name": row["name"], "content": text}


@router.post("/skills/suggest")
def suggest_skills(payload: SkillsSuggestRequest):
    if not payload.job_title and not payload.resume_text:
        return {"skills": []}

    prompt = f"""Based on the job title and resume below, return 10–12 highly relevant professional skills as a JSON array of strings.

Job Title: {payload.job_title}
Resume:
{payload.resume_text[:3000]}

Rules:
- Include skills that appear in the resume or are closely relevant to the job title
- Mix technical skills, tools, and domain expertise
- Keep each skill concise (1–3 words)
- Return ONLY a JSON array, e.g. ["Skill A", "Skill B", ...]"""

    response = _claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    try:
        skills = json.loads(raw)
        if isinstance(skills, list):
            return {"skills": [str(s) for s in skills]}
    except Exception:
        pass
    return {"skills": []}


@router.get("/resumes", response_model=List[ResumeBaseOut])
def list_resume_bases(db: Client = Depends(get_db)):
    result = db.table("resume_bases").select("*").execute()
    return result.data


@router.post("/generate", status_code=201)
def generate_documents(payload: GenerateDocsRequest, db: Client = Depends(get_db)):
    from backend.services.resume_renderer import render_resume_html, render_resume_text

    base_result = db.table("resume_bases").select("*").eq("id", payload.resume_base_id).single().execute()
    if not base_result.data:
        raise HTTPException(status_code=404, detail="Resume base not found")
    base = base_result.data

    prompt = f"""You are a professional resume designer. Given the base resume and job description below, output two sections separated by ---COVER_LETTER---.

Section 1: A JSON object (no markdown fences) representing a tailored resume for this role.
Section 2: A 3-paragraph cover letter in plain text.

Job: {payload.title} at {payload.company}
Job Description:
{payload.job_description[:3000]}

Base Resume:
{base['content'][:4000]}

The JSON must have exactly these keys:
{{
  "name": "First Last",
  "tagline": "Role · Specialty · Specialty",
  "location": "City, ST",
  "phone": "000.000.0000",
  "email": "email@example.com",
  "linkedin": "linkedin.com/in/handle",
  "competencies": ["list of all core competencies from the resume"],
  "tech_stack": ["all martech/tools listed in resume"],
  "highlighted_tech": ["3-5 tools most relevant to THIS job"],
  "ai_tools": ["all AI/automation tools from resume"],
  "highlighted_ai": ["2-3 AI tools most relevant to THIS job"],
  "certifications": ["any certs/courses from resume"],
  "education": "School Name\\nCity, ST",
  "board": "Board: Org\\nCity, ST · Years",
  "intro_paragraph": "2 sentences max — personal brand statement tailored to this role",
  "framework_items": [
    {{"num": "01", "title": "Short Title", "body": "One sentence, 15 words max."}},
    {{"num": "02", "title": "Short Title", "body": "One sentence, 15 words max."}},
    {{"num": "03", "title": "Short Title", "body": "One sentence, 15 words max."}},
    {{"num": "04", "title": "Short Title", "body": "One sentence, 15 words max."}}
  ],
  "achievement_groups": [
    {{
      "title": "Category Name",
      "items": [
        "Achievement bullet under 20 words — use [[double brackets]] around key metrics so they render bold"
      ]
    }}
  ],
  "experience": [
    {{"title": "Job Title", "company": "Company Name", "dates": "YYYY–YYYY"}}
  ]
}}

CRITICAL one-page rules — the rendered resume must fit on a single letter-size page:
- Extract all values from the base resume (do not invent contact details, companies, or dates)
- intro_paragraph: 2 sentences maximum
- framework_items body: 1 sentence, 15 words maximum each
- achievement_groups: exactly 3 groups most relevant to this job
- Each group: exactly 3 bullet items, each under 20 words
- Use [[double brackets]] around key metrics/numbers so they render bold
- Return the board key only if the resume mentions board membership; otherwise omit it
- Output ONLY: the raw JSON object, then the delimiter ---COVER_LETTER---, then the cover letter text"""

    response = _claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    parts = raw.split("---COVER_LETTER---")
    json_part = parts[0].strip()
    cl_content = parts[1].strip() if len(parts) > 1 else ""

    # Strip any accidental code fences
    if json_part.startswith("```"):
        json_part = json_part.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    try:
        resume_data = json.loads(json_part)
    except Exception:
        resume_data = {}

    resume_html = render_resume_html(resume_data, payload.title, payload.company)
    resume_text = render_resume_text(resume_data, payload.title, payload.company)

    variant = db.table("resume_variants").insert({
        "base_id": payload.resume_base_id,
        "job_id": payload.job_id,
        "content": resume_html,
        "text_content": resume_text,
    }).execute().data[0]

    cover_letter = db.table("cover_letters").insert({
        "job_id": payload.job_id,
        "company": payload.company,
        "content": cl_content,
    }).execute().data[0]

    db.table("applications").update({
        "resume_variant_id": variant["id"],
        "cover_letter_id": cover_letter["id"],
        "status": "ready",
    }).eq("job_id", payload.job_id).execute()

    return {
        "resume_variant_id": variant["id"],
        "cover_letter_id": cover_letter["id"],
        "status": "ready",
    }


@router.get("/variants/{variant_id}", response_model=ResumeVariantOut)
def get_resume_variant(variant_id: str, db: Client = Depends(get_db)):
    result = db.table("resume_variants").select("*").eq("id", variant_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Resume variant not found")
    return result.data


@router.get("/cover-letters/{cl_id}", response_model=CoverLetterOut)
def get_cover_letter(cl_id: str, db: Client = Depends(get_db)):
    result = db.table("cover_letters").select("*").eq("id", cl_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return result.data


@router.patch("/variants/{variant_id}", response_model=ResumeVariantOut)
def update_resume_variant(variant_id: str, payload: DocumentUpdateRequest, db: Client = Depends(get_db)):
    result = db.table("resume_variants").update({"content": payload.content}).eq("id", variant_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Resume variant not found")
    return result.data[0]


@router.patch("/cover-letters/{cl_id}", response_model=CoverLetterOut)
def update_cover_letter(cl_id: str, payload: DocumentUpdateRequest, db: Client = Depends(get_db)):
    result = db.table("cover_letters").update({"content": payload.content}).eq("id", cl_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return result.data[0]
