'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

function sessionId(): string {
  try {
    let s = sessionStorage.getItem('vtsid')
    if (!s) {
      s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      sessionStorage.setItem('vtsid', s)
    }
    return s
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2, 10)
  }
}

export default function VisitTracker() {
  const lastSent = useRef<string | null>(null)
  // Internal path changes on every client-side navigation; use it as the
  // trigger but report the public URL the visitor actually sees.
  const pathname = usePathname()

  useEffect(() => {
    try {
      const path = window.location.pathname
      if (lastSent.current === path) return
      lastSent.current = path

      let referrer: string | null = null
      if (document.referrer) {
        try { referrer = new URL(document.referrer).hostname } catch {}
      }

      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p: path,
          l: document.documentElement.getAttribute('data-locale') || 'en',
          r: referrer,
          s: sessionId(),
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [pathname])

  return null
}
