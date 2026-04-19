# Workflow: Track Application Status

**Objective:** Keep application records up to date as a job moves through the pipeline.

**Status machine:**
```
QUEUED → READY → OPENED → AUTOFILLED → USER_REVIEWING → SUBMITTED → INTERVIEWING | REJECTED
```

**Triggers for each status:**

| Status | Triggered by |
|--------|-------------|
| queued | User swipes right in mobile app |
| ready | Document generation completes |
| opened | User taps "Open in Chrome" in mobile app |
| autofilled | Chrome extension fills the form |
| user_reviewing | User clicks "Review & Submit" in overlay |
| submitted | User manually updates, or extension detects success page |
| interviewing | User manually updates in Log screen |
| rejected | User manually updates in Log screen |

**Steps for manual status update:**
1. Open Application Log in mobile app
2. Tap the application row to expand
3. Status updates are available via `PATCH /api/applications/<id>/status`

**Edge cases:**
- If extension autofill fails: status stays at "opened", user sees error in overlay
- If user closes Chrome without submitting: status stays at "autofilled" — user can re-open
- If user rejects an offer after interviewing: update to "rejected" manually

**Checking status via tool:**
```bash
python tools/db_client.py  # lists all applications with current status
```
