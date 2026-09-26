export const dynamic = 'force-dynamic'

import { query } from '@/db'
import { SITE_ORIGIN } from '@/lib/seo'

const LOCALES = ['en', 'zh-TW'] as const
const SECTIONS = ['about', 'portfolio', 'blog', 'services', 'resume', 'contact'] as const

export async function GET() {
  const urls: { loc: string; freq: string; priority: number; lastmod?: string }[] = []

  for (const locale of LOCALES) {
    urls.push({ loc: `${SITE_ORIGIN}/${locale}`, freq: 'monthly', priority: 1.0 })
    for (const section of SECTIONS) {
      urls.push({
        loc: `${SITE_ORIGIN}/${locale}/${section}`,
        freq: section === 'portfolio' || section === 'blog' ? 'weekly' : 'monthly',
        priority: section === 'portfolio' ? 0.9 : section === 'about' || section === 'blog' ? 0.8 : 0.6,
      })
    }
  }

  try {
    const rows = await query<{ slug: string; published_at: string | null }>(
      `SELECT slug, published_at FROM posts WHERE published = true AND draft = false`,
    )
    for (const r of rows) {
      for (const locale of LOCALES) {
        urls.push({
          loc: `${SITE_ORIGIN}/${locale}/blog/${r.slug}`,
          freq: 'weekly',
          priority: 0.7,
          ...(r.published_at ? { lastmod: new Date(r.published_at).toISOString().slice(0, 10) } : {}),
        })
      }
    }
  } catch {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => {
  let entry = `  <url>\n    <loc>${u.loc}</loc>\n`
  if (u.lastmod) entry += `    <lastmod>${u.lastmod}</lastmod>\n`
  entry += `    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  return entry
}).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
