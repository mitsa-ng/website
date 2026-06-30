import { headers } from 'next/headers'
import type { Metadata } from 'next'
import AboutPage from './client'

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const locale = h.get('x-locale') || 'en'
  const isZh = locale === 'zh-TW'
  return {
    title: isZh ? '關於' : 'About',
    description: isZh
      ? '認識 Nati — 全端開發者、UI 設計師與創意問題解決者。'
      : 'About Nati — full-stack developer, UI designer, and creative problem solver.',
    openGraph: {
      title: isZh ? '關於 | Nati\'s Web' : 'About | Nati\'s Web',
      description: isZh
        ? '認識 Nati — 全端開發者、UI 設計師與創意問題解決者。'
        : 'About Nati — full-stack developer, UI designer, and creative problem solver.',
    },
  }
}

export default function Page() {
  return <AboutPage />
}
