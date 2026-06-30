import { headers } from 'next/headers'
import type { Metadata } from 'next'
import PortfolioPage from './client'

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const locale = h.get('x-locale') || 'en'
  const isZh = locale === 'zh-TW'
  return {
    title: isZh ? '作品集' : 'Portfolio',
    description: isZh
      ? '瀏覽 Nati 的作品集 — 網站開發、UI 設計與創意專案。'
      : 'Browse Nati\'s portfolio — web development, UI design, and creative projects.',
    openGraph: {
      title: isZh ? '作品集 | Nati\'s Web' : 'Portfolio | Nati\'s Web',
      description: isZh
        ? '瀏覽 Nati 的作品集 — 網站開發、UI 設計與創意專案。'
        : 'Browse Nati\'s portfolio — web development, UI design, and creative projects.',
    },
  }
}

export default function Page() {
  return <PortfolioPage />
}
