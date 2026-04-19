import os
import anthropic
from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from typing import List

from backend.db.database import get_db
from backend.models.document import (
    ResumeBaseOut, ResumeVariantOut, CoverLetterOut, GenerateDocsRequest
)

router = APIRouter(prefix="/documents", tags=["documents"])

_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


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

    # Update the matching application record to ready
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
