export default function ResumePreviewModal({ htmlContent, onClose }) {
  const openInWindow = () => {
    const win = window.open('', '_blank', 'width=960,height=1100')
    if (!win) return
    win.document.open()
    win.document.write(htmlContent)
    win.document.close()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(12,14,28,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-start', padding: '24px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 900, display: 'flex',
          flexDirection: 'column', gap: 12,
        }}
      >
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#1a1c2a', borderRadius: 12, padding: '10px 16px',
        }}>
          <span style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
            fontSize: 13, color: '#e8e7f4',
          }}>
            Resume Preview
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={openInWindow}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: '#2A7F7F', color: '#fff', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12,
              }}
            >
              Open Full Window &rarr; Save as PDF
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: '#2a2c3a', color: '#9a9fa8', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12,
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Preview frame */}
        <div style={{
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          background: '#fff',
        }}>
          <iframe
            srcDoc={htmlContent}
            title="Resume Preview"
            style={{
              width: '100%', height: 900, border: 'none', display: 'block',
            }}
            sandbox="allow-same-origin allow-popups"
          />
        </div>

        <p style={{
          textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
          fontSize: 11, color: '#555', paddingBottom: 16,
        }}>
          Click "Open Full Window" then use your browser's Print dialog to save as PDF.
        </p>
      </div>
    </div>
  )
}
