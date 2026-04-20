# Sprint 4: Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all remaining fake/hardcoded data and missing actions: add email/phone/LinkedIn to the profile, fix the ExtensionOverlay to show and use real data, add manual status updates to the Log, add document download, and give the Discover empty state actionable CTAs.

**Architecture:** Task 1 (profile fields) must land before Task 2 (ExtensionOverlay) since the overlay reads `profile.email`, `profile.phone`, and `profile.linkedin_url`. Tasks 3, 4, and 5 are fully independent. All changes are frontend-only except Task 1 which also requires a Supabase migration and backend model update.

**Tech Stack:** FastAPI + Supabase MCP (Task 1 backend), React + Zustand (all tasks)

---

## File Map

**Modified files:**
- `backend/models/profile.py` — add `email`, `phone`, `linkedin_url` Optional fields
- `frontend/src/screens/Onboarding.jsx` — add Email, Phone to step 0; LinkedIn URL to step 3
- `frontend/src/screens/Log.jsx` — ExtensionOverlay real data + wired buttons; status action buttons in AppRow
- `frontend/src/screens/Documents.jsx` — download button per document card
- `frontend/src/screens/Discover.jsx` — empty state CTAs

---

## Task 1: Add email / phone / LinkedIn to profile

The ExtensionOverlay needs to preview the user's contact details before submitting a job application. These fields don't exist yet in the DB, backend model, or onboarding form.

**Files:**
- Supabase migration (via MCP)
- Modify: `backend/models/profile.py`
- Modify: `frontend/src/screens/Onboarding.jsx`

- [ ] **Step 1: Run the Supabase migration**

  Using `mcp__claude_ai_Supabase__apply_migration` with project ID `jihzrsxchczbazboiqjv`:

  ```sql
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
  ```

- [ ] **Step 2: Add fields to the backend ProfileCreate model**

  Replace the entire contents of `backend/models/profile.py`:

  ```python
  from pydantic import BaseModel
  from typing import Optional, List


  class ProfileCreate(BaseModel):
      name: Optional[str] = None
      title: Optional[str] = None
      location: Optional[str] = None
      email: Optional[str] = None
      phone: Optional[str] = None
      linkedin_url: Optional[str] = None
      experience: Optional[str] = None
      skills: List[str] = []
      industries: List[str] = []
      salary: Optional[str] = None
      resume_base_id: Optional[str] = None


  class ProfileOut(ProfileCreate):
      id: str
      created_at: str
  ```

- [ ] **Step 3: Add Email and Phone fields to Onboarding step 0**

  In `frontend/src/screens/Onboarding.jsx`, the step 0 block (starting at line 131) renders a `.map()` over an array of `[label, key, placeholder]` triples. Change the array from:

  ```javascript
  {[['Full Name', 'name', 'Alex Johnson'], ['Job Title', 'title', 'Product Designer'], ['Location', 'location', 'San Francisco, CA']].map(([label, key, ph]) => (
  ```
  To:
  ```javascript
  {[
    ['Full Name', 'name', 'Alex Johnson'],
    ['Job Title', 'title', 'Product Designer'],
    ['Location', 'location', 'San Francisco, CA'],
    ['Email', 'email', 'you@example.com'],
    ['Phone', 'phone', '+1 415 555 0100'],
  ].map(([label, key, ph]) => (
  ```

- [ ] **Step 4: Add LinkedIn URL field to Onboarding step 3**

  In `frontend/src/screens/Onboarding.jsx`, the step 3 block contains the industries and salary sections. After the closing `</div>` of the salary grid (and before the closing `</div>` of step 3), add a LinkedIn URL field:

  Find this closing pattern in step 3:
  ```jsx
              </div>
            </div>
          </div>
        )}
  ```
  The one that closes the salary section is the second-to-last `</div>` in the step 3 block. Add after the salary `</div>`:

  ```jsx
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>LinkedIn URL <span style={{ color: '#9a9fa8', fontWeight: 400 }}>(optional)</span></div>
              <input
                value={form.linkedin_url || ''}
                placeholder="linkedin.com/in/yourname"
                onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #e0dfd8', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0c0e1c', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
  ```

  Also initialise `linkedin_url` in the `form` state at line 32. Change:
  ```javascript
    name: '', title: '', location: '',
    experience: '', skills: [], industries: [], salary: '',
    resume_base_id: null, resume_filename: null, resume_text: '',
  ```
  To:
  ```javascript
    name: '', title: '', location: '', email: '', phone: '', linkedin_url: '',
    experience: '', skills: [], industries: [], salary: '',
    resume_base_id: null, resume_filename: null, resume_text: '',
  ```

- [ ] **Step 5: Update saveProfile to send the new fields**

  In `frontend/src/store/appStore.js`, the `saveProfile` action already sends all non-empty fields by doing:
  ```javascript
  body: JSON.stringify({
    name: formData.name || undefined,
    title: formData.title || undefined,
    ...
  })
  ```
  Add the three new fields to this object (after `resume_base_id`):
  ```javascript
  email: formData.email || undefined,
  phone: formData.phone || undefined,
  linkedin_url: formData.linkedin_url || undefined,
  ```

- [ ] **Step 6: Verify**

  Run onboarding start-to-finish. In step 0 there should be 5 fields: Full Name, Job Title, Location, Email, Phone. In step 3 a LinkedIn URL field appears. After completing, check Supabase: `select name, email, phone, linkedin_url from profiles order by created_at desc limit 3;` — the new columns should have values.

- [ ] **Step 7: Commit**

  ```bash
  git add backend/models/profile.py frontend/src/screens/Onboarding.jsx frontend/src/store/appStore.js
  git commit -m "feat: add email, phone, linkedin_url to profile schema and onboarding"
  ```

---

## Task 2: ExtensionOverlay real data + wired buttons

Depends on Task 1. Replace all five hardcoded strings in `ExtensionOverlay` with live profile and application data. Wire the Regenerate button to `generateDocs` and the Submit button to `updateApplicationStatus`.

**Files:**
- Modify: `frontend/src/screens/Log.jsx`

- [ ] **Step 1: Read profile + wire actions inside ExtensionOverlay**

  In `frontend/src/screens/Log.jsx`, `ExtensionOverlay` currently opens with:
  ```javascript
  function ExtensionOverlay({ app, onClose, accent }) {
    const [step, setStep] = useState(0)
    const fields = [
  ```

  Replace that opening with:
  ```javascript
  function ExtensionOverlay({ app, onClose, accent }) {
    const [step, setStep] = useState(0)
    const [regenerating, setRegenerating] = useState(false)
    const { profile, generateDocs, updateApplicationStatus } = useAppStore()

    const handleRegenerate = async () => {
      setRegenerating(true)
      try { await generateDocs(app) } catch {}
      setRegenerating(false)
    }

    const handleSubmit = () => {
      updateApplicationStatus(app.id, 'submitted')
      setStep(1)
    }

    const fields = [
  ```

- [ ] **Step 2: Replace the hardcoded fields array**

  Change the `fields` array from:
  ```javascript
    const fields = [
      { label: 'Full Name',    value: 'Alex Johnson',          ok: true },
      { label: 'Email',        value: 'alex@email.com',         ok: true },
      { label: 'Phone',        value: '+1 415 555 0192',        ok: true },
      { label: 'Resume',       value: `resume_${(app.company || 'job').toLowerCase()}_${app.resumeV || 'v1'}.pdf`, ok: true },
      { label: 'Cover Letter', value: 'Attached',               ok: true },
      { label: 'LinkedIn URL', value: 'linkedin.com/in/alexj',  ok: false },
    ]
  ```
  To:
  ```javascript
    const fields = [
      { label: 'Full Name',    value: profile?.name || 'Not set',          ok: Boolean(profile?.name) },
      { label: 'Email',        value: profile?.email || 'Not set',         ok: Boolean(profile?.email) },
      { label: 'Phone',        value: profile?.phone || 'Not set',         ok: Boolean(profile?.phone) },
      { label: 'Resume',       value: app.resume_variant_id ? `${(app.company || 'job').toLowerCase().replace(/\s+/g, '_')}_resume.pdf` : 'Not generated', ok: Boolean(app.resume_variant_id) },
      { label: 'Cover Letter', value: app.cover_letter_id ? 'Attached' : 'Not generated', ok: Boolean(app.cover_letter_id) },
      { label: 'LinkedIn URL', value: profile?.linkedin_url || 'Not set',  ok: Boolean(profile?.linkedin_url) },
    ]
  ```

- [ ] **Step 3: Wire the Regenerate and Submit buttons**

  The Regenerate button is currently:
  ```jsx
                <button style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #e0dfd8', background: '#f6f5f0', color: '#6b6f7e', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13 }}>
                  Regenerate
                </button>
  ```
  Replace with:
  ```jsx
                <button onClick={handleRegenerate} disabled={regenerating}
                  style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #e0dfd8', background: '#f6f5f0', color: '#6b6f7e', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: regenerating ? 'default' : 'pointer' }}>
                  {regenerating ? '✦ Regenerating…' : 'Regenerate'}
                </button>
  ```

  The Submit button is currently:
  ```jsx
                <button onClick={() => setStep(1)}
                  style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14 }}>
                  Submit Application →
                </button>
  ```
  Replace with:
  ```jsx
                <button onClick={handleSubmit}
                  style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Submit Application →
                </button>
  ```

- [ ] **Step 4: Verify**

  Queue a job, generate docs for it, then tap "Open in Chrome Extension." The overlay should show your real name/email/phone from the profile. The Resume row should show `ok: true` and a real filename. Clicking "Submit Application →" should close the overlay via the success screen and the application status should change to `submitted` in the Log list.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/screens/Log.jsx
  git commit -m "feat: ExtensionOverlay reads real profile data and wires Regenerate/Submit"
  ```

---

## Task 3: Manual status updates in Log

Users need to move applications through the pipeline by hand — e.g. mark as Submitted after applying outside the extension, or record an Interview or Rejection. Add status action buttons below the pipeline bar in each expanded AppRow.

**Files:**
- Modify: `frontend/src/screens/Log.jsx`

- [ ] **Step 1: Add status action buttons to AppRow**

  In `frontend/src/screens/Log.jsx`, inside the `AppRow` function, add `updateApplicationStatus` to the destructure after the existing `generateDocs`:

  Change:
  ```javascript
    const { generateDocs } = useAppStore()
  ```
  To:
  ```javascript
    const { generateDocs, updateApplicationStatus } = useAppStore()
  ```

  Then, in the expanded section, after the `<PipelineBar status={app.status} />` line and before the mini Resume/Match cards, add:

  ```jsx
          {(() => {
            const actions = {
              ready:       [{ label: 'Mark Submitted',  next: 'submitted' }],
              submitted:   [{ label: '🎉 Interview',    next: 'interviewing' }, { label: 'Rejected', next: 'rejected' }],
              interviewing:[{ label: 'Rejected',        next: 'rejected' }],
            }
            const btns = actions[app.status]
            if (!btns) return null
            return (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {btns.map(({ label, next }) => (
                  <button key={next}
                    onClick={() => updateApplicationStatus(app.id, next)}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 10, border: '1.5px solid #e0dfd8',
                      background: next === 'rejected' ? '#fff5f5' : '#f0fdf4',
                      color: next === 'rejected' ? '#ef4444' : '#16a34a',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            )
          })()}
  ```

- [ ] **Step 2: Verify**

  In the Log tab, expand an application with status `submitted`. Two buttons should appear: "🎉 Interview" and "Rejected." Clicking "🎉 Interview" should change the badge to `interviewing` and the pipeline bar should advance. Expanding a `ready` application should show "Mark Submitted."

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/screens/Log.jsx
  git commit -m "feat: add manual status update buttons in Log screen AppRow"
  ```

---

## Task 4: Document download

Add a Download button to each document card in the Documents screen. Uses the browser Blob API — no dependencies required.

**Files:**
- Modify: `frontend/src/screens/Documents.jsx`

- [ ] **Step 1: Add the downloadDoc helper and wire it to each card**

  In `frontend/src/screens/Documents.jsx`, add the helper function at the top of the `Documents` component (after the `useEffect` hooks):

  ```javascript
    const downloadDoc = (content, filename) => {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  ```

- [ ] **Step 2: Add Download button to the base resume card header**

  In the base resume card's header div, the current buttons are just `Edit` / `Done`. Add a Download button after the Edit toggle:

  Find:
  ```jsx
                  <button onClick={() => setEditingBase((v) => !v)} style={actionBtn(false)}>
                    {editingBase ? 'Done' : 'Edit'}
                  </button>
  ```
  Replace with:
  ```jsx
                  {baseContent && (
                    <button onClick={() => downloadDoc(baseContent, 'resume.txt')} style={actionBtn(true)}>
                      ↓ Download
                    </button>
                  )}
                  <button onClick={() => setEditingBase((v) => !v)} style={actionBtn(false)}>
                    {editingBase ? 'Done' : 'Edit'}
                  </button>
  ```

- [ ] **Step 3: Add Download button to variant cards**

  In the variant card's button group, after the `Edit` button (which shows when `content !== undefined && !isEditing`), add a Download button:

  Find:
  ```jsx
                      {content !== undefined && !isEditing && (
                        <button onClick={() => setEditingId(id)} style={actionBtn(false)}>Edit</button>
                      )}
  ```
  Replace with:
  ```jsx
                      {content !== undefined && !isEditing && (
                        <>
                          <button onClick={() => downloadDoc(content, `${app.company.toLowerCase().replace(/\s+/g, '_')}_resume.txt`)} style={actionBtn(true)}>↓</button>
                          <button onClick={() => setEditingId(id)} style={actionBtn(false)}>Edit</button>
                        </>
                      )}
  ```

- [ ] **Step 4: Add Download button to cover letter cards**

  In the cover letter card's button group, after the `Edit` button, add the same pattern:

  Find (in the cover letter `.map()`):
  ```jsx
                        {content !== undefined && !isEditing && (
                          <button onClick={() => setEditingId(id)} style={actionBtn(false)}>Edit</button>
                        )}
  ```
  Replace with:
  ```jsx
                        {content !== undefined && !isEditing && (
                          <>
                            <button onClick={() => downloadDoc(content, `${app.company.toLowerCase().replace(/\s+/g, '_')}_cover_letter.txt`)} style={actionBtn(true)}>↓</button>
                            <button onClick={() => setEditingId(id)} style={actionBtn(false)}>Edit</button>
                          </>
                        )}
  ```

- [ ] **Step 5: Verify**

  In the Documents tab: the base resume card should show "↓ Download" next to "Edit." Clicking it should download `resume.txt` with the resume content. After viewing a variant, the "↓" button appears and downloads `stripe_resume.txt` (or similar).

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/screens/Documents.jsx
  git commit -m "feat: add .txt download button to all document cards"
  ```

---

## Task 5: Discover empty state CTAs

When the card stack is empty the screen shows static text and no actions. Add two buttons: one to run the real job scraper, one to generate more Claude-powered suggestions.

**Files:**
- Modify: `frontend/src/screens/Discover.jsx`

- [ ] **Step 1: Replace the empty state div**

  In `frontend/src/screens/Discover.jsx`, find the empty state block:

  ```jsx
          {!loading && stack.length === 0 && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 20, color: '#0c0e1c' }}>You're all caught up!</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9a9fa8', textAlign: 'center', maxWidth: 220 }}>Check your Application Log to review queued jobs.</div>
            </div>
          )}
  ```

  Replace with:

  ```jsx
          {!loading && stack.length === 0 && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 24px' }}>
              <div style={{ fontSize: 40 }}>✦</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 20, color: '#0c0e1c', textAlign: 'center' }}>You're all caught up!</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9a9fa8', textAlign: 'center', maxWidth: 220 }}>
                Find real listings or generate more personalized suggestions.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 260 }}>
                <button onClick={handleScrape} disabled={scraping}
                  style={{ padding: '13px 24px', borderRadius: 14, border: 'none', background: scraping ? '#c0bfb8' : accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: scraping ? 'default' : 'pointer' }}>
                  {scraping ? 'Searching…' : '⟳ Find Real Jobs'}
                </button>
                <button onClick={fetchJobs}
                  style={{ padding: '13px 24px', borderRadius: 14, border: `1.5px solid ${accent}`, background: '#fff', color: accent, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  ✦ Generate More
                </button>
              </div>
            </div>
          )}
  ```

- [ ] **Step 2: Verify**

  Swipe through all jobs until the stack is empty. The "all caught up" screen should show two buttons. "⟳ Find Real Jobs" triggers the scraper and reloads the stack. "✦ Generate More" calls `fetchJobs()` which generates a new Claude-powered batch.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/screens/Discover.jsx
  git commit -m "feat: add Find Real Jobs + Generate More CTAs to Discover empty state"
  ```

---

## Self-Review Checklist

| Requirement | Task |
|---|---|
| ExtensionOverlay shows real name/email/phone | Tasks 1 + 2 |
| Regenerate button actually regenerates docs | Task 2 |
| Submit button marks application as submitted | Task 2 |
| Manual status advancement (submitted → interviewing → rejected) | Task 3 |
| Document download for base resume, variants, cover letters | Task 4 |
| Discover empty state has actionable buttons | Task 5 |

Type consistency: `profile?.email`, `profile?.phone`, `profile?.linkedin_url` in Task 2 match the `ProfileCreate` fields added in Task 1. `updateApplicationStatus(app.id, next)` in Task 3 matches the existing store action signature `updateApplicationStatus: async (appId, status)`. `downloadDoc(content, filename)` in Task 4 is defined in the same component — no cross-file dependency.
