from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional


class ApplicationStatus(str, Enum):
    queued = "queued"
    ready = "ready"
    opened = "opened"
    autofilled = "autofilled"
    user_reviewing = "user_reviewing"
    submitted = "submitted"
    interviewing = "interviewing"
    rejected = "rejected"


class ApplicationCreate(BaseModel):
    job_id: str
    company: str
    title: str
    apply_url: str
    resume_base_id: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    resume_variant_id: Optional[str] = None
    cover_letter_id: Optional[str] = None
    notes: Optional[str] = None


class ApplicationOut(BaseModel):
    id: str
    job_id: str
    company: str
    title: str
    apply_url: str
    status: ApplicationStatus
    resume_base_id: Optional[str] = None
    resume_variant_id: Optional[str] = None
    cover_letter_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str
