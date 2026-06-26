import { useEffect, useState } from 'react'
import { apiGet, type Post, type Project, type Service, type Contact } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

function usePollStats() {
  const [stats, setStats] = useState<{ posts: number; projects: number; services: number; contacts: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchAll = () => {
      Promise.all([
        apiGet<Post[]>('/api/posts'),
        apiGet<Project[]>('/api/projects'),
        apiGet<Service[]>('/api/services'),
        apiGet<Contact[]>('/api/contact'),
      ]).then(([posts, projects, services, contacts]) => {
        if (!cancelled) {
          setStats({
            posts: posts.length,
            projects: projects.length,
            services: services.length,
            contacts: contacts.length,
          })
        }
      }).catch(() => {})
    }

    fetchAll()
    const id = setInterval(fetchAll, 30_000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return stats
}

export default function Dashboard() {
  const { t } = useLocale()
  const stats = usePollStats()

  const cards = [
    { label: t.dashboard.posts, value: stats?.posts, color: '#0071e3' },
    { label: t.dashboard.projects, value: stats?.projects, color: '#34c759' },
    { label: t.dashboard.services, value: stats?.services, color: '#ff9500' },
    { label: t.dashboard.contacts, value: stats?.contacts, color: '#ff3b30' },
  ]

  return (
    <div className="page">
      <h2 className="page-title">{t.dashboard.title}</h2>
      <div className="stats-grid">
        {stats ? cards.map(c => (
          <div key={c.label} className="stat-card-admin" style={{ borderTop: `3px solid ${c.color}` }}>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        )) : [1,2,3,4].map(i => (
          <div key={i} className="stat-card-admin">
            <div className="skeleton skeleton-stat-value" />
            <div className="skeleton skeleton-stat-label" />
          </div>
        ))}
      </div>
    </div>
  )
}
