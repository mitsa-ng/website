'use client'

import { useApp } from '../AppContext'
import Reveal from './Reveal'

interface Education {
  period: string
  degree: string
  school: string
}

interface Certification {
  year: string
  name: string
  issuer: string
}

export default function ResumeSection() {
  const { dict } = useApp()
  const exp = dict.experience as { period: string; title: string; org: string }[]
  const edu = dict.education as Education[]
  const certs = dict.certifications as Certification[]

  return (
    <>
      <div className="page-header">
        <h2>{dict.nav.resume}</h2>
      </div>
      <div className="resume-content">
        <div className="resume-section">
          <h2>{dict.sections.experience}</h2>
          <div className="timeline">
            {exp.map((e, i) => (
              <Reveal key={i} delay={Math.min(i, 3)}>
                <div className="timeline-item">
                  <div className="period">{e.period}</div>
                  <h3>{e.title}</h3>
                  <div className="org">{e.org}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="resume-section">
          <h2>{dict.sections.education}</h2>
          <div className="timeline">
            {edu.map((e, i) => (
              <Reveal key={i} delay={Math.min(i, 3)}>
                <div className="timeline-item">
                  <div className="period">{e.period}</div>
                  <h3>{e.degree}</h3>
                  <div className="org">{e.school}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="resume-section">
          <h2>{dict.sections.certifications}</h2>
          <div className="skill-grid">
            {certs.map((c, i) => (
              <Reveal key={i} delay={Math.min(i, 3)}>
                <span className="pill">{c.name} · {c.issuer} ({c.year})</span>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
