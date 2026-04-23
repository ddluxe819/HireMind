import os
import sys
import uuid
from typing import List

_tools_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'tools'))
if _tools_dir not in sys.path:
    sys.path.insert(0, _tools_dir)

from job_scraper import aggregate as _aggregate  # noqa: E402
from backend.models.job import JobListing


def scrape(query: str, location: str = "", limit: int = 50) -> List[JobListing]:
    raw = _aggregate(query, location=location, limit=limit)
    jobs = []
    for r in raw:
        jobs.append(JobListing(
            id=str(uuid.uuid4()),
            company=r.get("company") or "Unknown",
            title=r.get("title") or query,
            location=r.get("location"),
            salary_range=r.get("salary_range"),
            job_type=r.get("job_type") or "Full-time",
            description=r.get("description"),
            apply_url=r.get("apply_url") or "#",
            platform=r.get("platform") or "generic",
            tags=r.get("tags") or [],
            posted_at=r.get("posted_at") or "recent",
        ))
    return jobs
