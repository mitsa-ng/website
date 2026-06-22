'use client'

import { useApp } from '../AppContext'
import Reveal from './Reveal'

export default function SkillsSection() {
  const { dict } = useApp()
  const skills = dict.skills as string[]
  return (
    <div className="content-white">
      <div className="section-label">{dict.sections.skills}</div>
      <Reveal>
        <div className="skill-grid">
          {skills.map((s: string) => (
            <span key={s} className="pill">{s}</span>
          ))}
        </div>
      </Reveal>
    </div>
  )
}
