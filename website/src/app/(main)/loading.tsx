export default function MainLoading() {
  return (
    <div className="page active">
      <div className="page-header">
        <div className="skeleton" style={{ height: 32, width: 160, borderRadius: 8 }} />
      </div>
      <div style={{ padding: '0 20px' }}>
        <div className="skeleton" style={{ height: 18, width: '100%', marginBottom: 14, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '85%', marginBottom: 14, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 28, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '95%', marginBottom: 14, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 14, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 28, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '100%', marginBottom: 14, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '75%', borderRadius: 6 }} />
      </div>
      <div style={{ padding: '0 20px', marginTop: 32 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="skeleton" style={{ width: '33%', height: 100, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: '33%', height: 100, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: '33%', height: 100, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  )
}
