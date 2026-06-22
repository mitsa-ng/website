'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp, type PageSection } from '@/app/AppContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import TabBar from '@/app/components/TabBar'
import NavDesktop from '@/app/components/NavDesktop'

interface PostData {
  slug: string
  titleZh: string
  titleEn: string
  contentZh: string
  contentEn: string
  publishedAt: string
}

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const { locale } = useApp()
  const [post, setPost] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)
  const slug = params.slug as string

// Add class on mount and cleanup on unmount
useEffect(() => {
  const el = document.documentElement
  el.classList.add('blog-page-active')
  return () => el.classList.remove('blog-page-active')
}, [])
   
  // Fetch post data
  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/posts/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return
        setPost(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const title = locale === 'zh-TW' ? post?.titleZh : post?.titleEn
  const content = locale === 'zh-TW' ? post?.contentZh : post?.contentEn

  const handleNavigate = (key: PageSection) => {
    router.replace(`/?tab=${key}`)
  }

  return (
    <div className="blog-page">
      <NavDesktop />
      <div className="blog-page-header" style={{ zIndex: 200 }}>
        <button onClick={() => router.push('/?tab=blog')} aria-label="Back">
          <svg viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        </button>
        <span>Article</span>
      </div>
      <div className="blog-page-body">
        {loading && <p className="blog-page-message">Loading...</p>}
        {!loading && post && (
          <>
            <div className="date">{post.publishedAt?.slice(0, 10)}</div>
            <h1>{title}</h1>
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {content || ''}
              </ReactMarkdown>
            </div>
          </>
        )}
        {!loading && !post && (
          <p className="blog-page-message">Post not found.</p>
        )}
      </div>
      <TabBar onNavigate={handleNavigate} />
    </div>
  )
}
