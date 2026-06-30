'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useApp, type PageSection } from '../AppContext'
import { transformKeys } from '@/lib/transform'

const SECTIONS: { key: PageSection }[] = [
  { key: 'about' },
  { key: 'portfolio' },
  { key: 'blog' },
  { key: 'services' },
  { key: 'resume' },
  { key: 'contact' },
]

export default function NavDesktop() {
  const pathname = usePathname()
  const router = useRouter()
  const { dict, locale, setActivePage, setDrawerOpen, toggleTheme, theme, setLocale } = useApp()
  const [brand, setBrand] = useState('')
  const [siteIcon, setSiteIcon] = useState('')
  const isHome = pathname === '/' || pathname === ''

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => transformKeys(d) as Record<string, any>)
      .then(d => {
        if (d.brandText) setBrand(d.brandText)
        if (d.siteIcon) setSiteIcon(d.siteIcon)
      })
      .catch(() => {})
  }, [])

  const labels: Record<PageSection, string> = {
    about: dict.nav.about,
    portfolio: dict.nav.portfolio,
    blog: dict.nav.blog,
    services: dict.nav.services,
    resume: dict.nav.resume,
    contact: dict.nav.contact,
  }

  const handleNav = (key: PageSection) => {
    if (isHome) {
      setActivePage(key)
    } else {
      router.push(`/${locale}/${key}`)
    }
  }

  const isActive = (key: string) => {
    if (isHome) return false
    return pathname === `/${key}` || pathname.startsWith(`/${key}/`)
  }

  return (
    <div className="nav-desktop">
      <div className="brand">
        {siteIcon ? (
          <span className="brand-mono" style={{ overflow: 'hidden' }}>
            <img src={siteIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </span>
        ) : (
          <span className="brand-mono">P</span>
        )}
        {brand || 'Personal Web'}
      </div>
      <div className="nav-links">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            className={
              isHome
                ? ''
                : isActive(s.key) ? 'active' : ''
            }
            onClick={() => handleNav(s.key)}
          >
            {labels[s.key]}
          </button>
        ))}
      </div>
      <button className="menu-btn" onClick={toggleTheme} aria-label="Toggle theme" title={locale === 'zh-TW' ? '切換主題' : 'Toggle theme'}>
        {theme === 'light' ? (
          <svg viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        )}
      </button>
      <button className="menu-btn" onClick={() => setLocale(locale === 'zh-TW' ? 'en' : 'zh-TW')} aria-label="Switch language" title={locale === 'zh-TW' ? 'Switch to English' : '切換至中文'}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{locale === 'zh-TW' ? 'EN' : '中'}</span>
      </button>
      <button className="menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">
        <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></svg>
      </button>
    </div>
  )
}
