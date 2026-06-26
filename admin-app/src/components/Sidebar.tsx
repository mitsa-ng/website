import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useLocale } from '../lib/LocaleContext'
import type { Locale } from '../lib/i18n-admin'
import { getProfiles, getActiveProfile, setActiveProfileId, switchProfile } from '../lib/api'
import ProfileManager from './ProfileManager'

interface Props {
  onLogout: () => void
}

const icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  posts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  projects: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  services: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  contacts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  lang: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
}

const pages = [
  { to: '/', key: 'dashboard' as const },
  { to: '/posts', key: 'posts' as const },
  { to: '/projects', key: 'projects' as const },
  { to: '/services', key: 'services' as const },
  { to: '/contacts', key: 'contacts' as const },
  { to: '/settings', key: 'settings' as const },
]

export default function Sidebar({ onLogout }: Props) {
  const { t, locale, setLocale } = useLocale()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showProfileManager, setShowProfileManager] = useState(false)

  const toggleLang = () => setLocale(locale === 'en' ? 'zh-TW' as Locale : 'en')

  const activeProfile = getActiveProfile()
  const profiles = getProfiles()
  const serverUrl = localStorage.getItem('server_url')
  const profileName = activeProfile?.name || serverUrl?.replace(/^https?:\/\//, '') || 'local'

  const handleSwitchProfile = (id: string) => {
    switchProfile(id)
    setShowProfileMenu(false)
    window.location.reload()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">P</span>
        <span>{t.admin}</span>
      </div>

      <div className="sidebar-profile">
        <button className="sidebar-profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
          <span className="profile-name">{profileName}</span>
          <span className="profile-chevron">{icons.chevronDown}</span>
        </button>
        {showProfileMenu && (
          <div className="sidebar-profile-menu">
            {profiles.map(p => (
              <button
                key={p.id}
                className={`sidebar-profile-item${p.id === activeProfile?.id ? ' active' : ''}`}
                onClick={() => handleSwitchProfile(p.id)}
              >
                <span className="profile-item-name">{p.name}</span>
                <span className="profile-item-url">{p.serverUrl || '(local proxy)'}</span>
              </button>
            ))}
            <div className="sidebar-profile-divider" />
            <button className="sidebar-profile-item" onClick={() => { setShowProfileMenu(false); setShowProfileManager(true) }}>
              {t.manageProfiles}
            </button>
          </div>
        )}
        <div className="sidebar-server-url">{serverUrl || '(local proxy)'}</div>
      </div>

      <nav className="sidebar-nav">
        {pages.map(p => (
          <NavLink
            key={p.to}
            to={p.to}
            end={p.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="link-icon">{icons[p.key]}</span>
            {t.nav[p.key]}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-link sidebar-footer-btn" onClick={onLogout}>
          <span className="link-icon">{icons.logout}</span>
          {t.logout}
        </button>
        <button className="sidebar-link sidebar-footer-btn lang-toggle" onClick={toggleLang}>
          <span className="link-icon">{icons.lang}</span>
          {locale === 'en' ? '中文' : 'English'}
        </button>
      </div>

      {showProfileManager && (
        <ProfileManager
          onClose={() => setShowProfileManager(false)}
          onSwitch={() => window.location.reload()}
        />
      )}
    </aside>
  )
}
