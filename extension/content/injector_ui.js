import { detectPlatform } from './detector.js'
import { buildFieldMap } from './mapper.js'
import { autofillForm } from './autofill.js'
import { updateStatus, appendCustomAnswers } from '../utils/api_client.js'

let applicationRecord = null
let applicationFields = null
let overlayEl = null

// Wait for application context from the service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'HIREMIND_APPLICATION_CONTEXT') {
    const payload = message.payload || {}
    applicationRecord = payload.application || null
    applicationFields = payload.applicationFields || null
    initialize()
  }
})

// Also request context on load (tab may have already been processed)
chrome.runtime.sendMessage({ type: 'HIREMIND_GET_CONTEXT' }, (res) => {
  if (res?.context && !applicationRecord) {
    applicationRecord = res.context.application || null
    applicationFields = res.context.applicationFields || null
    initialize()
  }
})

async function initialize() {
  if (!applicationRecord) return
  const detection = detectPlatform()
  if (!detection.isApplicationPage || detection.confidence < 50) return

  injectOverlay('detected')

  const profile = buildProfile()
  const fieldMap = await buildFieldMap(profile)

  if (!fieldMap) {
    updateOverlay('no-form')
    return
  }

  updateOverlay('ready', { fieldMap, profile })

  const results = await autofillForm(fieldMap.mappings, applicationRecord)
  updateOverlay('autofilled', { results, fieldMap })

  // Report unmapped fields back as custom questions for the user to answer in-app.
  reportCustomQuestions(fieldMap).catch(() => {})

  await updateStatus(applicationRecord.id, 'autofilled')
}

function buildProfile() {
  // Reconstruct the profile shape field_matcher expects from stored application_fields.
  const f = applicationFields?.fields || {}
  return {
    firstName: f.firstName || '',
    lastName: f.lastName || '',
    email: f.email || '',
    phone: f.phone || '',
    linkedinUrl: f.linkedinUrl || '',
    portfolioUrl: f.portfolioUrl || f.githubUrl || '',
    location: {
      city: f.city || '',
      state: f.state || '',
      country: f.country || '',
      zip: f.zip || '',
    },
    workAuthorization: f.workAuthorization || '',
    yearsExperience: f.yearsExperience || '',
    salaryExpectation: f.salaryExpectation || '',
    resumeVariantId: applicationRecord?.resume_variant_id || null,
    coverLetterId: applicationRecord?.cover_letter_id || null,
  }
}

async function reportCustomQuestions({ rawFields, mappings }) {
  if (!applicationRecord || !rawFields || !mappings) return

  const existingIds = new Set((applicationFields?.custom_answers || []).map((a) => a.id))
  const detectedAt = new Date().toISOString()
  const unmapped = []

  mappings.forEach((mapping, i) => {
    if (mapping.strategy !== 'skip') return
    if (mapping.fieldType === 'resumeFile') return
    const raw = rawFields[i]
    if (!raw) return
    const question = (raw.label || raw.placeholder || raw.ariaLabel || '').trim()
    if (!question) return
    // Use selector as stable id — survives page reloads for the same form.
    const id = raw.selector
    if (existingIds.has(id)) return
    unmapped.push({
      id,
      question,
      answer: '',
      selector: raw.selector,
      detected_at: detectedAt,
    })
  })

  if (!unmapped.length) return
  const updated = await appendCustomAnswers(applicationRecord.id, unmapped)
  if (updated) applicationFields = updated
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
  const unmapped = (data.fieldMap?.mappings || []).filter((m) => m.strategy === 'skip' && m.fieldType !== 'resumeFile').length
  return `
    <div style="margin-bottom:12px">
      <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:13px;color:#0c0e1c;margin-bottom:8px">Fields filled</div>
      ${filled.map((r) => `<div style="font-size:12px;color:#059669;margin-bottom:3px">✓ ${r.fieldType}</div>`).join('')}
      ${errors.map((r) => `<div style="font-size:12px;color:#dc2626;margin-bottom:3px">✗ ${r.fieldType}</div>`).join('')}
      ${unmapped ? `<div style="font-size:12px;color:#b45309;margin-top:6px">⚠ ${unmapped} custom question${unmapped === 1 ? '' : 's'} captured — answer in the HireMind app.</div>` : ''}
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
  alert('HireMind: Please review all fields, then click the page\'s own Submit button.')
}
