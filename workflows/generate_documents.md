# Workflow: Generate Resume + Cover Letter

**Objective:** For a queued application, generate a tailored resume variant and cover letter using Claude.

**Inputs required:**
- `app_id` — the application record ID (status must be "queued")
- User's base resume must be uploaded (has a `resume_base_id`)

**Steps:**

1. Call `tools/resume_generator.py <app_id>`
2. Tool calls `POST /api/documents/generate` with:
   - job_id, company, title, job_description, resume_base_id
3. Backend sends both to Claude claude-sonnet-4-6 in a single prompt (cost efficient)
4. Backend saves:
   - `ResumeVariant` with tailored content
   - `CoverLetter` with 3-paragraph letter
5. Application record updated: `status → ready`, `resume_variant_id`, `cover_letter_id` set
6. Confirm in Application Log that status shows "Ready"

**Expected output:**
- Application status = "ready"
- Resume variant and cover letter IDs populated on the application record

**Edge cases:**
- If Claude returns malformed output (missing delimiter): retry once, then surface error to user
- If `resume_base_id` missing: prompt user to upload a base resume first
- API timeout (>30s): Claude generation can be slow — use 60s timeout in httpx client

**Cost note:**
- Uses claude-sonnet-4-6 (not Opus) — sufficient for document generation, lower cost
- One API call generates both documents together to minimize token overhead
