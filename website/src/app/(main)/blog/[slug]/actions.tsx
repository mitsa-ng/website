'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

function toRawUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
      const parts = u.pathname.split('/')
      const blobIndex = parts.indexOf('blob')
      const user = parts[1]
      const repo = parts[2]
      const branch = parts[blobIndex + 1]
      const path = parts.slice(blobIndex + 2).join('/')
      return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`
    }
  } catch {}
  return url
}

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
  const [rawUrl, setRawUrl] = useState('')
  const [imageOk, setImageOk] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const about = typeof d.about_content === 'string' ? JSON.parse(d.about_content) : d.about_content
        if (about?.avatarUrl) setRawUrl(toRawUrl(about.avatarUrl))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!rawUrl) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImageOk(true)
    img.src = rawUrl
  }, [rawUrl])

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
          marginSize={2}
          imageSettings={imageOk ? {
            src: rawUrl,
            width: 32,
            height: 32,
            excavate: true,
            crossOrigin: 'anonymous',
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
