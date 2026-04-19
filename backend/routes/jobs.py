from fastapi import APIRouter
from typing import List
import uuid

from backend.models.job import JobListing

router = APIRouter(prefix="/jobs", tags=["jobs"])

# Seed data for development — replace with real scraper tool output
MOCK_JOBS: List[JobListing] = [
    JobListing(
        id=str(uuid.uuid4()),
        company="Stripe",
        title="Senior Product Designer",
        location="Remote",
        salary_range="$160k–$200k",
        job_type="Full-time",
        apply_url="https://stripe.com/jobs/listing/senior-product-designer",
        platform="greenhouse",
        match_score=92,
        tags=["Design Systems", "Figma", "B2B"],
        posted_at="2 days ago",
    ),
    JobListing(
        id=str(uuid.uuid4()),
        company="Linear",
        title="Product Designer",
        location="San Francisco, CA",
        salary_range="$140k–$180k",
        job_type="Full-time",
        apply_url="https://linear.app/careers/product-designer",
        platform="lever",
        match_score=87,
        tags=["Product", "Mobile", "SaaS"],
        posted_at="1 day ago",
    ),
    JobListing(
        id=str(uuid.uuid4()),
        company="Vercel",
        title="UX Engineer",
        location="Remote",
        salary_range="$150k–$190k",
        job_type="Full-time",
        apply_url="https://vercel.com/careers/ux-engineer",
        platform="greenhouse",
        match_score=81,
        tags=["React", "Design", "Frontend"],
        posted_at="3 days ago",
    ),
]


@router.get("/discover", response_model=List[JobListing])
async def get_discover_feed():
    return MOCK_JOBS


@router.get("/{job_id}", response_model=JobListing)
async def get_job(job_id: str):
    match = next((j for j in MOCK_JOBS if j.id == job_id), None)
    if not match:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return match
