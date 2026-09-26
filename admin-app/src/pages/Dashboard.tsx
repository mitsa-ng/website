import { useEffect, useState } from 'react'
import { apiGet, type Post, type Project, type Service, type Contact, type Stats } from '../lib/api'
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

function usePollTraffic() {
  const [traffic, setTraffic] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchTraffic = () => {
      apiGet<Stats>('/api/stats?days=7')
        .then(s => { if (!cancelled) setTraffic(s) })
        .catch(() => {})
    }
    fetchTraffic()
    const id = setInterval(fetchTraffic, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return traffic
}

function Sparkline({ points }: { points: number[] }) {
  const W = 120
  const H = 28
  const max = Math.max(...points, 1)
  const step = points.length > 1 ? W / (points.length - 1) : W
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * step},${H - Math.round((v / max) * (H - 4)) - 2}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="analytics-sparkline" role="img" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Dashboard() {
  const { t } = useLocale()
  const stats = usePollStats()
  const traffic = usePollTraffic()

  const cards = [
    { label: t.dashboard.posts, value: stats?.posts, color: '#0071e3' },
    { label: t.dashboard.projects, value: stats?.projects, color: '#34c759' },
    { label: t.dashboard.services, value: stats?.services, color: '#ff9500' },
    { label: t.dashboard.contacts, value: stats?.contacts, color: '#ff3b30' },
    { label: t.dashboard.todayViews, value: traffic?.today.views, color: '#af52de' },
    { label: t.dashboard.weekViews, value: traffic?.total.views, color:'#5ac8fa', sparkline: true },
  ]

  return (
    <div className="page">
      <h2 className="page-title">{t.dashboard.title}</h2>
      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card-admin" style={{ borderTop: `3px solid ${c.color}` }}>
            <div className="stat-value">{c.value ?? '—'}</div>
            {c.sparkline && traffic && <Sparkline points={traffic.series.map(p => p.views)} />}
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
