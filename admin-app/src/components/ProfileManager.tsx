import { useState, useEffect } from 'react'
import { useLocale } from '../lib/LocaleContext'
import {
  type Profile,
  getProfiles,
  saveProfiles,
  addProfile,
  deleteProfile,
  switchProfile,
} from '../lib/api'

interface Props {
  onClose: () => void
  onSwitch: () => void
}

function testConnection(url: string, key: string): Promise<boolean> {
  const base = url.replace(/\/$/, '')
  return fetch(`${base}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  }).then(r => r.ok).catch(() => false)
}

export default function ProfileManager({ onClose, onSwitch }: Props) {
  const { t } = useLocale()
  const pm = t.profileManager
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [testing, setTesting] = useState<Record<string, 'idle' | 'loading' | 'ok' | 'fail'>>({})
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newKey, setNewKey] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { setProfiles(getProfiles()) }, [])

  const refresh = () => setProfiles(getProfiles())

  const handleTest = async (id: string) => {
    const p = profiles.find(x => x.id === id)
    if (!p) return
    setTesting(s => ({ ...s, [id]: 'loading' }))
    const ok = await testConnection(p.serverUrl, p.apiKey)
    setTesting(s => ({ ...s, [id]: ok ? 'ok' : 'fail' }))
  }

  const handleSwitch = (id: string) => {
    switchProfile(id)
    onSwitch()
    onClose()
  }

  const handleDelete = (id: string) => {
    if (!confirm(pm.confirmDelete)) return
    deleteProfile(id)
    refresh()
  }

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim() || !newKey.trim()) return
    addProfile(newName.trim(), newUrl.trim(), newKey.trim())
    setNewName('')
    setNewUrl('')
    setNewKey('')
    setAdding(false)
    refresh()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{pm.title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {profiles.length === 0 ? (
            <p className="modal-empty">{pm.empty}</p>
          ) : (
            <div className="profile-list">
              {profiles.map(p => (
                <div key={p.id} className="profile-row">
                  <div className="profile-info">
                    <strong>{p.name}</strong>
                    <span className="profile-url">{p.serverUrl || '(local proxy)'}</span>
                  </div>
                  <div className="profile-actions">
                    <button className="btn btn-sm" onClick={() => handleTest(p.id)} disabled={testing[p.id] === 'loading'}>
                      {testing[p.id] === 'loading' ? pm.testing : testing[p.id] === 'ok' ? pm.connected : testing[p.id] === 'fail' ? pm.failed : pm.test}
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSwitch(p.id)}>{pm.switch}</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)}>{pm.delete}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <div className="profile-add-form">
              <h4>{pm.add}</h4>
              <div className="form-group">
                <label>{pm.name}</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={pm.namePlaceholder} />
              </div>
              <div className="form-group">
                <label>{pm.serverUrl}</label>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="http://localhost:3000" />
              </div>
              <div className="form-group">
                <label>{pm.apiKey}</label>
                <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="pw_..." />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleAdd}>{pm.save}</button>
                <button className="btn btn-outline" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-outline btn-block" style={{ marginTop: 16 }} onClick={() => setAdding(true)}>
              {pm.add}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
