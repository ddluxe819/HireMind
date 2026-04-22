import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import JobCard from '../components/JobCard'
import MatchRing from '../components/MatchRing'

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconRemote({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  )
}

function IconHybrid({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 4l4 4-4 4"/>
      <path d="M3 12V8a4 4 0 0 1 4-4h14"/>
      <path d="M7 20l-4-4 4-4"/>
      <path d="M21 12v4a4 4 0 0 1-4 4H3"/>
    </svg>
  )
}

function IconOnsite({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="1"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconSliders({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
      <circle cx="8" cy="6" r="2" fill={color}/>
      <circle cx="16" cy="12" r="2" fill={color}/>
      <circle cx="10" cy="18" r="2" fill={color}/>
    </svg>
  )
}

// ── WorkModeGate ───────────────────────────────────────────────────────────────

const MODE_CONFIG = {
  Remote:   { desc: 'Work from anywhere',      iconBg: '#dcfce7', color: '#16a34a', border: '#22c55e', activeBg: '#f0fdf4' },
  Hybrid:   { desc: 'Mix of home & office',    iconBg: '#ede9fe', color: '#5047e5', border: '#5047e5', activeBg: '#f0effb' },
  'On-site':{ desc: 'In-person, full time',    iconBg: '#ffedd5', color: '#ea580c', border: '#fb923c', activeBg: '#fff7ed' },
}

function WorkModeGate({ initialPrefs, accent, onStart }) {
  const [workMode, setWorkMode] = useState(initialPrefs?.workMode || null)
  const [location, setLocation] = useState(initialPrefs?.location || '')

  const needsLocation = workMode === 'Hybrid' || workMode === 'On-site'
  const canStart = workMode !== null

  const modeIcon = (key, color) => {
    if (key === 'Remote') return <IconRemote color={color} />
    if (key === 'Hybrid') return <IconHybrid color={color} />
    return <IconOnsite color={color} />
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f4f0', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c' }}>
          Discover
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8', marginTop: 2 }}>
          Personalize your job search
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 0' }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 16, color: '#0c0e1c', marginBottom: 14 }}>
          Where do you want to work?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => {
            const active = workMode === key
            const iconColor = active ? cfg.color : '#b0aeb8'
            return (
              <button
                key={key}
                onClick={() => setWorkMode(active ? null : key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                  borderRadius: 16, border: `2px solid ${active ? cfg.border : '#e0dfd8'}`,
                  background: active ? cfg.activeBg : '#fff', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.2s, background 0.2s', width: '100%',
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 13,
                  background: active ? cfg.iconBg : '#f6f5f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.2s',
                }}>
                  {modeIcon(key, iconColor)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15,
                    color: active ? cfg.color : '#0c0e1c',
                  }}>
                    {key}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8', marginTop: 1 }}>
                    {cfg.desc}
                  </div>
                </div>

                {active && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: cfg.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <IconCheck />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 16, color: '#0c0e1c', marginBottom: 4 }}>
            Your location{' '}
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: 13, color: '#9a9fa8' }}>
              {needsLocation ? '(for nearby search)' : '(optional)'}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#b0aeb8', pointerEvents: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <input
              value={location}
              placeholder="City, state or ZIP code"
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: '100%', padding: '13px 14px 13px 40px', borderRadius: 12,
                border: `1.5px solid ${needsLocation && !location ? '#fbbf24' : '#e0dfd8'}`,
                fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0c0e1c',
                background: '#fff', boxSizing: 'border-box', outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {needsLocation && location && (
            <div style={{
              marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', background: '#f0effb', borderRadius: 10,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: accent, fontWeight: 500 }}>
                Searching within 100 miles of {location}
              </span>
            </div>
          )}

          {needsLocation && !location && (
            <div style={{ marginTop: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#b45309' }}>
              Add your location to find nearby {workMode?.toLowerCase()} roles
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px 24px' }}>
        <button
          disabled={!canStart}
          onClick={() => onStart({ workMode, location, useRadius: needsLocation && Boolean(location) })}
          style={{
            width: '100%', padding: 16, borderRadius: 14, border: 'none',
            background: canStart ? accent : '#c0bfb8',
            color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15,
            boxShadow: canStart ? `0 4px 16px ${accent}44` : 'none',
            cursor: canStart ? 'pointer' : 'default', transition: 'all 0.2s',
          }}
        >
          Start Search ✦
        </button>
      </div>
    </div>
  )
}

// ── JobDetailSheet ────────────────────────────────────────────────────────────

function JobDetailSheet({ job, onClose, onQueue, onSkip, accent }) {
  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(12,14,28,0.5)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', padding: 24, maxHeight: '76%', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: '#e0dfd8', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: job.color || accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 20, fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0,
          }}>
            {job.logo || job.company[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 18, fontFamily: 'Playfair Display, Georgia, serif', color: '#0c0e1c' }}>{job.title}</div>
            <div style={{ color: '#6b6f7e', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>{job.company} · {job.location}</div>
          </div>
          <MatchRing pct={job.match ?? job.match_score ?? 0} accent={accent} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {job.work_mode && (() => {
            const modeStyles = {
              'Remote':  { bg: '#f0fdf4', color: '#16a34a' },
              'Hybrid':  { bg: '#f0effb', color: '#5047e5' },
              'On-site': { bg: '#fff7ed', color: '#ea580c' },
            }
            const s = modeStyles[job.work_mode] || { bg: '#f6f5f0', color: '#6b6f7e' }
            return <span style={{ background: s.bg, color: s.color, fontSize: 12, padding: '4px 10px', borderRadius: 20, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{job.work_mode}</span>
          })()}
          {(job.tags || []).map((t) => (
            <span key={t} style={{ background: '#f0effb', color: '#5047e5', fontSize: 12, padding: '4px 10px', borderRadius: 20, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{t}</span>
          ))}
          {(job.salary || job.salary_range) && (
            <span style={{ background: '#f0f9f8', color: '#0ea5a0', fontSize: 12, padding: '4px 10px', borderRadius: 20, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              {job.salary || job.salary_range}
            </span>
          )}
        </div>

        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#3d4050', lineHeight: 1.6, marginBottom: 20 }}>
          {job.desc || job.description}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            ['Company size', job.size || '—'],
            ['Posted', job.posted || job.posted_at || '—'],
            ['Salary', job.salary || job.salary_range || '—'],
            ['AI Match', (job.match ?? job.match_score ?? '—') + '%'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#f6f5f0', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#9a9fa8', fontFamily: 'DM Sans, sans-serif', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0c0e1c' }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { onSkip(); onClose() }}
            style={{ flex: 1, padding: 14, border: '2px solid #fecaca', borderRadius: 14, background: '#fff5f5', color: '#ef4444', fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>
            Skip
          </button>
          <button onClick={() => { onQueue(); onClose() }}
            style={{ flex: 2, padding: 14, borderRadius: 14, background: accent, color: '#fff', fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, border: 'none' }}>
            Queue Application
          </button>
        </div>
      </div>
    </div>
  )
}

function BackCard({ offset }) {
  const scale = 1 - offset * 0.04
  const ty = offset * 10
  return (
    <div style={{
      position: 'absolute', inset: 0,
      transform: `scale(${scale}) translateY(${ty}px)`,
      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      zIndex: 0,
    }}>
      <div style={{ background: '#fff', borderRadius: 24, height: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }} />
    </div>
  )
}

// ── Discover ──────────────────────────────────────────────────────────────────

export default function Discover() {
  const { jobs, loading, fetchJobs, scrapeJobs, tweaks, queueJob, discoverPrefs, setDiscoverPrefs } = useAppStore()
  const accent = tweaks.accentColor
  const [showGate, setShowGate] = useState(!discoverPrefs?.workMode)
  const [stack, setStack] = useState([])
  const [rejected, setRejected] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('hm_rejected_ids')) || []) } catch { return new Set() }
  })
  const [showDetail, setShowDetail] = useState(false)
  const [scraping, setScraping] = useState(false)

  const handleScrape = async () => {
    setScraping(true)
    await scrapeJobs()
    setScraping(false)
  }

  useEffect(() => {
    if (!showGate) fetchJobs()
  }, [showGate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setStack(jobs.map((j) => j.id).filter((id) => !rejected.has(id)))
  }, [jobs, rejected])

  const removeTop = () => setStack((s) => s.slice(1))

  const handleQueue = () => {
    const top = jobs.find((j) => j.id === stack[0])
    if (top) { queueJob(top); removeTop() }
  }

  const handleSkip = () => {
    const topId = stack[0]
    if (topId) {
      setRejected((prev) => {
        const next = new Set([...prev, topId])
        try { localStorage.setItem('hm_rejected_ids', JSON.stringify([...next].slice(-500))) } catch {}
        return next
      })
    }
    removeTop()
  }

  const handleStartSearch = (prefs) => {
    setDiscoverPrefs(prefs)
    setShowGate(false)
  }

  if (showGate) {
    return <WorkModeGate initialPrefs={discoverPrefs} accent={accent} onStart={handleStartSearch} />
  }

  const visible = stack.slice(0, 3)
  const currentJob = jobs.find((j) => j.id === stack[0])

  const workModeLabel = discoverPrefs?.workMode
  const locationLabel = discoverPrefs?.location

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f4f0' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c' }}>Discover</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>{stack.length} jobs for you</div>
        </div>

        {/* Preferences chip */}
        <button
          onClick={() => setShowGate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px',
            borderRadius: 20, border: '1.5px solid #e0dfd8', background: '#fff',
            cursor: 'pointer', flexShrink: 0,
          }}
          title="Change preferences"
        >
          <IconSliders color={accent} />
          {workModeLabel && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11, color: accent }}>
              {workModeLabel}{locationLabel ? ` · ${locationLabel.split(',')[0]}` : ''}
            </span>
          )}
        </button>

        <button
          onClick={handleScrape}
          disabled={scraping || loading}
          style={{
            padding: '7px 14px', borderRadius: 20,
            border: `1.5px solid ${scraping ? '#e0dfd8' : accent}`,
            background: '#fff', cursor: scraping || loading ? 'default' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12,
            color: scraping ? '#9a9fa8' : accent,
            transition: 'all 0.2s', flexShrink: 0,
          }}>
          {scraping ? 'Searching…' : '⟳ Real Jobs'}
        </button>
      </div>

      {/* Card stack */}
      <div style={{ flex: 1, position: 'relative', margin: '14px 20px 20px', minHeight: 0 }}>
        {loading && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <style>{`
              @keyframes hm-spin { to { transform: rotate(360deg); } }
              @keyframes hm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: `3px solid ${accent}22`,
              borderTopColor: accent,
              animation: 'hm-spin 0.9s linear infinite',
            }} />
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#b0aeb8', animation: 'hm-pulse 1.6s ease-in-out infinite' }}>
              Finding jobs for you…
            </div>
          </div>
        )}

        {!loading && stack.length === 0 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 24px' }}>
            <div style={{ fontSize: 40 }}>✦</div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 20, color: '#0c0e1c', textAlign: 'center' }}>You're all caught up!</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9a9fa8', textAlign: 'center', maxWidth: 220 }}>
              Find real listings or generate more personalized suggestions.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 260 }}>
              <button onClick={handleScrape} disabled={scraping}
                style={{ padding: '13px 24px', borderRadius: 14, border: 'none', background: scraping ? '#c0bfb8' : accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: scraping ? 'default' : 'pointer' }}>
                {scraping ? 'Searching…' : '⟳ Find Real Jobs'}
              </button>
              <button onClick={fetchJobs}
                style={{ padding: '13px 24px', borderRadius: 14, border: `1.5px solid ${accent}`, background: '#fff', color: accent, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ✦ Generate More
              </button>
            </div>
          </div>
        )}

        {!loading && stack.length > 0 && (
          <>
            {visible.slice(1).map((id, i) => (
              <BackCard key={id} offset={i + 1} />
            ))}

            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              {currentJob && <JobCard key={stack[0]} job={currentJob} onGone={removeTop} />}
            </div>

            <button
              onClick={() => setShowDetail(true)}
              style={{
                position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
                zIndex: 20, display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 22px', borderRadius: 24,
                background: accent,
                border: 'none',
                color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13,
                boxShadow: '0 4px 20px rgba(80,71,229,0.35)',
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              View Details
            </button>
          </>
        )}
      </div>

      {showDetail && currentJob && (
        <JobDetailSheet
          job={currentJob}
          accent={accent}
          onClose={() => setShowDetail(false)}
          onQueue={handleQueue}
          onSkip={handleSkip}
        />
      )}
    </div>
  )
}
