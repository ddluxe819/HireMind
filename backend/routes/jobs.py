import json
import os
import uuid
import anthropic
from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from supabase import Client
from typing import List, Optional

from backend.db.database import get_db
from backend.models.job import JobListing

router = APIRouter(prefix="/jobs", tags=["jobs"])


class ScrapeRequest(BaseModel):
    title: str
    location: str = ""
    limit: int = 15

_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

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


def _generate_jobs_with_claude(title: str, skills: Optional[str], experience: Optional[str], exclude: Optional[str] = None) -> List[JobListing]:
    skills_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else []
    skills_str = ", ".join(skills_list) if skills_list else "general"
    exp_str = experience or "several years of"
    exclude_list = [c.strip() for c in exclude.split(",") if c.strip()] if exclude else []
    exclude_clause = f"\nDo NOT use these companies (already shown): {', '.join(exclude_list)}." if exclude_list else ""

    prompt = f"""Generate 10 realistic job listings for a candidate seeking a "{title}" role with {exp_str} experience. Key skills: {skills_str}.{exclude_clause}

Choose well-known companies across a wide variety of industries — do not limit to any one sector. Prioritize companies that genuinely hire for "{title}" roles. Vary company size, industry, and location to maximize the breadth of relevant opportunities.

Return a JSON array of exactly 10 objects with these fields:
- company: well-known company name appropriate for this role (string)
- title: specific job title related to "{title}" (string)
- location: "Remote" or "City, ST" (string)
- salary_range: e.g. "$120k–$160k" (string)
- job_type: "Full-time" (string)
- apply_url: realistic job board URL (string)
- platform: one of greenhouse, lever, workday, ashby (string)
- match_score: integer 75–98 weighted by skill overlap (integer)
- tags: array of 3 relevant skill/topic tags (array of strings)
- posted_at: "today", "1 day ago", or "X days ago" (string)
- description: 1–2 sentence role summary (string)

Return ONLY the JSON array."""

    response = _claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    jobs_data = json.loads(raw)
    result = []
    for job in jobs_data:
        result.append(JobListing(
            id=str(uuid.uuid4()),
            company=job.get("company", ""),
            title=job.get("title", ""),
            location=job.get("location"),
            salary_range=job.get("salary_range"),
            job_type=job.get("job_type", "Full-time"),
            description=job.get("description"),
            apply_url=job.get("apply_url", "#"),
            platform=job.get("platform", "greenhouse"),
            match_score=job.get("match_score"),
            tags=job.get("tags", []),
            posted_at=job.get("posted_at"),
        ))
    return result


@router.get("/discover", response_model=List[JobListing])
def get_discover_feed(
    title: Optional[str] = Query(None),
    skills: Optional[str] = Query(None),
    experience: Optional[str] = Query(None),
    exclude: Optional[str] = Query(None),
    db: Client = Depends(get_db),
):
    if title or skills:
        try:
            jobs = _generate_jobs_with_claude(title or "", skills, experience, exclude)
            rows = [
                {
                    "id": j.id,
                    "company": j.company,
                    "title": j.title,
                    "location": j.location,
                    "salary_range": j.salary_range,
                    "job_type": j.job_type,
                    "description": j.description,
                    "apply_url": j.apply_url,
                    "platform": j.platform,
                    "match_score": j.match_score,
                    "tags": j.tags,
                    "posted_at": j.posted_at,
                }
                for j in jobs
            ]
            db.table("job_listings").upsert(rows).execute()
            return jobs
        except Exception as e:
            print(f"[jobs/discover] Claude generation failed: {e}")
    return MOCK_JOBS


@router.post("/scrape", response_model=List[JobListing])
def scrape_jobs(payload: ScrapeRequest, db: Client = Depends(get_db)):
    from backend.services.scraper import scrape
    try:
        jobs = scrape(payload.title, location=payload.location, limit=payload.limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scrape failed: {e}")
    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found from any source")
    rows = [
        {
            "id": j.id, "company": j.company, "title": j.title,
            "location": j.location, "salary_range": j.salary_range,
            "job_type": j.job_type, "description": j.description,
            "apply_url": j.apply_url, "platform": j.platform,
            "match_score": j.match_score, "tags": j.tags, "posted_at": j.posted_at,
        }
        for j in jobs
    ]
    db.table("job_listings").upsert(rows).execute()
    return jobs


@router.get("/{job_id}", response_model=JobListing)
def get_job(job_id: str, db: Client = Depends(get_db)):
    result = db.table("job_listings").select("*").eq("id", job_id).single().execute()
    if result.data:
        return result.data
    match = next((j for j in MOCK_JOBS if j.id == job_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Job not found")
    return match
