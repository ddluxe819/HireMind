import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { useAppStore } from '../store/appStore'
import MatchRing from './MatchRing'

const SWIPE_THRESHOLD = 80

export default function JobCard({ job, onGone }) {
  const { tweaks, queueJob } = useAppStore()
  const accent = tweaks.accentColor
  const showMatch = tweaks.showMatchScore

  const [{ x, rotate }, api] = useSpring(() => ({
    x: 0, rotate: 0,
    config: { friction: 50, tension: 400 },
  }))

  const bind = useDrag(({ active, movement: [mx], velocity: [vx], direction: [dx] }) => {
    const gone = !active && (Math.abs(mx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5)

    if (gone) {
      const dir = dx > 0 ? 1 : -1
      api.start({ x: dir * 600, rotate: dir * 20, config: { friction: 40 } })
      if (dir === 1) queueJob(job)
      setTimeout(onGone, 320)
    } else {
      api.start({ x: active ? mx : 0, rotate: active ? mx * 0.07 : 0 })
    }
  }, { filterTaps: true })

  const rightOpacity = x.to([0, SWIPE_THRESHOLD], [0, 1], 'clamp')
  const leftOpacity = x.to([-SWIPE_THRESHOLD, 0], [1, 0], 'clamp')

  return (
    <animated.div
      {...bind()}
      style={{ x, rotate, position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none' }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: 24,
        height: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 8px 40px rgba(12,14,28,0.12)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* QUEUE overlay */}
        <animated.div style={{
          position: 'absolute', inset: 0, borderRadius: 24,
          background: 'linear-gradient(135deg, #22c55e18, #22c55e44)',
          opacity: rightOpacity, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}>
          <div style={{ border: '4px solid #22c55e', borderRadius: 12, padding: '8px 20px', transform: 'rotate(-15deg)', color: '#22c55e', fontWeight: 800, fontSize: 26, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            QUEUE
          </div>
        </animated.div>

        {/* SKIP overlay */}
        <animated.div style={{
          position: 'absolute', inset: 0, borderRadius: 24,
          background: 'linear-gradient(135deg, #ef444418, #ef444440)',
          opacity: leftOpacity, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}>
          <div style={{ border: '4px solid #ef4444', borderRadius: 12, padding: '8px 20px', transform: 'rotate(15deg)', color: '#ef4444', fontWeight: 800, fontSize: 26, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            SKIP
          </div>
        </animated.div>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: job.color || accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 20, fontFamily: 'Plus Jakarta Sans, sans-serif',
            flexShrink: 0, boxShadow: `0 4px 12px ${(job.color || accent)}44`,
          }}>
            {job.logo || job.company[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 15, color: '#0c0e1c' }}>{job.company}</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9a9fa8' }}>{job.location} · {job.posted || job.posted_at}</div>
          </div>
          {showMatch && (job.match != null || job.match_score != null) && (
            <MatchRing pct={job.match ?? job.match_score} accent={accent} />
          )}
        </div>

        {/* Title */}
        <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 600, fontSize: 27, color: '#0c0e1c', lineHeight: 1.15, marginBottom: 12 }}>
          {job.title}
        </div>

        {/* Salary */}
        {(job.salary || job.salary_range) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f0f9f8', borderRadius: 10, padding: '6px 12px', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0ea5a0' }}>
              {job.salary || job.salary_range}
            </span>
          </div>
        )}

        {/* Description */}
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#6b6f7e', lineHeight: 1.6, marginBottom: 20, flex: 1 }}>
          {(job.desc || job.description || '').slice(0, 110)}…
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(job.tags || []).map((t) => (
            <span key={t} style={{ background: '#f0effb', color: '#5047e5', fontSize: 12, padding: '5px 11px', borderRadius: 20, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </animated.div>
  )
}
