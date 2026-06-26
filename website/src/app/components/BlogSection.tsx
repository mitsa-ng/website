'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '../AppContext'
import { usePoll } from '@/lib/usePoll'
import Reveal from './Reveal'

interface BlogPost {
  slug: string
  titleZh: string
  titleEn: string
  excerptZh: string
  excerptEn: string
  publishedAt: string
}

export default function BlogSection() {
  const { dict, locale } = useApp()
  const router = useRouter()
  const { data: posts } = usePoll<BlogPost[]>('/api/posts')

  const titleKey = locale === 'zh-TW' ? 'titleZh' as const : 'titleEn' as const
  const excerptKey = locale === 'zh-TW' ? 'excerptZh' as const : 'excerptEn' as const

  return (
    <>
      <div className="page-header">
        <h2>{dict.nav.blog}</h2>
        <span className="count">{(posts || []).length}</span>
      </div>
      <div className="blog-list">
        {(posts || []).map((post, i) => (
          <Reveal key={post.slug} delay={Math.min(i, 3)}>
            <div className="blog-card" onClick={() => router.push(`/blog/${post.slug}`)} style={{ cursor: 'pointer' }}>
              <div className="date">{post.publishedAt?.slice(0, 10)}</div>
              <h3>{post[titleKey]}</h3>
              <p>{post[excerptKey]}</p>
              <span className="read-more">{dict.blog.readMore} →</span>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  )
}
