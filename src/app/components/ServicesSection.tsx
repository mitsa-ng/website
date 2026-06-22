'use client'

import { useApp } from '../AppContext'
import { usePoll } from '@/lib/usePoll'
import Reveal from './Reveal'

interface Service {
  id: number
  titleZh: string
  titleEn: string
  descriptionZh: string
  descriptionEn: string
  price: string
}

export default function ServicesSection() {
  const { dict, locale, setActivePage } = useApp()
  const { data: services } = usePoll<Service[]>('/api/services')

  const titleKey = locale === 'zh-TW' ? 'titleZh' as const : 'titleEn' as const
  const descKey = locale === 'zh-TW' ? 'descriptionZh' as const : 'descriptionEn' as const

  return (
    <>
      <div className="page-header">
        <h2>{dict.nav.services}</h2>
      </div>
      <div className="services-grid">
        {(services || []).map((s, i) => (
          <Reveal key={s.id} delay={i % 2}>
            <div className="service-card">
              <div className="icon-box"><span>{i + 1}</span></div>
              <h3>{s[titleKey]}</h3>
              <p>{s[descKey]}</p>
              <div className="price">{s.price}</div>
              <button className="btn btn-primary" onClick={() => setActivePage('contact')}>{dict.services.contact}</button>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  )
}
