"""
HireMind job scraper — aggregates results from all active sources:
  • Adzuna       (general job board, strong US coverage)
  • USAJOBS      (US federal government jobs)
  • Jooble       (international aggregator)
  • Greenhouse   (ATS board — curated list of companies, no auth)
  • Lever        (ATS board — curated list of companies, no auth)
  • Firecrawl    (fallback web scrape for ATS-direct URLs)

Results are deduplicated by (company + title) and returned as a unified list
compatible with the /api/jobs/discover feed format.

Usage:
  python tools/job_scraper.py "product designer" --location "remote" --limit 20
  python tools/job_scraper.py "software engineer" --sources adzuna greenhouse lever
  python tools/job_scraper.py "analyst" --sources usajobs --location "Washington DC"
"""
import os
import sys
import json
import hashlib
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

load_dotenv()


def _detect_platform(url: str) -> str:
    if "greenhouse.io" in url:
        return "greenhouse"
    if "lever.co" in url:
        return "lever"
    if "ashbyhq.com" in url:
        return "ashby"
    if "myworkdayjobs.com" in url or "myworkday.com" in url:
        return "workday"
    if "usajobs.gov" in url:
        return "usajobs"
    return "generic"


def _dedup_key(job: dict) -> str:
    raw = f"{job.get('company', '').lower().strip()}:{job.get('title', '').lower().strip()}"
    return hashlib.md5(raw.encode()).hexdigest()


def _fetch_adzuna(query: str, location: str, limit: int) -> list[dict]:
    try:
        from job_sources.adzuna import search
        return search(query, location=location, results_per_page=min(limit, 50))
    except EnvironmentError as e:
        print(f"  [adzuna] skipped — {e}")
        return []
    except Exception as e:
        print(f"  [adzuna] error — {e}")
        return []


def _fetch_usajobs(query: str, location: str, limit: int) -> list[dict]:
    try:
        from job_sources.usajobs import search
        return search(query, location=location, results_per_page=min(limit, 500))
    except EnvironmentError as e:
        print(f"  [usajobs] skipped — {e}")
        return []
    except Exception as e:
        print(f"  [usajobs] error — {e}")
        return []


def _fetch_jooble(query: str, location: str, limit: int) -> list[dict]:
    try:
        from job_sources.jooble import search
        return search(query, location=location, results_per_page=min(limit, 20))
    except EnvironmentError as e:
        print(f"  [jooble] skipped — {e}")
        return []
    except Exception as e:
        print(f"  [jooble] error — {e}")
        return []


def _fetch_greenhouse(query: str, location: str, limit: int) -> list[dict]:
    try:
        from job_sources.greenhouse import search
        return search(query, location=location, results_per_page=min(limit, 150))
    except Exception as e:
        print(f"  [greenhouse] error — {e}")
        return []


def _fetch_lever(query: str, location: str, limit: int) -> list[dict]:
    try:
        from job_sources.lever import search
        return search(query, location=location, results_per_page=min(limit, 150))
    except Exception as e:
        print(f"  [lever] error — {e}")
        return []


def _fetch_firecrawl(query: str, location: str, limit: int) -> list[dict]:
    import httpx
    api_key = os.environ.get("FIRECRAWL_API_KEY", "")
    if not api_key:
        print("  [firecrawl] skipped — FIRECRAWL_API_KEY not set")
        return []
    try:
        with httpx.Client(timeout=30) as c:
            res = c.post(
                "https://api.firecrawl.dev/v1/search",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "query": f"{query} {location} job apply site:greenhouse.io OR site:lever.co OR site:ashbyhq.com",
                    "limit": min(limit, 10),
                    "scrapeOptions": {"formats": ["markdown"]},
                },
            )
            if res.status_code != 200:
                return []
            data = res.json()
        results = []
        for item in data.get("data", []):
            url = item.get("url", "")
            results.append({
                "source": "firecrawl",
                "title": item.get("title", "").replace(" | Jobs", "").strip(),
                "company": "",
                "location": location,
                "salary_range": None,
                "apply_url": url,
                "description": (item.get("markdown") or "")[:400],
                "posted_at": "",
                "job_type": None,
                "tags": [],
            })
        return results
    except Exception as e:
        print(f"  [firecrawl] error — {e}")
        return []


SOURCE_MAP = {
    "adzuna": _fetch_adzuna,
    "usajobs": _fetch_usajobs,
    "jooble": _fetch_jooble,
    "greenhouse": _fetch_greenhouse,
    "lever": _fetch_lever,
    "firecrawl": _fetch_firecrawl,
}

ALL_SOURCES = list(SOURCE_MAP.keys())


def aggregate(
    query: str,
    location: str = "",
    limit: int = 100,
    sources: list[str] | None = None,
) -> list[dict]:
    active = sources or ALL_SOURCES
    print(f"[job_scraper] Query: '{query}' | Location: '{location or 'any'}' | Sources: {', '.join(active)}")

    # Over-fetch from every source so dedup still yields `limit` results.
    # Each source is capped internally (Adzuna: 50, Jooble: 20, Greenhouse/Lever: 150).
    fetch_per_source = max(limit, 50)
    raw: list[dict] = []
    with ThreadPoolExecutor(max_workers=len(active)) as pool:
        futures = {
            pool.submit(SOURCE_MAP[s], query, location, fetch_per_source): s
            for s in active if s in SOURCE_MAP
        }
        for future in as_completed(futures):
            source = futures[future]
            results = future.result()
            print(f"  [{source}] {len(results)} results")
            raw.extend(results)

    # Deduplicate by company+title, prefer entries with apply_url set
    seen: dict[str, dict] = {}
    for job in raw:
        key = _dedup_key(job)
        if key not in seen or (not seen[key].get("apply_url") and job.get("apply_url")):
            seen[key] = job

    # Enrich with platform detection
    unified = []
    for job in list(seen.values())[:limit]:
        job["platform"] = _detect_platform(job.get("apply_url", ""))
        job.setdefault("tags", [])
        unified.append(job)

    return unified


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HireMind unified job scraper")
    parser.add_argument("query", help='Search query e.g. "product designer"')
    parser.add_argument("--location", default="", help="Location filter (default: any/remote)")
    parser.add_argument("--limit", type=int, default=50, help="Max results after dedup")
    parser.add_argument(
        "--sources", nargs="+", choices=ALL_SOURCES,
        help=f"Sources to use (default: all). Options: {', '.join(ALL_SOURCES)}"
    )
    args = parser.parse_args()

    jobs = aggregate(args.query, location=args.location, limit=args.limit, sources=args.sources)

    print(f"\n[job_scraper] {len(jobs)} unique listings after dedup\n")
    for j in jobs:
        salary = f" · {j['salary_range']}" if j.get("salary_range") else ""
        print(f"  [{j['source']:10}] {j['title']} @ {j['company']}{salary}")
        print(f"               {j['apply_url']}")

    print("\n" + json.dumps(jobs, indent=2))
