import { transformKeys } from './transform'

export interface AboutContent {
  avatarUrl: string
  nameZh: string
  nameEn: string
  subtitleZh: string
  subtitleEn: string
  bioZh: string
  bioEn: string
  stats: { id: string; num: string; labelZh: string; labelEn: string }[]
  skillsZh: string[]
  skillsEn: string[]
  experience: { id: string; period: string; titleZh: string; titleEn: string; orgZh: string; orgEn: string }[]
  education: { id: string; period: string; degreeZh: string; degreeEn: string; schoolZh: string; schoolEn: string }[]
  certifications: { id: string; year: string; nameZh: string; nameEn: string; issuerZh: string; issuerEn: string }[]
}

let cached: AboutContent | null = null
let promise: Promise<AboutContent | null> | null = null

export function getAboutContent(): Promise<AboutContent | null> {
  if (cached) return Promise.resolve(cached)
  if (!promise) {
    promise = fetch('/api/settings')
      .then(r => r.json())
      .then(d => transformKeys(d) as Record<string, any>)
      .then(d => { cached = (d.aboutContent as AboutContent) || null; return cached })
      .catch(() => null)
  }
  return promise
}
