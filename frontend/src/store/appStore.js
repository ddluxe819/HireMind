import { create } from 'zustand'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'
const TWEAKS_KEY = 'hm_tweaks'
const SCREEN_KEY = 'hm_screen'
const PROFILE_KEY = 'hm_profile'
const SEEN_JOBS_KEY = 'hm_seen_jobs'
const DISCOVER_PREFS_KEY = 'hm_discover_prefs'

const DEFAULT_DISCOVER_PREFS = { workMode: null, location: '', useRadius: false }

function loadDiscoverPrefs() {
  try { return JSON.parse(localStorage.getItem(DISCOVER_PREFS_KEY)) || DEFAULT_DISCOVER_PREFS } catch { return DEFAULT_DISCOVER_PREFS }
}

function loadSeenJobs() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_JOBS_KEY)) || []) } catch { return new Set() }
}

function saveSeenJobs(seen) {
  try {
    // Keep last 500 to avoid unbounded growth
    const arr = [...seen].slice(-500)
    localStorage.setItem(SEEN_JOBS_KEY, JSON.stringify(arr))
  } catch {}
}

const DEFAULT_TWEAKS = { accentColor: '#5047e5', showMatchScore: true }

function loadTweaks() {
  try { return JSON.parse(localStorage.getItem(TWEAKS_KEY)) || DEFAULT_TWEAKS } catch { return DEFAULT_TWEAKS }
}

function loadScreen() {
  return localStorage.getItem(SCREEN_KEY) || 'onboarding'
}

function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null } catch { return null }
}

export const useAppStore = create((set, get) => ({
  screen: loadScreen(),
  tweaks: loadTweaks(),
  profile: loadProfile(),
  seenJobs: loadSeenJobs(),
  discoverPrefs: loadDiscoverPrefs(),
  jobs: [],
  applications: [],
  loading: false,

  setScreen: (screen) => {
    localStorage.setItem(SCREEN_KEY, screen)
    set({ screen })
  },

  setProfile: (profile) => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) } catch {}
    set({ profile })
  },

  setDiscoverPrefs: (prefs) => {
    try { localStorage.setItem(DISCOVER_PREFS_KEY, JSON.stringify(prefs)) } catch {}
    set({ discoverPrefs: prefs })
  },

  updateTweak: (key, val) => {
    const tweaks = { ...get().tweaks, [key]: val }
    try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks)) } catch {}
    set({ tweaks })
  },

  fetchJobs: async () => {
    set({ loading: true })
    try {
      const profile = get().profile
      const seenJobs = get().seenJobs
      const discoverPrefs = get().discoverPrefs
      let url = `${API}/jobs/discover`
      const params = new URLSearchParams()

      // Always send title so the backend triggers Claude generation.
      // Fall back to 'Professional' when there's no profile title yet.
      const effectiveTitle = profile?.title || 'Professional'
      params.set('title', effectiveTitle)
      if (profile?.skills?.length) params.set('skills', profile.skills.join(','))
      if (profile?.experience) params.set('experience', profile.experience)

      // discoverPrefs override profile location and work_mode when set
      const location = discoverPrefs?.location || profile?.location
      const workMode = discoverPrefs?.workMode || profile?.work_mode
      if (location) params.set('location', location)
      if (workMode) params.set('work_mode', workMode)
      if (discoverPrefs?.useRadius && location) params.set('radius', '100')

      // Pass seen companies so Claude avoids repeating them
      if (seenJobs.size > 0) {
        const seenArr = [...seenJobs]
        const companies = [...new Set(seenArr.map((k) => k.split('::')[0]))].slice(-20)
        if (companies.length) params.set('exclude', companies.join(','))
      }

      const qs = params.toString()
      if (qs) url += '?' + qs
      const res = await fetch(url)
      if (!res.ok) throw new Error('API unavailable')
      const jobs = await res.json()
      const fresh = jobs.filter((j) => !seenJobs.has(`${j.company}::${j.title}`))
      const result = fresh.length ? fresh : jobs
      const updated = new Set(seenJobs)
      result.forEach((j) => updated.add(`${j.company}::${j.title}`))
      saveSeenJobs(updated)
      set({ jobs: result, seenJobs: updated })
    } catch {
      set({ jobs: [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchApplications: async () => {
    try {
      const res = await fetch(`${API}/applications/`)
      if (!res.ok) throw new Error('API unavailable')
      const applications = await res.json()
      set({ applications })
    } catch {
      set({ applications: [] })
    }
  },

  queueJob: async (job) => {
    try {
      const res = await fetch(`${API}/applications/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          company: job.company,
          title: job.title,
          apply_url: job.apply_url || '',
          resume_base_id: get().profile?.resume_base_id || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      const application = await res.json()
      set((s) => ({
        applications: [application, ...s.applications],
        jobs: s.jobs.filter((j) => j.id !== job.id),
      }))
    } catch {
      const localApp = {
        id: 'local-' + job.id,
        company: job.company,
        title: job.title,
        logo: job.logo || job.company[0],
        color: job.color || '#5047e5',
        status: 'queued',
        date: 'Just now',
        match: job.match || 0,
        resumeV: 'generating…',
        hasExt: true,
        apply_url: job.apply_url || '',
      }
      set((s) => ({
        applications: [localApp, ...s.applications],
        jobs: s.jobs.filter((j) => j.id !== job.id),
      }))
    }
  },

  generateDocs: async (app) => {
    const profile = get().profile
    const resumeBaseId = app.resume_base_id || profile?.resume_base_id
    if (!resumeBaseId) throw new Error('No resume on file. Upload one in onboarding first.')

    let jobDescription = ''
    try {
      const jobRes = await fetch(`${API}/jobs/${app.job_id}`)
      if (jobRes.ok) {
        const job = await jobRes.json()
        jobDescription = job.description || ''
      }
    } catch {}

    const res = await fetch(`${API}/documents/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: app.job_id,
        company: app.company,
        title: app.title,
        job_description: jobDescription,
        resume_base_id: resumeBaseId,
      }),
    })
    if (!res.ok) throw new Error('Document generation failed')
    const result = await res.json()

    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === app.id
          ? { ...a, status: 'ready', resume_variant_id: result.resume_variant_id, cover_letter_id: result.cover_letter_id }
          : a
      ),
    }))
    return result
  },

  scrapeJobs: async () => {
    const profile = get().profile
    if (!profile?.title) return
    set({ loading: true })
    try {
      const discoverPrefs = get().discoverPrefs
      const location = discoverPrefs?.location || profile.location || ''
      const res = await fetch(`${API}/jobs/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: profile.title,
          location,
          limit: 50,
        }),
      })
      if (!res.ok) throw new Error('Scrape failed')
      const jobs = await res.json()
      if (jobs.length) {
        const seenJobs = get().seenJobs
        const fresh = jobs.filter((j) => !seenJobs.has(`${j.company}::${j.title}`))
        const result = fresh.length ? fresh : jobs
        const updated = new Set(seenJobs)
        result.forEach((j) => updated.add(`${j.company}::${j.title}`))
        saveSeenJobs(updated)
        set({ jobs: result, seenJobs: updated })
      }
    } catch {}
    set({ loading: false })
  },

  fetchApplicationFields: async (appId) => {
    const res = await fetch(`${API}/applications/${appId}/fields`)
    if (!res.ok) throw new Error('Could not load application fields')
    return res.json()
  },

  saveApplicationFields: async (appId, { fields, customAnswers }) => {
    const body = {}
    if (fields !== undefined) body.fields = fields
    if (customAnswers !== undefined) body.custom_answers = customAnswers
    const res = await fetch(`${API}/applications/${appId}/fields`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Save failed')
    return res.json()
  },

  updateApplicationStatus: async (appId, status) => {
    try {
      await fetch(`${API}/applications/${appId}/status?status=${status}`, { method: 'PATCH' })
    } catch {}
    set((s) => ({
      applications: s.applications.map((a) => (a.id === appId ? { ...a, status } : a)),
    }))
  },

  openInChrome: (app) => {
    if (app.apply_url) {
      window.open(`${app.apply_url}#hiremind-app-id=${app.id}`, '_blank')
    }
    get().updateApplicationStatus(app.id, 'opened')
  },

  saveProfile: async (formData) => {
    const existing = get().profile
    try {
      const isUpdate = Boolean(existing?.profile_id)
      const url = isUpdate
        ? `${API}/profiles/${existing.profile_id}`
        : `${API}/profiles/`
      const res = await fetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || undefined,
          title: formData.title || undefined,
          location: formData.location || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          linkedin_url: formData.linkedin_url || undefined,
          github_url: formData.github_url || undefined,
          portfolio_url: formData.portfolio_url || undefined,
          experience: formData.experience || undefined,
          years_experience: formData.experience || undefined,
          skills: formData.skills,
          industries: formData.industries,
          salary: formData.salary || undefined,
          work_authorized: typeof formData.work_authorized === 'boolean' ? formData.work_authorized : undefined,
          requires_sponsorship: typeof formData.requires_sponsorship === 'boolean' ? formData.requires_sponsorship : undefined,
          work_mode: formData.work_mode || undefined,
          resume_base_id: formData.resume_base_id || undefined,
        }),
      })
      if (!res.ok) throw new Error('Profile save failed')
      const saved = await res.json()
      const merged = { ...formData, profile_id: saved.id }
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(merged)) } catch {}
      set({ profile: merged })
    } catch {
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(formData)) } catch {}
      set({ profile: formData })
    }
  },

  resetOnboarding: () => {
    localStorage.clear()
    set({ screen: 'onboarding', tweaks: DEFAULT_TWEAKS, profile: null, jobs: [], applications: [] })
  },
}))
