"""
Adzuna job search API integration.
Docs: https://developer.adzuna.com/docs/search
Sign up: https://developer.adzuna.com/
"""
import os
import httpx
from typing import Optional

BASE_URL = "https://api.adzuna.com/v1/api/jobs"


def search(
    query: str,
    location: str = "",
    country: str = "us",
    results_per_page: int = 20,
    salary_min: Optional[int] = None,
    full_time_only: bool = False,
) -> list[dict]:
    app_id = os.environ.get("ADZUNA_APP_ID", "")
    api_key = os.environ.get("ADZUNA_API_KEY", "")
    if not app_id or not api_key:
        raise EnvironmentError("ADZUNA_APP_ID and ADZUNA_API_KEY must be set in .env")

    # Adzuna "where" needs a real geographic location (city/state).
    # "remote" / "anywhere" / "any" are not valid — omit when non-geographic.
    _NON_GEO = {"remote", "anywhere", "any", ""}
    geo_location = location.lower().strip() not in _NON_GEO

    params = {
        "app_id": app_id,
        "app_key": api_key,
        "results_per_page": results_per_page,
        "what": query,
        "sort_by": "date",
    }
    # Only pass "where" for real geographic locations — omitting it gives national results
    if geo_location:
        params["where"] = location
    if salary_min:
        params["salary_min"] = salary_min
    if full_time_only:
        params["full_time"] = 1

    with httpx.Client(timeout=15) as c:
        res = c.get(f"{BASE_URL}/{country}/search/1", params=params)
        res.raise_for_status()
        data = res.json()

    return [_normalize(job) for job in data.get("results", [])]


def _normalize(raw: dict) -> dict:
    salary_min = raw.get("salary_min")
    salary_max = raw.get("salary_max")
    salary_range = None
    if salary_min and salary_max:
        salary_range = f"${int(salary_min):,}–${int(salary_max):,}"
    elif salary_min:
        salary_range = f"${int(salary_min):,}+"

    return {
        "source": "adzuna",
        "title": raw.get("title", "").strip(),
        "company": raw.get("company", {}).get("display_name", ""),
        "location": raw.get("location", {}).get("display_name", ""),
        "salary_range": salary_range,
        "apply_url": raw.get("redirect_url", ""),
        "description": raw.get("description", ""),
        "posted_at": raw.get("created", ""),
        "job_type": "Full-time" if raw.get("contract_time") == "full_time" else None,
    }
