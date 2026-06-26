'use client'

import { useEffect, useState } from 'react'
import { transformKeys } from './transform'

export function usePoll<T = unknown>(url: string, intervalMs = 30_000) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetch_ = () => {
      setLoading(true)
      fetch(url)
        .then(r => r.json())
        .then(d => { if (!cancelled && (!d.error || Array.isArray(d))) setData(transformKeys<T>(d)) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false) })
    }

    fetch_()
    const id = setInterval(fetch_, intervalMs)
    const onVisible = () => { if (document.visibilityState === 'visible') fetch_() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [url, intervalMs])

  return { data, loading }
}
