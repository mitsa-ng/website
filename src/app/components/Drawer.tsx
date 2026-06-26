'use client'

import { useApp } from '../AppContext'

export default function Drawer({ onNavigate }: { onNavigate?: (key: string) => void }) {
  const { drawerOpen, setDrawerOpen, locale, setLocale, theme, toggleTheme, dict, setActivePage } = useApp()

  const pages: { key: string; label: string }[] = [
    { key: 'about', label: dict.nav.about },
    { key: 'portfolio', label: dict.nav.portfolio },
    { key: 'blog', label: dict.nav.blog },
    { key: 'services', label: dict.nav.services },
    { key: 'resume', label: dict.nav.resume },
    { key: 'contact', label: dict.nav.contact },
  ]

  return (
    <>
      <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`drawer${drawerOpen ? ' open' : ''}`}>
        <div className="drawer-handle">
          <h3>{dict.drawer.menu}</h3>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="drawer-items">
          {pages.map(p => (
            <button
              key={p.key}
              className="drawer-item"
              onClick={() => {
                setDrawerOpen(false);
                onNavigate && onNavigate(p.key);
                setActivePage(p.key as any);
              }}
            >
              <span className="label">{p.label}</span>
            </button>
          ))}
          <div className="drawer-divider" />
          <button className="drawer-item" onClick={() => setLocale(locale === 'zh-TW' ? 'en' : 'zh-TW')}>
            <span className="label">{dict.drawer.language}</span>
            <span className="lang-badge">{locale === 'zh-TW' ? 'EN' : '中文'}</span>
          </button>
          <button className="drawer-item" onClick={toggleTheme}>
            <span className="label">{dict.drawer.theme}</span>
            <span className={`toggle${theme === 'dark' ? ' on' : ''}`} />
          </button>
        </div>
      </div>
    </>
  )
}
