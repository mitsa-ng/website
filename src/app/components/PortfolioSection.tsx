'use client'

import { useApp } from '../AppContext'
import { usePoll } from '@/lib/usePoll'
import Reveal from './Reveal'

interface Project {
  id: number
  titleZh: string
  titleEn: string
  descriptionZh: string
  descriptionEn: string
  tags: string[]
  link?: string | null
  imageUrl?: string | null
}

export default function PortfolioSection() {
  const { dict, locale } = useApp()
  const { data: projects } = usePoll<Project[]>('/api/projects')

  const titleKey = locale === 'zh-TW' ? 'titleZh' as const : 'titleEn' as const
  const descKey = locale === 'zh-TW' ? 'descriptionZh' as const : 'descriptionEn' as const

  return (
    <>
      <div className="page-header">
        <h2>{dict.nav.portfolio}</h2>
        <span className="count">{(projects || []).length}</span>
      </div>
      <div className="project-grid">
        {(projects || []).map((p, i) => (
          <Reveal key={p.id} delay={i % 3}>
            <div className={`project-card${p.link ? ' clickable' : ''}`} onClick={() => p.link && window.open(p.link, '_blank', 'noopener')}>
              <div className="thumb" style={p.imageUrl ? { backgroundImage: `url(${p.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
              <div className="body">
                <h3>{p[titleKey]}</h3>
                <p>{p[descKey]}</p>
                <div className="project-tags">
                  {(p.tags || []).map((t: string, i: number) => (
                    <span key={i} className="pill">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  )
}
