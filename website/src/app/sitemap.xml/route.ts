import { query } from '@/db'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mitsa-ng.vercel.app'

export async function GET() {
  const urls: { loc: string; freq: string; priority: number; lastmod?: string }[] = [
    { loc: `${BASE}/`, freq: 'monthly', priority: 1.0 },
    { loc: `${BASE}/about`, freq: 'monthly', priority: 0.8 },
    { loc: `${BASE}/portfolio`, freq: 'weekly', priority: 0.9 },
    { loc: `${BASE}/blog`, freq: 'weekly', priority: 0.8 },
    { loc: `${BASE}/services`, freq: 'monthly', priority: 0.7 },
    { loc: `${BASE}/resume`, freq: 'monthly', priority: 0.6 },
    { loc: `${BASE}/contact`, freq: 'monthly', priority: 0.5 },
  ]

  try {
    const rows = await query<{ slug: string; published_at: string | null }>(
      `SELECT slug, published_at FROM posts WHERE published = true AND draft = false`,
    )
    for (const r of rows) {
      urls.push({
        loc: `${BASE}/blog/${r.slug}`,
        freq: 'weekly',
        priority: 0.7,
        ...(r.published_at ? { lastmod: new Date(r.published_at).toISOString().slice(0, 10) } : {}),
      })
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
