export default function Placeholder({ title }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <div style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 20, color: '#0c0e1c' }}>
        {title}
      </div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#6b6f7e' }}>Coming soon</div>
    </div>
  )
}
