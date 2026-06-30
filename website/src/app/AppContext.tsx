'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, useRef } from 'react'
import { loadLocale, type Locale, type I18nDict } from '@/lib/i18n'

export type PageSection = 'about' | 'portfolio' | 'blog' | 'services' | 'resume' | 'contact'
export type ToastType = 'success' | 'error' | 'info'

function getLocaleFromHtml(): Locale {
  if (typeof window === 'undefined') return 'en'
  const attr = document.documentElement.getAttribute('data-locale')
  if (attr === 'zh-TW' || attr === 'en') return attr
  return 'en'
}

interface AppState {
  locale: Locale
  dict: I18nDict
  theme: 'light' | 'dark'
  activePage: PageSection
  drawerOpen: boolean
  toast: { message: string; type: ToastType } | null
}

interface AppContextType extends AppState {
  setLocale: (l: Locale) => void
  toggleTheme: () => void
  setActivePage: (p: PageSection) => void
  setDrawerOpen: (o: boolean) => void
  showToast: (message: string, type?: ToastType) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [dict, setDict] = useState<I18nDict>(loadLocale('en'))
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)
  const [activePage, setActivePage] = useState<PageSection>('about')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const drawerNavigationRef = useRef<(key: string) => void | undefined>(undefined)

  useEffect(() => {
    const l = getLocaleFromHtml()
    setLocaleState(l)
    setDict(loadLocale(l))

    const savedTheme = (() => {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark' || stored === 'light') return stored
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    })()
    setTheme(savedTheme)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  const setLocale = useCallback((l: Locale) => {
    document.cookie = `locale=${l};path=/;max-age=31536000`
    const path = window.location.pathname
    const prefix = path.startsWith('/zh-TW') ? '/zh-TW' : path.startsWith('/en') ? '/en' : ''
    const rest = prefix ? path.slice(prefix.length) : path
    window.location.href = `/${l}${rest || '/'}${window.location.search}`
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const setDrawerNavigation = useCallback((onNavigate?: (key: string) => void) => {
    drawerNavigationRef.current = onNavigate
  }, [])

  return (
    <AppContext.Provider value={{
      locale, dict, theme, activePage, drawerOpen, toast,
      setLocale, toggleTheme, setActivePage, setDrawerOpen, showToast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
