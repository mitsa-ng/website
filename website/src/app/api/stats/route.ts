import { query } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { corsResponse } from '@/lib/cors';
import { ensureVisitsTable } from '@/lib/visits-table';

const TIMEZONE = 'Asia/Taipei'

function taipeiDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

export async function GET(req: Request) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const url = new URL(req.url)
  const parsed = Number.parseInt(url.searchParams.get('days') || '28', 10)
  const days = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : 28
  const today = taipeiDate()
  const start = taipeiDate(-(days - 1))

  try {
    await ensureVisitsTable()
    const [seriesRows, pageRows, referrerRows, localeRows, todayRows, totalRows] = await Promise.all([
      query<{ day: string; views: number; sessions: number }>(
        `SELECT to_char(day, 'YYYY-MM-DD') AS day, COUNT(*)::int AS views, COUNT(DISTINCT session_id)::int AS sessions
         FROM visits WHERE day >= $1 AND day <= $2 GROUP BY day ORDER BY day`,
        [start, today],
      ),
      query<{ path: string; views: number }>(
        `SELECT path, COUNT(*)::int AS views FROM visits WHERE day >= $1 AND day <= $2
         GROUP BY path ORDER BY views DESC LIMIT 10`,
        [start, today],
      ),
      query<{ referrer_host: string; views: number }>(
        `SELECT referrer_host, COUNT(*)::int AS views FROM visits
         WHERE day >= $1 AND day <= $2 AND referrer_host IS NOT NULL
         GROUP BY referrer_host ORDER BY views DESC LIMIT 10`,
        [start, today],
      ),
      query<{ locale: string; views: number }>(
        `SELECT locale, COUNT(*)::int AS views FROM visits WHERE day >= $1 AND day <= $2
         GROUP BY locale ORDER BY views DESC`,
        [start, today],
      ),
      query<{ views: number; sessions: number }>(
        `SELECT COUNT(*)::int AS views, COUNT(DISTINCT session_id)::int AS sessions
         FROM visits WHERE day = $1`,
        [today],
      ),
      query<{ views: number; sessions: number }>(
        `SELECT COUNT(*)::int AS views, COUNT(DISTINCT session_id)::int AS sessions
         FROM visits WHERE day >= $1 AND day <= $2`,
        [start, today],
      ),
    ])

    const byDay = new Map(seriesRows.map(r => [r.day, r]))
    const series: { date: string; views: number; sessions: number }[] = []
    for (let i = -(days - 1); i <= 0; i++) {
      const date = taipeiDate(i)
      const row = byDay.get(date)
      series.push({ date, views: row?.views ?? 0, sessions: row?.sessions ?? 0 })
    }

    return corsResponse({
      timezone: TIMEZONE,
      days,
      series,
      topPages: pageRows,
      topReferrers: referrerRows.map(r => ({ referrer: r.referrer_host, views: r.views })),
      locales: localeRows,
      today: todayRows[0] ?? { views: 0, sessions: 0 },
      total: totalRows[0] ?? { views: 0, sessions: 0 },
    })
  } catch {
    return corsResponse({ error: 'stats_unavailable' }, { status: 500 })
  }
}
