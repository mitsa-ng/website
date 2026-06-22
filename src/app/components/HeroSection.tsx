'use client'

import { useApp } from '../AppContext'
import Reveal from './Reveal'

export default function HeroSection() {
  const { dict } = useApp()
  return (
    <div className="hero-dark">
      <Reveal>
        <div className="avatar-mono">P</div>
      </Reveal>
      <Reveal delay={1}>
        <h1>{dict.hero.name}</h1>
      </Reveal>
      <Reveal delay={2}>
        <p className="subtitle">{dict.hero.subtitle}</p>
      </Reveal>
      <Reveal delay={3}>
        <p className="bio">{dict.hero.bio}</p>
      </Reveal>
    </div>
  )
}
