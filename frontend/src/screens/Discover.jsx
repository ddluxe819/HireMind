import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import JobCard from '../components/JobCard'
import MatchRing from '../components/MatchRing'

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

export default function Discover() {
  const { jobs, loading, fetchJobs, scrapeJobs, tweaks, queueJob } = useAppStore()
  const accent = tweaks.accentColor
  const [stack, setStack] = useState([])
  const [rejected, setRejected] = useState(new Set())
  const [showDetail, setShowDetail] = useState(false)
  const [scraping, setScraping] = useState(false)

  const handleScrape = async () => {
    setScraping(true)
    await scrapeJobs()
    setScraping(false)
  }

  useEffect(() => { fetchJobs() }, [])
  useEffect(() => {
    setStack(jobs.map((j) => j.id).filter((id) => !rejected.has(id)))
  }, [jobs])

  const removeTop = () => setStack((s) => s.slice(1))

  const handleQueue = () => {
    const top = jobs.find((j) => j.id === stack[0])
    if (top) { queueJob(top); removeTop() }
  }

  const handleSkip = () => {
    const topId = stack[0]
    if (topId) setRejected((prev) => new Set([...prev, topId]))
    removeTop()
  }

  const visible = stack.slice(0, 3)
  const currentJob = jobs.find((j) => j.id === stack[0])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f4f0' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c' }}>Discover</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>{stack.length} jobs for you</div>
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping || loading}
          style={{
            padding: '7px 14px', borderRadius: 20,
            border: `1.5px solid ${scraping ? '#e0dfd8' : accent}`,
            background: '#fff', cursor: scraping || loading ? 'default' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12,
            color: scraping ? '#9a9fa8' : accent,
            transition: 'all 0.2s',
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
            {/* Back cards */}
            {visible.slice(1).map((id, i) => (
              <BackCard key={id} offset={i + 1} />
            ))}

            {/* Top draggable card */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              {currentJob && <JobCard key={stack[0]} job={currentJob} onGone={removeTop} />}
            </div>

            {/* View Details button overlaid on card */}
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
