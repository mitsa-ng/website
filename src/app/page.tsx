'use client'

import { Suspense } from 'react'
import { useApp, type PageSection } from './AppContext'
import Splash from './components/Splash'
import StatusBar from './components/StatusBar'
import NavDesktop from './components/NavDesktop'
import TabBar from './components/TabBar'
import Drawer from './components/Drawer'
import Toast from './components/Toast'
import HeroSection from './components/HeroSection'
import StatsSection from './components/StatsSection'
import SkillsSection from './components/SkillsSection'
import TimelineSection from './components/TimelineSection'
import PortfolioSection from './components/PortfolioSection'
import BlogSection from './components/BlogSection'
import ServicesSection from './components/ServicesSection'
import ResumeSection from './components/ResumeSection'
import ContactSection from './components/ContactSection'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function PageView({ page }: { page: PageSection }) {
  const { activePage } = useApp()

  return (
    <div className={`page${activePage === page ? ' active' : ''}${activePage !== page && activePage !== page ? '' : ''}`}>
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
    if (tab && ['about','portfolio','blog','services','resume','contact'].includes(tab)) {
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
      <Splash />
      <StatusBar />
      <NavDesktop />
      <Suspense fallback={null}><HomeContent /></Suspense>
      <div className="page-view">
        {pages.map(p => (
          <PageView key={p} page={p} />
        ))}
      </div>
      <Drawer />
      <Toast />
      <TabBar />
    </>
  )
}
