import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import StatusBadge from '../components/StatusBadge'
import { STATUS_META, PIPELINE } from '../data/sampleData'

function PipelineBar({ status }) {
  const idx = PIPELINE.indexOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
      {PIPELINE.map((s, i) => {
        const active = i <= idx
        const meta = STATUS_META[s]
        return (
          <div key={s} style={{ display: 'contents' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: active ? meta.dot : '#e0dfd8', transition: 'background 0.3s' }} />
              <span style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', color: active ? meta.color : '#c0bfb8', fontWeight: 600, whiteSpace: 'nowrap' }}>{meta.label}</span>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < idx ? '#5047e5' : '#e0dfd8', marginBottom: 14, transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ExtensionOverlay({ app, onClose, accent }) {
  const [step, setStep] = useState(0)
  const [regenerating, setRegenerating] = useState(false)
  const { profile, generateDocs, updateApplicationStatus } = useAppStore()

  const handleRegenerate = async () => {
    setRegenerating(true)
    try { await generateDocs(app) } catch {}
    setRegenerating(false)
  }

  const handleSubmit = () => {
    updateApplicationStatus(app.id, 'submitted')
    setStep(1)
  }

  const fields = [
    { label: 'Full Name',    value: profile?.name || 'Not set',          ok: Boolean(profile?.name) },
    { label: 'Email',        value: profile?.email || 'Not set',         ok: Boolean(profile?.email) },
    { label: 'Phone',        value: profile?.phone || 'Not set',         ok: Boolean(profile?.phone) },
    { label: 'Resume',       value: app.resume_variant_id ? `${(app.company || 'job').toLowerCase().replace(/\s+/g, '_')}_resume.pdf` : 'Not generated', ok: Boolean(app.resume_variant_id) },
    { label: 'Cover Letter', value: app.cover_letter_id ? 'Attached' : 'Not generated', ok: Boolean(app.cover_letter_id) },
    { label: 'LinkedIn URL', value: profile?.linkedin_url || 'Not set',  ok: Boolean(profile?.linkedin_url) },
  ]

  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(12,14,28,0.6)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '88%', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ width: 36, height: 4, background: '#e0dfd8', borderRadius: 2, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>H</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15, color: '#0c0e1c' }}>HireMind Extension</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>{app.company} · {app.title}</div>
            </div>
          </div>

          {step === 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[['Resume', app.resumeV || 'v1', '📄'], ['Cover Letter', 'AI generated', '✉️']].map(([label, val, icon]) => (
                  <div key={label} style={{ background: '#f6f5f0', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c' }}>{label}</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9a9fa8', marginBottom: 8 }}>{val}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ flex: 1, fontSize: 11, fontFamily: 'DM Sans, sans-serif', padding: '4px 0', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: accent, fontWeight: 600 }}>View</button>
                      <button style={{ flex: 1, fontSize: 11, fontFamily: 'DM Sans, sans-serif', padding: '4px 0', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#6b6f7e' }}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#0c0e1c', marginBottom: 10 }}>Form Status</div>
                {fields.map((f) => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0efe9' }}>
                    <span style={{ fontSize: 14, marginRight: 8 }}>{f.ok ? '✅' : '⚠️'}</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3d4050', flex: 1 }}>{f.label}</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: f.ok ? '#9a9fa8' : '#f59e0b', maxWidth: 120, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, paddingBottom: 24 }}>
                <button onClick={handleRegenerate} disabled={regenerating}
                  style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #e0dfd8', background: '#f6f5f0', color: '#6b6f7e', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: regenerating ? 'default' : 'pointer' }}>
                  {regenerating ? '✦ Regenerating…' : 'Regenerate'}
                </button>
                <button onClick={handleSubmit}
                  style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Submit Application →
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 20px 40px' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c', marginBottom: 8 }}>Application Submitted!</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9a9fa8', marginBottom: 24 }}>{app.title} at {app.company}</div>
              <div style={{ background: '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#22c55e', marginBottom: 4 }}>✓ Confirmation received</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b6f7e' }}>Your application record has been updated. We'll track any responses.</div>
              </div>
              <button onClick={onClose}
                style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15 }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AppRow({ app, onOpenExtension, accent }) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const { generateDocs, updateApplicationStatus } = useAppStore()

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError('')
    try {
      await generateDocs(app)
    } catch (e) {
      setGenError(e.message || 'Generation failed')
    }
    setGenerating(false)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 12px rgba(12,14,28,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded((e) => !e)}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: app.color || accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Plus Jakarta Sans, sans-serif',
          flexShrink: 0, boxShadow: `0 3px 10px ${(app.color || accent)}44`,
        }}>
          {app.logo || (app.company || '?')[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#0c0e1c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.title}</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>{app.company} · {app.date || app.created_at?.slice(0, 10)}</div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0efe9' }}>
          <PipelineBar status={app.status} />
          {(() => {
            const actions = {
              ready:        [{ label: 'Mark Submitted',  next: 'submitted' }],
              submitted:    [{ label: '🎉 Interview',    next: 'interviewing' }, { label: 'Rejected', next: 'rejected' }],
              interviewing: [{ label: 'Rejected',        next: 'rejected' }],
            }
            const btns = actions[app.status]
            if (!btns) return null
            return (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {btns.map(({ label, next }) => (
                  <button key={next}
                    onClick={() => updateApplicationStatus(app.id, next)}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 10, border: '1.5px solid #e0dfd8',
                      background: next === 'rejected' ? '#fff5f5' : '#f0fdf4',
                      color: next === 'rejected' ? '#ef4444' : '#16a34a',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            )
          })()}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1, background: '#f6f5f0', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', color: '#9a9fa8', marginBottom: 2 }}>Resume</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: accent }}>
                {app.resumeV || (app.resume_variant_id ? app.resume_variant_id.slice(0, 6) + '…' : '—')}
              </div>
            </div>
            <div style={{ flex: 1, background: '#f6f5f0', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', color: '#9a9fa8', marginBottom: 2 }}>Match</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#0ea5a0' }}>
                {app.match != null ? app.match + '%' : '—'}
              </div>
            </div>
          </div>
          {app.status === 'queued' && !app.resume_variant_id && (
            <>
              <button onClick={handleGenerate} disabled={generating}
                style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: 'none', background: generating ? '#c0bfb8' : accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, cursor: generating ? 'default' : 'pointer' }}>
                {generating ? '✦ Generating docs…' : '✦ Generate Docs'}
              </button>
              {genError && (
                <div style={{ marginTop: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#ef4444' }}>{genError}</div>
              )}
            </>
          )}
          {(app.status === 'ready' || app.resume_variant_id) && (
            <button onClick={() => onOpenExtension(app)}
              style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 12, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in Chrome Extension
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const FILTERS = [
  ['all', 'All'],
  ['queued', 'Queued'],
  ['submitted', 'Submitted'],
  ['interviewing', 'Interview'],
]

export default function Log() {
  const { applications, fetchApplications, tweaks } = useAppStore()
  const accent = tweaks.accentColor
  const [filter, setFilter] = useState('all')
  const [extApp, setExtApp] = useState(null)

  useEffect(() => { fetchApplications() }, [])

  const counts = {
    all: applications.length,
    queued: applications.filter((a) => a.status === 'queued' || a.status === 'ready').length,
    submitted: applications.filter((a) => a.status === 'submitted').length,
    interviewing: applications.filter((a) => a.status === 'interviewing').length,
  }

  const filtered = filter === 'all'
    ? applications
    : filter === 'queued'
      ? applications.filter((a) => a.status === 'queued' || a.status === 'ready')
      : applications.filter((a) => a.status === filter)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f4f0', position: 'relative' }}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c', marginBottom: 2 }}>Applications</div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8', marginBottom: 14 }}>
          {counts.all} total · {counts.submitted} submitted
        </div>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
          {FILTERS.map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: filter === key ? accent : '#fff',
                color: filter === key ? '#fff' : '#6b6f7e',
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 12,
                whiteSpace: 'nowrap',
                boxShadow: filter === key ? `0 2px 10px ${accent}4d` : 'none',
                transition: 'all 0.2s',
              }}>
              {label} ({counts[key] ?? filtered.length})
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9a9fa8', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>No applications here yet.</div>
          : filtered.map((app) => <AppRow key={app.id} app={app} accent={accent} onOpenExtension={setExtApp} />)
        }
      </div>

      {extApp && <ExtensionOverlay app={extApp} accent={accent} onClose={() => setExtApp(null)} />}
    </div>
  )
}
