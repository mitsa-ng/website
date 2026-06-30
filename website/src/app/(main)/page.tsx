'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useApp, type PageSection } from '../AppContext'
import HeroSection from '../components/HeroSection'
import StatsSection from '../components/StatsSection'
import SkillsSection from '../components/SkillsSection'
import TimelineSection from '../components/TimelineSection'
import PortfolioSection from '../components/PortfolioSection'
import BlogSection from '../components/BlogSection'
import ServicesSection from '../components/ServicesSection'
import ResumeSection from '../components/ResumeSection'
import ContactSection from '../components/ContactSection'
import JsonLd from '../components/JsonLd'

function PageView({ page }: { page: PageSection }) {
  const { activePage } = useApp()

  return (
    <div className={`page${activePage === page ? ' active' : ''}`}>
      {page === 'about' && (
        <>
          <HeroSection />
          <StatsSection />
          <SkillsSection />
          <TimelineSection />
        </>
      )}
      {page === 'portfolio' && <PortfolioSection />}
      {page === 'blog' && <BlogSection />}
      {page === 'services' && <ServicesSection />}
      {page === 'resume' && <ResumeSection />}
      {page === 'contact' && <ContactSection />}
    </div>
  )
}

function HomeContent() {
  const { setActivePage } = useApp()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab') as PageSection | null
    if (tab && ['about', 'portfolio', 'blog', 'services', 'resume', 'contact'].includes(tab)) {
      setActivePage(tab)
    }
  }, [searchParams, setActivePage])

  return null
}

export default function Home() {
  const { activePage } = useApp()
  const pages: PageSection[] = ['about', 'portfolio', 'blog', 'services', 'resume', 'contact']

  return (
    <>
      <JsonLd type="website" />
      <JsonLd type="person" />
      <Suspense fallback={null}><HomeContent /></Suspense>
      <div className="page-view">
        {pages.map(p => (
          <PageView key={p} page={p} />
        ))}
      </div>
    </>
  )
}
