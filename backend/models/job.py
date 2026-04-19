from pydantic import BaseModel
from typing import Optional, List


class JobListing(BaseModel):
    id: str
    company: str
    title: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    apply_url: str
    platform: Optional[str] = None
    match_score: Optional[int] = None
    tags: List[str] = []
    posted_at: Optional[str] = None
    logo_url: Optional[str] = None
