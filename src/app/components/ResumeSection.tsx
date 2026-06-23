'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import { getAboutContent } from '@/lib/about'
import type { AboutContent } from '@/lib/about'
import Reveal from './Reveal'

export default function ResumeSection() {
  const { dict, locale } = useApp()
  const [about, setAbout] = useState<AboutContent | null>(null)
  useEffect(() => { getAboutContent().then(setAbout) }, [])

  const exp = about?.experience ?? null
  const edu = about?.education ?? null
  const certs = about?.certifications ?? null

  return (
    <>
      <div className="page-header">
        <h2>{dict.nav.resume}</h2>
      </div>
      <div className="resume-content">
        <div className="resume-section">
          <h2>{dict.sections.experience}</h2>
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

        <div className="resume-section">
          <h2>{dict.sections.education}</h2>
          <div className="timeline">
            {(edu || (dict.education as { period: string; degree: string; school: string }[])).map((e: any, i: number) => {
              const period = e.period
              const degree = edu ? (locale === 'zh-TW' ? e.degreeZh : e.degreeEn) : e.degree
              const school = edu ? (locale === 'zh-TW' ? e.schoolZh : e.schoolEn) : e.school
              return (
                <Reveal key={i} delay={Math.min(i, 3)}>
                  <div className="timeline-item">
                    <div className="period">{period}</div>
                    <h3>{degree}</h3>
                    <div className="org">{school}</div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>

        <div className="resume-section">
          <h2>{dict.sections.certifications}</h2>
          <div className="skill-grid">
            {(certs || (dict.certifications as { year: string; name: string; issuer: string }[])).map((c: any, i: number) => {
              const name = certs ? (locale === 'zh-TW' ? c.nameZh : c.nameEn) : c.name
              const issuer = certs ? (locale === 'zh-TW' ? c.issuerZh : c.issuerEn) : c.issuer
              const year = c.year
              return (
                <Reveal key={i} delay={Math.min(i, 3)}>
                  <span className="pill">{name} · {issuer} ({year})</span>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
