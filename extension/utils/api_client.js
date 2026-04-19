export const API_BASE = 'http://localhost:8000/api'

export async function fetchApplicationByUrl(applyUrl) {
  try {
    const res = await fetch(`${API_BASE}/applications/`)
    if (!res.ok) return null
    const applications = await res.json()
    // Match by apply_url prefix (ignore hash fragments added by the mobile app)
    const cleanUrl = applyUrl.split('#')[0]
    return applications.find((a) => a.apply_url.split('#')[0] === cleanUrl) || null
  } catch {
    return null
  }
}

export async function fetchResumeVariant(variantId) {
  const res = await fetch(`${API_BASE}/documents/variants/${variantId}`)
  if (!res.ok) throw new Error(`Resume variant ${variantId} not found`)
  return res.json()
}

export async function fetchCoverLetter(clId) {
  const res = await fetch(`${API_BASE}/documents/cover-letters/${clId}`)
  if (!res.ok) throw new Error(`Cover letter ${clId} not found`)
  return res.json()
}

export async function updateStatus(appId, status) {
  return fetch(`${API_BASE}/applications/${appId}/status?status=${status}`, { method: 'PATCH' })
}
