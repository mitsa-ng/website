'use client'

import { useApp } from '../AppContext'
import Reveal from './Reveal'

export default function StatsSection() {
  const { dict } = useApp()
  const stats = dict.stats as Record<string, { num: string; label: string }>
  return (
    <div className="content-light">
      <div className="stats-row">
        {Object.entries(stats).map(([key, s], i) => (
          <Reveal key={key} delay={i + 1}>
            <div className="stat-card">
              <div className="num">{s.num}</div>
              <div className="label">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
