import { API_BASE, fetchApplicationByUrl, fetchApplicationFields } from '../utils/api_client.js'

const JOB_SITE_PATTERNS = [
  /greenhouse\.io/,
  /lever\.co/,
  /myworkdayjobs\.com/,
  /myworkday\.com/,
  /ashbyhq\.com/,
]

function isJobSite(url) {
  return JOB_SITE_PATTERNS.some((re) => re.test(url))
}

// Track which tabs have active application context
const tabContext = new Map()

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  if (!isJobSite(tab.url)) return

  try {
    // Check if URL has a HireMind app ID fragment injected by the mobile app
    const url = new URL(tab.url)
    const appId = url.hash.match(/hiremind-app-id=([^&]+)/)?.[1]

    let applicationRecord = null

    if (appId) {
      const res = await fetch(`${API_BASE}/applications/${appId}`)
      if (res.ok) applicationRecord = await res.json()
    }

    if (!applicationRecord) {
      applicationRecord = await fetchApplicationByUrl(tab.url)
    }

    if (applicationRecord) {
      const applicationFields = await fetchApplicationFields(applicationRecord.id)
      const context = { application: applicationRecord, applicationFields }
      tabContext.set(tabId, context)
      chrome.tabs.sendMessage(tabId, {
        type: 'HIREMIND_APPLICATION_CONTEXT',
        payload: context,
      })

      await fetch(`${API_BASE}/applications/${applicationRecord.id}/status?status=opened`, {
        method: 'PATCH',
      })
    }
  } catch (err) {
    console.warn('[HireMind SW] Failed to load application context:', err)
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  tabContext.delete(tabId)
})

// Relay messages from content scripts to backend
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIREMIND_STATUS_UPDATE') {
    const { appId, status } = message.payload
    fetch(`${API_BASE}/applications/${appId}/status?status=${status}`, { method: 'PATCH' })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true // async response
  }

  if (message.type === 'HIREMIND_GET_CONTEXT') {
    const ctx = sender.tab ? tabContext.get(sender.tab.id) : null
    sendResponse({ context: ctx })
  }
})
