import { useEffect, useState } from 'react'
import { useLocale } from '../lib/LocaleContext'
import { getApiKey, getServerUrl } from '../lib/api'

interface SeoForm {
  site_title: string
  site_description: string
  default_og_image: string
  twitter_handle: string
  favicon_url: string
  verification_google: string
  verification_bing: string
  ga_id: string
  theme_color: string
  author_name: string
  author_url: string
}

async function apiUrl(path: string) {
  const base = await getServerUrl()
  return `${base}${path}`
}

async function apiHeaders() {
  const key = await getApiKey()
  return {
    'Content-Type': 'application/json',
    ...(key ? { 'X-Api-Key': key } : {}),
  } as Record<string, string>
}

export default function SEO() {
  const { t } = useLocale()
  const [form, setForm] = useState<SeoForm>({
    site_title: '',
    site_description: '',
    default_og_image: '',
    twitter_handle: '',
    favicon_url: '',
    verification_google: '',
    verification_bing: '',
    ga_id: '',
    theme_color: '#f5f5f7',
    author_name: '',
    author_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiUrl('/api/settings').then(url =>
      fetch(url, { headers: {} }).then(r => r.json()).then(data => {
        if (!data || data.error) return
        setForm(prev => ({ ...prev, ...data }))
        setLoaded(true)
      })
    )
  }, [])

  useEffect(() => {
    if (!loaded) return
    const id = setInterval(async () => {
      const url = await apiUrl('/api/settings')
      const h = await apiHeaders()
      try {
        const r = await fetch(url, { headers: h })
        const data = await r.json()
        if (data && !data.error) setForm(prev => ({ ...prev, ...data }))
      } catch {}
    }, 5000)
    return () => clearInterval(id)
  }, [loaded])

  const handleChange = (key: keyof SeoForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setStatus('idle')
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus('idle')
    try {
      const url = await apiUrl('/api/settings')
      const h = await apiHeaders()
      const r = await fetch(url, { method: 'PUT', headers: h, body: JSON.stringify(form) })
      if (r.ok) setStatus('saved')
      else setStatus('error')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const s = t.seo

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>{s.title}</h1>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{s.basic}</h2>
        <div className="card-form">
          <label>
            <span>{s.siteTitle}</span>
            <input
              type="text"
              value={form.site_title}
              onChange={e => handleChange('site_title', e.target.value)}
            />
            <span className="field-hint">{s.siteTitleHint}</span>
          </label>
          <label>
            <span>{s.siteDescription}</span>
            <textarea
              rows={3}
              value={form.site_description}
              onChange={e => handleChange('site_description', e.target.value)}
            />
            <span className="field-hint">{s.siteDescriptionHint}</span>
          </label>
          <label>
            <span>{s.defaultOgImage}</span>
            <input
              type="text"
              value={form.default_og_image}
              onChange={e => handleChange('default_og_image', e.target.value)}
              placeholder="https://..."
            />
            <span className="field-hint">{s.defaultOgImageHint}</span>
            {form.default_og_image && (
              <img
                src={form.default_og_image}
                alt="OG preview"
                className="og-preview"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </label>
          <label>
            <span>{s.twitterHandle}</span>
            <input
              type="text"
              value={form.twitter_handle}
              onChange={e => handleChange('twitter_handle', e.target.value)}
              placeholder="@username"
            />
            <span className="field-hint">{s.twitterHandleHint}</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{s.favicon}</h2>
        <div className="card-form">
          <label>
            <span>{s.faviconUrl}</span>
            <input
              type="text"
              value={form.favicon_url}
              onChange={e => handleChange('favicon_url', e.target.value)}
              placeholder="https://..."
            />
            <span className="field-hint">{s.faviconHint}</span>
            {form.favicon_url && (
              <img
                src={form.favicon_url}
                alt="favicon preview"
                className="favicon-preview"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{s.verification}</h2>
        <div className="card-form">
          <label>
            <span>{s.verificationGoogle}</span>
            <input
              type="text"
              value={form.verification_google}
              onChange={e => handleChange('verification_google', e.target.value)}
            />
            <span className="field-hint">{s.verificationGoogleHint}</span>
          </label>
          <label>
            <span>{s.verificationBing}</span>
            <input
              type="text"
              value={form.verification_bing}
              onChange={e => handleChange('verification_bing', e.target.value)}
            />
            <span className="field-hint">{s.verificationBingHint}</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{s.analytics}</h2>
        <div className="card-form">
          <label>
            <span>{s.gaId}</span>
            <input
              type="text"
              value={form.ga_id}
              onChange={e => handleChange('ga_id', e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
            <span className="field-hint">{s.gaIdHint}</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{s.pwa}</h2>
        <div className="card-form">
          <label>
            <span>{s.themeColor}</span>
            <div className="color-row">
              <input
                type="color"
                value={form.theme_color}
                onChange={e => handleChange('theme_color', e.target.value)}
              />
              <input
                type="text"
                value={form.theme_color}
                onChange={e => handleChange('theme_color', e.target.value)}
                placeholder="#f5f5f7"
              />
            </div>
            <span className="field-hint">{s.themeColorHint}</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{s.author}</h2>
        <div className="card-form">
          <label>
            <span>{s.authorName}</span>
            <input
              type="text"
              value={form.author_name}
              onChange={e => handleChange('author_name', e.target.value)}
            />
            <span className="field-hint">{s.authorNameHint}</span>
          </label>
          <label>
            <span>{s.authorUrl}</span>
            <input
              type="text"
              value={form.author_url}
              onChange={e => handleChange('author_url', e.target.value)}
              placeholder="https://..."
            />
            <span className="field-hint">{s.authorUrlHint}</span>
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : s.save}
        </button>
        {status === 'saved' && <span className="save-status success">{s.saved}</span>}
        {status === 'error' && <span className="save-status error">{s.error}</span>}
      </div>
    </div>
  )
}
