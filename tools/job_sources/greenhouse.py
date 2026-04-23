"""
Greenhouse public job board API integration.
No API key required — reads publicly listed openings from company boards.
Docs: https://developers.greenhouse.io/job-board.html
"""
import re
import httpx
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

# Popular companies using Greenhouse, keyed by board slug → display name
COMPANY_MAP: dict[str, str] = {
    "airbnb": "Airbnb",
    "anthropic": "Anthropic",
    "amplitude": "Amplitude",
    "asana": "Asana",
    "benchling": "Benchling",
    "brex": "Brex",
    "carta": "Carta",
    "chime": "Chime",
    "coinbase": "Coinbase",
    "databricks": "Databricks",
    "discord": "Discord",
    "doordash": "DoorDash",
    "dropbox": "Dropbox",
    "duolingo": "Duolingo",
    "figma": "Figma",
    "gusto": "Gusto",
    "hubspot": "HubSpot",
    "instacart": "Instacart",
    "intercom": "Intercom",
    "lattice": "Lattice",
    "lyft": "Lyft",
    "mixpanel": "Mixpanel",
    "notion": "Notion",
    "openai": "OpenAI",
    "pinterest": "Pinterest",
    "plaid": "Plaid",
    "rippling": "Rippling",
    "robinhood": "Robinhood",
    "scale": "Scale AI",
    "snowflake": "Snowflake",
    "stripe": "Stripe",
    "zendesk": "Zendesk",
    "airtable": "Airtable",
    "canva": "Canva",
    "coda": "Coda",
    "deel": "Deel",
    "gitlab": "GitLab",
    "hashicorp": "HashiCorp",
    "linear": "Linear",
    "loom": "Loom",
    "mercury": "Mercury",
    "vercel": "Vercel",
}

_NON_GEO = {"remote", "anywhere", "any", ""}
_WORKERS = 12


def search(
    query: str,
    location: str = "",
    results_per_page: int = 20,
) -> list[dict]:
    query_words = [w for w in query.lower().split() if len(w) > 2]
    want_remote = location.lower().strip() in _NON_GEO or "remote" in location.lower()
    geo_filter = location.lower().strip() not in _NON_GEO

    def _fetch_company(slug: str, name: str) -> list[dict]:
        try:
            with httpx.Client(timeout=10) as c:
                res = c.get(f"{BASE_URL}/{slug}/jobs", params={"content": "true"})
                if res.status_code != 200:
                    return []
                data = res.json()
            results = []
            for job in data.get("jobs", []):
                title = job.get("title", "")
                if query_words and not any(w in title.lower() for w in query_words):
                    continue
                if geo_filter:
                    loc_str = job.get("location", {}).get("name", "").lower()
                    if not loc_str or "remote" in loc_str or location.lower() in loc_str:
                        pass  # include
                    else:
                        continue
                results.append(_normalize(job, name))
            return results
        except Exception:
            return []

    raw: list[dict] = []
    with ThreadPoolExecutor(max_workers=_WORKERS) as pool:
        futures = {
            pool.submit(_fetch_company, slug, name): slug
            for slug, name in COMPANY_MAP.items()
        }
        for future in as_completed(futures):
            raw.extend(future.result())

    return raw[:results_per_page]


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text or "").strip()


def _normalize(raw: dict, company_name: str) -> dict:
    loc = raw.get("location", {})
    location = loc.get("name", "") if isinstance(loc, dict) else ""

    return {
        "source": "greenhouse",
        "title": raw.get("title", "").strip(),
        "company": company_name,
        "location": location,
        "salary_range": None,
        "apply_url": raw.get("absolute_url", ""),
        "description": _strip_html(raw.get("content", ""))[:500],
        "posted_at": (raw.get("updated_at") or "")[:10],
        "job_type": "Full-time",
        "tags": [],
    }
