"""
Jooble job search API integration.
Docs: https://jooble.org/api/about
Sign up: https://jooble.org/api/about (email them for a key)
"""
import os
import httpx

BASE_URL = "https://jooble.org/api"


def search(
    query: str,
    location: str = "",
    results_per_page: int = 20,
    page: int = 1,
) -> list[dict]:
    api_key = os.environ.get("JOOBLE_API_KEY", "")
    if not api_key:
        raise EnvironmentError("JOOBLE_API_KEY must be set in .env")

    payload = {
        "keywords": query,
        "location": location,
        "resultonpage": results_per_page,
        "page": page,
    }

    with httpx.Client(timeout=15) as c:
        res = c.post(f"{BASE_URL}/{api_key}", json=payload)
        res.raise_for_status()
        data = res.json()

    return [_normalize(job) for job in data.get("jobs", [])]


def _normalize(raw: dict) -> dict:
    return {
        "source": "jooble",
        "title": raw.get("title", "").strip(),
        "company": raw.get("company", ""),
        "location": raw.get("location", ""),
        "salary_range": raw.get("salary") or None,
        "apply_url": raw.get("link", ""),
        "description": raw.get("snippet", ""),
        "posted_at": raw.get("updated", ""),
        "job_type": raw.get("type") or None,
        "tags": [],
    }
