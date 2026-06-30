import { headers } from 'next/headers'
import type { Metadata } from 'next'
import ServicesPage from './client'

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const locale = h.get('x-locale') || 'en'
  const isZh = locale === 'zh-TW'
  return {
    title: isZh ? '服務' : 'Services',
    description: isZh
      ? 'Nati 提供的服務 — 網站開發、UI/UX 設計與技術顧問。'
      : 'Services by Nati — web development, UI/UX design, and technical consulting.',
    openGraph: {
      title: isZh ? '服務 | Nati\'s Web' : 'Services | Nati\'s Web',
      description: isZh
        ? 'Nati 提供的服務 — 網站開發、UI/UX 設計與技術顧問。'
        : 'Services by Nati — web development, UI/UX design, and technical consulting.',
    },
  }
}

export default function Page() {
  return <ServicesPage />
}
