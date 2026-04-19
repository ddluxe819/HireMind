# Workflow: Discover Jobs

**Objective:** Populate the HireMind discover feed with relevant job listings.

**Inputs required:**
- Search query (job title or keywords)
- Location (or "remote")
- Optional: limit, specific sources to use

**Active job sources:**

| Source    | Coverage                        | Key required         |
|-----------|---------------------------------|----------------------|
| Adzuna    | General US + international      | ADZUNA_APP_ID + KEY  |
| USAJOBS   | US federal government only      | USAJOBS_API_KEY      |
| Jooble    | International aggregator        | JOOBLE_API_KEY       |
| Firecrawl | Greenhouse/Lever ATS-direct URLs| FIRECRAWL_API_KEY ✓  |

**Not integrated (by design):**
- LinkedIn — no public API; scraping violates ToS; ATS-linked jobs (Greenhouse/Lever) are caught by Firecrawl and the extension anyway

**Steps:**

1. Run the scraper:
   ```bash
   python tools/job_scraper.py "product designer" --location "remote" --limit 20
   ```
2. To use specific sources only:
   ```bash
   python tools/job_scraper.py "analyst" --sources adzuna jooble --limit 15
   ```
3. Results are deduplicated by (company + title) across all sources
4. Platform detection (greenhouse/lever/workday/etc.) is applied automatically to each apply_url
5. Feed the results to the backend jobs route or pipe to `/api/jobs/discover`

**Adding keys (user action required):**
- Adzuna: https://developer.adzuna.com/ → add ADZUNA_APP_ID + ADZUNA_API_KEY to .env
- USAJOBS: https://developer.usajobs.gov/AP/Register → add USAJOBS_API_KEY to .env
- Jooble: Email jooble.org/api/about → add JOOBLE_API_KEY to .env
- USAJOBS_USER_AGENT is already set to owner email in .env

**Edge cases:**
- Missing key: that source is silently skipped with a log message — others continue
- Rate limits: Adzuna 250 req/month (free), USAJOBS unlimited, Jooble varies by plan
- Duplicates across sources: deduplicated by MD5(company + title) — company field required
- Firecrawl fallback runs even if all three APIs are missing
