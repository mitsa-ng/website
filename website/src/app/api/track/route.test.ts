import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), ensure: vi.fn() }))

vi.mock('@/db', () => ({ query: mocks.query }))
vi.mock('@/lib/visits-table', () => ({ ensureVisitsTable: mocks.ensure }))
vi.mock('@/lib/cors', () => ({
  corsResponse: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  }),
}))

import { POST } from './route'

function trackReq(body: unknown, host = 'mitsa.dpdns.org'): Request {
  return new Request('https://mitsa.dpdns.org/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-host': host },
    body: JSON.stringify(body),
  })
}

function insertCall(): [string, unknown[]] {
  const call = mocks.query.mock.calls.find(c => c[0].includes('INSERT INTO visits'))
  if (!call) throw new Error('no insert call')
  return call as [string, unknown[]]
}

beforeEach(() => {
  mocks.query.mockReset()
  mocks.query.mockResolvedValue([])
  mocks.ensure.mockReset()
  mocks.ensure.mockResolvedValue(undefined)
})

describe('POST /api/track', () => {
  it('records a valid view for the production host', async () => {
    const res = await POST(trackReq({ p: '/en/blog/hello-www', l: 'en', r: 'google.com', s: 'abc123' }))
    expect(res.status).toBe(204)
    expect(mocks.ensure).toHaveBeenCalledTimes(1)
    const [sql, params] = insertCall()
    expect(sql).toContain('INSERT INTO visits')
    expect(params[1]).toBe('/en/blog/hello-www')
    expect(params[2]).toBe('en')
    expect(params[3]).toBe('google.com')
    expect(params[4]).toBe('abc123')
    expect(String(params[0])).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('ignores requests from preview and legacy hosts', async () => {
    for (const host of [
      'website-abc123-xingencai060-8997s-projects.vercel.app',
      'mitsa-ng.vercel.app',
      'localhost:3000',
    ]) {
      const res = await POST(trackReq({ p: '/en', l: 'en', s: 'x' }, host))
      expect(res.status).toBe(204)
    }
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('counts the www host as production', async () => {
    await POST(trackReq({ p: '/en', l: 'en', s: 'sess1' }, 'www.mitsa.dpdns.org'))
    expect(mocks.ensure).toHaveBeenCalledTimes(1)
    expect(insertCall()).toBeTruthy()
  })

  it('normalizes the locale and strips query from the path', async () => {
    await POST(trackReq({ p: '/zh-TW/about?utm=x', l: 'fr', r: '', s: 'sess1' }))
    const [, params] = insertCall()
    expect(params[1]).toBe('/zh-TW/about')
    expect(params[2]).toBe('en')
    expect(params[3]).toBeNull()
  })

  it('drops malformed payloads silently', async () => {
    for (const body of ['not-json', { p: 'no-leading-slash' }, { p: '/ok' }, { p: '/x'.repeat(50), s: 'y' }]) {
      const init: RequestInit = {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-host': 'mitsa.dpdns.org' },
      }
      if (typeof body === 'string') init.body = body
      else init.body = JSON.stringify(body)
      const res = await POST(new Request('https://mitsa.dpdns.org/api/track', init))
      expect(res.status).toBe(204)
    }
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('never fails the client on a database error', async () => {
    mocks.query.mockRejectedValue(new Error('db down'))
    const res = await POST(trackReq({ p: '/en', l: 'en', s: 'x' }))
    expect(res.status).toBe(204)
  })
})
