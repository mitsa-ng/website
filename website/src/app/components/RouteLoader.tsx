'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '../AppContext'

export default function RouteLoader() {
  const pathname = usePathname()
  const { navigating, setNavigating } = useApp()

  useEffect(() => {
    if (navigating) {
      setNavigating(false)
    }
  }, [pathname])

  return (
    <div className={`route-loader${navigating ? ' active' : ''}`}>
      <div className="route-loader-bar" />
    </div>
  )
}
