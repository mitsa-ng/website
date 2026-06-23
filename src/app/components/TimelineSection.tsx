'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { getAboutContent } from '@/lib/about'
import type { AboutContent } from '@/lib/about'
import Reveal from './Reveal'

export default function TimelineSection() {
  const { dict, locale } = useApp()
  const [about, setAbout] = useState<AboutContent | null>(null)
  useEffect(() => { getAboutContent().then(setAbout) }, [])
  const exp = about?.experience ?? null

  return (
    <div className="content-light">
      <div className="section-label">{dict.sections.experience}</div>
      <div className="timeline">
        {(exp || (dict.experience as { period: string; title: string; org: string }[])).map((e: any, i: number) => {
          const period = e.period
          const title = exp ? (locale === 'zh-TW' ? e.titleZh : e.titleEn) : e.title
          const org = exp ? (locale === 'zh-TW' ? e.orgZh : e.orgEn) : e.org
          return (
            <Reveal key={i} delay={Math.min(i, 3)}>
              <div className="timeline-item">
                <div className="period">{period}</div>
                <h3>{title}</h3>
                <div className="org">{org}</div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
