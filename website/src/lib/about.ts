import { transformKeys } from './transform'

export interface AboutContent {
  avatarUrl: string
  nameZh: string
  nameEn: string
  subtitleZh: string
  subtitleEn: string
  bioZh: string
  bioEn: string
  heroBgColor: string
  heroBgImage: string
  heroTextColor: string
  stats: { id: string; num: string; labelZh: string; labelEn: string }[]
  skillsZh: string[]
  skillsEn: string[]
  experience: { id: string; period: string; titleZh: string; titleEn: string; orgZh: string; orgEn: string }[]
  education: { id: string; period: string; degreeZh: string; degreeEn: string; schoolZh: string; schoolEn: string }[]
  certifications: { id: string; year: string; nameZh: string; nameEn: string; issuerZh: string; issuerEn: string }[]
}

let promise: Promise<AboutContent | null> | null = null

function fromSettings(): AboutContent | null {
  if (typeof window === 'undefined') return null
  try {
    const s = (window as any).__SETTINGS__
    if (!s?.about_content) return null
    const c = typeof s.about_content === 'string' ? JSON.parse(s.about_content) : s.about_content
    return c as AboutContent
  } catch { return null }
}

export function getAboutContent(): Promise<AboutContent | null> {
  const cached = fromSettings()
  if (cached) return Promise.resolve(cached)
  if (!promise) {
    promise = fetch('/api/settings')
      .then(r => r.json())
      .then(d => transformKeys(d) as Record<string, any>)
      .then(d => (d.aboutContent as AboutContent) || null)
      .catch(() => null)
      .finally(() => { promise = null })
  }
  return promise
}
