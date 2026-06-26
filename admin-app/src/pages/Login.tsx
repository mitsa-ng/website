import { useState, useEffect, type FormEvent } from 'react'
import { setApiKey, setServerUrl, initApiKey, verifyApiKey, getConfig, setConfig, addProfile, setActiveProfileId, getProfiles } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

interface Props {
  onLogin: () => void
}

export default function Login({ onLogin }: Props) {
  const { t } = useLocale()
  const [mode, setMode] = useState<'setup' | 'init' | 'enter'>('setup')
  const [serverUrl, setServerUrlState] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [key, setKey] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const saveAsProfile = (serverUrl: string, apiKey: string) => {
    const profiles = getProfiles()
    const exists = profiles.some(p => p.serverUrl === serverUrl && p.apiKey === apiKey)
    if (exists) {
      const p = profiles.find(x => x.serverUrl === serverUrl && x.apiKey === apiKey)!
      setActiveProfileId(p.id)
      return
    }
    const name = serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const profile = addProfile(name, serverUrl, apiKey)
    setActiveProfileId(profile.id)
  }

  // Check if already configured on mount
  useEffect(() => {
    getConfig().then(config => {
      if (config && config.serverUrl && config.apiSecret) {
        setServerUrlState(config.serverUrl)
        setApiSecret(config.apiSecret)
        setUrl(config.serverUrl)
        setMode('enter')
      }
    }).catch(console.error)
  }, [])

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault()
    if (!serverUrl || !apiSecret) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const normalizedUrl = serverUrl.replace(/\/$/, '')
      await setConfig({
        serverUrl: normalizedUrl,
        apiSecret,
        configuredAt: Date.now()
      })
      const ok = await verifyApiKey(apiSecret, normalizedUrl)
      if (!ok) {
        setError('Invalid API secret')
        setLoading(false)
        return
      }
      await setServerUrl(normalizedUrl)
      await setApiKey(apiSecret)
      setUrl(normalizedUrl)
      saveAsProfile(normalizedUrl, apiSecret)
      onLogin()
    } catch (e: any) {
      setError(e.message || 'Configuration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleInit = async () => {
    setLoading(true); setError('')
    try {
      const raw = await initApiKey(url)
      await setServerUrl(url)
      await setApiKey(raw)
      saveAsProfile(url, raw)
      onLogin()
    } catch (e: any) {
      setError(e.message || t.login.failInit)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const ok = await verifyApiKey(key, url)
      if (!ok) { setError(t.login.invalidKey); setLoading(false); return }
      await setServerUrl(url)
      await setApiKey(key)
      saveAsProfile(url, key)
      onLogin()
    } catch (e: any) {
      setError(e.message || t.login.failVerify)
    } finally {
      setLoading(false)
    }
  }

  // Setup Mode - First time configuration
  if (mode === 'setup') {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">P</div>
          <h1>Admin Setup</h1>
          <p className="login-sub">Configure your server connection</p>

          <form onSubmit={handleSetup}>
            <div className="form-group">
              <label>Server Domain</label>
              <input
                type="url"
                value={serverUrl}
                onChange={e => setServerUrlState(e.target.value)}
                placeholder="https://your-server.com"
                required
              />
            </div>

            <div className="form-group">
              <label>API Secret</label>
              <input
                type="password"
                value={apiSecret}
                onChange={e => setApiSecret(e.target.value)}
                placeholder="Enter your API secret"
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </form>

          <button className="btn btn-text btn-block" type="button" onClick={() => { setUrl(serverUrl); setMode('init'); }} style={{ marginTop: 12 }}>
            Don't have an API key? Generate one
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">P</div>
        <h1>{t.login.title}</h1>
        <p className="login-sub">{t.login.subtitle}</p>

        <div className="form-group">
          <label>{t.login.serverUrl}</label>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder={t.login.serverPlaceholder} />
        </div>

        {mode === 'enter' ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t.login.apiKey}</label>
              <input type="text" value={key} onChange={e => setKey(e.target.value)} placeholder={t.login.apiKeyPlaceholder} />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? t.login.verifying : t.login.login}
            </button>
            <button className="btn btn-text btn-block" type="button" onClick={() => setMode('init')} style={{ marginTop: 8 }}>
              {t.login.firstTime}
            </button>
            <button className="btn btn-text btn-block" type="button" onClick={() => setMode('setup')} style={{ marginTop: 8 }}>
              Change Server
            </button>
          </form>
        ) : (
          <div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-block" onClick={handleInit} disabled={loading}>
              {loading ? t.login.generating : t.login.generate}
            </button>
            <button className="btn btn-text btn-block" type="button" onClick={() => setMode('enter')} style={{ marginTop: 8 }}>
              {t.login.back}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
