import io
import json
import os
import anthropic
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response, RedirectResponse
from supabase import Client
from typing import List

from backend.db.database import get_db
from backend.models.document import (
    ResumeBaseOut, ResumeVariantOut, CoverLetterOut, GenerateDocsRequest,
    SkillsSuggestRequest, DocumentUpdateRequest
)

router = APIRouter(prefix="/documents", tags=["documents"])

_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

STORAGE_BUCKET = "resumes"


def _ensure_bucket(db: Client):
    try:
        db.storage.create_bucket(STORAGE_BUCKET, options={"public": True})
    except Exception:
        pass  # bucket already exists


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


# ── Upload ────────────────────────────────────────────────────────────────────

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

    # Insert row first to get the ID, then upload to storage using that ID
    result = db.table("resume_bases").insert({
        "name": filename,
        "content": text,
        "file_type": ext,
    }).execute()
    row = result.data[0]
    base_id = row["id"]

    # Store original file in Supabase Storage
    storage_path = None
    try:
        _ensure_bucket(db)
        storage_path = f"originals/{base_id}.{ext}"
        mime = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            if ext == "docx"
            else "application/pdf"
        )
        db.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": mime},
        )
        db.table("resume_bases").update({"storage_path": storage_path}).eq("id", base_id).execute()
    except Exception as exc:
        print(f"[upload] storage error (non-fatal): {exc}")

    return {
        "id": base_id,
        "name": row["name"],
        "content": text,
        "file_type": ext,
        "storage_path": storage_path,
    }


# ── Download original ─────────────────────────────────────────────────────────

@router.get("/resumes/{base_id}/download")
def download_original_resume(base_id: str, db: Client = Depends(get_db)):
    row = db.table("resume_bases").select("*").eq("id", base_id).single().execute().data
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")

    storage_path = row.get("storage_path")
    if not storage_path:
        raise HTTPException(status_code=404, detail="Original file not stored — please re-upload your resume")

    try:
        url = db.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
        return RedirectResponse(url=url)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Storage error: {exc}")


# ── Skills suggest ────────────────────────────────────────────────────────────

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


# ── List bases ────────────────────────────────────────────────────────────────

@router.get("/resumes", response_model=List[ResumeBaseOut])
def list_resume_bases(db: Client = Depends(get_db)):
    result = db.table("resume_bases").select("*").execute()
    return result.data


# ── Generate tailored docs ────────────────────────────────────────────────────

@router.post("/generate", status_code=201)
def generate_documents(payload: GenerateDocsRequest, db: Client = Depends(get_db)):
    from backend.services.resume_renderer import (
        generate_docx_from_data, edit_docx_with_replacements, render_resume_text
    )

    base_result = db.table("resume_bases").select("*").eq("id", payload.resume_base_id).single().execute()
    if not base_result.data:
        raise HTTPException(status_code=404, detail="Resume base not found")
    base = base_result.data

    # ── Ask Claude for structured resume JSON + cover letter ──
    prompt = f"""You are a professional resume writer. Given the base resume and job description below, output two sections separated by ---COVER_LETTER---.

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
  "intro_paragraph": "2 sentences max tailored to this role",
  "framework_items": [
    {{"num": "01", "title": "Short Title", "body": "One sentence, 15 words max."}},
    {{"num": "02", "title": "Short Title", "body": "One sentence, 15 words max."}},
    {{"num": "03", "title": "Short Title", "body": "One sentence, 15 words max."}},
    {{"num": "04", "title": "Short Title", "body": "One sentence, 15 words max."}}
  ],
  "achievement_groups": [
    {{
      "title": "Category Name",
      "items": ["Achievement under 20 words — use [[double brackets]] around key metrics"]
    }}
  ],
  "experience": [
    {{"title": "Job Title", "company": "Company Name", "dates": "YYYY–YYYY"}}
  ]
}}

Rules:
- Extract all values from the base resume (do not invent contact details, companies, or dates)
- Tailor intro_paragraph and framework_items to match the target role
- Exactly 3 achievement_groups, exactly 3 bullets each, each under 20 words
- Use [[double brackets]] around key metrics/numbers so they render bold
- Return the board key only if the resume mentions board membership
- Output ONLY: the raw JSON object, then ---COVER_LETTER---, then the cover letter"""

    response = _claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    parts = raw.split("---COVER_LETTER---")
    json_part = parts[0].strip()
    cl_content = parts[1].strip() if len(parts) > 1 else ""

    if json_part.startswith("```"):
        json_part = json_part.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    try:
        resume_data = json.loads(json_part)
    except Exception:
        resume_data = {}

    # ── Build tailored DOCX ──
    file_type = base.get("file_type", "pdf")
    storage_path = base.get("storage_path")

    docx_bytes = None

    # If original is a DOCX, try surgical editing first
    if file_type == "docx" and storage_path:
        try:
            original_bytes = db.storage.from_(STORAGE_BUCKET).download(storage_path)

            # Ask Claude for targeted find→replace pairs
            repl_prompt = f"""Here is the original resume text and the tailored intro paragraph and framework items.
Generate a JSON array of find/replace pairs that will update the original DOCX.
Focus ONLY on: the summary/intro paragraph and the 4 framework descriptions.
Keep changes minimal — only replace text that differs.

Original text (first 2000 chars):
{base['content'][:2000]}

Tailored intro: {resume_data.get('intro_paragraph', '')}

Framework items:
{json.dumps(resume_data.get('framework_items', []))}

Return ONLY a JSON array like:
[{{"find": "exact original text", "replace": "new text"}}]
Maximum 6 replacements. Match exact sentences from the original."""

            repl_response = _claude.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=[{"role": "user", "content": repl_prompt}]
            )
            repl_raw = repl_response.content[0].text.strip()
            if repl_raw.startswith("```"):
                repl_raw = repl_raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            replacements = json.loads(repl_raw)
            docx_bytes = edit_docx_with_replacements(original_bytes, replacements)
        except Exception as exc:
            print(f"[generate] DOCX edit failed, falling back to generated DOCX: {exc}")
            docx_bytes = None

    # Fallback: generate a clean DOCX from the JSON data
    if docx_bytes is None:
        docx_bytes = generate_docx_from_data(resume_data, payload.title, payload.company)

    resume_text = render_resume_text(resume_data, payload.title, payload.company)

    # ── Store tailored DOCX in Supabase Storage ──
    docx_storage_path = None
    try:
        _ensure_bucket(db)
        variant_row = db.table("resume_variants").insert({
            "base_id": payload.resume_base_id,
            "job_id": payload.job_id,
            "content": resume_text,
            "text_content": resume_text,
        }).execute().data[0]

        docx_storage_path = f"tailored/{variant_row['id']}.docx"
        db.storage.from_(STORAGE_BUCKET).upload(
            path=docx_storage_path,
            file=docx_bytes,
            file_options={
                "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            },
        )
        db.table("resume_variants").update({
            "pdf_path": docx_storage_path,
        }).eq("id", variant_row["id"]).execute()
    except Exception as exc:
        print(f"[generate] storage upload error: {exc}")
        if not variant_row:
            raise HTTPException(status_code=500, detail="Failed to save variant")

    cover_letter = db.table("cover_letters").insert({
        "job_id": payload.job_id,
        "company": payload.company,
        "content": cl_content,
    }).execute().data[0]

    db.table("applications").update({
        "resume_variant_id": variant_row["id"],
        "cover_letter_id": cover_letter["id"],
        "status": "ready",
    }).eq("job_id", payload.job_id).execute()

    return {
        "resume_variant_id": variant_row["id"],
        "cover_letter_id": cover_letter["id"],
        "status": "ready",
        "has_docx": docx_storage_path is not None,
    }


# ── Download tailored DOCX ────────────────────────────────────────────────────

@router.get("/variants/{variant_id}/download")
def download_variant_docx(variant_id: str, db: Client = Depends(get_db)):
    row = db.table("resume_variants").select("*").eq("id", variant_id).single().execute().data
    if not row:
        raise HTTPException(status_code=404, detail="Variant not found")

    docx_path = row.get("pdf_path")
    if not docx_path:
        raise HTTPException(status_code=404, detail="DOCX not available — regenerate the resume")

    try:
        url = db.storage.from_(STORAGE_BUCKET).get_public_url(docx_path)
        return RedirectResponse(url=url)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Storage error: {exc}")


# ── Fetch / update variants & cover letters ───────────────────────────────────

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
