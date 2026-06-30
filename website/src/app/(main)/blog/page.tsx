import { headers } from 'next/headers'
import type { Metadata } from 'next'
import BlogListPage from './client'

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const locale = h.get('x-locale') || 'en'
  const isZh = locale === 'zh-TW'
  return {
    title: isZh ? '部落格' : 'Blog',
    description: isZh
      ? 'Nati 的部落格 — 技術文章、設計思考與專案心得。'
      : 'Nati\'s blog — technical articles, design thoughts, and project insights.',
    openGraph: {
      title: isZh ? '部落格 | Nati\'s Web' : 'Blog | Nati\'s Web',
      description: isZh
        ? 'Nati 的部落格 — 技術文章、設計思考與專案心得。'
        : 'Nati\'s blog — technical articles, design thoughts, and project insights.',
    },
  }
}

export default function Page() {
  return <BlogListPage />
}
