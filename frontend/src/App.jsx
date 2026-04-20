import { useEffect, useState } from 'react'
import { useAppStore } from './store/appStore'
import BottomNav from './components/BottomNav'
import Onboarding from './screens/Onboarding'
import Discover from './screens/Discover'
import Log from './screens/Log'
import Documents from './screens/Documents'
import Profile from './screens/Profile'

function TweaksPanel({ tweaks, updateTweak }) {
  const accent = tweaks.accentColor
  const COLORS = ['#5047e5', '#0ea5a0', '#e8612a', '#e5476a', '#059669']
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#fff', borderRadius: 18, padding: 18, width: 240, boxShadow: '0 8px 40px rgba(12,14,28,0.18)', zIndex: 1000 }}>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 15, color: '#0c0e1c', marginBottom: 16 }}>Tweaks</div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 12, color: '#6b6f7e', marginBottom: 8 }}>Accent Color</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {COLORS.map((c) => (
            <div key={c} onClick={() => updateTweak('accentColor', c)}
              style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: accent === c ? '3px solid #0c0e1c' : '3px solid transparent', transition: 'border 0.15s' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 12, color: '#6b6f7e' }}>Show Match %</span>
        <div onClick={() => updateTweak('showMatchScore', !tweaks.showMatchScore)}
          style={{ width: 40, height: 22, borderRadius: 11, background: tweaks.showMatchScore ? accent : '#e0dfd8', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 3, left: tweaks.showMatchScore ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid #f0efe9', paddingTop: 12, marginTop: 4 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#c0bfb8', textAlign: 'center' }}>Swipe cards on Discover tab to queue jobs. Tap Applied rows to expand.</div>
      </div>
    </div>
  )
}

const SCREENS = {
  discover: <Discover />,
  log:      <Log />,
  docs:     <Documents />,
  profile:  <Profile />,
}

export default function App() {
  const { screen, setScreen, tweaks, updateTweak, saveProfile } = useAppStore()
  const [showTweaks, setShowTweaks] = useState(false)

  useEffect(() => {
    const h = (e) => {
      if (e.data?.type === '__activate_edit_mode') setShowTweaks(true)
      if (e.data?.type === '__deactivate_edit_mode') setShowTweaks(false)
    }
    window.addEventListener('message', h)
    window.parent.postMessage({ type: '__edit_mode_available' }, '*')
    return () => window.removeEventListener('message', h)
  }, [])

  return (
    <>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#f5f4f0',
      }}>
        {screen === 'onboarding' ? (
          <Onboarding onComplete={async (form) => { await saveProfile(form); setScreen('discover') }} />
        ) : (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
              {SCREENS[screen]}
            </div>
            <BottomNav />
          </>
        )}
      </div>

      {showTweaks && <TweaksPanel tweaks={tweaks} updateTweak={updateTweak} />}
    </>
  )
}
