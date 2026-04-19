import { detectPlatform } from './detector.js'
import { buildFieldMap } from './mapper.js'
import { autofillForm } from './autofill.js'
import { fetchResumeVariant, fetchCoverLetter, updateStatus } from '../utils/api_client.js'

let applicationRecord = null
let overlayEl = null

// Wait for application context from the service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'HIREMIND_APPLICATION_CONTEXT') {
    applicationRecord = message.payload
    initialize()
  }
})

// Also request context on load (tab may have already been processed)
chrome.runtime.sendMessage({ type: 'HIREMIND_GET_CONTEXT' }, (res) => {
  if (res?.applicationRecord && !applicationRecord) {
    applicationRecord = res.applicationRecord
    initialize()
  }
})

async function initialize() {
  const detection = detectPlatform()
  if (!detection.isApplicationPage || detection.confidence < 50) return

  injectOverlay('detected')

  // Build a stub profile — in production this comes from the application record + backend
  const profile = await buildProfile()
  const fieldMap = await buildFieldMap(profile)

  if (!fieldMap) {
    updateOverlay('no-form')
    return
  }

  updateOverlay('ready', { fieldMap, profile })

  // Auto-run autofill
  const results = await autofillForm(fieldMap.mappings, applicationRecord)
  updateOverlay('autofilled', { results, fieldMap })

  await updateStatus(applicationRecord.id, 'autofilled')
}

async function buildProfile() {
  // Fetch resume + cover letter content for the application
  const profile = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    portfolioUrl: '',
    location: {},
    workAuthorization: 'citizen',
    yearsExperience: '',
    salaryExpectation: '',
    resumeVariantId: applicationRecord?.resume_variant_id || null,
    coverLetterId: applicationRecord?.cover_letter_id || null,
  }

  // Load from chrome.storage (populated when user sets up profile in the app)
  const stored = await chrome.storage.local.get('userProfile')
  return { ...profile, ...(stored.userProfile || {}) }
}

function injectOverlay(state) {
  if (overlayEl) return
  overlayEl = document.createElement('div')
  overlayEl.id = 'hiremind-overlay'
  overlayEl.style.cssText = `
    position: fixed; top: 20px; right: 20px; width: 320px;
    background: #fff; border-radius: 18px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.15);
    z-index: 2147483647; font-family: 'DM Sans', sans-serif;
    overflow: hidden; border: 1px solid #e8e7e2;
  `
  document.body.appendChild(overlayEl)
  renderOverlay(state)
}

function updateOverlay(state, data) {
  if (!overlayEl) return
  renderOverlay(state, data)
}

function renderOverlay(state, data) {
  const accent = '#5047e5'
  const appInfo = applicationRecord ? `${applicationRecord.title} @ ${applicationRecord.company}` : 'Application'

  const states = {
    detected: `<p style="color:#6b6f7e;font-size:13px;margin:0">Detected job page. Preparing autofill…</p>`,
    'no-form': `<p style="color:#e8612a;font-size:13px;margin:0">No application form detected on this page.</p>`,
    ready: `<p style="color:#6b6f7e;font-size:13px;margin:0">Form detected. Running autofill…</p>`,
    autofilled: buildFilledState(data, accent),
  }

  overlayEl.innerHTML = `
    <div style="padding:16px;border-bottom:1px solid #f0efe9;display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;border-radius:10px;background:${accent}18;display:flex;align-items:center;justify-content:center;font-size:16px">🧠</div>
      <div>
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:13px;color:#0c0e1c">HireMind</div>
        <div style="font-size:11px;color:#6b6f7e">${appInfo}</div>
      </div>
      <button id="hm-close" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#b0aeb8;font-size:18px">×</button>
    </div>
    <div style="padding:16px">
      ${states[state] || states.detected}
    </div>
    ${state === 'autofilled' ? buildActions(accent) : ''}
  `

  overlayEl.querySelector('#hm-close')?.addEventListener('click', () => overlayEl.remove())
  overlayEl.querySelector('#hm-submit')?.addEventListener('click', handleSubmit)
}

function buildFilledState(data, accent) {
  if (!data?.results) return ''
  const filled = data.results.filter((r) => r.status === 'filled')
  const errors = data.results.filter((r) => r.status === 'error')
  return `
    <div style="margin-bottom:12px">
      <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:13px;color:#0c0e1c;margin-bottom:8px">Fields filled</div>
      ${filled.map((r) => `<div style="font-size:12px;color:#059669;margin-bottom:3px">✓ ${r.fieldType}</div>`).join('')}
      ${errors.map((r) => `<div style="font-size:12px;color:#dc2626;margin-bottom:3px">✗ ${r.fieldType}</div>`).join('')}
    </div>
    <p style="font-size:11px;color:#b0aeb8;margin:0">Review all fields before submitting.</p>
  `
}

function buildActions(accent) {
  return `
    <div style="padding:0 16px 16px;display:flex;flex-direction:column;gap:8px">
      <button id="hm-submit" style="
        padding:11px;border-radius:12px;background:${accent};border:none;cursor:pointer;
        font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:13px;color:#fff;
      ">Review &amp; Submit</button>
    </div>
  `
}

async function handleSubmit() {
  await updateStatus(applicationRecord.id, 'user_reviewing')
  renderOverlay('autofilled')
  // User clicks the actual submit button themselves — we never submit for them
  alert('HireMind: Please review all fields, then click the page\'s own Submit button.')
}
