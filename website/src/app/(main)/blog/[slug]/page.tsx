import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { query } from '@/db'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import BlogNav from './nav'
import BlogActions from './actions'
import JsonLdServer from './jsonld'

interface PostRow {
  slug: string
  title_zh: string
  title_en: string
  content_zh: string
  content_en: string
  excerpt_zh: string
  excerpt_en: string
  published_at: Date | null
  fingerprint_zh: string | null
  fingerprint_en: string | null
}

function formatDate(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function toISO(d: Date | string | null): string | undefined {
  if (!d) return undefined
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export async function generateStaticParams() {
  try {
    const rows = await query<{ slug: string }>(
      `SELECT slug FROM posts WHERE published = true AND draft = false`,
    )
    return rows.map(r => ({ slug: r.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const h = await headers()
  const locale = h.get('x-locale') || 'en'

  try {
    const rows = await query<PostRow>(
      'SELECT * FROM posts WHERE slug = $1 AND published = true AND draft = false LIMIT 1',
      [slug],
    )
    if (rows.length === 0) return { title: 'Post Not Found' }

    const post = rows[0]
    const isZh = locale === 'zh-TW'
    const title = isZh ? post.title_zh : post.title_en
    const description = isZh ? post.excerpt_zh : post.excerpt_en

    return {
      title,
      description: description || undefined,
      openGraph: {
        title: `${title} | Nati's Web`,
        description: description || undefined,
        type: 'article',
        publishedTime: toISO(post.published_at),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | Nati's Web`,
        description: description || undefined,
      },
    }
  } catch {
    return { title: 'Post Not Found' }
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const h = await headers()
  const locale = h.get('x-locale') || 'en'

  let rows: PostRow[]
  try {
    rows = await query<PostRow>(
      'SELECT * FROM posts WHERE slug = $1 AND published = true AND draft = false LIMIT 1',
      [slug],
    )
  } catch {
    notFound()
  }
  if (rows.length === 0) notFound()

  const post = rows[0]
  const isZh = locale === 'zh-TW'
  const title = isZh ? post.title_zh : post.title_en
  const content = isZh ? post.content_zh : post.content_en
  const fingerprint = isZh ? post.fingerprint_zh : post.fingerprint_en
  const publishedAt = formatDate(post.published_at)

  return (
    <div className="page active page-entering">
      <JsonLdServer
        title={title}
        description={isZh ? post.excerpt_zh : post.excerpt_en}
        url={`/${locale}/blog/${slug}`}
        publishedAt={publishedAt}
      />
      <BlogNav />
      <div className="blog-page-body">
        <div className="date">{publishedAt}</div>
        <h1>{title}</h1>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {content || ''}
          </ReactMarkdown>
        </div>
        {fingerprint && (
          <BlogActions
            slug={slug}
            fingerprint={fingerprint}
            content={content || ''}
          />
        )}
      </div>
    </div>
  )
}
