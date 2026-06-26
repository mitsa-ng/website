export function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function setStored<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}
