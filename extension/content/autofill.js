import { fetchResumeVariant, fetchCoverLetter } from '../utils/api_client.js'

/**
 * Fills form fields based on the mapping from mapper.js.
 * Skips file inputs (handled by document injection separately).
 * Never auto-submits.
 */
export async function autofillForm(mappings, applicationRecord) {
  const results = []

  // Resolve cover letter text if needed
  let coverLetterText = null
  if (applicationRecord?.cover_letter_id) {
    try {
      const cl = await fetchCoverLetter(applicationRecord.cover_letter_id)
      coverLetterText = cl.content
    } catch {
      // Non-fatal — user can paste manually
    }
  }

  for (const mapping of mappings) {
    if (mapping.strategy === 'skip' || mapping.value === null) continue
    if (mapping.fieldType === 'resumeFile') continue // handled by injector_ui

    try {
      const el = document.querySelector(mapping.selector)
      if (!el) continue

      let value = mapping.value

      // Swap cover letter sentinel for real content
      if (typeof value === 'string' && value.startsWith('__COVER_LETTER__:') && coverLetterText) {
        value = coverLetterText
      }

      fillElement(el, value)
      results.push({ selector: mapping.selector, fieldType: mapping.fieldType, status: 'filled' })
    } catch (err) {
      results.push({ selector: mapping.selector, fieldType: mapping.fieldType, status: 'error', error: err.message })
    }
  }

  return results
}

function fillElement(el, value) {
  const tag = el.tagName.toLowerCase()

  if (tag === 'select') {
    fillSelect(el, value)
    return
  }

  if (el.contentEditable === 'true') {
    el.textContent = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return
  }

  // React/Vue/Angular — must use native input value setter to trigger onChange
  const nativeInputSetter = Object.getOwnPropertyDescriptor(
    tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value'
  )?.set

  if (nativeInputSetter) {
    nativeInputSetter.call(el, value)
  } else {
    el.value = value
  }

  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))
}

function fillSelect(el, value) {
  const normalized = value.toLowerCase().trim()
  const option = Array.from(el.options).find(
    (o) => o.value.toLowerCase() === normalized || o.text.toLowerCase().includes(normalized)
  )
  if (option) {
    el.value = option.value
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}
