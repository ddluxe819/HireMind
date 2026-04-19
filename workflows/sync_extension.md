# Workflow: Chrome Extension Sync

**Objective:** Ensure the Chrome extension has the correct application context when a job page loads.

**How context flows:**
1. User taps "Open in Chrome" in the mobile app
2. App opens job URL with fragment: `<apply_url>#hiremind-app-id=<app_id>`
3. Service worker (`background/service_worker.js`) detects tab load on a job site
4. SW extracts `app_id` from URL fragment, fetches application record from backend
5. SW sends `HIREMIND_APPLICATION_CONTEXT` message to content scripts
6. `injector_ui.js` receives context and kicks off detection + autofill

**If context is missing (user opened Chrome manually):**
- SW falls back to URL matching: `GET /api/applications/` and match by `apply_url`
- If no match found, overlay shows "No active application for this page"

**Testing the extension locally:**
1. Start backend: `uvicorn backend.main:app --reload`
2. Open `chrome://extensions/` → Load unpacked → select `/workspaces/HireMind/extension/`
3. Open a Greenhouse/Lever job page
4. Overlay should appear if a matching queued application exists

**Edge cases:**
- CORS: backend allows `chrome-extension://*` via CORS middleware
- Service worker lifecycle: SW may be terminated between tab loads — context is re-fetched on each `onUpdated` event
- Workday iframes: content scripts run in top frame; Workday form may be in an iframe — check `host_permissions` and `all_frames: true` if needed
