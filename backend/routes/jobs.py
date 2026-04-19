import json
import os
import uuid
import anthropic
from fastapi import APIRouter, Query
from typing import List, Optional

from backend.models.job import JobListing

router = APIRouter(prefix="/jobs", tags=["jobs"])

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


def _generate_jobs_with_claude(title: str, skills: Optional[str], experience: Optional[str]) -> List[JobListing]:
    skills_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else []
    skills_str = ", ".join(skills_list) if skills_list else "general"
    exp_str = experience or "several years of"

    prompt = f"""Generate 5 realistic job listings for a candidate seeking a "{title}" role with {exp_str} experience. Key skills: {skills_str}.

Return a JSON array of exactly 5 objects with these fields:
- company: well-known tech company name (string)
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
        max_tokens=2048,
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
):
    if title or skills:
        try:
            return _generate_jobs_with_claude(title or "", skills, experience)
        except Exception:
            pass
    return MOCK_JOBS


@router.get("/{job_id}", response_model=JobListing)
def get_job(job_id: str):
    match = next((j for j in MOCK_JOBS if j.id == job_id), None)
    if not match:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return match
