import { useEffect, useState } from 'react'
import { useAppStore } from './store/appStore'
import BottomNav from './components/BottomNav'
import Onboarding from './screens/Onboarding'
import Discover from './screens/Discover'
import Log from './screens/Log'
import Documents from './screens/Documents'
import Profile from './screens/Profile'

function StatusBar() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ height: 50, background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 0', flexShrink: 0, position: 'relative' }}>
      {/* Dynamic island pill */}
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 88, height: 26, background: '#0c0e1c', borderRadius: 20 }} />
      <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#0c0e1c', zIndex: 1 }}>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, zIndex: 1 }}>
        {/* WiFi */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0c0e1c" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="#0c0e1c" />
        </svg>
        {/* Battery */}
        <svg width="22" height="12" viewBox="0 0 24 12" fill="none">
          <rect x="0.5" y="0.5" width="19" height="11" rx="2" stroke="#0c0e1c" strokeWidth="1.2" />
          <rect x="2" y="2" width="15" height="8" rx="1" fill="#0c0e1c" />
          <path d="M21 4v4" stroke="#0c0e1c" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

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
      {/* Phone bezel */}
      <div style={{
        width: 390, height: 844,
        background: '#0c0e1c',
        borderRadius: 54,
        padding: 12,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 40px 100px rgba(0,0,0,0.6), 0 10px 30px rgba(80,71,229,0.2)',
        position: 'relative',
        flexShrink: 0,
      }}>
        {/* Inner screen */}
        <div style={{
          width: '100%', height: '100%',
          background: '#f5f4f0',
          borderRadius: 44,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}>
          {screen === 'onboarding' ? (
            <Onboarding onComplete={async (form) => { await saveProfile(form); setScreen('discover') }} />
          ) : (
            <>
              <StatusBar />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {SCREENS[screen]}
              </div>
              <BottomNav />
            </>
          )}
        </div>
      </div>

      {showTweaks && <TweaksPanel tweaks={tweaks} updateTweak={updateTweak} />}
    </>
  )
}
