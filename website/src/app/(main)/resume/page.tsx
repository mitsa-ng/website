import { headers } from 'next/headers'
import type { Metadata } from 'next'
import ResumePage from './client'

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const locale = h.get('x-locale') || 'en'
  const isZh = locale === 'zh-TW'
  return {
    title: isZh ? '簡歷' : 'Resume',
    description: isZh
      ? 'Nati 的簡歷 — 工作經歷、學歷與專業認證。'
      : 'Nati\'s resume — work experience, education, and professional certifications.',
    openGraph: {
      title: isZh ? '簡歷 | Nati\'s Web' : 'Resume | Nati\'s Web',
      description: isZh
        ? 'Nati 的簡歷 — 工作經歷、學歷與專業認證。'
        : 'Nati\'s resume — work experience, education, and professional certifications.',
    },
  }
}

export default function Page() {
  return <ResumePage />
}
