# Sprint 2: Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the backend so the production frontend can reach it, wire Documents and Profile screens to real user data, and add PATCH endpoints so edits persist.

**Architecture:** Four independent tasks: (1) Render deployment config + frontend env var swap, (2) two new PATCH endpoints in the existing documents route, (3) full rewrite of Documents.jsx to load real resume/variant/cover-letter content from the API, (4) Profile.jsx reads from the Zustand profile object instead of hardcoded strings. Tasks 3 depends on Task 2; all others are independent.

**Tech Stack:** FastAPI + Supabase (backend), React + Zustand (frontend), Render.com (backend hosting), Vercel (frontend hosting)

---

## File Map

**New files:**
- `render.yaml` — Render service definition (backend deployment)

**Modified files:**
- `backend/models/document.py` — add `DocumentUpdateRequest` schema
- `backend/routes/documents.py` — add `PATCH /documents/variants/{id}` and `PATCH /documents/cover-letters/{id}`
- `frontend/src/store/appStore.js:4` — swap hardcoded `'/api'` for env-var-aware constant
- `frontend/src/screens/Documents.jsx` — full rewrite: real resume/variant/cover-letter data, load-on-demand, edit + PATCH save
- `frontend/src/screens/Profile.jsx` — replace hardcoded strings with `profile` from Zustand store

---

## Task 1: Backend deployment setup

The Vercel frontend calls `/api/*` which proxies to `localhost:8000` in dev but 404s in production. This task creates a Render config so the backend gets a real public URL, then teaches the frontend to use it.

**Files:**
- Create: `render.yaml`
- Modify: `frontend/src/store/appStore.js:4`

- [ ] **Step 1: Create render.yaml**

  Create `render.yaml` at the project root:

  ```yaml
  services:
    - type: web
      name: hiremind-api
      runtime: python
      buildCommand: pip install -r backend/requirements.txt
      startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
      envVars:
        - key: ANTHROPIC_API_KEY
          sync: false
        - key: SUPABASE_URL
          sync: false
        - key: SUPABASE_SERVICE_KEY
          sync: false
        - key: PYTHON_VERSION
          value: "3.11.0"
  ```

  `sync: false` means Render will prompt for these values in the dashboard — they must not be committed.

- [ ] **Step 2: Make the frontend API base URL configurable**

  In `frontend/src/store/appStore.js`, line 4, change:
  ```javascript
  const API = '/api'
  ```
  To:
  ```javascript
  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'
  ```

  In dev, `VITE_API_URL` is undefined so this collapses to `'/api'` (dev proxy still works). In production, Vercel will have `VITE_API_URL=https://hiremind-api.onrender.com` set, making all fetch calls absolute.

- [ ] **Step 3: Deploy the backend to Render (manual — requires user action)**

  1. Go to [render.com](https://render.com), create a new Web Service
  2. Connect the GitHub repo, root directory = `/` (not `backend/`)
  3. Render will auto-detect `render.yaml` and fill in build/start commands
  4. In Render dashboard → Environment, add the three env vars from `.env`:
     - `ANTHROPIC_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_KEY`
  5. Deploy. Copy the service URL (e.g. `https://hiremind-api.onrender.com`)

- [ ] **Step 4: Set VITE_API_URL in Vercel (manual — requires user action)**

  1. Go to Vercel dashboard → Project Settings → Environment Variables
  2. Add `VITE_API_URL` = `https://hiremind-api.onrender.com` (no trailing slash)
  3. Redeploy the frontend

- [ ] **Step 5: Commit the config files**

  ```bash
  git add render.yaml frontend/src/store/appStore.js
  git commit -m "feat: add Render deployment config and env-var-aware API base URL"
  ```

---

## Task 2: Add PATCH endpoints for document editing

The frontend needs to save edits to resume variants and cover letters. The backend currently has GET endpoints but no update endpoints.

**Files:**
- Modify: `backend/models/document.py`
- Modify: `backend/routes/documents.py`

- [ ] **Step 1: Add DocumentUpdateRequest to the document model**

  In `backend/models/document.py`, add at the bottom:

  ```python
  class DocumentUpdateRequest(BaseModel):
      content: str
  ```

  The full file should now look like:

  ```python
  from pydantic import BaseModel
  from typing import Optional


  class ResumeBaseOut(BaseModel):
      id: str
      name: str
      content: str
      created_at: str


  class ResumeVariantOut(BaseModel):
      id: str
      base_id: str
      job_id: str
      content: str
      pdf_path: Optional[str] = None
      created_at: str


  class CoverLetterOut(BaseModel):
      id: str
      job_id: str
      company: str
      content: str
      created_at: str


  class GenerateDocsRequest(BaseModel):
      job_id: str
      company: str
      title: str
      job_description: str
      resume_base_id: str


  class SkillsSuggestRequest(BaseModel):
      job_title: str
      resume_text: str


  class DocumentUpdateRequest(BaseModel):
      content: str
  ```

- [ ] **Step 2: Add PATCH /documents/variants/{variant_id}**

  In `backend/routes/documents.py`, add the import for `DocumentUpdateRequest` to the existing import line:

  ```python
  from backend.models.document import (
      ResumeBaseOut, ResumeVariantOut, CoverLetterOut, GenerateDocsRequest,
      SkillsSuggestRequest, DocumentUpdateRequest
  )
  ```

  Then add these two routes at the bottom of the file:

  ```python
  @router.patch("/variants/{variant_id}", response_model=ResumeVariantOut)
  def update_resume_variant(variant_id: str, payload: DocumentUpdateRequest, db: Client = Depends(get_db)):
      result = db.table("resume_variants").update({"content": payload.content}).eq("id", variant_id).execute()
      if not result.data:
          raise HTTPException(status_code=404, detail="Resume variant not found")
      return result.data[0]


  @router.patch("/cover-letters/{cl_id}", response_model=CoverLetterOut)
  def update_cover_letter(cl_id: str, payload: DocumentUpdateRequest, db: Client = Depends(get_db)):
      result = db.table("cover_letters").update({"content": payload.content}).eq("id", cl_id).execute()
      if not result.data:
          raise HTTPException(status_code=404, detail="Cover letter not found")
      return result.data[0]
  ```

- [ ] **Step 3: Test the PATCH endpoints**

  Start backend: `cd /workspaces/HireMind && uvicorn backend.main:app --reload`

  First create a test variant (skip if one already exists in Supabase):
  ```bash
  # List applications to find one with a resume_variant_id
  curl http://localhost:8000/api/applications/
  ```

  Then test the PATCH (replace `<variant_id>` with a real UUID from the applications list):
  ```bash
  curl -X PATCH http://localhost:8000/api/documents/variants/<variant_id> \
    -H "Content-Type: application/json" \
    -d '{"content": "Updated resume content test"}'
  ```
  Expected: `200` with the updated variant including `"content": "Updated resume content test"`.

  ```bash
  curl -X PATCH http://localhost:8000/api/documents/cover-letters/<cl_id> \
    -H "Content-Type: application/json" \
    -d '{"content": "Updated cover letter test"}'
  ```
  Expected: `200` with updated cover letter.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/models/document.py backend/routes/documents.py
  git commit -m "feat: add PATCH endpoints for resume variants and cover letters"
  ```

---

## Task 3: Documents screen — real data, view and edit

Replace all hardcoded content in `Documents.jsx` with live data. Base resume comes from `profile.resume_text`. Tailored variants and cover letters are loaded on demand from the API, keyed to existing applications.

**Files:**
- Modify: `frontend/src/screens/Documents.jsx` (full rewrite)

- [ ] **Step 1: Rewrite Documents.jsx**

  Replace the entire contents of `frontend/src/screens/Documents.jsx` with:

  ```jsx
  import { useState, useEffect } from 'react'
  import { useAppStore } from '../store/appStore'

  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'

  export default function Documents() {
    const { tweaks, profile, applications, fetchApplications } = useAppStore()
    const accent = tweaks.accentColor

    const [tab, setTab] = useState('resume')
    const [editingId, setEditingId] = useState(null)
    const [localEdits, setLocalEdits] = useState({})
    const [loadedDocs, setLoadedDocs] = useState({})
    const [loading, setLoading] = useState({})
    const [saving, setSaving] = useState(null)
    const [baseContent, setBaseContent] = useState(profile?.resume_text || '')
    const [editingBase, setEditingBase] = useState(false)

    useEffect(() => {
      if (!applications.length) fetchApplications()
    }, [])

    useEffect(() => {
      setBaseContent(profile?.resume_text || '')
    }, [profile?.resume_text])

    const appsWithVariants = applications.filter((a) => a.resume_variant_id)
    const appsWithCoverLetters = applications.filter((a) => a.cover_letter_id)

    const loadDoc = async (type, id) => {
      if (loadedDocs[id] !== undefined) return
      setLoading((prev) => ({ ...prev, [id]: true }))
      try {
        const url = type === 'variant'
          ? `${API}/documents/variants/${id}`
          : `${API}/documents/cover-letters/${id}`
        const res = await fetch(url)
        const data = await res.json()
        setLoadedDocs((prev) => ({ ...prev, [id]: data.content }))
        setLocalEdits((prev) => ({ ...prev, [id]: data.content }))
      } catch {
        setLoadedDocs((prev) => ({ ...prev, [id]: '' }))
      }
      setLoading((prev) => ({ ...prev, [id]: false }))
    }

    const saveDoc = async (type, id) => {
      setSaving(id)
      try {
        const url = type === 'variant'
          ? `${API}/documents/variants/${id}`
          : `${API}/documents/cover-letters/${id}`
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: localEdits[id] }),
        })
        setLoadedDocs((prev) => ({ ...prev, [id]: localEdits[id] }))
      } catch {}
      setSaving(null)
      setEditingId(null)
    }

    const cardStyle = {
      background: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(12,14,28,0.05)',
    }
    const headerStyle = {
      padding: '12px 14px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', borderBottom: '1px solid #f0efe9',
    }
    const labelStyle = {
      fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#0c0e1c',
    }
    const bodyStyle = {
      padding: '12px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 13,
      color: '#3d4050', lineHeight: 1.7, whiteSpace: 'pre-wrap',
    }
    const textareaStyle = {
      width: '100%', padding: '12px 14px', border: 'none',
      fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3d4050',
      lineHeight: 1.6, resize: 'vertical', minHeight: 120,
      background: '#fafaf8', boxSizing: 'border-box',
    }
    const actionBtn = (primary) => ({
      padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: primary ? '#f0effb' : '#f6f5f0',
      color: primary ? accent : '#6b6f7e',
      fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11,
    })

    const emptyState = (msg) => (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>{msg}</div>
      </div>
    )

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f4f0' }}>
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c', marginBottom: 14 }}>Documents</div>
          <div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, boxShadow: '0 2px 10px rgba(12,14,28,0.06)' }}>
            {[['resume', 'Resume'], ['coverletter', 'Cover Letters']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', background: tab === t ? accent : 'transparent', color: tab === t ? '#fff' : '#9a9fa8', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>

          {tab === 'resume' && (
            <>
              {/* Base resume */}
              {baseContent ? (
                <div style={cardStyle}>
                  <div style={headerStyle}>
                    <div>
                      <span style={labelStyle}>Your Resume</span>
                      <span style={{ marginLeft: 8, background: '#f0effb', color: accent, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>Base</span>
                    </div>
                    <button onClick={() => setEditingBase((v) => !v)} style={actionBtn(false)}>
                      {editingBase ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  {editingBase ? (
                    <textarea
                      value={baseContent}
                      onChange={(e) => setBaseContent(e.target.value)}
                      style={{ ...textareaStyle, minHeight: 200 }}
                    />
                  ) : (
                    <div style={{ ...bodyStyle, maxHeight: 200, overflowY: 'auto' }}>{baseContent}</div>
                  )}
                </div>
              ) : (
                emptyState('Upload a resume in onboarding to see it here.')
              )}

              {/* Tailored variants */}
              {appsWithVariants.length > 0 && (
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 12, color: '#9a9fa8', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Tailored Versions
                </div>
              )}
              {appsWithVariants.map((app) => {
                const id = app.resume_variant_id
                const isEditing = editingId === id
                const content = loadedDocs[id]
                return (
                  <div key={id} style={cardStyle}>
                    <div style={headerStyle}>
                      <div>
                        <div style={labelStyle}>{app.company}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>{app.title}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {content === undefined && !loading[id] && (
                          <button onClick={() => loadDoc('variant', id)} style={actionBtn(true)}>View</button>
                        )}
                        {content !== undefined && !isEditing && (
                          <button onClick={() => setEditingId(id)} style={actionBtn(false)}>Edit</button>
                        )}
                        {isEditing && (
                          <>
                            <button onClick={() => saveDoc('variant', id)} disabled={saving === id} style={actionBtn(true)}>
                              {saving === id ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => setEditingId(null)} style={actionBtn(false)}>Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                    {loading[id] && (
                      <div style={{ padding: '14px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>Loading…</div>
                    )}
                    {content !== undefined && !isEditing && (
                      <div style={{ ...bodyStyle, maxHeight: 180, overflowY: 'auto' }}>{content}</div>
                    )}
                    {isEditing && (
                      <textarea
                        value={localEdits[id] ?? content}
                        onChange={(e) => setLocalEdits((prev) => ({ ...prev, [id]: e.target.value }))}
                        style={{ ...textareaStyle, minHeight: 180 }}
                      />
                    )}
                  </div>
                )
              })}

              {!baseContent && appsWithVariants.length === 0 && emptyState('No documents yet. Queue a job on Discover to generate tailored materials.')}
            </>
          )}

          {tab === 'coverletter' && (
            <>
              {appsWithCoverLetters.length === 0
                ? emptyState('No cover letters yet. Queue a job on Discover to generate one.')
                : appsWithCoverLetters.map((app) => {
                  const id = app.cover_letter_id
                  const isEditing = editingId === id
                  const content = loadedDocs[id]
                  return (
                    <div key={id} style={cardStyle}>
                      <div style={headerStyle}>
                        <div>
                          <div style={labelStyle}>{app.company}</div>
                          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>{app.title}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {content === undefined && !loading[id] && (
                            <button onClick={() => loadDoc('cl', id)} style={actionBtn(true)}>View</button>
                          )}
                          {content !== undefined && !isEditing && (
                            <button onClick={() => setEditingId(id)} style={actionBtn(false)}>Edit</button>
                          )}
                          {isEditing && (
                            <>
                              <button onClick={() => saveDoc('cl', id)} disabled={saving === id} style={actionBtn(true)}>
                                {saving === id ? 'Saving…' : 'Save'}
                              </button>
                              <button onClick={() => setEditingId(null)} style={actionBtn(false)}>Cancel</button>
                            </>
                          )}
                        </div>
                      </div>
                      {loading[id] && (
                        <div style={{ padding: '14px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>Loading…</div>
                      )}
                      {content !== undefined && !isEditing && (
                        <div style={{ ...bodyStyle, maxHeight: 220, overflowY: 'auto' }}>{content}</div>
                      )}
                      {isEditing && (
                        <textarea
                          value={localEdits[id] ?? content}
                          onChange={(e) => setLocalEdits((prev) => ({ ...prev, [id]: e.target.value }))}
                          style={{ ...textareaStyle, minHeight: 220 }}
                        />
                      )}
                    </div>
                  )
                })}
            </>
          )}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify the screen renders without errors**

  Start the dev server: `cd /workspaces/HireMind/frontend && npm run dev`

  Navigate to the Documents tab. Verify:
  - No console errors
  - If profile has `resume_text`: the "Your Resume" base card appears with content
  - If no resume uploaded: the empty state message shows
  - Cover Letters tab shows empty state or real data from applications
  - "View" button appears on any application card with a variant/cover letter

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/screens/Documents.jsx
  git commit -m "feat: wire Documents screen to real resume/variant/cover-letter data"
  ```

---

## Task 4: Profile screen — real data

Replace the four hardcoded strings (name, title, avatar letter, settings rows) with real values from the Zustand `profile` object. The `profile` object is populated during onboarding and persisted in localStorage.

The `profile` object shape (from `appStore.js`):
```javascript
{
  name: string,
  title: string,
  location: string,
  experience: string,
  skills: string[],
  industries: string[],
  salary: string,
  resume_base_id: string | null,
  profile_id: string, // backend UUID, added in Sprint 1
}
```

**Files:**
- Modify: `frontend/src/screens/Profile.jsx` (full rewrite)

- [ ] **Step 1: Rewrite Profile.jsx**

  Replace the entire contents of `frontend/src/screens/Profile.jsx` with:

  ```jsx
  import { useAppStore } from '../store/appStore'

  export default function Profile() {
    const { tweaks, resetOnboarding, applications, profile } = useAppStore()
    const accent = tweaks.accentColor

    const name = profile?.name || 'Your Name'
    const title = profile?.title || 'Job Title'
    const location = profile?.location || ''
    const avatarLetter = name[0].toUpperCase()
    const subtitle = [title, location].filter(Boolean).join(' · ')

    const stats = [
      [String(applications.length || 0), 'Applied'],
      [String(applications.filter((a) => a.status === 'interviewing').length || 0), 'Interviews'],
      [String(profile?.skills?.length || 0), 'Skills'],
    ]

    const industryPreview = profile?.industries?.length
      ? profile.industries.slice(0, 3).join(', ')
      : 'Not set'

    const salaryPreview = profile?.salary || 'Not set'

    const resumePreview = profile?.resume_base_id ? 'Resume uploaded' : 'No resume on file'

    const settings = [
      ['Resume', resumePreview],
      ['Preferences', `${industryPreview}`],
      ['Salary', salaryPreview],
      ['Experience', profile?.experience || 'Not set'],
    ]

    return (
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f4f0', padding: '16px 20px 24px' }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c', marginBottom: 20 }}>Profile</div>

        {/* Avatar card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 12px rgba(12,14,28,0.06)' }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0 }}>
            {avatarLetter}
          </div>
          <div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 18, color: '#0c0e1c' }}>{name}</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>{subtitle}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          {stats.map(([val, label]) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 10px rgba(12,14,28,0.05)' }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 20, color: accent }}>{val}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9a9fa8', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Settings rows */}
        {settings.map(([title, sub]) => (
          <div key={title} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(12,14,28,0.04)' }}>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#0c0e1c' }}>{title}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>{sub}</div>
            </div>
            <span style={{ color: '#c0bfb8', fontSize: 18, lineHeight: 1 }}>›</span>
          </div>
        ))}

        <button onClick={resetOnboarding}
          style={{ width: '100%', padding: 13, borderRadius: 14, border: '1.5px solid #fecaca', background: '#fff5f5', color: '#ef4444', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, marginTop: 8, cursor: 'pointer' }}>
          Restart Onboarding
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify the Profile screen**

  With the dev server running, navigate to the Profile tab.

  - If onboarding was completed with a real name: the avatar shows the first letter of that name, and the name/title/location are displayed correctly
  - If `profile` is null (fresh browser): shows "Your Name" / "Job Title" placeholder text gracefully
  - The "Skills" stat shows the count of skills selected during onboarding
  - The "Interviews" stat is 0 (no hardcoded 1)

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/screens/Profile.jsx
  git commit -m "feat: Profile screen reads real user data from Zustand profile store"
  ```

---

## Self-Review Checklist

| Requirement | Task |
|---|---|
| Backend upload fails in production (no deployed API) | Task 1 |
| View/edit for resume variant doesn't work | Tasks 2 + 3 |
| View/edit for cover letter doesn't work | Tasks 2 + 3 |
| Documents screen shows hardcoded Alex Johnson content | Task 3 |
| Profile screen shows hardcoded Alex Johnson | Task 4 |
| Profile stats show hardcoded 86% match avg / 1 interview | Task 4 |

No placeholder steps. All code is complete. `DocumentUpdateRequest` defined in Task 2 is used by the PATCH endpoints in Task 2 — not referenced before being defined. `API` constant in `Documents.jsx` matches the pattern in `appStore.js` (both use `import.meta.env.VITE_API_URL`). `profile` shape referenced in Task 4 matches what `saveProfile` stores in Sprint 1.
