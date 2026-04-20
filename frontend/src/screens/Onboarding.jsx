import { useState, useEffect, useRef } from 'react'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'

const FALLBACK_SKILLS = ['Product Design', 'UX Research', 'Design Systems', 'Figma', 'Prototyping', 'Frontend', 'Motion', 'Brand']
const INDUSTRY_OPTS = [
  'Fintech', 'SaaS', 'Consumer', 'Dev Tools', 'Healthcare', 'AI/ML',
  'E-commerce', 'Media', 'Cybersecurity', 'EdTech', 'Legal Tech', 'Climate Tech',
  'Real Estate', 'Supply Chain', 'Gaming', 'Social', 'Enterprise', 'Biotech',
  'Infrastructure', 'Marketplace',
]

const STEPS = [
  { title: 'Welcome to HireMind', sub: 'Set up your profile in under 2 minutes.' },
  { title: 'Upload your resume', sub: "We'll tailor your skills and job matches." },
  { title: 'Your experience', sub: 'Help us match you with the right roles.' },
  { title: 'Your preferences', sub: 'What kind of work excites you?' },
]

const accent = '#5047e5'
const pill = (active) => ({
  padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
  border: `1.5px solid ${active ? accent : '#e0dfd8'}`,
  background: active ? '#f0effb' : '#fff',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: 13,
  color: active ? accent : '#6b6f7e',
})
const gridBtn = (active) => ({
  padding: 13, borderRadius: 12, cursor: 'pointer',
  border: `2px solid ${active ? accent : '#e0dfd8'}`,
  background: active ? '#f0effb' : '#fff',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
  color: active ? accent : '#6b6f7e',
})

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', title: '', location: '', email: '', phone: '',
    linkedin_url: '', github_url: '', portfolio_url: '',
    experience: '', skills: [], industries: [], salary: '',
    work_authorized: null, requires_sponsorship: null,
    resume_base_id: null, resume_filename: null, resume_text: '',
  })
  const [uploadState, setUploadState] = useState('idle') // idle | uploading | success | error
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [suggestedSkills, setSuggestedSkills] = useState(FALLBACK_SKILLS)
  const [customInput, setCustomInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const fileInputRef = useRef(null)

  const toggle = (field, val) =>
    setForm((f) => ({ ...f, [field]: f[field].includes(val) ? f[field].filter((x) => x !== val) : [...f[field], val] }))

  const uploadFile = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) {
      setUploadState('error')
      setUploadError('Only PDF and DOCX files are supported.')
      return
    }
    setUploadState('uploading')
    setUploadError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`${API}/documents/resumes/upload`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setForm((f) => ({ ...f, resume_base_id: data.id, resume_filename: file.name, resume_text: data.content || '' }))
      setUploadState('success')
    } catch {
      setUploadState('error')
      setUploadError('Upload failed. You can continue without a resume.')
    }
  }

  // Fetch AI-suggested skills when entering step 2
  useEffect(() => {
    if (step !== 2) return
    const title = form.title
    const resumeText = form.resume_text
    if (!title && !resumeText) return
    setSkillsLoading(true)
    fetch(`${API}/documents/skills/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_title: title, resume_text: resumeText }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (data.skills?.length) setSuggestedSkills(data.skills) })
      .catch(() => {})
      .finally(() => setSkillsLoading(false))
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const addCustomSkill = () => {
    const skill = customInput.trim()
    if (!skill) return
    if (!suggestedSkills.includes(skill)) setSuggestedSkills((p) => [...p, skill])
    setForm((f) => ({ ...f, skills: f.skills.includes(skill) ? f.skills : [...f.skills, skill] }))
    setCustomInput('')
    setShowCustomInput(false)
  }

  const canAdvance = uploadState !== 'uploading'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f4f0', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? accent : '#e0dfd8', transition: 'background 0.4s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>H</span>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 19, color: '#0c0e1c', letterSpacing: '-0.5px' }}>
            Hire<span style={{ color: accent }}>Mind</span>
          </span>
        </div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 24, color: '#0c0e1c', marginBottom: 6, lineHeight: 1.2 }}>
          {STEPS[step].title}
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9a9fa8', marginBottom: 24 }}>
          {STEPS[step].sub}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>

        {/* Step 0 — Profile basics */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Full Name', 'name', 'Alex Johnson'],
              ['Job Title', 'title', 'Product Designer'],
              ['Location', 'location', 'San Francisco, CA'],
              ['Email', 'email', 'you@example.com'],
              ['Phone', 'phone', '+1 415 555 0100'],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 6 }}>{label}</div>
                <input
                  value={form[key]}
                  placeholder={ph}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #e0dfd8', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0c0e1c', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 1 — Resume upload */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              style={{ display: 'none' }}
              onChange={(e) => uploadFile(e.target.files[0])}
            />

            {uploadState === 'success' ? (
              <div style={{ background: '#f0fdf4', borderRadius: 16, padding: 20, border: '2px solid #22c55e', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>✅</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#16a34a', marginBottom: 2 }}>Resume uploaded</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6f7e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.resume_filename}</div>
                </div>
                <button
                  onClick={() => { setUploadState('idle'); setForm((f) => ({ ...f, resume_base_id: null, resume_filename: null, resume_text: '' })) }}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e0dfd8', background: '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b6f7e', cursor: 'pointer' }}
                >
                  Replace
                </button>
              </div>
            ) : (
              <div
                onClick={() => uploadState !== 'uploading' && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); uploadFile(e.dataTransfer.files[0]) }}
                style={{
                  background: isDragging ? '#f0effb' : '#fff',
                  borderRadius: 16, padding: 28,
                  border: `2px dashed ${isDragging ? accent : '#e0dfd8'}`,
                  textAlign: 'center',
                  cursor: uploadState === 'uploading' ? 'default' : 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                {uploadState === 'uploading' ? (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15, color: '#0c0e1c', marginBottom: 4 }}>Uploading…</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>Extracting your resume content</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15, color: '#0c0e1c', marginBottom: 4 }}>Drop your resume here</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8', marginBottom: 14 }}>PDF or DOCX · up to 10MB · optional</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                      style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >
                      Choose File
                    </button>
                  </>
                )}
              </div>
            )}

            {uploadState === 'error' && (
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#ef4444', padding: '10px 14px', background: '#fef2f2', borderRadius: 10 }}>
                {uploadError}
              </div>
            )}

            <div style={{ background: '#f0effb', borderRadius: 14, padding: 16 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: accent, marginBottom: 6 }}>✦ What HireMind does with it</div>
              <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6f7e', paddingLeft: 16, margin: 0, lineHeight: 2.1 }}>
                <li>Surfaces skills most relevant to your target role</li>
                <li>Tailors cover letters per application</li>
                <li>Generates job-specific resume variants</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2 — Experience & Skills */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Years of Experience</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['0–2 years', '3–5 years', '6–10 years', '10+ years'].map((v) => (
                  <button key={v} onClick={() => setForm((f) => ({ ...f, experience: v }))} style={gridBtn(form.experience === v)}>{v}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c' }}>Core Skills</div>
                {form.resume_base_id && !skillsLoading && (
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: accent, display: 'flex', alignItems: 'center', gap: 3 }}>
                    ✦ AI-matched to your resume
                  </div>
                )}
              </div>

              {skillsLoading ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[90, 70, 110, 80, 100, 75, 95, 85, 60, 105].map((w, i) => (
                    <div key={i} style={{ width: w, height: 34, borderRadius: 20, background: '#e8e7e0', opacity: 0.6 + (i % 3) * 0.13 }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {suggestedSkills.map((s) => (
                    <button key={s} onClick={() => toggle('skills', s)} style={pill(form.skills.includes(s))}>{s}</button>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                {showCustomInput ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={customInput}
                      placeholder="e.g. Accessibility"
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addCustomSkill()
                        if (e.key === 'Escape') { setShowCustomInput(false); setCustomInput('') }
                      }}
                      style={{ flex: 1, padding: '7px 12px', borderRadius: 10, border: `1.5px solid ${accent}`, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#0c0e1c', background: '#fff', outline: 'none' }}
                    />
                    <button onClick={addCustomSkill}
                      style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      Add
                    </button>
                    <button onClick={() => { setShowCustomInput(false); setCustomInput('') }}
                      style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid #e0dfd8', background: '#fff', color: '#6b6f7e', fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowCustomInput(true)}
                    style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px dashed #c0bfb8', background: 'transparent', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: 13, color: '#9a9fa8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add a skill
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Preferences */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Industries you love</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INDUSTRY_OPTS.map((s) => (
                  <button key={s} onClick={() => toggle('industries', s)} style={pill(form.industries.includes(s))}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Salary expectation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['$80–120K', '$120–160K', '$160–200K', '$200K+'].map((v) => (
                  <button key={v} onClick={() => setForm((f) => ({ ...f, salary: v }))} style={gridBtn(form.salary === v)}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>LinkedIn URL <span style={{ color: '#9a9fa8', fontWeight: 400 }}>(optional)</span></div>
              <input
                value={form.linkedin_url || ''}
                placeholder="linkedin.com/in/yourname"
                onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #e0dfd8', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0c0e1c', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>GitHub URL <span style={{ color: '#9a9fa8', fontWeight: 400 }}>(optional)</span></div>
              <input
                value={form.github_url || ''}
                placeholder="github.com/yourname"
                onChange={(e) => setForm((f) => ({ ...f, github_url: e.target.value }))}
                style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #e0dfd8', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0c0e1c', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Portfolio / Website <span style={{ color: '#9a9fa8', fontWeight: 400 }}>(optional)</span></div>
              <input
                value={form.portfolio_url || ''}
                placeholder="yourname.com"
                onChange={(e) => setForm((f) => ({ ...f, portfolio_url: e.target.value }))}
                style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #e0dfd8', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0c0e1c', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Authorized to work in your target country?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button type="button" onClick={() => setForm((f) => ({ ...f, work_authorized: true }))} style={gridBtn(form.work_authorized === true)}>Yes</button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, work_authorized: false }))} style={gridBtn(form.work_authorized === false)}>No</button>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Do you require sponsorship?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button type="button" onClick={() => setForm((f) => ({ ...f, requires_sponsorship: true }))} style={gridBtn(form.requires_sponsorship === true)}>Yes</button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, requires_sponsorship: false }))} style={gridBtn(form.requires_sponsorship === false)}>No</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div style={{ padding: '16px 20px 24px', display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{ padding: '14px 20px', borderRadius: 14, border: '1.5px solid #e0dfd8', background: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 14, color: '#6b6f7e', cursor: 'pointer' }}
          >
            Back
          </button>
        )}
        <button
          disabled={!canAdvance}
          onClick={() => step < STEPS.length - 1 ? setStep((s) => s + 1) : onComplete(form)}
          style={{
            flex: 1, padding: 14, borderRadius: 14, border: 'none',
            background: canAdvance ? accent : '#c0bfb8',
            color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15,
            boxShadow: canAdvance ? '0 4px 16px rgba(80,71,229,0.35)' : 'none',
            cursor: canAdvance ? 'pointer' : 'default',
          }}
        >
          {uploadState === 'uploading' ? 'Uploading…' : step < STEPS.length - 1 ? 'Continue →' : 'Start Discovering Jobs ✦'}
        </button>
      </div>
    </div>
  )
}
