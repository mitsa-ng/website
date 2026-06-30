'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function BlogActions({
  slug,
  fingerprint,
  content,
}: {
  slug: string
  fingerprint: string
  content: string
}) {
  const [copied, setCopied] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const about = typeof d.about_content === 'string' ? JSON.parse(d.about_content) : d.about_content
        if (about?.avatarUrl) setAvatarUrl(about.avatarUrl)
      })
      .catch(() => {})
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="fingerprint-section">
      <div className="fingerprint-divider" />
      <div className="fingerprint-label">Content Fingerprint (SHA-256)</div>
      <div className="fingerprint-qr">
        <QRCodeSVG
          value={`${baseUrl}/verify/${slug}`}
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
        {copied ? 'Copied!' : 'Copy raw content for verification'}
      </button>
      <a className="fingerprint-link" href={`/verify/${slug}`}>
        Verify authenticity →
      </a>
    </div>
  )
}
