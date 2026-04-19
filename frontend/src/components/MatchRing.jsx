export default function MatchRing({ pct, accent = '#5047e5' }) {
  const r = 16, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#e8e7e2" strokeWidth="3" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={accent} strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0c0e1c"
        fontFamily="Plus Jakarta Sans, sans-serif">{pct}%</text>
    </svg>
  )
}
