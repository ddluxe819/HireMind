from pydantic import BaseModel
from typing import Optional, List


class ProfileCreate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    experience: Optional[str] = None
    years_experience: Optional[str] = None
    skills: List[str] = []
    industries: List[str] = []
    salary: Optional[str] = None
    work_authorized: Optional[bool] = None
    requires_sponsorship: Optional[bool] = None
    earliest_start_date: Optional[str] = None
    open_to_relocation: Optional[bool] = None
    work_mode: Optional[str] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    veteran_status: Optional[str] = None
    disability_status: Optional[str] = None
    resume_base_id: Optional[str] = None


class ProfileOut(ProfileCreate):
    id: str
    created_at: str
