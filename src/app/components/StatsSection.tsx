'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { getAboutContent } from '@/lib/about'
import type { AboutContent } from '@/lib/about'
import Reveal from './Reveal'

export default function StatsSection() {
  const { dict, locale } = useApp()
  const [about, setAbout] = useState<AboutContent | null>(null)
  useEffect(() => { getAboutContent().then(setAbout) }, [])
  const stats = about?.stats ?? null

  return (
    <div className="content-light">
      <div className="stats-row">
        {(stats || Object.entries(dict.stats as Record<string, { num: string; label: string }>)).map((item, i) => {
          const num = stats ? (item as { id: string; num: string; labelZh: string; labelEn: string }).num : (item as [string, { num: string; label: string }])[1].num
          const label = stats ? (locale === 'zh-TW' ? (item as { id: string; num: string; labelZh: string; labelEn: string }).labelZh : (item as { id: string; num: string; labelZh: string; labelEn: string }).labelEn) : (item as [string, { num: string; label: string }])[1].label
          return (
            <Reveal key={i} delay={i + 1}>
              <div className="stat-card">
                <div className="num">{num}</div>
                <div className="label">{label}</div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
