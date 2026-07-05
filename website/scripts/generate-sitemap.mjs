import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { Pool } = pg
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mitsa-ng.vercel.app'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const urls = [
    { loc: `${BASE}/`, priority: 1.0, changefreq: 'monthly' },
    { loc: `${BASE}/about`, priority: 0.8, changefreq: 'monthly' },
    { loc: `${BASE}/portfolio`, priority: 0.9, changefreq: 'weekly' },
    { loc: `${BASE}/blog`, priority: 0.8, changefreq: 'weekly' },
    { loc: `${BASE}/services`, priority: 0.7, changefreq: 'monthly' },
    { loc: `${BASE}/resume`, priority: 0.6, changefreq: 'monthly' },
    { loc: `${BASE}/contact`, priority: 0.5, changefreq: 'monthly' },
  ]

  try {
    const result = await pool.query(
      `SELECT slug, published_at FROM posts WHERE published = true AND draft = false`
    )
    for (const row of result.rows) {
      urls.push({
        loc: `${BASE}/blog/${row.slug}`,
        priority: 0.7,
        changefreq: 'weekly',
        ...(row.published_at
          ? { lastmod: new Date(row.published_at).toISOString().slice(0, 10) }
          : {}),
      })
    }
  } catch (e) {
    console.warn('⚠️ Failed to fetch blog posts for sitemap:', e.message)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => {
  let entry = `  <url>\n    <loc>${u.loc}</loc>\n`
  if (u.lastmod) entry += `    <lastmod>${u.lastmod}</lastmod>\n`
  entry += `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  return entry
}).join('\n')}
</urlset>`

  writeFileSync(join(__dirname, '../public/sitemap.xml'), xml, 'utf-8')
  console.log('✅ sitemap.xml generated —', urls.length, 'URLs')
  await pool.end()
}

main().catch(e => { console.error('❌ Sitemap generation failed:', e); process.exit(1) })
