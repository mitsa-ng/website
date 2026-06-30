'use client'

import { useEffect, useState } from 'react'
import Img from './Img'

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
          <Img src={icon} alt="" wrapClassName="splash-icon" wrapStyle={{ width: '100%', height: '100%', borderRadius: 18 }} />
        ) : (
          <span>N</span>
        )}
      </div>
      <p>Made by Nati</p>
    </div>
  )
}
