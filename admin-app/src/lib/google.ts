import { platformFetch } from './api'

const STORAGE_KEY = 'google_oauth'
const PROPERTY_KEY = 'ga4_property'

export interface GoogleTokens {
  refreshToken: string
  accessToken: string
  expiresAt: number
}

export interface Ga4Report {
  rows: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]
}

export interface GscResponse {
  rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[]
}

export function isConnected(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return !!raw && !!JSON.parse(raw).refreshToken
  } catch {
    return false
  }
}

export function disconnect(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(PROPERTY_KEY)
}

export async function connect(): Promise<boolean> {
  const api = (window as any).electronAPI
  if (!api?.googleAuth) return false
  const tokens = await api.googleAuth()
  if (!tokens?.refreshToken || !tokens?.accessToken) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  return true
}

let cached: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string | null> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const stored = JSON.parse(raw) as GoogleTokens
  if (!stored.refreshToken) return null

  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
  try {
    const api = (window as any).electronAPI
    const refreshed = await api?.googleRefresh?.(stored.refreshToken)
    if (!refreshed?.accessToken) return null
    cached = { token: refreshed.accessToken, expiresAt: refreshed.expiresAt }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, ...refreshed }))
    return refreshed.accessToken
  } catch {
    return null
  }
}

export function getSelectedProperty(): string {
  return localStorage.getItem(PROPERTY_KEY) || ''
}

export function setSelectedProperty(property: string): void {
  localStorage.setItem(PROPERTY_KEY, property)
}

/** Lists GA4 properties visible to the connected account, as `properties/123` + display names. */
export async function listGa4Properties(): Promise<{ id: string; name: string }[]> {
  const token = await getAccessToken()
  if (!token) throw new Error('not connected')
  const res = await platformFetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`analyticsadmin ${res.status}`)
  const data = await res.json() as {
    accountSummaries?: {
      displayName: string
      propertySummaries?: { property: string; displayName: string }[]
    }[]
  }
  const out: { id: string; name: string }[] = []
  for (const acc of data.accountSummaries || []) {
    for (const p of acc.propertySummaries || []) {
      out.push({ id: p.property, name: `${acc.displayName} · ${p.displayName}` })
    }
  }
  return out
}

export async function fetchGa4Trend(property: string, days: number): Promise<{ date: string; sessions: number; views: number }[]> {
  const token = await getAccessToken()
  if (!token) throw new Error('not connected')
  const start = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
  const end = new Date().toISOString().slice(0, 10)
  const res = await platformFetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
  })
  if (!res.ok) throw new Error(`analyticsdata ${res.status}`)
  const report = await res.json() as Ga4Report
  return (report.rows || []).map(r => ({
    date: r.dimensionValues[0]?.value || '',
    sessions: Number(r.metricValues[0]?.value || 0),
    views: Number(r.metricValues[1]?.value || 0),
  }))
}

export async function fetchGa4TopPages(property: string, days: number): Promise<{ label: string; views: number }[]> {
  const token = await getAccessToken()
  if (!token) throw new Error('not connected')
  const start = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
  const end = new Date().toISOString().slice(0, 10)
  const res = await platformFetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
  })
  if (!res.ok) throw new Error(`analyticsdata ${res.status}`)
  const report = await res.json() as Ga4Report
  return (report.rows || []).map(r => ({
    label: r.dimensionValues[0]?.value || '',
    views: Number(r.metricValues[0]?.value || 0),
  }))
}

const GSC_SITE = encodeURIComponent('sc-domain:mitsa.dpdns.org')

export async function fetchGscSummary(days = 28): Promise<{ clicks: number; impressions: number; topQueries: { label: string; clicks: number }[]; trend: { date: string; clicks: number }[] }> {
  const token = await getAccessToken()
  if (!token) throw new Error('not connected')
  const base = {
    startDate: new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  }
  const call = async (body: Record<string, unknown>) => {
    const res = await platformFetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${GSC_SITE}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`searchconsole ${res.status}`)
    return res.json() as Promise<GscResponse>
  }
  const [totals, byQuery, byDate] = await Promise.all([
    call({ ...base }),
    call({ ...base, dimensions: ['query'], rowLimit: 10 }),
    call({ ...base, dimensions: ['date'] }),
  ])
  return {
    clicks: (totals.rows || []).reduce((s, r) => s + r.clicks, 0),
    impressions: (totals.rows || []).reduce((s, r) => s + r.impressions, 0),
    topQueries: (byQuery.rows || []).map(r => ({ label: r.keys[0], clicks: r.clicks })),
    trend: (byDate.rows || []).map(r => ({ date: r.keys[0], clicks: r.clicks })),
  }
}
