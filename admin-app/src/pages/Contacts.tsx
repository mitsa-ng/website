import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiDelete, type Contact } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

export default function Contacts() {
  const { t } = useLocale()
  const nav = useNavigate()
  const [items, setItems] = useState<Contact[] | null>(null)

  useEffect(() => { apiGet<Contact[]>('/api/contact').then(setItems).catch(() => setItems([])) }, [])

  const handleDelete = async (id: number) => {
    if (!confirm(t.contacts.confirmDelete)) return
    await apiDelete(`/api/contact/${id}`)
    setItems(p => (p || []).filter(x => x.id !== id))
  }

  return (
    <div className="page">
<div className="page-header-row">
  <h2 className="page-title">{t.contacts.title}</h2>
  <span className="count">{(items || []).length}</span>
      <button
    className="btn btn-sm btn-text"
    onClick={() => nav('/settings')}
    aria-label="Settings"
  >
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
    Settings
  </button>
</div>
      <div className="contact-list">
        {items === null && [1,2].map(i => (
          <div key={i} className="contact-card">
            <div className="skeleton skeleton-contact-card" />
          </div>
        ))}
{items?.map(c => (
  <div key={c.id} className="contact-card">
    <div className="contact-head">
      <strong>{c.name}</strong>
      <span className="contact-email">{c.email}</span>
      <span className="contact-date">{new Date(c.createdAt).toLocaleDateString()}</span>
      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>{t.contacts.delete}</button>
      <button className="btn btn-sm btn-outline" onClick={() => nav(`/contacts/${c.id}/edit`)} aria-label="Edit">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Edit
      </button>
    </div>
    <p className="contact-message">{c.message}</p>
  </div>
        ))}
        {items?.length === 0 && <p className="empty">{t.contacts.empty}</p>}
      </div>
    </div>
  )
}
