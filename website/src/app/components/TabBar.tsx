'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useApp, type PageSection } from '../AppContext'

function IconPerson() {
  return <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" /><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>
}
function IconGrid() {
  return <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" /><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" /><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" /><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>
}
function IconArticle() {
  return <svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="4" y1="18" x2="14" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function IconServices() {
  return <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
}
function IconResume() {
  return <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" fill="none" /><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" fill="none" /><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.8" fill="none" /><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.8" fill="none" /><line x1="10" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>
}
function IconMail() {
  return <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" fill="none" /><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>
}

const TABS: { key: PageSection; Icon: React.FC }[] = [
  { key: 'about', Icon: IconPerson },
  { key: 'portfolio', Icon: IconGrid },
  { key: 'blog', Icon: IconArticle },
  { key: 'services', Icon: IconServices },
  { key: 'resume', Icon: IconResume },
  { key: 'contact', Icon: IconMail },
]

export default function TabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { dict, locale, activePage, setActivePage, setNavigating } = useApp()
  const isHome = pathname === '/' || pathname === ''

  const labels: Record<PageSection, string> = {
    about: dict.nav.about,
    portfolio: dict.nav.portfolio,
    blog: dict.nav.blog,
    services: dict.nav.services,
    resume: dict.nav.resume,
    contact: dict.nav.contact,
  }

  const handleClick = (key: PageSection) => {
    if (isHome) {
      setActivePage(key)
    } else {
      setNavigating(true)
      router.push(`/${locale}/${key}`)
    }
  }

  const isActive = (key: PageSection) => {
    if (isHome) return activePage === key
    return pathname === `/${key}` || pathname.startsWith(`/${key}/`)
  }

  return (
    <div className="app-tabs">
      {TABS.map(tab => (
        <button
          key={tab.key}
          className={isActive(tab.key) ? 'active' : ''}
          onClick={() => handleClick(tab.key)}
        >
          <tab.Icon />
          <span>{labels[tab.key]}</span>
        </button>
      ))}
    </div>
  )
}
