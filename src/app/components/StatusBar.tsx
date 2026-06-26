'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'

function formatDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === 'zh-TW' ? 'zh-Hans-CN' : 'en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  })
}

export default function StatusBar() {
  const { setDrawerOpen } = useApp()
  const [time, setTime] = useState('')

  useEffect(() => {
    setTime(formatDate(new Date(), 'en'))
    const timer = setInterval(() => setTime(formatDate(new Date(), 'en')), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="app-status">
      <time>{time}</time>
      <button className="menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">
        <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      </button>
    </div>
  )
}
