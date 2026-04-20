from pydantic import BaseModel
from typing import Optional, List


class ProfileCreate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    skills: List[str] = []
    industries: List[str] = []
    salary: Optional[str] = None
    resume_base_id: Optional[str] = None


class ProfileOut(ProfileCreate):
    id: str
    created_at: str
