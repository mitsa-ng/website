'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '../AppContext'
import { getAboutContent } from '@/lib/about'
import type { AboutContent } from '@/lib/about'
import Reveal from './Reveal'

export default function HeroSection() {
  const { dict, locale } = useApp()
  const [about, setAbout] = useState<AboutContent | null>(null)
  const [avatarLoaded, setAvatarLoaded] = useState(false)
  const [bgLoaded, setBgLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  useEffect(() => { getAboutContent().then(setAbout) }, [])
  const a = about

  useEffect(() => {
    if (!a?.avatarUrl) { setAvatarLoaded(true); return }
    const img = new Image()
    imgRef.current = img
    img.onload = () => setAvatarLoaded(true)
    img.src = a.avatarUrl
    if (img.complete) setAvatarLoaded(true)
    return () => { img.onload = null }
  }, [a?.avatarUrl])

  useEffect(() => {
    if (!a?.heroBgImage) { setBgLoaded(true); return }
    const img = new Image()
    img.onload = () => setBgLoaded(true)
    img.src = a.heroBgImage
    if (img.complete) setBgLoaded(true)
    return () => { img.onload = null }
  }, [a?.heroBgImage])

  const bgStyle: React.CSSProperties | undefined =
    a?.heroBgImage || a?.heroBgColor
      ? {
          background: bgLoaded && a?.heroBgImage
            ? `url(${a.heroBgImage}) center/cover ${a?.heroBgColor || '#000'}`
            : a?.heroBgColor || '#000',
        }
      : undefined

  const textColor = a?.heroTextColor || undefined

  return (
    <div className="hero-dark" style={{ ...bgStyle, color: textColor }}>
      <Reveal>
        <div
          className={`avatar-img${a?.avatarUrl ? (avatarLoaded ? ' img-fade-in' : ' img-shimmer') : ' img-shimmer'}`}
          style={a?.avatarUrl && avatarLoaded ? { backgroundImage: `url(${a.avatarUrl})` } : undefined}
        />
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
