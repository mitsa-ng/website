import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Locale, Dict } from './i18n-admin'
import { dict } from './i18n-admin'

interface LocaleCtx {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Dict
}

const Ctx = createContext<LocaleCtx>(null!)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale_] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem('admin_locale') as Locale | null
    if (saved === 'zh-TW' || saved === 'en') setLocale_(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocale_(l)
    localStorage.setItem('admin_locale', l)
  }

  return (
    <Ctx.Provider value={{ locale, setLocale, t: dict[locale] }}>
      {children}
    </Ctx.Provider>
  )
}

export const useLocale = () => useContext(Ctx)
