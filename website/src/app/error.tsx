'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      textAlign: 'center',
      padding: 24,
      background: 'var(--surface)',
      color: 'var(--fg)',
      fontFamily: 'var(--font-display)',
    }}>
      <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>Oops!</h1>
      <p style={{ fontSize: 17, color: 'var(--fg-2)', marginBottom: 24 }}>
        Something went wrong. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '12px 28px',
          borderRadius: 980,
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          border: 0,
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  )
}
