import { create } from 'zustand'
import { SAMPLE_JOBS, SAMPLE_APPS } from '../data/sampleData'

const API = '/api'
const TWEAKS_KEY = 'hm_tweaks'
const SCREEN_KEY = 'hm_screen'
const PROFILE_KEY = 'hm_profile'

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

  updateTweak: (key, val) => {
    const tweaks = { ...get().tweaks, [key]: val }
    try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks)) } catch {}
    set({ tweaks })
  },

  fetchJobs: async () => {
    set({ loading: true })
    try {
      const profile = get().profile
      let url = `${API}/jobs/discover`
      if (profile) {
        const params = new URLSearchParams()
        if (profile.title) params.set('title', profile.title)
        if (profile.skills?.length) params.set('skills', profile.skills.join(','))
        if (profile.experience) params.set('experience', profile.experience)
        const qs = params.toString()
        if (qs) url += '?' + qs
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('API unavailable')
      const jobs = await res.json()
      set({ jobs: jobs.length ? jobs : SAMPLE_JOBS })
    } catch {
      set({ jobs: SAMPLE_JOBS })
    } finally {
      set({ loading: false })
    }
  },

  fetchApplications: async () => {
    try {
      const res = await fetch(`${API}/applications/`)
      if (!res.ok) throw new Error('API unavailable')
      const applications = await res.json()
      set({ applications: applications.length ? applications : SAMPLE_APPS })
    } catch {
      set({ applications: SAMPLE_APPS })
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

  resetOnboarding: () => {
    localStorage.clear()
    set({ screen: 'onboarding', tweaks: DEFAULT_TWEAKS, profile: null, jobs: [], applications: [] })
  },
}))
