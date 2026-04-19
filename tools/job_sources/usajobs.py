"""
USAJOBS API integration (US federal government jobs).
Docs: https://developer.usajobs.gov/API-Reference
Register: https://developer.usajobs.gov/AP/Register
"""
import os
import httpx

BASE_URL = "https://data.usajobs.gov/api/search"


def search(
    query: str,
    location: str = "",
    results_per_page: int = 25,
    remote_only: bool = False,
) -> list[dict]:
    api_key = os.environ.get("USAJOBS_API_KEY", "")
    user_agent = os.environ.get("USAJOBS_USER_AGENT", "")
    if not api_key or not user_agent:
        raise EnvironmentError("USAJOBS_API_KEY and USAJOBS_USER_AGENT must be set in .env")

    headers = {
        "Authorization": api_key,
        "User-Agent": user_agent,
        "Host": "data.usajobs.gov",
    }
    _NON_GEO = {"remote", "anywhere", "any", ""}
    geo_location = location.lower().strip() not in _NON_GEO
    is_remote_search = not geo_location or "remote" in location.lower()

    params = {
        "Keyword": query,
        "ResultsPerPage": results_per_page,
    }
    if geo_location:
        params["LocationName"] = location
    if is_remote_search or remote_only:
        params["RemoteIndicator"] = "True"

    with httpx.Client(timeout=15) as c:
        res = c.get(BASE_URL, headers=headers, params=params)
        res.raise_for_status()
        data = res.json()

    items = data.get("SearchResult", {}).get("SearchResultItems", [])
    return [_normalize(item) for item in items]


def _normalize(raw: dict) -> dict:
    desc = raw.get("MatchedObjectDescriptor", {})
    positions = desc.get("PositionLocation", [{}])
    loc_parts = [p.get("CityName", "") for p in positions if p.get("CityName")]
    location = ", ".join(loc_parts[:2]) if loc_parts else "Multiple Locations"

    salary = desc.get("PositionRemuneration", [{}])[0] if desc.get("PositionRemuneration") else {}
    salary_range = None
    if salary.get("MinimumRange") and salary.get("MaximumRange"):
        lo = int(float(salary["MinimumRange"]))
        hi = int(float(salary["MaximumRange"]))
        salary_range = f"${lo:,}–${hi:,}"

    apply_url = desc.get("PositionURI", "") or desc.get("ApplyURI", [""])[0]

    return {
        "source": "usajobs",
        "title": desc.get("PositionTitle", ""),
        "company": desc.get("OrganizationName", "US Government"),
        "location": location,
        "salary_range": salary_range,
        "apply_url": apply_url,
        "description": desc.get("UserArea", {}).get("Details", {}).get("JobSummary", ""),
        "posted_at": desc.get("PublicationStartDate", ""),
        "job_type": "Full-time",
        "tags": ["Government", "Federal"],
    }
