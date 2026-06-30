import { headers } from 'next/headers'
import type { Metadata } from 'next'
import ContactPage from './client'

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const locale = h.get('x-locale') || 'en'
  const isZh = locale === 'zh-TW'
  return {
    title: isZh ? '聯絡' : 'Contact',
    description: isZh
      ? '與 Nati 聯絡 — 發送訊息或查看聯絡資訊。'
      : 'Contact Nati — send a message or check contact information.',
    openGraph: {
      title: isZh ? '聯絡 | Nati\'s Web' : 'Contact | Nati\'s Web',
      description: isZh
        ? '與 Nati 聯絡 — 發送訊息或查看聯絡資訊。'
        : 'Contact Nati — send a message or check contact information.',
    },
  }
}

export default function Page() {
  return <ContactPage />
}
