import { query } from '@/db';
import { ensureVisitsTable } from '@/lib/visits-table';

const TRACKED_HOSTS = new Set(['mitsa.dpdns.org', 'www.mitsa.dpdns.org'])
const LOCALES = new Set(['en', 'zh-TW'])
// The site owner is in Taipei; a "day" of traffic means a Taipei day.
const TIMEZONE = 'Asia/Taipei'

function taipeiToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null
  let p = raw.split(/[?#]/)[0]
  if (p.length > 200) return null
  if (!/^\/[A-Za-z0-9\-._~\/]*$/.test(p)) return null
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p || '/'
}

function normalizeReferrer(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null
  if (!/^[A-Za-z0-9.\-]{1,100}$/.test(raw)) return null
  return raw.toLowerCase()
}

function normalizeSession(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_\-]{4,64}$/.test(raw)) return null
  return raw
}

type TrackBody = { p?: unknown; l?: unknown; r?: unknown; s?: unknown }

export async function POST(req: Request) {
  try {
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
      .split(',')[0].trim().toLowerCase()
    if (!TRACKED_HOSTS.has(host)) return new Response(null, { status: 204 })

    const body = await req.json().catch(() => null) as TrackBody | null
    if (!body || typeof body !== 'object') return new Response(null, { status: 204 })

    const path = normalizePath(body.p)
    const session = normalizeSession(body.s)
    if (!path || !session) return new Response(null, { status: 204 })

    const locale = LOCALES.has(body.l as string) ? body.l as string : 'en'
    const referrer = normalizeReferrer(body.r)

    await ensureVisitsTable()
    await query(
      'INSERT INTO visits (day, path, locale, referrer_host, session_id) VALUES ($1,$2,$3,$4,$5)',
      [taipeiToday(), path, locale, referrer, session],
    )
  } catch {}

  // A beacon must never retry or surface errors to the visitor.
  return new Response(null, { status: 204 })
}
