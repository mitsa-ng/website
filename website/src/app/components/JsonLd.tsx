'use client'

import { useEffect, useState } from 'react'
import { getAboutContent } from '@/lib/about'
import {
  websiteJsonLd,
  personJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo'

interface Props {
  type: 'website' | 'person' | 'article' | 'breadcrumb'
  data?: Record<string, unknown>
}

interface SeoSettings {
  author_name?: string
  author_url?: string
}

export default function JsonLd({ type, data }: Props) {
  const [about, setAbout] = useState<{ nameEn?: string; avatarUrl?: string } | null>(null)
  const [seoSettings, setSeoSettings] = useState<SeoSettings | null>(null)

  useEffect(() => {
    const settings = (window as any).__SETTINGS__ || {}
    setSeoSettings({
      author_name: settings.author_name,
      author_url: settings.author_url,
    })
    getAboutContent().then(data => {
      if (data) setAbout(data)
    })
  }, [])

  let json: Record<string, unknown>

  switch (type) {
    case 'website':
      json = websiteJsonLd({
        name: seoSettings?.author_name
          ? `${seoSettings.author_name}'s Web`
          : undefined,
        description: undefined,
      })
      break
    case 'person':
      json = personJsonLd({
        name: seoSettings?.author_name || about?.nameEn,
        image: about?.avatarUrl,
        url: seoSettings?.author_url,
      })
      break
    case 'article':
      json = articleJsonLd({
        ...data as any,
        authorName: seoSettings?.author_name || about?.nameEn,
      })
      break
    case 'breadcrumb':
      json = breadcrumbJsonLd(data as any)
      break
    default:
      return null
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
