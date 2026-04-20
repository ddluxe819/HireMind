# Sprint 3: Document Generation + Real Job Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two biggest functional gaps: let users trigger AI document generation for queued jobs from the Log screen, and pull real job listings from Adzuna/USAJOBS/Jooble into the Discover feed.

**Architecture:** Two independent tracks. Track A adds a `generateDocs` Zustand action and a "Generate Docs" button in the Log screen's expanded AppRow — it calls the existing `POST /api/documents/generate` backend endpoint. Track B creates a thin `backend/services/scraper.py` wrapper around `tools/job_scraper.py`, exposes it as `POST /api/jobs/scrape`, adds a `scrapeJobs` Zustand action, and adds a "Real Jobs" refresh button to the Discover header.

**Tech Stack:** FastAPI, React + Zustand, tools/job_scraper.py (Adzuna, USAJOBS, Jooble)

---

## File Map

**New files:**
- `backend/services/__init__.py` — empty, makes services a package
- `backend/services/scraper.py` — sys.path wrapper around tools/job_scraper.py; exports `scrape(query, location, limit) → List[JobListing]`

**Modified files:**
- `backend/routes/jobs.py` — add `ScrapeRequest` model + `POST /api/jobs/scrape` endpoint
- `frontend/src/store/appStore.js` — add `generateDocs` action; add `scrapeJobs` action
- `frontend/src/screens/Log.jsx` — add `generating` state + "Generate Docs" button to `AppRow`
- `frontend/src/screens/Discover.jsx` — add `scrapeJobs` call + "Real Jobs" button to header

---

## Task 1: Document generation trigger in Log screen

The backend's `POST /api/documents/generate` already works — it takes a job's details plus a `resume_base_id` and calls Claude to produce a tailored resume variant and cover letter. Nothing in the UI triggers it. This task wires the button.

**Files:**
- Modify: `frontend/src/store/appStore.js`
- Modify: `frontend/src/screens/Log.jsx`

- [ ] **Step 1: Add `generateDocs` to the Zustand store**

  In `frontend/src/store/appStore.js`, add this action after `updateApplicationStatus` (before `openInChrome`):

  ```javascript
  generateDocs: async (app) => {
    const profile = get().profile
    const resumeBaseId = app.resume_base_id || profile?.resume_base_id
    if (!resumeBaseId) throw new Error('No resume on file. Upload one in onboarding first.')

    let jobDescription = ''
    try {
      const jobRes = await fetch(`${API}/jobs/${app.job_id}`)
      if (jobRes.ok) {
        const job = await jobRes.json()
        jobDescription = job.description || ''
      }
    } catch {}

    const res = await fetch(`${API}/documents/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: app.job_id,
        company: app.company,
        title: app.title,
        job_description: jobDescription,
        resume_base_id: resumeBaseId,
      }),
    })
    if (!res.ok) throw new Error('Document generation failed')
    const result = await res.json()

    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === app.id
          ? { ...a, status: 'ready', resume_variant_id: result.resume_variant_id, cover_letter_id: result.cover_letter_id }
          : a
      ),
    }))
    return result
  },
  ```

- [ ] **Step 2: Update AppRow in Log.jsx to show the Generate Docs button**

  The `AppRow` function in `frontend/src/screens/Log.jsx` currently receives `app`, `onOpenExtension`, and `accent` as props. Make these changes:

  **a)** Add `generateDocs` to the destructure inside `AppRow`:

  Change the first line of `AppRow`:
  ```jsx
  function AppRow({ app, onOpenExtension, accent }) {
    const [expanded, setExpanded] = useState(false)
  ```
  To:
  ```jsx
  function AppRow({ app, onOpenExtension, accent }) {
    const [expanded, setExpanded] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [genError, setGenError] = useState('')
    const { generateDocs } = useAppStore()

    const handleGenerate = async () => {
      setGenerating(true)
      setGenError('')
      try {
        await generateDocs(app)
      } catch (e) {
        setGenError(e.message || 'Generation failed')
      }
      setGenerating(false)
    }
  ```

  **b)** Replace the existing single "Open in Chrome Extension" button block (lines 156–164 of the original file):

  Change:
  ```jsx
          {(app.hasExt || app.status === 'queued' || app.status === 'ready') && (
            <button onClick={() => onOpenExtension(app)}
              style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in Chrome Extension
            </button>
          )}
  ```
  To:
  ```jsx
          {app.status === 'queued' && !app.resume_variant_id && (
            <>
              <button onClick={handleGenerate} disabled={generating}
                style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: 'none', background: generating ? '#c0bfb8' : accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, cursor: generating ? 'default' : 'pointer' }}>
                {generating ? '✦ Generating docs…' : '✦ Generate Docs'}
              </button>
              {genError && (
                <div style={{ marginTop: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#ef4444' }}>{genError}</div>
              )}
            </>
          )}
          {(app.status === 'ready' || app.resume_variant_id) && (
            <button onClick={() => onOpenExtension(app)}
              style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in Chrome Extension
            </button>
          )}
  ```

- [ ] **Step 3: Verify the generate flow**

  With frontend and backend running:
  1. Complete onboarding with a resume upload so `profile.resume_base_id` is set
  2. Swipe right on a job in Discover to queue it
  3. Go to the Log tab → expand the queued application row
  4. A "✦ Generate Docs" button should appear
  5. Click it — button text changes to "✦ Generating docs…" and is disabled (Claude call takes ~10s)
  6. After completion, button is gone; "Open in Chrome Extension" appears in its place
  7. Application status badge changes to "ready"
  8. In Supabase: `select * from resume_variants limit 5;` → new row

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/store/appStore.js frontend/src/screens/Log.jsx
  git commit -m "feat: add Generate Docs button in Log screen for queued applications"
  ```

---

## Task 2: Backend scraper service + /scrape endpoint

`tools/job_scraper.py` has a battle-tested `aggregate()` function that hits Adzuna, USAJOBS, and Jooble in parallel. The challenge: it uses `from job_sources.adzuna import search` (relative to `tools/`), which doesn't resolve from inside the `backend/` package. The fix is a thin service file that patches `sys.path` before importing.

**Files:**
- Create: `backend/services/__init__.py`
- Create: `backend/services/scraper.py`
- Modify: `backend/routes/jobs.py`

- [ ] **Step 1: Create the services package**

  ```bash
  touch /workspaces/HireMind/backend/services/__init__.py
  ```

- [ ] **Step 2: Create backend/services/scraper.py**

  Create `backend/services/scraper.py`:

  ```python
  import os
  import sys
  import uuid
  from typing import List

  _tools_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'tools'))
  if _tools_dir not in sys.path:
      sys.path.insert(0, _tools_dir)

  from job_scraper import aggregate as _aggregate  # noqa: E402
  from backend.models.job import JobListing


  def scrape(query: str, location: str = "", limit: int = 15) -> List[JobListing]:
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
  ```

- [ ] **Step 3: Add ScrapeRequest model and POST /scrape endpoint to jobs.py**

  In `backend/routes/jobs.py`, add the `ScrapeRequest` model after the existing imports and before `MOCK_JOBS`. Add `Body` to the FastAPI imports and `BaseModel` from pydantic:

  At the top of `backend/routes/jobs.py`, change the import block to:
  ```python
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
  ```

  Then add the `ScrapeRequest` class right after the imports (before `router = APIRouter(...)`):
  ```python
  class ScrapeRequest(BaseModel):
      title: str
      location: str = ""
      limit: int = 15
  ```

  Then add this route **before** the `GET /{job_id}` route at the bottom of the file (order matters — POST /scrape must be registered before GET /{job_id} to avoid path ambiguity):

  ```python
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
  ```

- [ ] **Step 4: Test the scrape endpoint**

  With backend running (`uvicorn backend.main:app --reload`):
  ```bash
  curl -X POST http://localhost:8000/api/jobs/scrape \
    -H "Content-Type: application/json" \
    -d '{"title": "product designer", "location": "remote", "limit": 5}'
  ```
  Expected: `200` with a JSON array of up to 5 jobs. Each job has a real `apply_url` from Adzuna/USAJOBS/Jooble. Sources with missing API keys are skipped silently. If all keys are missing, returns `404`.

  If you get a 500 with an import error, check that `tools/job_sources/` exists and `ADZUNA_APP_ID` etc. are set in `.env`.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/services/__init__.py backend/services/scraper.py backend/routes/jobs.py
  git commit -m "feat: add POST /api/jobs/scrape endpoint backed by real job board APIs"
  ```

---

## Task 3: Real Jobs button in Discover screen

Depends on Task 2. Adds a `scrapeJobs` Zustand action and a "Real Jobs" button in the Discover header that triggers a scrape for the user's job title and reloads the card stack.

**Files:**
- Modify: `frontend/src/store/appStore.js`
- Modify: `frontend/src/screens/Discover.jsx`

- [ ] **Step 1: Add `scrapeJobs` to the Zustand store**

  In `frontend/src/store/appStore.js`, add this action after `fetchJobs`:

  ```javascript
  scrapeJobs: async () => {
    const profile = get().profile
    if (!profile?.title) return
    set({ loading: true })
    try {
      const res = await fetch(`${API}/jobs/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: profile.title,
          location: profile.location || '',
          limit: 15,
        }),
      })
      if (!res.ok) throw new Error('Scrape failed')
      const jobs = await res.json()
      if (jobs.length) set({ jobs })
    } catch {}
    set({ loading: false })
  },
  ```

- [ ] **Step 2: Add the Real Jobs button to Discover.jsx**

  In `frontend/src/screens/Discover.jsx`, update the destructure on line 93:

  Change:
  ```jsx
    const { jobs, loading, fetchJobs, tweaks, queueJob } = useAppStore()
  ```
  To:
  ```jsx
    const { jobs, loading, fetchJobs, scrapeJobs, tweaks, queueJob } = useAppStore()
  ```

  Add local scraping state right below the existing `useState` hooks:
  ```jsx
    const [scraping, setScraping] = useState(false)

    const handleScrape = async () => {
      setScraping(true)
      await scrapeJobs()
      setScraping(false)
    }
  ```

  In the header section (the `<div>` with `padding: '16px 20px 0'`), replace the existing header div content:

  Change:
  ```jsx
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c' }}>Discover</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>{stack.length} jobs for you</div>
        </div>
  ```
  To:
  ```jsx
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c' }}>Discover</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>{stack.length} jobs for you</div>
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping || loading}
          style={{
            padding: '7px 14px', borderRadius: 20,
            border: `1.5px solid ${scraping ? '#e0dfd8' : accent}`,
            background: '#fff', cursor: scraping || loading ? 'default' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12,
            color: scraping ? '#9a9fa8' : accent,
            transition: 'all 0.2s',
          }}>
          {scraping ? 'Searching…' : '⟳ Real Jobs'}
        </button>
  ```

- [ ] **Step 3: Verify end-to-end**

  With both servers running:
  1. Complete onboarding with a job title (e.g. "Product Designer")
  2. Go to Discover — see the "⟳ Real Jobs" button in the top-right of the header
  3. Click it — button text changes to "Searching…" (10-15s while scraper runs)
  4. Card stack reloads with real jobs from Adzuna/USAJOBS/Jooble — `apply_url` values point to real job boards, not `stripe.com/jobs` etc.
  5. In Supabase: `select company, title, apply_url from job_listings order by created_at desc limit 10;` — real companies and real URLs appear

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/store/appStore.js frontend/src/screens/Discover.jsx
  git commit -m "feat: add Real Jobs button to Discover that scrapes Adzuna/USAJOBS/Jooble"
  ```

---

## Self-Review Checklist

| Requirement | Task |
|---|---|
| No way to trigger doc generation from UI | Task 1 |
| Generate Docs button shows for queued apps without variants | Task 1 |
| Generate Docs button disappears after success, replaced by extension button | Task 1 |
| Error message if no resume on file | Task 1 |
| Discover feed only shows Claude-hallucinated jobs | Tasks 2 + 3 |
| Real scraper accessible from API | Task 2 |
| Real Jobs button refreshes the card stack | Task 3 |

Type consistency: `generateDocs(app)` in Task 1 takes a full application object (from `applications` array) — `app.job_id`, `app.company`, `app.title`, `app.resume_base_id` all exist on ApplicationOut from the backend. `scrapeJobs()` in Task 3 uses `profile.title` and `profile.location` — both set during onboarding and persisted via Sprint 1. `ScrapeRequest` defined in Task 2 matches the `JSON.stringify` body in Task 3's `scrapeJobs` action.
