import { STATUS_META } from '../data/sampleData'

export default function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.queued
  return (
    <span style={{
      background: m.bg,
      color: m.color,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: 'DM Sans, sans-serif',
      padding: '3px 9px',
      borderRadius: 20,
    }}>
      {m.label}
    </span>
  )
}
