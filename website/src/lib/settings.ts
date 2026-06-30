import { query } from '@/db'

let cache: Record<string, any> | null = null
let lastFetch = 0
let pendingPromise: Promise<Record<string, any>> | null = null
const TTL = 60_000

export async function fetchSettings(): Promise<Record<string, any>> {
  const now = Date.now()
  if (cache && now - lastFetch < TTL) return cache

  if (!pendingPromise) {
    pendingPromise = (async () => {
      const rows = await query<{ key: string; value: string }>('SELECT key, value FROM site_settings')
      const settings: Record<string, any> = {}
      for (const row of rows) {
        try { settings[row.key] = JSON.parse(row.value) } catch { settings[row.key] = row.value }
      }
      cache = settings
      lastFetch = Date.now()
      return settings
    })()
  }

  try {
    return await pendingPromise
  } finally {
    pendingPromise = null
  }
}

export function invalidateSettingsCache() {
  cache = null
  lastFetch = 0
}
