'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { getAboutContent } from '@/lib/about'
import type { AboutContent } from '@/lib/about'
import Reveal from './Reveal'

export default function HeroSection() {
  const { dict, locale } = useApp()
  const [about, setAbout] = useState<AboutContent | null>(null)
  useEffect(() => { getAboutContent().then(setAbout) }, [])
  const a = about

  return (
    <div className="hero-dark">
      <Reveal>
        {a?.avatarUrl ? (
          <div className="avatar-img" style={{ backgroundImage: `url(${a.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '50%', width: 80, height: 80, margin: '0 auto' }} />
        ) : (
          <div className="avatar-mono">P</div>
        )}
      </Reveal>
      <Reveal delay={1}>
        <h1>{a ? (locale === 'zh-TW' ? a.nameZh : a.nameEn) : dict.hero.name}</h1>
      </Reveal>
      <Reveal delay={2}>
        <p className="subtitle">{a ? (locale === 'zh-TW' ? a.subtitleZh : a.subtitleEn) : dict.hero.subtitle}</p>
      </Reveal>
      <Reveal delay={3}>
        <p className="bio">{a ? (locale === 'zh-TW' ? a.bioZh : a.bioEn) : dict.hero.bio}</p>
      </Reveal>
    </div>
  )
}
