import type { MetadataRoute } from 'next'
import { query } from '@/db'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nati.dev'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { url: BASE, changeFrequency: 'monthly' as const, priority: 1.0 },
    { url: `${BASE}/about`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE}/portfolio`, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE}/blog`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/services`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/resume`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/contact`, changeFrequency: 'monthly' as const, priority: 0.5 },
  ]

  try {
    const rows = await query<{ slug: string; published_at: string | null }>(
      `SELECT slug, published_at FROM posts WHERE published = true AND draft = false`,
    )

    const blogPages: MetadataRoute.Sitemap = rows.map(r => ({
      url: `${BASE}/blog/${r.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      lastModified: r.published_at ? new Date(r.published_at) : undefined,
    }))

    return [...staticPages, ...blogPages]
  } catch {
    return staticPages
  }
}
