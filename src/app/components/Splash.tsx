'use client'

import { useEffect, useState } from 'react'

let shown = false

export default function Splash() {
  const [hidden, setHidden] = useState(shown)

  useEffect(() => {
    if (shown) return
    shown = true
    const timer = setTimeout(() => setHidden(true), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={`splash${hidden ? ' hidden' : ''}`}>
      <div className="mark"><span>P</span></div>
      <p>Personal Web</p>
    </div>
  )
}
