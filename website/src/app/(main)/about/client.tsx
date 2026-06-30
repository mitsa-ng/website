'use client'

import HeroSection from '../../components/HeroSection'
import StatsSection from '../../components/StatsSection'
import SkillsSection from '../../components/SkillsSection'
import TimelineSection from '../../components/TimelineSection'
import JsonLd from '../../components/JsonLd'

export default function AboutPage() {
  return (
    <>
      <JsonLd type="person" />
      <div className="page-view">
        <div className="page active page-entering">
          <HeroSection />
          <StatsSection />
          <SkillsSection />
          <TimelineSection />
        </div>
      </div>
    </>
  )
}
