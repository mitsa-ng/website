import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../lib/LocaleContext'
import Analytics from './Analytics'
import * as api from '../lib/api'

vi.mock('../lib/api', () => ({ apiGet: vi.fn() }))

const sampleStats: api.Stats = {
  timezone: 'Asia/Taipei',
  days: 7,
  series: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-09-2${i + 1}`,
    views: i === 6 ? 9 : i,
    sessions: i,
  })),
  topPages: [{ path: '/en', views: 12 }, { path: '/zh-TW/blog/x', views: 3 }],
  topReferrers: [{ referrer: 'google.com', views: 5 }],
  locales: [{ locale: 'en', views: 10 }, { locale: 'zh-TW', views: 5 }],
  today: { views: 9, sessions: 6 },
  total: { views: 24, sessions: 21 },
}

describe('Analytics page', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    values.clear()
    vi.stubGlobal('localStorage', storage)
    vi.mocked(api.apiGet).mockResolvedValue(sampleStats)
  })

  afterEach(cleanup)

  it('renders totals, trend, top pages and referrers from the stats API', async () => {
    render(<LocaleProvider><Analytics /></LocaleProvider>)

    await screen.findByText('Total Views')
    expect(api.apiGet).toHaveBeenCalledWith('/api/stats?days=28')

    expect(screen.getByText('24')).toBeTruthy()
    expect(screen.getByText('/en')).toBeTruthy()
    expect(screen.getByText('/zh-TW/blog/x')).toBeTruthy()
    expect(screen.getByText('google.com')).toBeTruthy()
    expect(screen.getByText('09-27')).toBeTruthy()
  })

  it('switches the window and refetches', async () => {
    const user = userEvent.setup()
    render(<LocaleProvider><Analytics /></LocaleProvider>)

    await screen.findByText('Total Views')
    await user.click(screen.getByRole('button', { name: '90 days' }))
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith('/api/stats?days=90'))
  })

  it('shows the empty hint when there are no views yet', async () => {
    vi.mocked(api.apiGet).mockResolvedValue({
      ...sampleStats,
      total: { views: 0, sessions: 0 },
      topPages: [],
      topReferrers: [],
      locales: [],
    })
    render(<LocaleProvider><Analytics /></LocaleProvider>)

    await screen.findByText(/No data yet/i)
    expect(screen.queryByText('/en')).toBeNull()
  })
})
