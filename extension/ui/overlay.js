// Extension popup UI — shows current tab's application status
const API_BASE = 'http://localhost:8000/api'

const STATUS_STYLE = {
  queued:        { bg: '#f0effb', color: '#5047e5', label: 'Queued' },
  ready:         { bg: '#f0f9f8', color: '#0ea5a0', label: 'Ready' },
  opened:        { bg: '#fff7ed', color: '#e8612a', label: 'Opened' },
  autofilled:    { bg: '#fef9ee', color: '#d97706', label: 'Autofilled' },
  user_reviewing:{ bg: '#fdf4ff', color: '#9333ea', label: 'Reviewing' },
  submitted:     { bg: '#f0fdf4', color: '#059669', label: 'Submitted' },
  interviewing:  { bg: '#eff6ff', color: '#2563eb', label: 'Interviewing' },
  rejected:      { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
}

async function init() {
  const root = document.getElementById('root')

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url) {
    root.innerHTML = renderIdle()
    return
  }

  try {
    const res = await fetch(`${API_BASE}/applications/`)
    if (!res.ok) throw new Error('API unavailable')
    const applications = await res.json()
    const cleanUrl = tab.url.split('#')[0]
    const app = applications.find((a) => a.apply_url.split('#')[0] === cleanUrl)

    root.innerHTML = app ? renderApp(app) : renderIdle()
  } catch {
    root.innerHTML = renderError()
  }
}

function renderApp(app) {
  const s = STATUS_STYLE[app.status] || STATUS_STYLE.queued
  return `
    <div class="header">
      <div class="logo">🧠</div>
      <div>
        <div class="app-name">HireMind</div>
        <div style="font-size:11px;color:#6b6f7e">${app.company}</div>
      </div>
    </div>
    <div style="padding:12px">
      <div class="section">
        <div class="label">Application</div>
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:14px;margin-bottom:8px">${app.title}</div>
        <span class="status-badge" style="background:${s.bg};color:${s.color}">${s.label}</span>
      </div>
      <div class="section">
        <div class="label">Documents</div>
        <div style="font-size:12px;color:#6b6f7e;margin-bottom:4px">Resume: ${app.resume_variant_id ? '✓ Ready' : '— Not generated'}</div>
        <div style="font-size:12px;color:#6b6f7e">Cover letter: ${app.cover_letter_id ? '✓ Ready' : '— Not generated'}</div>
      </div>
    </div>
  `
}

function renderIdle() {
  return `
    <div class="header">
      <div class="logo">🧠</div>
      <div class="app-name">HireMind</div>
    </div>
    <div style="padding:24px 16px;text-align:center;color:#b0aeb8;font-size:13px">
      No active application for this page.<br/>Queue a job from the HireMind app first.
    </div>
  `
}

function renderError() {
  return `
    <div class="header">
      <div class="logo">🧠</div>
      <div class="app-name">HireMind</div>
    </div>
    <div style="padding:24px 16px;text-align:center;color:#dc2626;font-size:13px">
      Could not connect to HireMind backend.<br/>Make sure the server is running.
    </div>
  `
}

init()
