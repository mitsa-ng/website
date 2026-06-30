export default function MainLoading() {
  return (
    <div className="page active">
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ height: 24, width: 120 }} />
      </div>
      <div style={{ padding: '0 20px' }}>
        <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 12, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '85%', marginBottom: 12, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 24, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '95%', marginBottom: 12, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 12, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 24, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 12, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '75%', borderRadius: 4 }} />
      </div>
    </div>
  )
}
