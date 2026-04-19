import { useState } from 'react'
import { useAppStore } from '../store/appStore'

const RESUME_SECTIONS = [
  { id: 'header',  label: 'Header',            content: 'Alex Johnson\nProduct Designer · alex@email.com · San Francisco, CA\nlinkedin.com/in/alexj · alexjohnson.design' },
  { id: 'summary', label: 'Summary',           content: 'Strategic product designer with 7+ years crafting human-centered digital experiences. Specialized in 0→1 product development, design systems, and cross-functional collaboration at high-growth startups.' },
  { id: 'exp1',    label: 'Experience · Stripe', content: 'Senior Product Designer, 2022–Present\nLed redesign of Dashboard onboarding, reducing time-to-first-charge by 34%. Owned the Billing product surface across 3 engineering teams.' },
  { id: 'exp2',    label: 'Experience · Airbnb', content: 'Product Designer, 2019–2022\nDesigned new search & filters experience for 100M+ users. Built and maintained the core Figma component library.' },
  { id: 'skills',  label: 'Skills',            content: 'Figma · Prototyping · Design Systems · User Research · Usability Testing · HTML/CSS · React (basics) · Framer' },
]

const CL_TEMPLATE = `Dear Hiring Manager,

I'm writing to express my strong interest in the Product Designer role at Stripe. With 7+ years designing at the intersection of complexity and clarity, I've developed a deep appreciation for the precise, developer-first thinking that defines Stripe's work.

At Stripe, I led the redesign of our onboarding experience — reducing time-to-first-charge by 34% — by combining rigorous data analysis with scrappy prototype testing.

I'd love to talk more about how I can contribute to your team.

Best,
Alex Johnson`

export default function Documents() {
  const { tweaks } = useAppStore()
  const accent = tweaks.accentColor
  const [tab, setTab] = useState('resume')
  const [sections, setSections] = useState(RESUME_SECTIONS)
  const [editingId, setEditingId] = useState(null)
  const [aiLoading, setAiLoading] = useState(null)
  const [cl, setCl] = useState(CL_TEMPLATE)

  const simulateAi = (id) => {
    setAiLoading(id)
    setTimeout(() => {
      setSections((ss) => ss.map((s) => s.id === id ? { ...s, content: s.content + '\n\n✦ Tailored for Stripe Product Designer role.' } : s))
      setAiLoading(null)
    }, 1400)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f4f0' }}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c', marginBottom: 14 }}>Documents</div>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, boxShadow: '0 2px 10px rgba(12,14,28,0.06)' }}>
          {['resume', 'coverletter'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', background: tab === t ? accent : 'transparent', color: tab === t ? '#fff' : '#9a9fa8', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, transition: 'all 0.2s' }}>
              {t === 'resume' ? 'Resume' : 'Cover Letter'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ background: '#f0effb', color: accent, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>
            {tab === 'resume' ? 'Base Resume v3' : 'Stripe CL · AI Generated'}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#c0bfb8' }}>Updated 2h ago</span>
        </div>

        {tab === 'resume' ? (
          sections.map((sec) => (
            <div key={sec.id} style={{ background: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(12,14,28,0.05)' }}>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0efe9' }}>
                <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#0c0e1c' }}>{sec.label}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => simulateAi(sec.id)} disabled={!!aiLoading}
                    style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: '#f0effb', color: accent, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11 }}>
                    {aiLoading === sec.id ? '✦ Rewriting…' : '✦ AI Rewrite'}
                  </button>
                  <button onClick={() => setEditingId(editingId === sec.id ? null : sec.id)}
                    style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: '#f6f5f0', color: '#6b6f7e', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11 }}>
                    {editingId === sec.id ? 'Done' : 'Edit'}
                  </button>
                </div>
              </div>
              {editingId === sec.id ? (
                <textarea
                  value={sec.content}
                  onChange={(e) => setSections((ss) => ss.map((s) => s.id === sec.id ? { ...s, content: e.target.value } : s))}
                  style={{ width: '100%', padding: '12px 14px', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3d4050', lineHeight: 1.6, resize: 'vertical', minHeight: 80, background: '#fafaf8' }}
                />
              ) : (
                <div style={{ padding: '12px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3d4050', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {sec.content}
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 2px 10px rgba(12,14,28,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                onClick={() => { setAiLoading('cl'); setTimeout(() => setAiLoading(null), 1400) }}
                style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#f0effb', color: accent, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 12 }}>
                {aiLoading === 'cl' ? '✦ Regenerating…' : '✦ Regenerate'}
              </button>
            </div>
            <textarea
              value={cl}
              onChange={(e) => setCl(e.target.value)}
              style={{ width: '100%', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3d4050', lineHeight: 1.9, resize: 'none', height: 320, background: 'transparent' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
