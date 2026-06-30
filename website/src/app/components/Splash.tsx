'use client'

import { useEffect, useState } from 'react'

let shown = false

export default function Splash() {
  const [hidden, setHidden] = useState(shown)
  const [icon, setIcon] = useState('')

  useEffect(() => {
    if (shown) return
    shown = true

    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.site_icon) setIcon(d.site_icon) })
      .catch(() => {})

    const minShow = setTimeout(() => setHidden(true), 1500)
    return () => clearTimeout(minShow)
  }, [])

  return (
    <div className={`splash${hidden ? ' hidden' : ''}`}>
      <div className="mark">
        {icon ? (
          <img src={icon} alt="" className="splash-icon" />
        ) : (
          <span>N</span>
        )}
      </div>
      <p>Made by Nati</p>
    </div>
  )
}
