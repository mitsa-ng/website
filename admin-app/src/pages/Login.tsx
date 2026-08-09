import { useState, useEffect, type FormEvent } from 'react'
import { setApiKey, setServerUrl, verifyApiKey, getConfig, setConfig, addProfile, setActiveProfileId, getProfiles } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'
import AdminKeyRotation from '../components/AdminKeyRotation'

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
  const [rotationServerUrl, setRotationServerUrl] = useState('')
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

  const handleVerifiedRotation = async (rawKey: string) => {
    await setServerUrl(rotationServerUrl)
    await setApiKey(rawKey)
    saveAsProfile(rotationServerUrl, rawKey)
    onLogin()
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
              <label htmlFor="setup-server-url">Server Domain</label>
              <input
                id="setup-server-url"
                type="url"
                value={serverUrl}
                onChange={e => setServerUrlState(e.target.value)}
                placeholder="https://your-server.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="setup-api-secret">API Secret</label>
              <input
                id="setup-api-secret"
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

          <button className="btn btn-text btn-block" type="button" onClick={() => { setUrl(serverUrl); setRotationServerUrl(serverUrl); setMode('init'); }} style={{ marginTop: 12, minHeight: 44 }}>
            {t.rotation.recoveryEntry}
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
          <label htmlFor="login-server-url">{t.login.serverUrl}</label>
          <input id="login-server-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder={t.login.serverPlaceholder} disabled={mode === 'init'} />
        </div>

        {mode === 'enter' ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-api-key">{t.login.apiKey}</label>
              <input id="login-api-key" type="text" value={key} onChange={e => setKey(e.target.value)} placeholder={t.login.apiKeyPlaceholder} />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? t.login.verifying : t.login.login}
            </button>
            <button className="btn btn-text btn-block" type="button" onClick={() => { setRotationServerUrl(url); setMode('init') }} style={{ marginTop: 8, minHeight: 44 }}>
              {t.login.firstTime}
            </button>
            <button className="btn btn-text btn-block" type="button" onClick={() => setMode('setup')} style={{ marginTop: 8 }}>
              Change Server
            </button>
          </form>
        ) : (
          <AdminKeyRotation
            serverUrl={rotationServerUrl}
            onVerified={handleVerifiedRotation}
            onClose={() => setMode('enter')}
          />
        )}
      </div>
    </div>
  )
}
