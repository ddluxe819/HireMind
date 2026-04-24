from pydantic import BaseModel
from typing import Optional


class ResumeBaseOut(BaseModel):
    id: str
    name: str
    content: str
    file_type: Optional[str] = None
    storage_path: Optional[str] = None
    created_at: str


class ResumeVariantOut(BaseModel):
    id: str
    base_id: str
    job_id: str
    content: str
    text_content: Optional[str] = None
    pdf_path: Optional[str] = None
    created_at: str


class CoverLetterOut(BaseModel):
    id: str
    job_id: str
    company: str
    content: str
    created_at: str


class GenerateDocsRequest(BaseModel):
    job_id: str
    company: str
    title: str
    job_description: str
    resume_base_id: str


class SkillsSuggestRequest(BaseModel):
    job_title: str
    resume_text: str


class DocumentUpdateRequest(BaseModel):
    content: str
