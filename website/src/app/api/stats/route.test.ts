import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), requireAdmin: vi.fn() }))

vi.mock('@/db', () => ({ query: mocks.query }))
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/cors', () => ({
  corsResponse: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  }),
}))

import { GET } from './route'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-27T02:00:00Z')) // 10:00 Taipei, same date
  mocks.requireAdmin.mockReset().mockResolvedValue(null)
  mocks.query.mockReset()
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('GROUP BY day')) {
      return [
        { day: '2026-09-21', views: 4, sessions: 2 },
        { day: '2026-09-27', views: 9, sessions: 6 },
      ]
    }
    if (sql.includes('GROUP BY path')) {
      return [{ path: '/en', views: 12 }, { path: '/zh-TW/blog/x', views: 3 }]
    }
    if (sql.includes('GROUP BY referrer_host')) {
      return [{ referrer_host: 'google.com', views: 5 }]
    }
    if (sql.includes('GROUP BY locale')) {
      return [{ locale: 'en', views: 10 }, { locale: 'zh-TW', views: 5 }]
    }
    if (sql.includes('WHERE day = $1')) {
      return [{ views: 9, sessions: 6 }]
    }
    return [{ views: 13, sessions: 8 }]
  })
})

afterEach(() => vi.useRealTimers())

function statsReq(days?: number): Request {
  return new Request(`https://mitsa.dpdns.org/api/stats${days ? `?days=${days}` : ''}`)
}

describe('GET /api/stats', () => {
  it('rejects callers without an admin key', async () => {
    mocks.requireAdmin.mockResolvedValue(new Response('unauthorized', { status: 401 }))
    const res = await GET(statsReq())
    expect(res.status).toBe(401)
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('returns a zero-filled daily series for the requested window', async () => {
    const res = await GET(statsReq(7))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.timezone).toBe('Asia/Taipei')
    expect(body.series).toHaveLength(7)
    expect(body.series[0]).toMatchObject({ date: '2026-09-21', views: 4, sessions: 2 })
    expect(body.series[1]).toMatchObject({ date: '2026-09-22', views: 0, sessions: 0 })
    expect(body.series[6]).toMatchObject({ date: '2026-09-27', views: 9, sessions: 6 })
  })

  it('aggregates top pages, referrers, locales, today and period totals', async () => {
    const body = await (await GET(statsReq(28))).json()
    expect(body.topPages).toEqual([
      { path: '/en', views: 12 },
      { path: '/zh-TW/blog/x', views: 3 },
    ])
    expect(body.topReferrers).toEqual([{ referrer: 'google.com', views: 5 }])
    expect(body.locales).toEqual([
      { locale: 'en', views: 10 },
      { locale: 'zh-TW', views: 5 },
    ])
    expect(body.today).toEqual({ views: 9, sessions: 6 })
    expect(body.total).toEqual({ views: 13, sessions: 8 })
  })

  it('clamps unreasonable windows to 365 days', async () => {
    const body = await (await GET(statsReq(9999))).json()
    expect(body.days).toBe(365)
    expect(body.series).toHaveLength(365)
  })
})
