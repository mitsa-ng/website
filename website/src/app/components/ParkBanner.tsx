'use client'

import { useState } from 'react'
import { useApp } from '../AppContext'

const PARK_URL = 'https://park.mitsa.dpdns.org'

export default function ParkBanner() {
  const { locale } = useApp()
  const [show, setShow] = useState(true)

  if (!show) return null

  const text = locale === 'zh-TW'
    ? '找停車位？ParkWhere 已搬遷至新網址'
    : 'Looking for ParkWhere? It has moved to a new address'
  const cta = locale === 'zh-TW' ? '前往 ParkWhere →' : 'Go to ParkWhere →'

  return (
    <div className="park-banner" role="note">
      <span className="park-banner-text">{text}</span>
      <a className="park-banner-link" href={PARK_URL} target="_blank" rel="noopener">{cta}</a>
      <button
        className="park-banner-close"
        aria-label={locale === 'zh-TW' ? '關閉' : 'Dismiss'}
        onClick={() => setShow(false)}
      >
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}
