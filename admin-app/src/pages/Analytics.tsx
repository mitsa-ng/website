import { useEffect, useRef, useState } from 'react'
import { apiGet, type Stats } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

const PERIODS = [7, 28, 90] as const

function useStats(days: number) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const data = await apiGet<Stats>(`/api/stats?days=${days}`)
        if (!cancelled) { setStats(data); setError(false) }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        inFlight.current = false
      }
    }

    fetchStats()
    const id = setInterval(fetchStats, 30_000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStats() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [days])

  return { stats, error }
}

function TrendChart({ series }: { series: Stats['series'] }) {
  const W = 720
  const H = 180
  const pad = 4
  const max = Math.max(...series.map(p => p.views), 1)
  const bw = (W - pad * 2) / series.length

  return (
    <svg className="analytics-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      {series.map((p, i) => {
        const h = Math.round((p.views / max) * (H - 24))
        return (
          <g key={p.date}>
            <rect
              x={pad + i * bw + bw * 0.15}
              y={H - h}
              width={bw * 0.7}
              height={h}
              rx={Math.min(3, bw * 0.35)}
              className="analytics-bar"
            >
              <title>{`${p.date} — ${p.views} / ${p.sessions}`}</title>
            </rect>
            {series.length <= 28 && (
              <text x={pad + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="analytics-tick">
                {p.date.slice(5)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function BarList({ items, empty }: { items: { label: string; views: number }[]; empty: string }) {
  if (items.length === 0) return <div className="analytics-empty-row">{empty}</div>
  const max = Math.max(...items.map(i => i.views), 1)
  return (
    <div className="analytics-bar-list">
      {items.map(i => (
        <div key={i.label} className="analytics-bar-row">
          <span className="analytics-bar-label" title={i.label}>{i.label}</span>
          <span className="analytics-bar-track"><span className="analytics-bar-fill" style={{ width: `${(i.views / max) * 100}%` }} /></span>
          <span className="analytics-bar-value">{i.views}</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { t } = useLocale()
  const [days, setDays] = useState<number>(28)
  const { stats, error } = useStats(days)
  const ta = t.analyticsPage

  const isEmpty = stats && stats.total.views === 0

  return (
    <div className="page">
      <h2 className="page-title">{ta.title}</h2>

      <div className="analytics-toolbar">
        <div className="analytics-periods">
          {PERIODS.map(p => (
            <button
              key={p}
              className={`analytics-period-btn${days === p ? ' active' : ''}`}
              onClick={() => setDays(p)}
            >
              {p === 7 ? ta.days7 : p === 28 ? ta.days28 : ta.days90}
            </button>
          ))}
        </div>
        <span className="analytics-tz">{ta.tzNote}</span>
      </div>

      {error && <div className="analytics-empty-row">{ta.noData}</div>}

      {!stats && !error && (
        <div className="stats-grid">
          {[1, 2].map(i => (
            <div key={i} className="stat-card-admin">
              <div className="skeleton skeleton-stat-value" />
              <div className="skeleton skeleton-stat-label" />
            </div>
          ))}
        </div>
      )}

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card-admin" style={{ borderTop: '3px solid #0071e3' }}>
              <div className="stat-value">{stats.today.views}</div>
              <div className="stat-label">{ta.views} · {stats.series[stats.series.length - 1]?.date}</div>
            </div>
            <div className="stat-card-admin" style={{ borderTop: '3px solid #34c759' }}>
              <div className="stat-value">{stats.total.views}</div>
              <div className="stat-label">{ta.totalViews}</div>
            </div>
            <div className="stat-card-admin" style={{ borderTop: '3px solid #ff9500' }}>
              <div className="stat-value">{stats.total.sessions}</div>
              <div className="stat-label">{ta.totalSessions}</div>
            </div>
          </div>

          {isEmpty ? (
            <div className="analytics-empty-row">{ta.noData}</div>
          ) : (
            <>
              <div className="analytics-card">
                <h3>{ta.dailyTrend} · {ta.views}</h3>
                <TrendChart series={stats.series} />
              </div>

              <div className="analytics-grid-2">
                <div className="analytics-card">
                  <h3>{ta.topPages}</h3>
                  <BarList items={stats.topPages.map(p => ({ label: p.path, views: p.views }))} empty={ta.noData} />
                </div>
                <div className="analytics-card">
                  <h3>{ta.topReferrers}</h3>
                  <BarList items={stats.topReferrers.map(r => ({ label: r.referrer, views: r.views }))} empty={ta.noData} />
                </div>
              </div>

              <div className="analytics-card">
                <h3>{ta.locales}</h3>
                <BarList items={stats.locales.map(l => ({ label: l.locale, views: l.views }))} empty={ta.noData} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
