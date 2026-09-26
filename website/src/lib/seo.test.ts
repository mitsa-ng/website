import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_SITE_URL

async function freshSeo() {
  vi.resetModules()
  return import('@/lib/seo')
}

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_ENV
  vi.resetModules()
})

describe('SITE_ORIGIN / canonicalUrl', () => {
  it('falls back to the confirmed production origin, not nati.dev or vercel.app', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    const { SITE_ORIGIN } = await freshSeo()
    expect(SITE_ORIGIN).toBe('https://mitsa.dpdns.org')
    expect(SITE_ORIGIN).not.toContain('nati.dev')
    expect(SITE_ORIGIN).not.toContain('vercel.app')
  })

  it('prefers NEXT_PUBLIC_SITE_URL and trims a trailing slash', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/'
    const { SITE_ORIGIN } = await freshSeo()
    expect(SITE_ORIGIN).toBe('https://example.com')
  })

  it('builds absolute canonical URLs for locale-prefixed paths', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    const { canonicalUrl } = await freshSeo()
    expect(canonicalUrl('/en')).toBe('https://mitsa.dpdns.org/en')
    expect(canonicalUrl('/zh-TW/blog/hello-www')).toBe('https://mitsa.dpdns.org/zh-TW/blog/hello-www')
  })
})

describe('websiteJsonLd / personJsonLd', () => {
  it('emits JSON-LD urls on the unified origin', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    const { websiteJsonLd, personJsonLd } = await freshSeo()
    expect(websiteJsonLd().url).toBe('https://mitsa.dpdns.org')
    expect(personJsonLd({ url: undefined }).url).toBe('https://mitsa.dpdns.org')
  })
})

describe('robots()', () => {
  it('points the sitemap directive at the unified origin', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    vi.resetModules()
    const robots = (await import('@/app/robots')).default
    expect(robots().sitemap).toBe('https://mitsa.dpdns.org/sitemap.xml')
  })
})
