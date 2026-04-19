/**
 * Scans a form and returns structured field descriptors for field_matcher.js.
 */
export function parseFormFields(form) {
  const inputs = Array.from(
    form.querySelectorAll('input, textarea, select, [role="combobox"], [contenteditable="true"]')
  )

  return inputs
    .filter((el) => {
      const type = el.type?.toLowerCase()
      return type !== 'hidden' && type !== 'submit' && type !== 'button' && type !== 'reset'
    })
    .map((el) => {
      const label = resolveLabel(el)
      const context = resolveContext(el)
      return {
        selector: buildSelector(el),
        element: el,
        label,
        placeholder: el.placeholder || '',
        type: el.type || el.tagName.toLowerCase(),
        name: el.name || '',
        id: el.id || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        context,
      }
    })
}

function resolveLabel(el) {
  if (el.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (lbl) return lbl.innerText.trim()
  }
  const parent = el.closest('label')
  if (parent) return parent.innerText.replace(el.value || '', '').trim()

  // Look for sibling or ancestor label text
  const wrapper = el.closest('[class*="field"], [class*="form"], [class*="input"], [class*="question"]')
  if (wrapper) {
    const lbl = wrapper.querySelector('label, legend, [class*="label"]')
    if (lbl) return lbl.innerText.trim()
  }
  return ''
}

function resolveContext(el) {
  const wrapper = el.closest('[class*="field"], [class*="question"], [class*="form-group"]')
  return wrapper ? wrapper.innerText.replace(el.value || '', '').trim().slice(0, 120) : ''
}

function buildSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`
  if (el.name) return `[name="${CSS.escape(el.name)}"]`
  // Fallback: nth-of-type within form
  const form = el.closest('form')
  if (form) {
    const siblings = Array.from(form.querySelectorAll(el.tagName))
    const idx = siblings.indexOf(el)
    return `form ${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`
  }
  return el.tagName.toLowerCase()
}
