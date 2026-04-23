"""
Lever public posting API integration.
No API key required — reads publicly listed openings from company boards.
Docs: https://hire.lever.co/developer/postings
"""
import re
import httpx
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://api.lever.co/v0/postings"

# Popular companies using Lever, keyed by posting slug → display name
COMPANY_MAP: dict[str, str] = {
    "netflix": "Netflix",
    "reddit": "Reddit",
    "shopify": "Shopify",
    "atlassian": "Atlassian",
    "zoom": "Zoom",
    "square": "Square",
    "twitch": "Twitch",
    "cloudflare": "Cloudflare",
    "digitalocean": "DigitalOcean",
    "elastic": "Elastic",
    "github": "GitHub",
    "grammarly": "Grammarly",
    "klaviyo": "Klaviyo",
    "mongodb": "MongoDB",
    "okta": "Okta",
    "pagerduty": "PagerDuty",
    "sendgrid": "Twilio SendGrid",
    "sentry": "Sentry",
    "segment": "Segment",
    "twilio": "Twilio",
    "typeform": "Typeform",
    "webflow": "Webflow",
    "zapier": "Zapier",
    "affirm": "Affirm",
    "blend": "Blend",
    "checkr": "Checkr",
    "faire": "Faire",
    "flexport": "Flexport",
    "lob": "Lob",
    "opendoor": "Opendoor",
    "remote": "Remote",
    "retool": "Retool",
    "ro": "Ro",
    "stytch": "Stytch",
    "watershed": "Watershed",
    "wealthfront": "Wealthfront",
}

_NON_GEO = {"remote", "anywhere", "any", ""}
_WORKERS = 12


def search(
    query: str,
    location: str = "",
    results_per_page: int = 20,
) -> list[dict]:
    query_words = [w for w in query.lower().split() if len(w) > 2]
    geo_filter = location.lower().strip() not in _NON_GEO

    def _fetch_company(slug: str, name: str) -> list[dict]:
        try:
            with httpx.Client(timeout=10) as c:
                res = c.get(f"{BASE_URL}/{slug}", params={"mode": "json", "limit": 50})
                if res.status_code != 200:
                    return []
                postings = res.json()
            results = []
            for job in postings:
                title = job.get("text", "")
                if query_words and not any(w in title.lower() for w in query_words):
                    continue
                if geo_filter:
                    loc_str = (job.get("categories", {}).get("location") or "").lower()
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
    categories = raw.get("categories", {})
    commitment = categories.get("commitment", "")
    created_ms = raw.get("createdAt")
    posted_at = ""
    if created_ms:
        from datetime import datetime, timezone
        dt = datetime.fromtimestamp(created_ms / 1000, tz=timezone.utc)
        posted_at = dt.strftime("%Y-%m-%d")

    return {
        "source": "lever",
        "title": raw.get("text", "").strip(),
        "company": company_name,
        "location": categories.get("location", ""),
        "salary_range": None,
        "apply_url": raw.get("hostedUrl", ""),
        "description": _strip_html(raw.get("descriptionPlain") or raw.get("description") or "")[:500],
        "posted_at": posted_at,
        "job_type": commitment if commitment else "Full-time",
        "tags": [],
    }
