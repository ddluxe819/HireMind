/**
 * HireMind - Field Matcher
 *
 * Semantic matching brain of the autofill system. Takes detected form fields
 * and maps them to canonical field types using the user's profile data.
 *
 * Pipeline:
 *   1. Normalize field signals (label, placeholder, name, id, aria-label).
 *   2. Apply matching strategies in priority order:
 *        exact -> semantic -> type-based -> inferred -> skip
 *   3. Resolve each canonical field to a concrete value from the profile.
 *
 * No external dependencies. No network calls. Pure logic.
 */

// ---------------------------------------------------------------------------
// Canonical field taxonomy
// ---------------------------------------------------------------------------

const FIELD_TYPES = Object.freeze({
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  FULL_NAME: 'fullName',
  EMAIL: 'email',
  PHONE: 'phone',
  LINKEDIN_URL: 'linkedinUrl',
  PORTFOLIO_URL: 'portfolioUrl',
  CITY: 'city',
  STATE: 'state',
  COUNTRY: 'country',
  ZIP: 'zip',
  WORK_AUTHORIZATION: 'workAuthorization',
  YEARS_EXPERIENCE: 'yearsExperience',
  SALARY_EXPECTATION: 'salaryExpectation',
  COVER_LETTER_TEXT: 'coverLetterText',
  RESUME_FILE: 'resumeFile',
  UNKNOWN: 'unknown',
});

// ---------------------------------------------------------------------------
// Alias lookup table
//
// Each canonical field type maps to an array of lowercase, punctuation-stripped
// phrases commonly seen across ATS platforms (Greenhouse, Lever, Workday,
// iCIMS, SmartRecruiters, Ashby, Taleo, BambooHR, etc.).
// ---------------------------------------------------------------------------

const FIELD_ALIASES = Object.freeze({
  [FIELD_TYPES.FIRST_NAME]: [
    'first name',
    'firstname',
    'fname',
    'given name',
    'forename',
    'legal first name',
    'preferred first name',
    'first',
  ],
  [FIELD_TYPES.LAST_NAME]: [
    'last name',
    'lastname',
    'lname',
    'surname',
    'family name',
    'legal last name',
    'second name',
    'last',
  ],
  [FIELD_TYPES.FULL_NAME]: [
    'full name',
    'fullname',
    'name',
    'your name',
    'legal name',
    'complete name',
    'candidate name',
    'applicant name',
  ],
  [FIELD_TYPES.EMAIL]: [
    'email',
    'email address',
    'e mail',
    'e mail address',
    'contact email',
    'work email',
    'personal email',
    'primary email',
    'emailaddress',
    'your email',
  ],
  [FIELD_TYPES.PHONE]: [
    'phone',
    'phone number',
    'telephone',
    'telephone number',
    'mobile',
    'mobile number',
    'mobile phone',
    'cell',
    'cell phone',
    'contact number',
    'contact phone',
    'primary phone',
    'tel',
  ],
  [FIELD_TYPES.LINKEDIN_URL]: [
    'linkedin',
    'linkedin url',
    'linkedin profile',
    'linkedin link',
    'linkedin profile url',
    'li url',
    'linked in',
  ],
  [FIELD_TYPES.PORTFOLIO_URL]: [
    'portfolio',
    'portfolio url',
    'portfolio link',
    'website',
    'personal website',
    'personal site',
    'personal url',
    'homepage',
    'home page',
    'github',
    'github url',
    'github profile',
    'website or portfolio',
    'other website',
  ],
  [FIELD_TYPES.CITY]: [
    'city',
    'town',
    'city town',
    'current city',
    'location city',
  ],
  [FIELD_TYPES.STATE]: [
    'state',
    'province',
    'state province',
    'region',
    'state region',
    'county',
  ],
  [FIELD_TYPES.COUNTRY]: [
    'country',
    'nation',
    'country of residence',
    'current country',
    'country region',
  ],
  [FIELD_TYPES.ZIP]: [
    'zip',
    'zip code',
    'zipcode',
    'postal code',
    'postcode',
    'post code',
    'postal',
  ],
  [FIELD_TYPES.WORK_AUTHORIZATION]: [
    'work authorization',
    'work auth',
    'authorized to work',
    'authorization to work',
    'legally authorized',
    'legally authorized to work',
    'right to work',
    'work status',
    'visa status',
    'visa sponsorship',
    'require sponsorship',
    'sponsorship required',
    'employment eligibility',
    'us work authorization',
  ],
  [FIELD_TYPES.YEARS_EXPERIENCE]: [
    'years of experience',
    'years experience',
    'total experience',
    'total years of experience',
    'yoe',
    'experience years',
    'how many years',
    'relevant experience',
    'professional experience',
  ],
  [FIELD_TYPES.SALARY_EXPECTATION]: [
    'salary',
    'salary expectation',
    'salary expectations',
    'expected salary',
    'desired salary',
    'compensation',
    'compensation expectation',
    'expected compensation',
    'desired compensation',
    'target salary',
    'pay expectation',
    'pay expectations',
    'wage expectation',
  ],
  [FIELD_TYPES.COVER_LETTER_TEXT]: [
    'cover letter',
    'coverletter',
    'cover note',
    'motivation letter',
    'letter of motivation',
    'personal statement',
    'why do you want to work here',
    'why are you interested',
    'tell us about yourself',
  ],
  [FIELD_TYPES.RESUME_FILE]: [
    'resume',
    'resumé',
    'cv',
    'curriculum vitae',
    'upload resume',
    'upload cv',
    'attach resume',
    'attach cv',
    'resume upload',
    'cv upload',
    'resume cv',
    'resume file',
  ],
});

// Reverse index: phrase -> canonicalFieldType. Computed once at module load.
const ALIAS_INDEX = (() => {
  const idx = new Map();
  for (const [canonical, phrases] of Object.entries(FIELD_ALIASES)) {
    for (const phrase of phrases) {
      idx.set(phrase, canonical);
    }
  }
  return idx;
})();

// Token-weighted index for semantic matching.
// Each canonical field has a set of signature tokens with weights.
const TOKEN_SIGNATURES = (() => {
  const sigs = {};
  for (const [canonical, phrases] of Object.entries(FIELD_ALIASES)) {
    const tokenCounts = new Map();
    for (const phrase of phrases) {
      for (const tok of tokenize(phrase)) {
        tokenCounts.set(tok, (tokenCounts.get(tok) || 0) + 1);
      }
    }
    sigs[canonical] = tokenCounts;
  }
  return sigs;
})();

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

const STOP_TOKENS = new Set([
  'the', 'a', 'an', 'of', 'to', 'for', 'and', 'or', 'is', 'your',
  'please', 'enter', 'provide', 'optional', 'required',
]);

/**
 * Lowercase, strip punctuation, collapse whitespace.
 * "E-Mail Address*" -> "e mail address"
 */
function normalize(input) {
  if (input === undefined || input === null) return '';
  return String(input)
    .toLowerCase()
    .replace(/[_\-/\\.:,;!?*()[\]{}"'`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize normalized text, drop stop words, drop 1-char tokens.
 */
function tokenize(input) {
  const norm = normalize(input);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_TOKENS.has(t));
}

/**
 * Collect every text signal attached to a detected field into a single
 * normalized string and a token set. Checks label, placeholder, name, id,
 * ariaLabel, and any user-supplied context.
 */
function extractSignals(field) {
  const parts = [
    field.label,
    field.placeholder,
    field.name,
    field.id,
    field.ariaLabel,
    field.context,
    field.selector && field.selector.replace(/^[#.]/, ''),
  ].filter(Boolean);

  const normalizedParts = parts.map(normalize).filter(Boolean);
  const combined = normalizedParts.join(' | ');
  const tokens = new Set();
  for (const p of parts) {
    for (const t of tokenize(p)) tokens.add(t);
  }
  return { parts: normalizedParts, combined, tokens };
}

// ---------------------------------------------------------------------------
// Matching strategies
// ---------------------------------------------------------------------------

/**
 * Strategy 1: Exact phrase match against the alias index.
 * Returns { canonical, confidence } or null.
 */
function matchExact(signals) {
  for (const part of signals.parts) {
    const hit = ALIAS_INDEX.get(part);
    if (hit) return { canonical: hit, confidence: 98 };
  }
  return null;
}

/**
 * Strategy 2: Semantic token-overlap match.
 * Scores each canonical type by Jaccard-like overlap weighted by token
 * frequency in the alias set. Returns the best scoring candidate if above
 * the confidence floor.
 */
function matchSemantic(signals) {
  if (signals.tokens.size === 0) return null;

  let best = { canonical: null, score: 0 };

  for (const [canonical, tokenCounts] of Object.entries(TOKEN_SIGNATURES)) {
    let overlap = 0;
    let totalSigWeight = 0;
    for (const [tok, count] of tokenCounts) {
      totalSigWeight += count;
      if (signals.tokens.has(tok)) overlap += count;
    }
    if (overlap === 0 || totalSigWeight === 0) continue;

    // Ratio of signature weight matched, scaled by token density in the field.
    const sigRatio = overlap / totalSigWeight;
    const fieldRatio = overlap / signals.tokens.size;
    const score = (sigRatio * 0.6 + fieldRatio * 0.4);

    if (score > best.score) best = { canonical, score };
  }

  if (!best.canonical) return null;

  // Map score (0..1) to confidence (0..90). Semantic caps at 90 so exact wins.
  const confidence = Math.round(Math.min(best.score, 1) * 90);
  if (confidence < 35) return null;
  return { canonical: best.canonical, confidence };
}

/**
 * Strategy 3: Input-type based match. Weak signal on its own but useful
 * when label/placeholder are missing or generic.
 */
function matchByInputType(field) {
  const type = (field.type || '').toLowerCase();
  switch (type) {
    case 'email':
      return { canonical: FIELD_TYPES.EMAIL, confidence: 80 };
    case 'tel':
      return { canonical: FIELD_TYPES.PHONE, confidence: 78 };
    case 'url':
      // Ambiguous - could be linkedin, portfolio, github. Low confidence.
      return { canonical: FIELD_TYPES.PORTFOLIO_URL, confidence: 45 };
    case 'file':
      // Resume is the overwhelming common case in job apps.
      return { canonical: FIELD_TYPES.RESUME_FILE, confidence: 55 };
    default:
      return null;
  }
}

/**
 * Strategy 4: Inferred from surrounding DOM context supplied in `field.context`
 * (e.g. the nearest <fieldset> legend or preceding heading). This is the same
 * machinery as semantic matching but kept as a separate stage so we can cap
 * its confidence lower.
 */
function matchInferred(field) {
  if (!field.context) return null;
  const contextSignals = extractSignals({ label: field.context });
  const exact = matchExact(contextSignals);
  if (exact) return { canonical: exact.canonical, confidence: 60 };
  const semantic = matchSemantic(contextSignals);
  if (semantic) {
    return {
      canonical: semantic.canonical,
      confidence: Math.min(semantic.confidence, 55),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Value resolution
// ---------------------------------------------------------------------------

/**
 * Given a canonical field type, pull the corresponding value from the profile.
 * Returns undefined if the profile does not carry that data.
 */
function resolveValue(canonical, profile) {
  if (!profile) return undefined;
  const loc = profile.location || {};

  switch (canonical) {
    case FIELD_TYPES.FIRST_NAME:
      return profile.firstName;
    case FIELD_TYPES.LAST_NAME:
      return profile.lastName;
    case FIELD_TYPES.FULL_NAME: {
      const first = (profile.firstName || '').trim();
      const last = (profile.lastName || '').trim();
      const joined = [first, last].filter(Boolean).join(' ');
      return joined || undefined;
    }
    case FIELD_TYPES.EMAIL:
      return profile.email;
    case FIELD_TYPES.PHONE:
      return profile.phone;
    case FIELD_TYPES.LINKEDIN_URL:
      return profile.linkedinUrl;
    case FIELD_TYPES.PORTFOLIO_URL:
      return profile.portfolioUrl;
    case FIELD_TYPES.CITY:
      return loc.city;
    case FIELD_TYPES.STATE:
      return loc.state;
    case FIELD_TYPES.COUNTRY:
      return loc.country;
    case FIELD_TYPES.ZIP:
      return loc.zip;
    case FIELD_TYPES.WORK_AUTHORIZATION:
      return profile.workAuthorization;
    case FIELD_TYPES.YEARS_EXPERIENCE:
      return profile.yearsExperience;
    case FIELD_TYPES.SALARY_EXPECTATION:
      return profile.salaryExpectation;
    case FIELD_TYPES.COVER_LETTER_TEXT:
      // The orchestrator resolves coverLetterId to text separately. We emit
      // a stable sentinel that the filler can swap in, or undefined if absent.
      return profile.coverLetterId
        ? `__COVER_LETTER__:${profile.coverLetterId}`
        : undefined;
    case FIELD_TYPES.RESUME_FILE:
      // File fields are handled by the document injector, not the value filler.
      return undefined;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Field-level orchestration
// ---------------------------------------------------------------------------

/**
 * Resolve a single detected field to a mapping entry.
 */
function matchSingleField(field, profile) {
  const signals = extractSignals(field);
  const type = (field.type || '').toLowerCase();
  const combined = signals.combined;

  // Hard rule: type=file with any resume/cv hint -> resumeFile, conf 0.
  // Confidence is 0 because the filler does not handle it; the injector does.
  if (type === 'file') {
    const looksLikeResume =
      /\b(resume|resum[eé]|cv|curriculum)\b/.test(combined) ||
      /\b(resume|cv)\b/.test((field.selector || '').toLowerCase());
    if (looksLikeResume || !combined) {
      return {
        selector: field.selector,
        fieldType: FIELD_TYPES.RESUME_FILE,
        value: null,
        confidence: 0,
        strategy: 'skip',
      };
    }
    // Non-resume file upload (e.g. portfolio PDF). Still skip, zero confidence.
    return {
      selector: field.selector,
      fieldType: FIELD_TYPES.UNKNOWN,
      value: null,
      confidence: 0,
      strategy: 'skip',
    };
  }

  // Strategy pipeline (priority order).
  const candidates = [];

  const exact = matchExact(signals);
  if (exact) candidates.push({ ...exact, strategy: 'exact' });

  const semantic = matchSemantic(signals);
  if (semantic) candidates.push({ ...semantic, strategy: 'semantic' });

  const typed = matchByInputType(field);
  if (typed) candidates.push({ ...typed, strategy: 'semantic' }); // type reports as semantic

  const inferred = matchInferred(field);
  if (inferred) candidates.push({ ...inferred, strategy: 'inferred' });

  // Pick the highest-confidence candidate.
  candidates.sort((a, b) => b.confidence - a.confidence);
  const winner = candidates[0];

  if (!winner || winner.confidence < 30) {
    return {
      selector: field.selector,
      fieldType: FIELD_TYPES.UNKNOWN,
      value: null,
      confidence: winner ? winner.confidence : 0,
      strategy: 'skip',
    };
  }

  const value = resolveValue(winner.canonical, profile);

  // If we confidently know the field type but the profile has no value for it,
  // still report the mapping so the caller can prompt the user. We downgrade
  // strategy to 'skip' only when confidence falls below threshold.
  return {
    selector: field.selector,
    fieldType: winner.canonical,
    value: value === undefined ? null : value,
    confidence: winner.confidence,
    strategy: winner.strategy,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Match a batch of detected fields against a user profile.
 *
 * @param {Array<Object>} fields - Detected form fields.
 * @param {Object} profile - User profile data.
 * @returns {Array<Object>} Mapping entries, one per input field, same order.
 */
function matchFields(fields, profile) {
  if (!Array.isArray(fields)) return [];
  const safeProfile = profile || {};
  return fields.map((f) => matchSingleField(f || {}, safeProfile));
}

// ---------------------------------------------------------------------------
// Exports
//
// Supports both ES module consumers (content scripts bundled by the extension
// build) and CommonJS-style access for Node-based unit tests.
// ---------------------------------------------------------------------------

export { matchFields, FIELD_ALIASES, FIELD_TYPES };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { matchFields, FIELD_ALIASES, FIELD_TYPES };
}
