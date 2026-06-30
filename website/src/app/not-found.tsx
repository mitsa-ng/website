export default function NotFound() {
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
      <h1 style={{ fontSize: 64, fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>404</h1>
      <p style={{ fontSize: 20, fontWeight: 500, marginBottom: 4, color: 'var(--fg-2)' }}>Page not found</p>
      <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 24 }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <a
        href="/"
        style={{
          padding: '12px 28px',
          borderRadius: 980,
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Go Home
      </a>
    </div>
  )
}
