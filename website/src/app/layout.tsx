import type { Metadata, Viewport } from "next"
import { headers } from 'next/headers'
import { fetchSettings } from '@/lib/settings'
import "./globals.css"
import { AppProvider } from "./AppContext"
import GAScript from "./components/GAScript"

const DEFAULT_LOCALE = 'en'

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const locale = h.get('x-locale') || DEFAULT_LOCALE

  const s = await fetchSettings()
  const title = s.site_title || "Nati's Web"
  const description = s.site_description || "Nati's personal portfolio & blog — full-stack developer, UI designer, and creative problem solver."

  const icons: Metadata['icons'] = {}
  if (s.favicon_url) {
    icons.icon = [{ url: s.favicon_url }, { url: '/icon.svg', type: 'image/svg+xml' }]
    icons.apple = s.favicon_url
  } else {
    icons.icon = [{ url: '/favicon.ico' }, { url: '/icon.svg', type: 'image/svg+xml' }]
    icons.apple = '/icon.svg'
  }

  const other: Record<string, string> = {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  }
  if (s.verification_google) {
    other['google-site-verification'] = s.verification_google
  }
  if (s.verification_bing) {
    other['msvalidate.01'] = s.verification_bing
  }

  return {
    title: { default: title, template: `%s | ${title}` },
    description,
    robots: { index: true, follow: true },
    manifest: '/manifest.webmanifest',
    icons,
    other,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'zh-TW' ? 'zh_TW' : 'en_US',
      siteName: title,
      images: s.default_og_image ? [{ url: s.default_og_image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: s.twitter_handle || undefined,
      images: s.default_og_image ? [s.default_og_image] : undefined,
    },
    alternates: {
      languages: {
        en: '/en',
        'zh-TW': '/zh-TW',
      },
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f5f7',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const locale = h.get('x-locale') || DEFAULT_LOCALE
  const lang = locale === 'zh-TW' ? 'zh-Hant-TW' : 'en'

  const s = await fetchSettings()
  const themeColor = s.theme_color || '#f5f5f7'
  const gaId = s.ga_id as string | undefined
  const clientSettings = JSON.stringify(s)

  return (
    <html lang={lang} data-locale={locale} className="h-full antialiased" style={{ colorScheme: 'light dark' }}>
      <head />
      <body className="h-full">
        <GAScript gaId={gaId} />
        <script dangerouslySetInnerHTML={{ __html: `window.__SETTINGS__=${clientSettings}` }} />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
