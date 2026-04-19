import { useAppStore } from '../store/appStore'

export default function Profile() {
  const { tweaks, resetOnboarding, applications } = useAppStore()
  const accent = tweaks.accentColor

  const stats = [
    [String(applications.length || 6), 'Applied'],
    [String(applications.filter((a) => a.status === 'interviewing').length || 1), 'Interviews'],
    ['86%', 'Match avg'],
  ]

  const settings = [
    ['Resume', 'Base Resume v3 · Updated 2h ago'],
    ['Preferences', 'Remote · $140K+ · Design'],
    ['Notifications', 'Email + push enabled'],
    ['Connected Apps', 'Chrome Extension active'],
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#f5f4f0', padding: '16px 20px 24px' }}>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 22, color: '#0c0e1c', marginBottom: 20 }}>Profile</div>

      {/* Avatar card */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 12px rgba(12,14,28,0.06)' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          A
        </div>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 18, color: '#0c0e1c' }}>Alex Johnson</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>Product Designer · San Francisco</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        {stats.map(([val, label]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 10px rgba(12,14,28,0.05)' }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 20, color: accent }}>{val}</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9a9fa8', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Settings rows */}
      {settings.map(([title, sub]) => (
        <div key={title} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(12,14,28,0.04)' }}>
          <div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#0c0e1c' }}>{title}</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9a9fa8' }}>{sub}</div>
          </div>
          <span style={{ color: '#c0bfb8', fontSize: 18, lineHeight: 1 }}>›</span>
        </div>
      ))}

      <button onClick={resetOnboarding}
        style={{ width: '100%', padding: 13, borderRadius: 14, border: '1.5px solid #fecaca', background: '#fff5f5', color: '#ef4444', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, marginTop: 8 }}>
        Restart Onboarding
      </button>
    </div>
  )
}
