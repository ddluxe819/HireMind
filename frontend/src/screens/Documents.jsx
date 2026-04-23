import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import ResumePreviewModal from '../components/ResumePreviewModal'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'

export default function Documents() {
  const { tweaks, profile, applications, fetchApplications } = useAppStore()
  const accent = tweaks.accentColor

  const [tab, setTab] = useState('resume')
  const [previewHtml, setPreviewHtml] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [localEdits, setLocalEdits] = useState({})
  const [loadedDocs, setLoadedDocs] = useState({})
  const [loading, setLoading] = useState({})
  const [saving, setSaving] = useState(null)
  const [baseContent, setBaseContent] = useState(profile?.resume_text || '')
  const [editingBase, setEditingBase] = useState(false)

  useEffect(() => {
    if (!applications.length) fetchApplications()
  }, [])

  useEffect(() => {
    setBaseContent(profile?.resume_text || '')
  }, [profile?.resume_text])

  const downloadDoc = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const appsWithVariants = applications.filter((a) => a.resume_variant_id)
  const appsWithCoverLetters = applications.filter((a) => a.cover_letter_id)

  const [textDocs, setTextDocs] = useState({})
  const [showingText, setShowingText] = useState({})

  const loadDoc = async (type, id) => {
    if (loadedDocs[id] !== undefined) return
    setLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const url = type === 'variant'
        ? `${API}/documents/variants/${id}`
        : `${API}/documents/cover-letters/${id}`
      const res = await fetch(url)
      const data = await res.json()
      setLoadedDocs((prev) => ({ ...prev, [id]: data.content }))
      setLocalEdits((prev) => ({ ...prev, [id]: data.content }))
      if (data.text_content) {
        setTextDocs((prev) => ({ ...prev, [id]: data.text_content }))
      }
    } catch {
      setLoadedDocs((prev) => ({ ...prev, [id]: '' }))
    }
    setLoading((prev) => ({ ...prev, [id]: false }))
  }

  const saveDoc = async (type, id) => {
    setSaving(id)
    try {
      const url = type === 'variant'
        ? `${API}/documents/variants/${id}`
        : `${API}/documents/cover-letters/${id}`
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: localEdits[id] }),
      })
      setLoadedDocs((prev) => ({ ...prev, [id]: localEdits[id] }))
    } catch {}
    setSaving(null)
    setEditingId(null)
  }

  const cardStyle = {
    background: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(12,14,28,0.05)',
  }
  const headerStyle = {
    padding: '12px 14px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', borderBottom: '1px solid #f0efe9',
  }
  const labelStyle = {
    fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#0c0e1c',
  }
  const bodyStyle = {
    padding: '12px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 13,
    color: '#3d4050', lineHeight: 1.7, whiteSpace: 'pre-wrap',
  }
  const textareaStyle = {
    width: '100%', padding: '12px 14px', border: 'none',
    fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3d4050',
    lineHeight: 1.6, resize: 'vertical', minHeight: 120,
    background: '#fafaf8', boxSizing: 'border-box',
  }
  const actionBtn = (primary) => ({
    padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: primary ? '#f0effb' : '#f6f5f0',
    color: primary ? accent : '#6b6f7e',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11,
  })

  const isHtml = (content) => typeof content === 'string' && content.trimStart().startsWith('<!DOCTYPE')

  const emptyState = (msg) => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>{msg}</div>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f4f0' }}>
      {previewHtml && <ResumePreviewModal htmlContent={previewHtml} onClose={() => setPreviewHtml(null)} />}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c', marginBottom: 14 }}>Documents</div>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, boxShadow: '0 2px 10px rgba(12,14,28,0.06)' }}>
          {[['resume', 'Resume'], ['coverletter', 'Cover Letters']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', background: tab === t ? accent : 'transparent', color: tab === t ? '#fff' : '#9a9fa8', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, transition: 'all 0.2s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>

        {tab === 'resume' && (
          <>
            {baseContent ? (
              <div style={cardStyle}>
                <div style={headerStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={labelStyle}>Your Resume</span>
                    <span style={{ background: '#f0effb', color: accent, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>Base</span>
                  </div>
                  {baseContent && (
                    <button onClick={() => downloadDoc(baseContent, 'resume.txt')} style={actionBtn(true)}>
                      ↓ Download
                    </button>
                  )}
                  <button onClick={() => setEditingBase((v) => !v)} style={actionBtn(false)}>
                    {editingBase ? 'Done' : 'Edit'}
                  </button>
                </div>
                {editingBase ? (
                  <textarea
                    value={baseContent}
                    onChange={(e) => setBaseContent(e.target.value)}
                    style={{ ...textareaStyle, minHeight: 200 }}
                  />
                ) : (
                  <div style={{ ...bodyStyle, maxHeight: 200, overflowY: 'auto' }}>{baseContent}</div>
                )}
              </div>
            ) : (
              emptyState('Upload a resume in onboarding to see it here.')
            )}

            {appsWithVariants.length > 0 && (
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 12, color: '#9a9fa8', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
                Tailored Versions
              </div>
            )}

            {appsWithVariants.map((app) => {
              const id = app.resume_variant_id
              const isEditing = editingId === id
              const content = loadedDocs[id]
              const htmlResume = content !== undefined && isHtml(content)
              const slug = app.company.toLowerCase().replace(/\s+/g, '_')
              return (
                <div key={id} style={cardStyle}>
                  <div style={headerStyle}>
                    <div>
                      <div style={labelStyle}>{app.company}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>{app.title}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {content === undefined && !loading[id] && (
                        <button onClick={() => loadDoc('variant', id)} style={actionBtn(true)}>View</button>
                      )}
                      {content !== undefined && !isEditing && htmlResume && (
                        <>
                          <button
                            onClick={() => setPreviewHtml(content)}
                            style={{ ...actionBtn(true), background: accent, color: '#fff' }}
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => setShowingText((prev) => ({ ...prev, [id]: !prev[id] }))}
                            style={actionBtn(showingText[id])}
                          >
                            {showingText[id] ? 'Hide Text' : 'Text'}
                          </button>
                          {textDocs[id] && (
                            <button
                              onClick={() => downloadDoc(textDocs[id], `${slug}_resume.txt`)}
                              style={actionBtn(false)}
                            >
                              ↓ .txt
                            </button>
                          )}
                          <button
                            onClick={() => downloadDoc(content, `${slug}_resume.html`)}
                            style={actionBtn(false)}
                          >
                            ↓ .html
                          </button>
                        </>
                      )}
                      {content !== undefined && !isEditing && !htmlResume && (
                        <>
                          <button onClick={() => downloadDoc(content, `${slug}_resume.txt`)} style={actionBtn(true)}>↓</button>
                          <button onClick={() => setEditingId(id)} style={actionBtn(false)}>Edit</button>
                        </>
                      )}
                      {isEditing && (
                        <>
                          <button onClick={() => saveDoc('variant', id)} disabled={saving === id} style={actionBtn(true)}>
                            {saving === id ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)} style={actionBtn(false)}>Cancel</button>
                        </>
                      )}
                    </div>
                  </div>
                  {loading[id] && (
                    <div style={{ padding: '14px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>Loading…</div>
                  )}
                  {content !== undefined && !isEditing && !htmlResume && (
                    <div style={{ ...bodyStyle, maxHeight: 180, overflowY: 'auto' }}>{content}</div>
                  )}
                  {content !== undefined && !isEditing && htmlResume && !showingText[id] && (
                    <div style={{ padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>
                      Executive Signal template ready. Click <strong>Preview</strong> to view and save as PDF, or <strong>Text</strong> for a plain-text version.
                    </div>
                  )}
                  {content !== undefined && !isEditing && htmlResume && showingText[id] && (
                    <div style={{ ...bodyStyle, maxHeight: 260, overflowY: 'auto' }}>
                      {textDocs[id] || '(Text version not available — regenerate docs to create one.)'}
                    </div>
                  )}
                  {isEditing && (
                    <textarea
                      value={localEdits[id] ?? content}
                      onChange={(e) => setLocalEdits((prev) => ({ ...prev, [id]: e.target.value }))}
                      style={{ ...textareaStyle, minHeight: 180 }}
                    />
                  )}
                </div>
              )
            })}

            {!baseContent && appsWithVariants.length === 0 && emptyState('No documents yet. Queue a job on Discover to generate tailored materials.')}
          </>
        )}

        {tab === 'coverletter' && (
          <>
            {appsWithCoverLetters.length === 0
              ? emptyState('No cover letters yet. Queue a job on Discover to generate one.')
              : appsWithCoverLetters.map((app) => {
                const id = app.cover_letter_id
                const isEditing = editingId === id
                const content = loadedDocs[id]
                return (
                  <div key={id} style={cardStyle}>
                    <div style={headerStyle}>
                      <div>
                        <div style={labelStyle}>{app.company}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>{app.title}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {content === undefined && !loading[id] && (
                          <button onClick={() => loadDoc('cl', id)} style={actionBtn(true)}>View</button>
                        )}
                        {content !== undefined && !isEditing && (
                          <>
                            <button onClick={() => downloadDoc(content, `${app.company.toLowerCase().replace(/\s+/g, '_')}_cover_letter.txt`)} style={actionBtn(true)}>↓</button>
                            <button onClick={() => setEditingId(id)} style={actionBtn(false)}>Edit</button>
                          </>
                        )}
                        {isEditing && (
                          <>
                            <button onClick={() => saveDoc('cl', id)} disabled={saving === id} style={actionBtn(true)}>
                              {saving === id ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => setEditingId(null)} style={actionBtn(false)}>Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                    {loading[id] && (
                      <div style={{ padding: '14px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>Loading…</div>
                    )}
                    {content !== undefined && !isEditing && (
                      <div style={{ ...bodyStyle, maxHeight: 220, overflowY: 'auto' }}>{content}</div>
                    )}
                    {isEditing && (
                      <textarea
                        value={localEdits[id] ?? content}
                        onChange={(e) => setLocalEdits((prev) => ({ ...prev, [id]: e.target.value }))}
                        style={{ ...textareaStyle, minHeight: 220 }}
                      />
                    )}
                  </div>
                )
              })}
          </>
        )}
      </div>
    </div>
  )
}
