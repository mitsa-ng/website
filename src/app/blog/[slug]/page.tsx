'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp, type PageSection } from '@/app/AppContext'
import { transformKeys } from '@/lib/transform'
import { QRCodeSVG } from 'qrcode.react'
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
  fingerprintZh?: string
  fingerprintEn?: string
}

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const { locale } = useApp()
  const [post, setPost] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false)
  const [fingerprintMethod, setFingerprintMethod] = useState('hash')
  const [copied, setCopied] = useState(false)
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
        setPost(transformKeys<PostData>(data))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  // Fetch settings for avatar + fingerprint config
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const about = typeof d.about_content === 'string' ? JSON.parse(d.about_content) : d.about_content
        if (about?.avatarUrl) setAvatarUrl(about.avatarUrl)
        setFingerprintEnabled(!!d.fingerprint_enabled)
        if (d.fingerprint_method) setFingerprintMethod(d.fingerprint_method)
      })
      .catch(() => {})
  }, [])

  const title = locale === 'zh-TW' ? post?.titleZh : post?.titleEn
  const content = locale === 'zh-TW' ? post?.contentZh : post?.contentEn
  const fingerprint = locale === 'zh-TW' ? post?.fingerprintZh : post?.fingerprintEn
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleCopy = async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

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
            {fingerprintEnabled && fingerprint && (
              <div className="fingerprint-section">
                <div className="fingerprint-divider" />
                <div className="fingerprint-label">Content Fingerprint {fingerprintMethod === 'signature' ? '(Signed)' : '(SHA-256)'}</div>
                <div className="fingerprint-qr">
                  <QRCodeSVG
                    value={`${baseUrl}/verify/${post.slug}`}
                    size={160}
                    level="M"
                    fgColor="#0071e3"
                    bgColor="transparent"
                    marginSize={2}
                    imageSettings={avatarUrl ? {
                      src: avatarUrl,
                      width: 32,
                      height: 32,
                      excavate: true,
                    } : undefined}
                  />
                </div>
                <div className="fingerprint-hash">{fingerprint}</div>
                <button className="fingerprint-copy-btn" onClick={handleCopy}>
                  {copied
                    ? (locale === 'zh-TW' ? '已複製原始內容' : 'Copied!')
                    : (locale === 'zh-TW' ? '複製原始內容以供驗證' : 'Copy raw content for verification')}
                </button>
                <a className="fingerprint-link" href={`/verify/${post.slug}`}>
                  {locale === 'zh-TW' ? '驗證真實性 →' : 'Verify authenticity →'}
                </a>
              </div>
            )}
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
