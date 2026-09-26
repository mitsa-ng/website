import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/cors', () => ({
  resolveAllowedOrigin: () => null,
}))
vi.mock('@/lib/seo', () => ({
  SITE_ORIGIN: 'https://mitsa.dpdns.org',
}))

import { proxy } from './proxy'

const rewriteSpy = vi.spyOn(NextResponse, 'rewrite')
const redirectSpy = vi.spyOn(NextResponse, 'redirect')
const nextSpy = vi.spyOn(NextResponse, 'next')

function req(path: string, init?: RequestInit): NextRequest {
  return new NextRequest(path.startsWith('http') ? path : `http://testhost${path}`, init)
}

beforeEach(() => {
  rewriteSpy.mockClear()
  redirectSpy.mockClear()
  nextSpy.mockClear()
})

describe('locale rewrite keeps query and locale context', () => {
  it('rewrites /{locale}/... to the internal path preserving the full query', () => {
    const res = proxy(req('/zh-TW/blog/hello-www?utm_source=x&page=2'))
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(rewriteSpy).toHaveBeenCalledTimes(1)
    const [url] = rewriteSpy.mock.calls[0]
    expect(url.pathname).toBe('/blog/hello-www')
    expect(url.search).toBe('?utm_source=x&page=2')
    expect(res.headers.get('x-locale')).toBe('zh-TW')
    expect(res.cookies.get('locale')?.value).toBe('zh-TW')
  })

  it('passes x-locale and the internal path to the app via request headers', () => {
    proxy(req('/zh-TW/about'))
    const [, init] = rewriteSpy.mock.calls[0]
    const headers = init?.request?.headers as Headers
    expect(headers.get('x-locale')).toBe('zh-TW')
    expect(headers.get('x-pathname')).toBe('/about')
  })

  it('keeps unknown tab values on the homepage rewrite instead of guessing a route', () => {
    proxy(req('/en?tab=unknown&keep=1'))
    expect(redirectSpy).not.toHaveBeenCalled()
    const [url] = rewriteSpy.mock.calls[0]
    expect(url.pathname).toBe('/')
    expect(url.search).toBe('?tab=unknown&keep=1')
  })
})

describe('legacy ?tab= mapping', () => {
  it.each(['about', 'portfolio', 'blog', 'services', 'resume', 'contact'] as const)(
    'maps /{locale}?tab=%s to the dedicated route, consuming only the tab param',
    tab => {
      proxy(req(`/en?tab=${tab}&utm_source=x`))
      expect(redirectSpy).toHaveBeenCalledTimes(1)
      const [target] = redirectSpy.mock.calls[0]
      expect(target.pathname).toBe(`/en/${tab}`)
      expect(target.search).toBe('?utm_source=x')
    },
  )

  it('maps a no-locale /?tab= link straight to the final locale route (single hop)', () => {
    proxy(req('/?tab=blog&utm_source=x'))
    expect(redirectSpy).toHaveBeenCalledTimes(1)
    const [target] = redirectSpy.mock.calls[0]
    expect(target.pathname).toBe('/en/blog')
    expect(target.search).toBe('?utm_source=x')
  })
})

describe('no-locale requests redirect with query preserved', () => {
  it('preserves query params that today get dropped', () => {
    proxy(req('/?utm_source=test&utm_campaign=move'))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.pathname).toBe('/en/')
    expect(target.search).toBe('?utm_source=test&utm_campaign=move')
  })

  it('preserves query on deep paths', () => {
    proxy(req('/blog/hello-www?page=2'))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.pathname).toBe('/en/blog/hello-www')
    expect(target.search).toBe('?page=2')
  })
})

describe('locale resolution priority: URL > cookie > Accept-Language > en', () => {
  it('uses a valid locale cookie before Accept-Language', () => {
    proxy(req('/about', { headers: { cookie: 'locale=zh-TW', 'accept-language': 'en-US,en' } }))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.pathname).toBe('/zh-TW/about')
  })

  it('ignores an invalid cookie value and falls back to Accept-Language', () => {
    proxy(req('/about', { headers: { cookie: 'locale=fr', 'accept-language': 'zh-TW,zh;q=0.9,en' } }))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.pathname).toBe('/zh-TW/about')
  })

  it('defaults to en with no cookie and non-zh Accept-Language', () => {
    proxy(req('/about', { headers: { 'accept-language': 'en-US,en;q=0.9' } }))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.pathname).toBe('/en/about')
  })
})

describe('API and static paths bypass locale routing', () => {
  it('lets public API GETs through without redirect or rewrite', () => {
    const res = proxy(req('/api/posts'))
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(rewriteSpy).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('answers API preflight with 204', () => {
    const res = proxy(req('/api/posts', { method: 'OPTIONS' }))
    expect(res.status).toBe(204)
    expect(redirectSpy).not.toHaveBeenCalled()
  })

  it('does not redirect Next.js assets', () => {
    proxy(req('/_next/static/chunks/app.js'))
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(rewriteSpy).not.toHaveBeenCalled()
  })

  it('leaves sitemap.xml and robots.txt untouched', () => {
    proxy(req('/sitemap.xml'))
    proxy(req('/robots.txt'))
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(rewriteSpy).not.toHaveBeenCalled()
  })
})

describe('unknown content paths are not sent to the homepage', () => {
  it('redirects an unknown no-locale path to the same locale path (app then 404s)', () => {
    proxy(req('/no-such-page?keep=1'))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.pathname).toBe('/en/no-such-page')
    expect(target.search).toBe('?keep=1')
  })

  it('rewrites an unknown path under a locale to itself (real 404 from the app)', () => {
    proxy(req('/en/no-such-page'))
    const [url] = rewriteSpy.mock.calls[0]
    expect(url.pathname).toBe('/no-such-page')
  })
})

describe('legacy host redirects (mitsa-ng.vercel.app, www.mitsa.dpdns.org)', () => {
  it('redirects a no-locale legacy path to the new origin with fixed en, query preserved', () => {
    proxy(req('https://mitsa-ng.vercel.app/blog/hello-www?utm_source=x'))
    expect(redirectSpy).toHaveBeenCalledTimes(1)
    const [target, status] = redirectSpy.mock.calls[0]
    expect(target.href).toBe('https://mitsa.dpdns.org/en/blog/hello-www?utm_source=x')
    expect(status).toBe(307)
  })

  it('keeps the explicit locale of an old shared URL', () => {
    proxy(req('https://mitsa-ng.vercel.app/zh-TW/portfolio?keep=1'))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.href).toBe('https://mitsa.dpdns.org/zh-TW/portfolio?keep=1')
  })

  it('maps a legacy homepage ?tab= straight to the final route (single hop)', () => {
    proxy(req('https://mitsa-ng.vercel.app/?tab=resume&keep=1'))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.href).toBe('https://mitsa.dpdns.org/en/resume?keep=1')
  })

  it('redirects legacy verify links (old QR codes) with query intact', () => {
    proxy(req('https://mitsa-ng.vercel.app/verify/nati-intro'))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.href).toBe('https://mitsa.dpdns.org/en/verify/nati-intro')
  })

  it('redirects www to the final locale URL on the apex (single hop)', () => {
    proxy(req('https://www.mitsa.dpdns.org/portfolio'))
    const [target] = redirectSpy.mock.calls[0]
    expect(target.href).toBe('https://mitsa.dpdns.org/en/portfolio')
  })

  it('never redirects API paths on the legacy host (desktop Admin keeps working)', () => {
    const res = proxy(req('https://mitsa-ng.vercel.app/api/posts'))
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(rewriteSpy).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('never redirects non-GET/HEAD requests across hosts on the legacy host', () => {
    proxy(req('https://mitsa-ng.vercel.app/contact', { method: 'POST' }))
    const crossHost = redirectSpy.mock.calls.some(([target]) => target.host === 'mitsa.dpdns.org')
    expect(crossHost).toBe(false)
  })

  it('leaves preview/deployment hostnames untouched', () => {
    proxy(req('https://website-dqpecbbvq-xingencai060-8997s-projects.vercel.app/en/about'))
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(rewriteSpy).toHaveBeenCalled()
  })
})
