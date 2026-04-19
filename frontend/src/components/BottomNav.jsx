import { useAppStore } from '../store/appStore'

const NAV_ICONS = {
  discover: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  log: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  docs: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

const TABS = [
  { key: 'discover', label: 'Discover' },
  { key: 'log',      label: 'Applied' },
  { key: 'docs',     label: 'Docs' },
  { key: 'profile',  label: 'Profile' },
]

export default function BottomNav() {
  const { screen, setScreen, tweaks, applications } = useAppStore()
  const accent = tweaks.accentColor
  const queued = applications.filter((a) => a.status === 'queued' || a.status === 'ready').length

  return (
    <div style={{
      height: 80, background: '#fff', borderTop: '1px solid #f0efe9',
      display: 'flex', alignItems: 'center', paddingBottom: 14, flexShrink: 0,
    }}>
      {TABS.map((tab) => {
        const active = screen === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => setScreen(tab.key)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 0', border: 'none', background: 'transparent', position: 'relative' }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: active ? accent + '1a' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              color: active ? accent : '#b0aeb8',
            }}>
              {NAV_ICONS[tab.key]}
            </div>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 10, color: active ? accent : '#b0aeb8', transition: 'color 0.2s' }}>
              {tab.label}
            </span>
            {tab.key === 'log' && queued > 0 && (
              <div style={{ position: 'absolute', top: 6, right: 'calc(50% - 18px)', width: 8, height: 8, background: accent, borderRadius: '50%' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
