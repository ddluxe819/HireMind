# Sprint 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix resume upload (missing DB tables), persist user profiles from onboarding to the backend, persist Claude-generated jobs so they survive across requests, and expand the industry list.

**Architecture:** All tasks are backend-first: provision missing Supabase tables → add profiles API → wire frontend onboarding to save profiles → persist jobs on generation. Tasks 1–2 are independent; Task 3 depends on Task 2; Task 4 is independent; Task 5 is a standalone frontend change.

**Tech Stack:** FastAPI, Supabase (PostgreSQL via MCP `mcp__claude_ai_Supabase__execute_sql`), React + Zustand, Python Pydantic v2

---

## File Map

**New files:**
- `supabase/migrations/001_initial_schema.sql` — canonical SQL for all tables
- `backend/models/profile.py` — Pydantic schemas: `ProfileCreate`, `ProfileOut`
- `backend/routes/profiles.py` — `POST /api/profiles`, `GET /api/profiles/{id}`, `PATCH /api/profiles/{id}`

**Modified files:**
- `backend/main.py` — register `profiles` router
- `backend/routes/jobs.py` — upsert jobs to DB on generation; fix `GET /{job_id}` to query DB
- `frontend/src/store/appStore.js` — add `saveProfile` async action; pass `resume_base_id` in `queueJob`
- `frontend/src/App.jsx` — call `saveProfile` in `onComplete`; destructure `saveProfile` from store
- `frontend/src/screens/Onboarding.jsx` — expand `INDUSTRY_OPTS` from 8 → 20 options

---

## Task 1: Provision missing Supabase tables

**Root cause of upload failure:** The backend calls `db.table("resume_bases").insert(...)` but no migration has ever been applied — the table doesn't exist, causing a 500.

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Check which tables already exist**

  Use the Supabase MCP tool `mcp__claude_ai_Supabase__list_tables` to see what's in the project. Note any tables that already exist so the migration can skip them safely.

- [ ] **Step 2: Write the migration file**

  Create `supabase/migrations/001_initial_schema.sql`:

  ```sql
  -- resume_bases must come before profiles (profiles FK references it)
  create table if not exists resume_bases (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    content text not null default '',
    created_at timestamptz default now()
  );

  create table if not exists resume_variants (
    id uuid primary key default gen_random_uuid(),
    base_id uuid references resume_bases(id),
    job_id text,
    content text not null,
    pdf_path text,
    created_at timestamptz default now()
  );

  create table if not exists cover_letters (
    id uuid primary key default gen_random_uuid(),
    job_id text,
    company text,
    content text not null,
    created_at timestamptz default now()
  );

  -- job_id is text (not FK) because Claude-generated IDs are UUIDs as strings
  create table if not exists jobs (
    id text primary key,
    company text not null,
    title text not null,
    location text,
    salary_range text,
    job_type text,
    description text,
    apply_url text not null,
    platform text,
    match_score int,
    tags text[] default '{}',
    posted_at text,
    created_at timestamptz default now()
  );

  create table if not exists applications (
    id uuid primary key default gen_random_uuid(),
    job_id text,
    company text not null,
    title text not null,
    apply_url text,
    status text not null default 'queued',
    resume_base_id uuid,
    resume_variant_id uuid,
    cover_letter_id uuid,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table if not exists profiles (
    id uuid primary key default gen_random_uuid(),
    name text,
    title text,
    location text,
    experience text,
    skills text[] default '{}',
    industries text[] default '{}',
    salary text,
    resume_base_id uuid references resume_bases(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  ```

- [ ] **Step 3: Apply the migration via Supabase MCP**

  Use `mcp__claude_ai_Supabase__apply_migration` (or `execute_sql` if apply_migration is unavailable) with the full SQL above. Get the project ID first via `mcp__claude_ai_Supabase__list_projects`.

  Expected: all 6 tables created with no errors. If a table already existed, `create table if not exists` skips it silently.

- [ ] **Step 4: Smoke-test resume upload**

  Start the backend: `cd /workspaces/HireMind && uvicorn backend.main:app --reload`

  Upload a real PDF:
  ```bash
  curl -X POST http://localhost:8000/api/documents/resumes/upload \
    -F "file=@/path/to/any.pdf"
  ```
  Expected response:
  ```json
  {"id": "<uuid>", "name": "any.pdf", "content": "<extracted text>"}
  ```
  If content is empty string, that's acceptable — some PDFs have no extractable text. Status must be `201`.

- [ ] **Step 5: Commit**

  ```bash
  git add supabase/migrations/001_initial_schema.sql
  git commit -m "feat: add initial Supabase schema migration for all 6 tables"
  ```

---

## Task 2: Add profiles backend endpoint

**Files:**
- Create: `backend/models/profile.py`
- Create: `backend/routes/profiles.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Write the Profile Pydantic models**

  Create `backend/models/profile.py`:

  ```python
  from pydantic import BaseModel
  from typing import Optional, List


  class ProfileCreate(BaseModel):
      name: Optional[str] = None
      title: Optional[str] = None
      location: Optional[str] = None
      experience: Optional[str] = None
      skills: List[str] = []
      industries: List[str] = []
      salary: Optional[str] = None
      resume_base_id: Optional[str] = None


  class ProfileOut(ProfileCreate):
      id: str
      created_at: str
  ```

- [ ] **Step 2: Write the profiles route**

  Create `backend/routes/profiles.py`:

  ```python
  from fastapi import APIRouter, HTTPException, Depends
  from supabase import Client

  from backend.db.database import get_db
  from backend.models.profile import ProfileCreate, ProfileOut

  router = APIRouter(prefix="/profiles", tags=["profiles"])


  @router.post("/", response_model=ProfileOut, status_code=201)
  def create_profile(payload: ProfileCreate, db: Client = Depends(get_db)):
      result = db.table("profiles").insert(payload.model_dump(exclude_none=True)).execute()
      return result.data[0]


  @router.get("/{profile_id}", response_model=ProfileOut)
  def get_profile(profile_id: str, db: Client = Depends(get_db)):
      result = db.table("profiles").select("*").eq("id", profile_id).single().execute()
      if not result.data:
          raise HTTPException(status_code=404, detail="Profile not found")
      return result.data


  @router.patch("/{profile_id}", response_model=ProfileOut)
  def update_profile(profile_id: str, payload: ProfileCreate, db: Client = Depends(get_db)):
      updates = payload.model_dump(exclude_none=True)
      if not updates:
          raise HTTPException(status_code=400, detail="No fields to update")
      result = db.table("profiles").update(updates).eq("id", profile_id).execute()
      if not result.data:
          raise HTTPException(status_code=404, detail="Profile not found")
      return result.data[0]
  ```

- [ ] **Step 3: Register the profiles router in main.py**

  In `backend/main.py`, add the import and `include_router` call. The file currently has:
  ```python
  from backend.routes import applications, documents, jobs
  ```
  Change it to:
  ```python
  from backend.routes import applications, documents, jobs, profiles
  ```
  And add after the existing `include_router` calls:
  ```python
  app.include_router(profiles.router, prefix="/api")
  ```

- [ ] **Step 4: Test the endpoint**

  With backend running:
  ```bash
  # Create a profile
  curl -X POST http://localhost:8000/api/profiles/ \
    -H "Content-Type: application/json" \
    -d '{"name":"Alex Johnson","title":"Product Designer","location":"San Francisco","skills":["Figma","UX Research"],"industries":["SaaS","Fintech"]}'
  ```
  Expected: `201` with JSON including `"id": "<uuid>"` and `"created_at": "..."`.

  ```bash
  # Fetch it back (use the id from above)
  curl http://localhost:8000/api/profiles/<uuid>
  ```
  Expected: `200` with the same profile data.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/models/profile.py backend/routes/profiles.py backend/main.py
  git commit -m "feat: add profiles table backend endpoint (POST/GET/PATCH)"
  ```

---

## Task 3: Wire onboarding → backend profile save

Depends on Task 2 being deployed.

**Files:**
- Modify: `frontend/src/store/appStore.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add `saveProfile` action to the Zustand store**

  In `frontend/src/store/appStore.js`, add this action inside the `create` call, after `resetOnboarding`:

  ```javascript
  saveProfile: async (formData) => {
    const existing = get().profile
    try {
      const isUpdate = Boolean(existing?.profile_id)
      const url = isUpdate
        ? `${API}/profiles/${existing.profile_id}`
        : `${API}/profiles/`
      const res = await fetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || undefined,
          title: formData.title || undefined,
          location: formData.location || undefined,
          experience: formData.experience || undefined,
          skills: formData.skills,
          industries: formData.industries,
          salary: formData.salary || undefined,
          resume_base_id: formData.resume_base_id || undefined,
        }),
      })
      if (!res.ok) throw new Error('Profile save failed')
      const saved = await res.json()
      const merged = { ...formData, profile_id: saved.id }
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(merged)) } catch {}
      set({ profile: merged })
    } catch {
      // Graceful degradation: save locally without profile_id
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(formData)) } catch {}
      set({ profile: formData })
    }
  },
  ```

- [ ] **Step 2: Update App.jsx to call saveProfile**

  In `frontend/src/App.jsx`, update the `useAppStore` destructure (line 83):

  Change:
  ```javascript
  const { screen, setScreen, tweaks, updateTweak, setProfile } = useAppStore()
  ```
  To:
  ```javascript
  const { screen, setScreen, tweaks, updateTweak, saveProfile } = useAppStore()
  ```

  Then update the `onComplete` handler on line 119:

  Change:
  ```jsx
  <Onboarding onComplete={(profile) => { setProfile(profile); setScreen('discover') }} />
  ```
  To:
  ```jsx
  <Onboarding onComplete={async (form) => { await saveProfile(form); setScreen('discover') }} />
  ```

- [ ] **Step 3: Test the full onboarding flow**

  With both backend and frontend running (`npm run dev` in `/workspaces/HireMind/frontend`):

  1. Clear localStorage via DevTools → Application → Local Storage → Clear All
  2. Complete onboarding (name, resume upload optional, skills, preferences)
  3. Click "Start Discovering Jobs ✦"
  4. Open Network tab — confirm a `POST /api/profiles/` call was made and returned `201`
  5. Check localStorage `hm_profile` value — should include `"profile_id": "<uuid>"`
  6. In Supabase dashboard (or via MCP `execute_sql`): `select * from profiles limit 5;` — the row should be there

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/store/appStore.js frontend/src/App.jsx
  git commit -m "feat: persist onboarding profile to backend on completion"
  ```

---

## Task 4: Persist Claude-generated jobs + fix job lookup

**Files:**
- Modify: `backend/routes/jobs.py`

- [ ] **Step 1: Update the discover endpoint to upsert jobs**

  Replace `backend/routes/jobs.py` with the following. Key changes: `get_discover_feed` accepts `db` dependency and upserts generated jobs; `get_job` queries the DB first.

  ```python
  import json
  import os
  import uuid
  import anthropic
  from fastapi import APIRouter, Query, HTTPException, Depends
  from supabase import Client
  from typing import List, Optional

  from backend.db.database import get_db
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
      db: Client = Depends(get_db),
  ):
      if title or skills:
          try:
              jobs = _generate_jobs_with_claude(title or "", skills, experience)
              rows = [
                  {
                      "id": j.id,
                      "company": j.company,
                      "title": j.title,
                      "location": j.location,
                      "salary_range": j.salary_range,
                      "job_type": j.job_type,
                      "description": j.description,
                      "apply_url": j.apply_url,
                      "platform": j.platform,
                      "match_score": j.match_score,
                      "tags": j.tags,
                      "posted_at": j.posted_at,
                  }
                  for j in jobs
              ]
              db.table("jobs").upsert(rows).execute()
              return jobs
          except Exception:
              pass
      return MOCK_JOBS


  @router.get("/{job_id}", response_model=JobListing)
  def get_job(job_id: str, db: Client = Depends(get_db)):
      result = db.table("jobs").select("*").eq("id", job_id).single().execute()
      if result.data:
          return result.data
      match = next((j for j in MOCK_JOBS if j.id == job_id), None)
      if not match:
          raise HTTPException(status_code=404, detail="Job not found")
      return match
  ```

- [ ] **Step 2: Pass resume_base_id when queuing a job**

  In `frontend/src/store/appStore.js`, update the `queueJob` action's fetch body to include the user's resume:

  Change:
  ```javascript
  body: JSON.stringify({
    job_id: job.id,
    company: job.company,
    title: job.title,
    apply_url: job.apply_url || '',
  }),
  ```
  To:
  ```javascript
  body: JSON.stringify({
    job_id: job.id,
    company: job.company,
    title: job.title,
    apply_url: job.apply_url || '',
    resume_base_id: get().profile?.resume_base_id || undefined,
  }),
  ```

- [ ] **Step 3: Test job persistence**

  With backend running:
  ```bash
  # Generate + persist jobs
  curl "http://localhost:8000/api/jobs/discover?title=Product+Designer&skills=Figma,UX"
  ```
  Expected: JSON array of 5 jobs, each with a UUID `id`.

  Copy one of the returned `id` values, then:
  ```bash
  curl http://localhost:8000/api/jobs/<uuid-from-above>
  ```
  Expected: `200` with the same job object (retrieved from DB, not memory).

  In Supabase: `select id, company, title from jobs;` — should show 5 rows.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/routes/jobs.py frontend/src/store/appStore.js
  git commit -m "feat: persist Claude-generated jobs to DB; fix job lookup to query DB"
  ```

---

## Task 5: Expand industry list

**Files:**
- Modify: `frontend/src/screens/Onboarding.jsx`

- [ ] **Step 1: Replace INDUSTRY_OPTS**

  In `frontend/src/screens/Onboarding.jsx`, replace line 4:

  Change:
  ```javascript
  const INDUSTRY_OPTS = ['Fintech', 'SaaS', 'Consumer', 'Dev Tools', 'Healthcare', 'AI/ML', 'E-commerce', 'Media']
  ```
  To:
  ```javascript
  const INDUSTRY_OPTS = [
    'Fintech', 'SaaS', 'Consumer', 'Dev Tools', 'Healthcare', 'AI/ML',
    'E-commerce', 'Media', 'Cybersecurity', 'EdTech', 'Legal Tech', 'Climate Tech',
    'Real Estate', 'Supply Chain', 'Gaming', 'Social', 'Enterprise', 'Biotech',
    'Infrastructure', 'Marketplace',
  ]
  ```

- [ ] **Step 2: Verify in browser**

  Navigate to onboarding step 3. Confirm all 20 options are visible and the pill layout wraps cleanly.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/screens/Onboarding.jsx
  git commit -m "feat: expand industry options from 8 to 20 in onboarding preferences"
  ```

---

## Self-Review Checklist

| Requirement | Task |
|---|---|
| Resume upload fails (missing tables) | Task 1 |
| Profile data lost after onboarding | Tasks 2 + 3 |
| Jobs disappear between requests | Task 4 |
| `GET /api/jobs/{id}` can't find generated jobs | Task 4 |
| Industry list is too thin | Task 5 |
| `resume_base_id` not passed when queueing | Task 4 Step 2 |

No placeholder steps. All code is complete and runnable. Types are consistent: `ProfileCreate`/`ProfileOut` in Task 2 match usage in Task 3; `JobListing` model is unchanged.
