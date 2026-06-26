import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPatch } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

interface ContactData {
  id: number
  name: string
  email: string
  message: string
  createdAt: string
}

export default function ContactEdit() {
  const { t } = useLocale()
  const { id } = useParams()
  const nav = useNavigate()
  const [contact, setContact] = useState<ContactData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    apiGet<{ data: ContactData }>(`/api/contact/${id}`)
      .then(res => setContact(res.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setContact(prev => prev ? { ...prev, [name]: value } : prev)
  }

  const handleSubmit = async () => {
    if (!contact || saving) return
    setSaving(true)
    setError('')
    try {
      const { id: _, createdAt: __, ...body } = contact
      await apiPatch(`/api/contact/${id}`, body)
      nav('/contacts')
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><p>{t.contacts.loading}</p></div>
  if (error && !contact) return <div className="page"><p className="form-error">{error}</p></div>
  if (!contact) return <div className="page"><p>{t.contacts.empty}</p></div>

  return (
    <div className="page">
      <h2 className="page-title">{t.contacts.edit}</h2>
      <div className="card-form" style={{ maxWidth: 600 }}>
        <div className="form-group">
          <label>{t.contacts.name}</label>
          <input type="text" name="name" value={contact.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>{t.contacts.email}</label>
          <input type="email" name="email" value={contact.email} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>{t.contacts.message}</label>
          <textarea name="message" rows={4} value={contact.message} onChange={handleChange} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : t.contacts.save}
          </button>
          <button className="btn btn-outline" onClick={() => nav('/contacts')}>
            {t.contacts.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
