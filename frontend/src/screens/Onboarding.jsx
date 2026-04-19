import { useState } from 'react'

const STEPS = [
  { title: 'Welcome to HireMind', sub: 'Set up your profile in under 2 minutes.' },
  { title: 'Your experience', sub: 'Help us match you with the right roles.' },
  { title: 'Your preferences', sub: 'What kind of work excites you?' },
  { title: 'Upload your resume', sub: "We'll generate tailored versions per job." },
]

const SKILL_OPTS = ['Product Design', 'UX Research', 'Design Systems', 'Figma', 'Prototyping', 'Frontend', 'Motion', 'Brand']
const INDUSTRY_OPTS = ['Fintech', 'SaaS', 'Consumer', 'Dev Tools', 'Healthcare', 'AI/ML', 'E-commerce', 'Media']

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ name: '', title: '', location: '', experience: '', skills: [], industries: [], salary: '' })

  const toggle = (field, val) =>
    setForm((f) => ({ ...f, [field]: f[field].includes(val) ? f[field].filter((x) => x !== val) : [...f[field], val] }))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f4f0', overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 0' }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? '#5047e5' : '#e0dfd8', transition: 'background 0.4s' }} />
          ))}
        </div>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#5047e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>H</span>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 19, color: '#0c0e1c', letterSpacing: '-0.5px' }}>
            Hire<span style={{ color: '#5047e5' }}>Mind</span>
          </span>
        </div>

        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 24, color: '#0c0e1c', marginBottom: 6, lineHeight: 1.2 }}>
          {STEPS[step].title}
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9a9fa8', marginBottom: 24 }}>
          {STEPS[step].sub}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[['Full Name', 'name', 'Alex Johnson'], ['Job Title', 'title', 'Product Designer'], ['Location', 'location', 'San Francisco, CA']].map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 6 }}>{label}</div>
                <input
                  value={form[key]}
                  placeholder={ph}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #e0dfd8', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0c0e1c', background: '#fff' }}
                />
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Years of Experience</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['0–2 years', '3–5 years', '6–10 years', '10+ years'].map((v) => (
                  <button key={v} onClick={() => setForm((f) => ({ ...f, experience: v }))}
                    style={{ padding: 13, borderRadius: 12, border: `2px solid ${form.experience === v ? '#5047e5' : '#e0dfd8'}`, background: form.experience === v ? '#f0effb' : '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, color: form.experience === v ? '#5047e5' : '#6b6f7e' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Core Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SKILL_OPTS.map((s) => (
                  <button key={s} onClick={() => toggle('skills', s)}
                    style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${form.skills.includes(s) ? '#5047e5' : '#e0dfd8'}`, background: form.skills.includes(s) ? '#f0effb' : '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: 13, color: form.skills.includes(s) ? '#5047e5' : '#6b6f7e' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Industries you love</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INDUSTRY_OPTS.map((s) => (
                  <button key={s} onClick={() => toggle('industries', s)}
                    style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${form.industries.includes(s) ? '#5047e5' : '#e0dfd8'}`, background: form.industries.includes(s) ? '#f0effb' : '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: 13, color: form.industries.includes(s) ? '#5047e5' : '#6b6f7e' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, color: '#0c0e1c', marginBottom: 8 }}>Salary expectation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['$80–120K', '$120–160K', '$160–200K', '$200K+'].map((v) => (
                  <button key={v} onClick={() => setForm((f) => ({ ...f, salary: v }))}
                    style={{ padding: 13, borderRadius: 12, border: `2px solid ${form.salary === v ? '#5047e5' : '#e0dfd8'}`, background: form.salary === v ? '#f0effb' : '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, color: form.salary === v ? '#5047e5' : '#6b6f7e' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '2px dashed #e0dfd8', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15, color: '#0c0e1c', marginBottom: 4 }}>Drop your resume here</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8', marginBottom: 12 }}>PDF or DOCX · up to 10MB</div>
              <button style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: '#5047e5', color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13 }}>
                Choose File
              </button>
            </div>
            <div style={{ background: '#f0effb', borderRadius: 14, padding: 16 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#5047e5', marginBottom: 6 }}>✦ What HireMind does with it</div>
              <ul style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6f7e', paddingLeft: 16, margin: 0, lineHeight: 2.1 }}>
                <li>Generates job-specific resume variants</li>
                <li>Tailors cover letters per application</li>
                <li>Maps your skills to job requirements</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px 24px', display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)}
            style={{ padding: '14px 20px', borderRadius: 14, border: '1.5px solid #e0dfd8', background: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 14, color: '#6b6f7e' }}>
            Back
          </button>
        )}
        <button
          onClick={() => step < STEPS.length - 1 ? setStep((s) => s + 1) : onComplete()}
          style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#5047e5', color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15, boxShadow: '0 4px 16px rgba(80,71,229,0.35)' }}>
          {step < STEPS.length - 1 ? 'Continue →' : 'Start Discovering Jobs ✦'}
        </button>
      </div>
    </div>
  )
}
