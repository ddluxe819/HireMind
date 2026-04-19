// detector.js — HireMind content script
// Detects which job application platform the current page belongs to and
// returns structured metadata. Pure DOM inspection — no network calls.

export const PLATFORMS = {
  greenhouse: {
    hostPatterns: [
      /(^|\.)greenhouse\.io$/i,
      /(^|\.)boards\.greenhouse\.io$/i,
    ],
    // Greenhouse embeds boards on customer domains via a `boards.greenhouse.io`
    // iframe too; we also match URL paths that look like `/jobs/<id>` hosted
    // under a `/boards/<company>` or `/<company>` segment.
    urlPatterns: [
      /boards\.greenhouse\.io\/[^/]+\/jobs\/(\d+)/i,
      /greenhouse\.io\/embed\/job_app\?.*for=([^&]+)/i,
    ],
  },
  lever: {
    hostPatterns: [
      /(^|\.)jobs\.lever\.co$/i,
      /(^|\.)lever\.co$/i,
    ],
    urlPatterns: [
      // Lever apply URLs: jobs.lever.co/<company>/<uuid>/apply
      /jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{8,})(?:\/apply)?/i,
    ],
  },
  workday: {
    hostPatterns: [
      /(^|\.)myworkdayjobs\.com$/i,
      /(^|\.)wd1\.myworkday\.com$/i,
      /(^|\.)wd3\.myworkday\.com$/i,
      /(^|\.)wd5\.myworkday\.com$/i,
      /wd\d+\.myworkdayjobs\.com$/i,
    ],
    urlPatterns: [
      // Workday URLs carry the company as the first subdomain and a job id
      // in the trailing path segment after a locale-like slug.
      /([^.]+)\.wd\d+\.myworkdayjobs\.com\/.+\/job\/[^/]+\/([^/?#]+)/i,
      /([^.]+)\.myworkdayjobs\.com\/.+\/job\/[^/]+\/([^/?#]+)/i,
    ],
  },
  ashby: {
    hostPatterns: [
      /(^|\.)jobs\.ashbyhq\.com$/i,
      /(^|\.)ashbyhq\.com$/i,
    ],
    urlPatterns: [
      // Ashby: jobs.ashbyhq.com/<company>/<uuid>[/application]
      /jobs\.ashbyhq\.com\/([^/]+)\/([0-9a-f-]{8,})/i,
    ],
  },
};

/**
 * Wait for a matching element to appear in the DOM.
 * Workday hydrates its form fields after an initial SPA render, so selectors
 * on first paint return null. We poll via MutationObserver and fall back on a
 * timeout so we never block content-script startup indefinitely.
 */
export function waitForElement(selector, timeout = 3000, root = document) {
  return new Promise((resolve) => {
    const immediate = root.querySelector(selector);
    if (immediate) {
      resolve(immediate);
      return;
    }

    let timer = null;
    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        observer.disconnect();
        if (timer) clearTimeout(timer);
        resolve(el);
      }
    });

    observer.observe(root === document ? document.documentElement : root, {
      childList: true,
      subtree: true,
    });

    timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// --- Small utilities -------------------------------------------------------

function hostMatches(host, patterns) {
  return patterns.some((re) => re.test(host));
}

function firstMatch(haystack, patterns) {
  for (const re of patterns) {
    const m = haystack.match(re);
    if (m) return m;
  }
  return null;
}

function textOf(el) {
  if (!el) return null;
  const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
  return t || null;
}

function metaContent(name) {
  const el =
    document.querySelector(`meta[property="${name}"]`) ||
    document.querySelector(`meta[name="${name}"]`);
  return el ? el.getAttribute('content') : null;
}

function jsonLdJobPosting() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent || 'null');
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (!node) continue;
        const type = node['@type'];
        const isJob = type === 'JobPosting' ||
          (Array.isArray(type) && type.includes('JobPosting'));
        if (isJob) return node;
      }
    } catch {
      // Malformed JSON-LD is common; ignore and keep looking.
    }
  }
  return null;
}

// --- Per-platform detectors ------------------------------------------------

function detectGreenhouse(url) {
  const host = url.hostname;
  const hostHit = hostMatches(host, PLATFORMS.greenhouse.hostPatterns);
  const urlHit = firstMatch(url.href, PLATFORMS.greenhouse.urlPatterns);

  // Greenhouse embedded iframes on customer sites expose `#grnhse_iframe` or
  // a `div#grnhse_app` mount point. The apply form itself uses `#application`.
  const hasEmbed = !!document.querySelector(
    '#grnhse_iframe, #grnhse_app, iframe[src*="greenhouse.io"]'
  );
  const hasForm = !!document.querySelector(
    'form#application_form, form[action*="greenhouse"], #application[data-mapped]'
  );

  if (!hostHit && !hasEmbed && !urlHit) return null;

  const company =
    textOf(document.querySelector('.company-name, .app-title .company')) ||
    (urlHit && urlHit[0].includes('for=') ? decodeURIComponent(urlHit[1] || '') : null) ||
    metaContent('og:site_name');

  const title =
    textOf(document.querySelector('.app-title, h1.posting-headline, h1')) ||
    metaContent('og:title');

  const jobId =
    (urlHit && /\d+/.test(urlHit[1] || '') ? urlHit[1] : null) ||
    (url.searchParams.get('gh_jid')) ||
    null;

  const isApplicationPage = hasForm || /\/apply(\b|\/|$)/i.test(url.pathname);
  let confidence = 0;
  if (hostHit) confidence += 55;
  if (urlHit) confidence += 25;
  if (hasForm) confidence += 20;
  else if (hasEmbed) confidence += 10;
  confidence = Math.min(confidence, 100);

  return {
    platform: 'greenhouse',
    confidence,
    isApplicationPage,
    jobMeta: {
      company: company || null,
      title: title || null,
      jobId: jobId || null,
      applyUrl: url.href,
    },
  };
}

function detectLever(url) {
  const host = url.hostname;
  const hostHit = hostMatches(host, PLATFORMS.lever.hostPatterns);
  const urlHit = firstMatch(url.href, PLATFORMS.lever.urlPatterns);

  if (!hostHit) return null;

  const hasForm = !!document.querySelector(
    'form[action*="lever.co"], form.application-form, [data-qa="application-form"]'
  );
  // Lever job listings use `.posting-page` without a form; the apply page adds
  // `.application-page` (or lives at `/apply`).
  const onApply =
    /\/apply\b/i.test(url.pathname) ||
    !!document.querySelector('.application-page, .application');

  const company =
    (urlHit && urlHit[1]) ||
    textOf(document.querySelector('.main-header-logo, .company-name')) ||
    metaContent('og:site_name');

  const title =
    textOf(document.querySelector('.posting-headline h2, .posting-header h2, h2')) ||
    metaContent('og:title');

  const jobId = urlHit ? urlHit[2] : null;

  let confidence = 0;
  if (hostHit) confidence += 60;
  if (urlHit) confidence += 20;
  if (hasForm) confidence += 20;
  else if (onApply) confidence += 10;
  confidence = Math.min(confidence, 100);

  return {
    platform: 'lever',
    confidence,
    isApplicationPage: hasForm || onApply,
    jobMeta: {
      company: company || null,
      title: title || null,
      jobId: jobId || null,
      applyUrl: url.href,
    },
  };
}

function detectWorkday(url) {
  const host = url.hostname;
  const hostHit = hostMatches(host, PLATFORMS.workday.hostPatterns);
  const urlHit = firstMatch(url.href, PLATFORMS.workday.urlPatterns);

  if (!hostHit) return null;

  // Workday uses data-automation-id attributes that are stable across tenants.
  // `jobPostingHeader` appears on the listing; `applyManually` / `applyAutoFill`
  // buttons render only on the apply flow entry. The actual apply form mounts
  // under `[data-automation-id="applicationPage"]` after a hydration delay.
  const header = document.querySelector('[data-automation-id="jobPostingHeader"]');
  const applyButtons = document.querySelector(
    '[data-automation-id="applyManually"], [data-automation-id="applyAutoFill"]'
  );
  const applyForm = document.querySelector(
    '[data-automation-id="applicationPage"], [data-automation-id="formField-firstName"]'
  );

  const company =
    host.split('.')[0] ||
    metaContent('og:site_name') ||
    null;

  const title =
    textOf(header) ||
    textOf(document.querySelector('h2[data-automation-id="jobPostingHeader"]')) ||
    metaContent('og:title') ||
    document.title.split(/[-|·]/)[0].trim() ||
    null;

  const jobId =
    (urlHit && urlHit[2]) ||
    (() => {
      // e.g. .../job/Location/Software-Engineer_R-12345
      const m = url.pathname.match(/_(R-?\d+|JR-?\d+|\d{4,})/i);
      return m ? m[1] : null;
    })();

  const isApplicationPage = !!applyForm || /\/apply\b/i.test(url.pathname);

  let confidence = 0;
  if (hostHit) confidence += 55;
  if (urlHit) confidence += 20;
  if (header) confidence += 10;
  if (applyButtons) confidence += 5;
  if (applyForm) confidence += 15;
  confidence = Math.min(confidence, 100);

  return {
    platform: 'workday',
    confidence,
    isApplicationPage,
    jobMeta: {
      company: company ? company.replace(/-/g, ' ') : null,
      title,
      jobId: jobId || null,
      applyUrl: url.href,
    },
  };
}

function detectAshby(url) {
  const host = url.hostname;
  const hostHit = hostMatches(host, PLATFORMS.ashby.hostPatterns);
  const urlHit = firstMatch(url.href, PLATFORMS.ashby.urlPatterns);

  if (!hostHit) return null;

  // Ashby uses `ashby-job-posting-*` class prefixes plus a `/application`
  // sub-route when the applicant is actively filling out the form.
  const hasForm = !!document.querySelector(
    'form[class*="ashby"], .ashby-application-form, [class*="_form_"] form'
  );
  const onApply =
    /\/application\/?$/i.test(url.pathname) ||
    /\/apply\/?$/i.test(url.pathname);

  const company =
    (urlHit && urlHit[1]) ||
    textOf(document.querySelector('.ashby-job-posting-brand-title, [class*="brandName"]')) ||
    metaContent('og:site_name');

  const title =
    textOf(document.querySelector('.ashby-job-posting-heading, h1')) ||
    metaContent('og:title');

  const jobId = urlHit ? urlHit[2] : null;

  let confidence = 0;
  if (hostHit) confidence += 60;
  if (urlHit) confidence += 20;
  if (hasForm) confidence += 20;
  else if (onApply) confidence += 10;
  confidence = Math.min(confidence, 100);

  return {
    platform: 'ashby',
    confidence,
    isApplicationPage: hasForm || onApply,
    jobMeta: {
      company: company || null,
      title: title || null,
      jobId: jobId || null,
      applyUrl: url.href,
    },
  };
}

function detectGeneric(url) {
  // Fallback: look for a plausible application form anywhere on the page.
  // We require either (a) a file input for a resume/CV, or (b) a form that
  // contains both an email field and a submit button — the minimum viable
  // shape of an application form. This keeps us from lighting up on every
  // newsletter signup or login screen.
  const forms = Array.from(document.querySelectorAll('form'));
  let bestForm = null;
  let bestScore = 0;

  for (const form of forms) {
    const hasFile = !!form.querySelector(
      'input[type="file"][accept*="pdf"], input[type="file"][name*="resume" i], input[type="file"][name*="cv" i], input[type="file"]'
    );
    const hasEmail = !!form.querySelector('input[type="email"], input[name*="email" i]');
    const hasName = !!form.querySelector(
      'input[name*="name" i], input[id*="name" i], input[autocomplete*="name"]'
    );
    const hasSubmit = !!form.querySelector('button[type="submit"], input[type="submit"]');
    const mentionsApply = /apply|application|resume|cv|cover/i.test(
      (form.getAttribute('action') || '') + ' ' + (form.className || '') + ' ' + (form.id || '')
    );

    let score = 0;
    if (hasFile) score += 30;
    if (hasEmail) score += 20;
    if (hasName) score += 15;
    if (hasSubmit) score += 10;
    if (mentionsApply) score += 20;

    if (score > bestScore) {
      bestScore = score;
      bestForm = form;
    }
  }

  const pageMentionsApply = /apply|application/i.test(document.title) ||
    /apply|application/i.test(url.pathname);
  if (pageMentionsApply) bestScore += 5;

  if (bestScore < 40) return null;

  const ld = jsonLdJobPosting();
  const company =
    (ld && (ld.hiringOrganization?.name || ld.hiringOrganization)) ||
    metaContent('og:site_name') ||
    url.hostname.replace(/^www\./, '').split('.')[0] ||
    null;

  const title =
    (ld && ld.title) ||
    metaContent('og:title') ||
    textOf(document.querySelector('h1')) ||
    document.title ||
    null;

  const jobId =
    (ld && (ld.identifier?.value || ld.identifier)) ||
    url.searchParams.get('jobId') ||
    url.searchParams.get('job_id') ||
    url.searchParams.get('id') ||
    null;

  return {
    platform: 'generic',
    confidence: Math.min(bestScore, 85), // cap generic at 85 — we're never fully sure
    isApplicationPage: !!bestForm,
    jobMeta: {
      company: typeof company === 'string' ? company : (company?.name || null),
      title: typeof title === 'string' ? title : null,
      jobId: typeof jobId === 'string' ? jobId : (jobId ? String(jobId) : null),
      applyUrl: url.href,
    },
  };
}

// --- Public entry point ----------------------------------------------------

/**
 * Detect the platform of the current page.
 * Runs all platform detectors, picks the highest-confidence match, and falls
 * back to the generic form detector when no vendor matches.
 */
export function detectPlatform() {
  // Support being called from inside an iframe (Greenhouse embeds). We prefer
  // the top document's URL when we have same-origin access, else our own.
  let url;
  try {
    url = new URL(
      window.top && window.top !== window && window.top.location.href
        ? window.top.location.href
        : window.location.href
    );
  } catch {
    url = new URL(window.location.href);
  }

  const candidates = [
    detectGreenhouse(url),
    detectLever(url),
    detectWorkday(url),
    detectAshby(url),
  ].filter(Boolean);

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates[0];
  }

  const generic = detectGeneric(url);
  if (generic) return generic;

  return {
    platform: null,
    confidence: 0,
    isApplicationPage: false,
    jobMeta: {
      company: null,
      title: null,
      jobId: null,
      applyUrl: url.href,
    },
  };
}
