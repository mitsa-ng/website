'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { getAboutContent } from '@/lib/about'
import type { AboutContent } from '@/lib/about'
import Reveal from './Reveal'

export default function SkillsSection() {
  const { dict, locale } = useApp()
  const [about, setAbout] = useState<AboutContent | null>(null)
  useEffect(() => { getAboutContent().then(setAbout) }, [])
  const skills = about ? (locale === 'zh-TW' ? about.skillsZh : about.skillsEn) : null

  return (
    <div className="content-white">
      <div className="section-label">{dict.sections.skills}</div>
      <Reveal>
        <div className="skill-grid">
          {(skills || (dict.skills as string[])).map((s: string) => (
            <span key={s} className="pill">{s}</span>
          ))}
        </div>
      </Reveal>
    </div>
  )
}
