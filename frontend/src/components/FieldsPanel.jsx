import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'

// required: true means the field is flagged when empty — these are what virtually
// every ATS gates submission on. Everything else is editable but never nagged.
const REQUIRED_KEYS = new Set(['firstName', 'lastName', 'email', 'phone', 'workAuthorization'])

const FIELD_GROUPS = [
  {
    title: 'Identity',
    fields: [
      { key: 'firstName', label: 'First Name', required: true },
      { key: 'lastName', label: 'Last Name', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Phone', type: 'tel', required: true },
    ],
  },
  {
    title: 'Links',
    fields: [
      { key: 'linkedinUrl', label: 'LinkedIn URL' },
      { key: 'githubUrl', label: 'GitHub URL' },
      { key: 'portfolioUrl', label: 'Portfolio / Website' },
    ],
  },
  {
    title: 'Location',
    fields: [
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State / Region' },
      { key: 'country', label: 'Country' },
      { key: 'zip', label: 'Postal Code' },
    ],
  },
  {
    title: 'Work Authorization',
    fields: [
      { key: 'workAuthorization', label: 'Authorized to work', type: 'yesno', required: true },
      { key: 'requiresSponsorship', label: 'Requires sponsorship', type: 'yesno' },
    ],
  },
  {
    title: 'Preferences',
    fields: [
      { key: 'yearsExperience', label: 'Years of experience' },
      { key: 'salaryExpectation', label: 'Salary expectation' },
      { key: 'earliestStartDate', label: 'Earliest start date' },
      { key: 'openToRelocation', label: 'Open to relocation', type: 'yesno' },
      { key: 'workMode', label: 'Work mode (remote/hybrid/onsite)' },
    ],
  },
  {
    title: 'Demographics (optional)',
    fields: [
      { key: 'gender', label: 'Gender' },
      { key: 'ethnicity', label: 'Ethnicity' },
      { key: 'veteranStatus', label: 'Veteran status' },
      { key: 'disabilityStatus', label: 'Disability status' },
    ],
  },
]

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1.5px solid #e0dfd8',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13,
  color: '#0c0e1c',
  background: '#fff',
  boxSizing: 'border-box',
}

function YesNoSelect({ value, onChange }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="">—</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  )
}

export default function FieldsPanel({ app, accent, onBack }) {
  const { fetchApplicationFields, saveApplicationFields } = useAppStore()
  const [fields, setFields] = useState({})
  const [customAnswers, setCustomAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchApplicationFields(app.id)
      .then((data) => {
        if (cancelled) return
        setFields(data.fields || {})
        setCustomAnswers(data.custom_answers || [])
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [app.id, fetchApplicationFields])

  const setField = (key, value) => setFields((f) => ({ ...f, [key]: value }))

  const setAnswer = (id, answer) =>
    setCustomAnswers((arr) => arr.map((a) => (a.id === id ? { ...a, answer } : a)))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await saveApplicationFields(app.id, { fields, customAnswers })
      setSavedAt(Date.now())
    } catch (e) {
      setError(e.message || 'Save failed')
    }
    setSaving(false)
  }

  const missingRequiredCount = Array.from(REQUIRED_KEYS).filter((k) => !fields[k]?.trim()).length
  const unansweredCustomCount = customAnswers.filter((a) => !a.answer?.trim()).length
  const attentionCount = missingRequiredCount + unansweredCustomCount

  if (loading) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>
        Loading fields…
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          onClick={onBack}
          style={{ background: '#f6f5f0', border: 'none', borderRadius: 8, padding: '5px 10px', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b6f7e', cursor: 'pointer' }}>
          ← Back
        </button>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#0c0e1c', flex: 1 }}>
          Application Fields
        </span>
        {attentionCount > 0 && (
          <span style={{ background: '#fef3c7', color: '#b45309', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10 }}>
            {attentionCount} needed
          </span>
        )}
      </div>

      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b6f7e', marginBottom: 14, lineHeight: 1.5 }}>
        These values are what the extension will fill when you open this job site. Edits here apply to this application only.
      </div>

      {FIELD_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 12, color: '#0c0e1c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {group.title}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {group.fields.map((f) => {
              const missing = f.required && !fields[f.key]?.trim()
              return (
                <div key={f.key} style={{ gridColumn: group.fields.length === 1 ? '1 / -1' : 'auto' }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: missing ? '#b45309' : '#6b6f7e', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {f.label}
                    {f.required && <span style={{ color: '#ef4444', fontSize: 10 }}>*</span>}
                  </div>
                  {f.type === 'yesno' ? (
                    <YesNoSelect value={fields[f.key]} onChange={(v) => setField(f.key, v)} />
                  ) : (
                    <input
                      value={fields[f.key] || ''}
                      type={f.type || 'text'}
                      onChange={(e) => setField(f.key, e.target.value)}
                      style={{ ...inputStyle, borderColor: missing ? '#fbbf24' : '#e0dfd8' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 12, color: '#0c0e1c', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Custom Questions
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9a9fa8' }}>
            Detected on the job page
          </div>
        </div>
        {customAnswers.length === 0 ? (
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8', padding: '12px 0' }}>
            No custom questions yet. The extension will add any screening questions it finds here after you open the job page.
          </div>
        ) : (
          customAnswers.map((a) => (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#0c0e1c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {!a.answer?.trim() && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />}
                {a.question}
              </div>
              <textarea
                value={a.answer || ''}
                placeholder="Your answer…"
                onChange={(e) => setAnswer(a.id, e.target.value)}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}
              />
            </div>
          ))
        )}
      </div>

      {error && (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</div>
      )}
      {savedAt && !error && (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#16a34a', marginBottom: 10 }}>Saved.</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: saving ? '#c0bfb8' : accent, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Saving…' : 'Save Fields'}
      </button>
    </div>
  )
}
