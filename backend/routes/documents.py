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
    base_result = db.table("resume_bases").select("*").eq("id", payload.resume_base_id).single().execute()
    if not base_result.data:
        raise HTTPException(status_code=404, detail="Resume base not found")
    base = base_result.data

    prompt = f"""You are a professional resume and cover letter writer.

Job: {payload.title} at {payload.company}
Job Description: {payload.job_description}

Base Resume:
{base['content']}

Generate two outputs separated by the delimiter ---COVER_LETTER---:
1. A tailored resume variant (keep same format, optimize keywords for this role)
2. A compelling cover letter (3 paragraphs, professional tone)

Format:
[tailored resume content]
---COVER_LETTER---
[cover letter content]"""

    response = _claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text
    parts = raw.split("---COVER_LETTER---")
    resume_content = parts[0].strip()
    cl_content = parts[1].strip() if len(parts) > 1 else ""

    variant = db.table("resume_variants").insert({
        "base_id": payload.resume_base_id,
        "job_id": payload.job_id,
        "content": resume_content,
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
