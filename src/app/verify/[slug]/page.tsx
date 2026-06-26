'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createHash } from 'crypto'
import { useApp } from '@/app/AppContext'
import { transformKeys } from '@/lib/transform'
import { QRCodeSVG } from 'qrcode.react'

interface PostData {
  slug: string
  titleZh: string
  titleEn: string
  contentZh: string
  contentEn: string
  fingerprintZh?: string
  fingerprintEn?: string
}

type VerifyStatus = 'idle' | 'match' | 'mismatch'

export default function VerifyPage() {
  const params = useParams()
  const router = useRouter()
  const { locale } = useApp()
  const [post, setPost] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pastedContent, setPastedContent] = useState('')
  const [status, setStatus] = useState<VerifyStatus>('idle')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false)
  const [fingerprintMethod, setFingerprintMethod] = useState('hash')
  const slug = params.slug as string
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (!slug) return
    Promise.all([
      fetch(`/api/posts/${slug}`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([postData, settingsData]) => {
      if (postData.error) return
      setPost(transformKeys<PostData>(postData))
      const about = typeof settingsData.about_content === 'string'
        ? JSON.parse(settingsData.about_content)
        : settingsData.about_content
      if (about?.avatarUrl) setAvatarUrl(about.avatarUrl)
      setFingerprintEnabled(!!settingsData.fingerprint_enabled)
      if (settingsData.fingerprint_method) setFingerprintMethod(settingsData.fingerprint_method)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [slug])

  const title = locale === 'zh-TW' ? post?.titleZh : post?.titleEn
  const fingerprint = locale === 'zh-TW' ? post?.fingerprintZh : post?.fingerprintEn

  const handleVerify = () => {
    if (!pastedContent.trim() || !fingerprint) return
    if (fingerprintMethod === 'signature') {
      setStatus('mismatch')
      return
    }
    const hash = createHash('sha256').update(pastedContent).digest('hex')
    setStatus(hash === fingerprint ? 'match' : 'mismatch')
  }

  if (loading) {
    return (
      <div className="verify-page">
        <div className="verify-container">
          <p className="verify-message">Loading...</p>
        </div>
      </div>
    )
  }

  if (!fingerprintEnabled) {
    return (
      <div className="verify-page">
        <div className="verify-container">
          <p className="verify-message">Content fingerprint is disabled for this site.</p>
          <button className="btn btn-outline" onClick={() => router.push(`/blog/${slug}`)}>Back to article</button>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="verify-page">
        <div className="verify-container">
          <p className="verify-message">Post not found.</p>
          <button className="btn btn-outline" onClick={() => router.push('/?tab=blog')}>Back to blog</button>
        </div>
      </div>
    )
  }

  return (
    <div className="verify-page">
      <div className="verify-container">
        <button className="verify-back" onClick={() => router.push(`/blog/${slug}`)}>
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          Back to article
        </button>

        <h1 className="verify-title">Content Authenticity Verification</h1>
        <p className="verify-subtitle">{title}</p>

        <div className="verify-qr-wrap">
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
        </div>

        <div className="verify-fingerprint">
          <div className="verify-fp-label">Expected Fingerprint {fingerprintMethod === 'signature' ? '(Signed)' : '(SHA-256)'}</div>
          <code className="verify-fp-value">{fingerprint}</code>
        </div>

        <div className="verify-paste-section">
          <label className="verify-paste-label">
            {locale === 'zh-TW' ? '貼上原始文章內容以驗證完整性：' : 'Paste the article content below to verify its integrity:'}
          </label>
          <p className="verify-paste-hint">
            {locale === 'zh-TW'
              ? '提示：請使用原始內容（Markdown）進行驗證，而非瀏覽器渲染後的文字。您可以從文章頁面點擊「複製原始內容以供驗證」取得。'
              : 'Tip: Paste the raw Markdown content, not the rendered text. Use the "Copy raw content for verification" button on the article page.'}
          </p>
          <textarea
            className="verify-textarea"
            rows={8}
            value={pastedContent}
            onChange={e => { setPastedContent(e.target.value); setStatus('idle') }}
            placeholder="Paste the full article content here..."
          />
          <button
            className="btn btn-primary verify-btn"
            onClick={handleVerify}
            disabled={!pastedContent.trim()}
          >
            Verify
          </button>
        </div>

        {status === 'match' && (
          <div className="verify-result verify-result-match">
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>
            <div>
              <strong>Content verified</strong>
              <p>The content matches the original fingerprint. It has not been tampered with.</p>
            </div>
          </div>
        )}

        {status === 'mismatch' && (
          <div className="verify-result verify-result-mismatch">
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/></svg>
            <div>
              <strong>Content modified</strong>
              <p>The content does NOT match the original fingerprint. It may have been altered.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
