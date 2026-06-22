'use client'

import { useApp } from '../AppContext'
import Reveal from './Reveal'

interface Experience {
  period: string
  title: string
  org: string
}

export default function TimelineSection() {
  const { dict } = useApp()
  const exp = dict.experience as Experience[]
  return (
    <div className="content-light">
      <div className="section-label">{dict.sections.experience}</div>
      <div className="timeline">
        {exp.map((e: Experience, i: number) => (
          <Reveal key={i} delay={Math.min(i, 3)}>
            <div className="timeline-item">
              <div className="period">{e.period}</div>
              <h3>{e.title}</h3>
              <div className="org">{e.org}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
