import { parseFormFields } from '../utils/dom_parser.js'
import { matchFields } from '../utils/field_matcher.js'

/**
 * Finds the primary application form on the page and maps all fields
 * to user profile data. Returns null if no suitable form found.
 */
export async function buildFieldMap(profile) {
  const form = findApplicationForm()
  if (!form) return null

  const rawFields = parseFormFields(form)
  const mappings = matchFields(rawFields, profile)

  return { form, rawFields, mappings }
}

function findApplicationForm() {
  // Platform-specific selectors first
  const specific = [
    'form#application_form',          // Greenhouse
    'form[action*="apply"]',
    '.application-form form',         // Lever
    '[data-automation-id="applicationPage"] form',  // Workday
    '.ashby-application-form form',   // Ashby
  ]

  for (const sel of specific) {
    const el = document.querySelector(sel)
    if (el) return el
  }

  // Generic: find the form with the most meaningful inputs
  const forms = Array.from(document.querySelectorAll('form'))
  return forms
    .map((f) => ({ form: f, score: scoreForm(f) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.form || null
}

function scoreForm(form) {
  let score = 0
  const text = (form.textContent || '').toLowerCase()
  if (text.includes('resume') || text.includes('cv')) score += 30
  if (text.includes('cover letter')) score += 20
  if (text.includes('apply') || text.includes('application')) score += 15
  const emailInput = form.querySelector('input[type="email"]')
  if (emailInput) score += 20
  const fileInput = form.querySelector('input[type="file"]')
  if (fileInput) score += 15
  return score
}
