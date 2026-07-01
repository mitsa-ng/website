const DEFAULT_SERVER = ''
const CONFIG_KEY = 'admin_config'
const PROFILES_KEY = 'admin_profiles'
const ACTIVE_PROFILE_KEY = 'active_profile_id'

export interface Profile {
  id: string
  name: string
  serverUrl: string
  apiKey: string
}

export function getProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function addProfile(name: string, serverUrl: string, apiKey: string): Profile {
  const profiles = getProfiles()
  const id = 'profile_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
  const profile: Profile = { id, name, serverUrl: serverUrl.replace(/\/$/, ''), apiKey }
  profiles.push(profile)
  saveProfiles(profiles)
  return profile
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter(p => p.id !== id)
  saveProfiles(profiles)
  const active = getActiveProfileId()
  if (active === id) localStorage.removeItem(ACTIVE_PROFILE_KEY)
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY)
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id)
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId()
  if (!id) return null
  return getProfiles().find(p => p.id === id) || null
}

export function switchProfile(id: string): void {
  const profile = getProfiles().find(p => p.id === id)
  if (!profile) return
  localStorage.setItem('api_key', profile.apiKey)
  localStorage.setItem('server_url', profile.serverUrl)
  setActiveProfileId(profile.id)
}

export function clearCredentials(): void {
  localStorage.removeItem('api_key')
  localStorage.removeItem('server_url')
  localStorage.removeItem(CONFIG_KEY)
  localStorage.removeItem(ACTIVE_PROFILE_KEY)
}

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(transformKeys)
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamel(k), transformKeys(v)])
    )
  }
  return obj
}

declare global {
  interface Window {
    electronAPI?: {
      apiFetch: (url: string, options?: RequestInit) => Promise<{ ok: boolean; status: number; text: string }>
    }
  }
}

async function platformFetch(url: string, init?: RequestInit): Promise<Response> {
  if (window.electronAPI) {
    const result = await window.electronAPI.apiFetch(url, init)
    if (!result.ok) throw new Error(result.text)
    return new Response(result.text, {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await platformFetch(url, init)
  const data = await res.json()
  return transformKeys(data) as T
}

interface AdminConfig {
  serverUrl: string
  apiSecret: string
  configuredAt: number
}

export async function getConfig(): Promise<AdminConfig | null> {
  const stored = localStorage.getItem(CONFIG_KEY)
  return stored ? JSON.parse(stored) : null
}

export async function setConfig(config: AdminConfig): Promise<void> {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export async function isConfigured(): Promise<boolean> {
  const config = await getConfig()
  return !!(config && config.serverUrl && config.apiSecret)
}

export async function getApiKey(): Promise<string | null> {
  return localStorage.getItem('api_key')
}

export async function setApiKey(key: string): Promise<void> {
  localStorage.setItem('api_key', key)
}

export async function getServerUrl(): Promise<string> {
  const explicit = localStorage.getItem('server_url')
  if (explicit) return explicit
  const config = await getConfig()
  return config?.serverUrl || DEFAULT_SERVER
}

export async function setServerUrl(url: string): Promise<void> {
  localStorage.setItem('server_url', url)
}

async function headers(): Promise<Record<string, string>> {
  const key = await getApiKey()
  return {
    'Content-Type': 'application/json',
    ...(key ? { 'X-Api-Key': key } : {}),
  }
}

async function apiUrl(path: string): Promise<string> {
  const base = await getServerUrl()
  if (base) return `${base}${path}`
  return path
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(await apiUrl(path), { headers: await headers() })
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(await apiUrl(path), {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(body),
  })
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(await apiUrl(path), {
    method: 'PUT',
    headers: await headers(),
    body: JSON.stringify(body),
  })
}

export async function apiDelete(path: string): Promise<void> {
  await platformFetch(await apiUrl(path), {
    method: 'DELETE',
    headers: await headers(),
  })
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(await apiUrl(path), {
    method: 'PATCH',
    headers: await headers(),
    body: JSON.stringify(body),
  })
}

function absUrl(base: string, path: string): string {
  if (base) return `${base}${path}`
  return path
}

export async function initApiKey(serverUrl?: string): Promise<string> {
  const base = serverUrl !== undefined ? serverUrl : await getServerUrl()
  const res = await platformFetch(absUrl(base, '/api/admin/init'), { method: 'POST' })
  const data = await res.json()
  return data.raw
}

export async function verifyApiKey(key: string, serverUrl?: string): Promise<boolean> {
  const base = serverUrl !== undefined ? serverUrl : await getServerUrl()
  try {
    const res = await platformFetch(absUrl(base, '/api/admin/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    return res.ok
  } catch {
    return false
  }
}

export interface Post {
  id: number
  slug: string
  titleZh: string
  titleEn: string
  contentZh: string
  contentEn: string
  excerptZh: string
  excerptEn: string
  draft: boolean
  publishedAt: string | null
  fingerprintZh?: string
  fingerprintEn?: string
}

export interface Project {
  id: number
  titleZh: string
  titleEn: string
  descriptionZh: string
  descriptionEn: string
  tags: string[]
  link?: string | null
  imageUrl?: string | null
  sortOrder: number
  draft: boolean
  published: boolean
}

export interface Service {
  id: number
  titleZh: string
  titleEn: string
  descriptionZh: string
  descriptionEn: string
  price: string
  icon: string
  sortOrder: number
  draft: boolean
  published: boolean
}

export interface Contact {
  id: number
  name: string
  email: string
  message: string
  createdAt: string
}
