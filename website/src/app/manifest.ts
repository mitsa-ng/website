import type { MetadataRoute } from 'next'
import { query } from '@/db'

async function fetchSettings(): Promise<Record<string, any>> {
  try {
    const rows = await query<{ key: string; value: string }>(
      'SELECT key, value FROM site_settings',
    )
    const settings: Record<string, any> = {}
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value) } catch { settings[row.key] = row.value }
    }
    return settings
  } catch {
    return {}
  }
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await fetchSettings()
  const title = s.site_title || "Nati's Web"
  const themeColor = s.theme_color || '#f5f5f7'

  return {
    name: title,
    short_name: title,
    description: s.site_description || "Nati's personal portfolio & blog",
    start_url: '/',
    display: 'standalone',
    background_color: themeColor,
    theme_color: themeColor,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  }
}
