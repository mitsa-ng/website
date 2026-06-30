'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function RouteLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const prevPath = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      setLoading(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setLoading(false), 400)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  return (
    <div className={`route-loader${loading ? ' active' : ''}`}>
      <div className="route-loader-bar" />
    </div>
  )
}
