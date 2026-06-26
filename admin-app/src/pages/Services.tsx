import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, type Service } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

const empty = { titleZh: '', titleEn: '', descriptionZh: '', descriptionEn: '', price: '', icon: '', sortOrder: 0, draft: true, published: false }

export default function Services() {
  const { t } = useLocale()
  const [items, setItems] = useState<Service[] | null>(null)
  const [edit, setEdit] = useState<Partial<Service>>(empty)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { apiGet<Service[]>('/api/services?drafts=true').then(setItems).catch(() => setItems([])) }, [])

  const openNew = () => {
    setEdit({ ...empty })
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (s: Service) => {
    setEdit({ ...s })
    setEditingId(s.id)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEdit(empty)
    setEditingId(null)
  }

  const handleSave = async () => {
    try {
      if (editingId) {
        await apiPut(`/api/services/${editingId}`, edit)
      } else {
        await apiPost('/api/services', edit)
      }
      const saved = await apiGet<Service[]>('/api/services?drafts=true')
      setItems(saved)
      closeForm()
    } catch (e: any) {
      alert(t.services.error + ': ' + (e.message || e))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t.services.confirmDelete)) return
    await apiDelete(`/api/services/${id}`)
    setItems(p => (p || []).filter(x => x.id !== id))
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">{t.services.title}</h2>
        <button className="btn btn-primary" onClick={openNew}>{t.services.new}</button>
      </div>

      {showForm && (
        <div className="card-form">
          <div className="form-row">
            <div className="form-group"><label>{t.services.titleZh}</label><input value={edit.titleZh || ''} onChange={e => setEdit(f => ({ ...f, titleZh: e.target.value }))} /></div>
            <div className="form-group"><label>{t.services.titleEn}</label><input value={edit.titleEn || ''} onChange={e => setEdit(f => ({ ...f, titleEn: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{t.services.descZh}</label><textarea rows={2} value={edit.descriptionZh || ''} onChange={e => setEdit(f => ({ ...f, descriptionZh: e.target.value }))} /></div>
            <div className="form-group"><label>{t.services.descEn}</label><textarea rows={2} value={edit.descriptionEn || ''} onChange={e => setEdit(f => ({ ...f, descriptionEn: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{t.services.price}</label><input value={edit.price || ''} onChange={e => setEdit(f => ({ ...f, price: e.target.value }))} /></div>
            <div className="form-group"><label>{t.services.sortOrder}</label><input type="number" value={edit.sortOrder || 0} onChange={e => setEdit(f => ({ ...f, sortOrder: +e.target.value }))} /></div>
          </div>
          <div className="form-group"><label>{t.services.icon}</label><input value={edit.icon || ''} onChange={e => setEdit(f => ({ ...f, icon: e.target.value }))} placeholder={t.services.iconPlaceholder} /></div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={!edit.draft} onChange={e => setEdit(f => ({ ...f, draft: !e.target.checked, published: e.target.checked }))} />
              {t.services.published}
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSave}>{t.services.save}</button>
            <button className="btn btn-outline" onClick={closeForm}>{t.services.cancel}</button>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead><tr><th>{t.services.iconCol}</th><th>{t.services.titleCol}</th><th>{t.services.priceCol}</th><th>{t.services.orderCol}</th><th></th></tr></thead>
        <tbody>
          {items === null && [1,2,3].map(i => (
            <tr key={i}><td colSpan={5}>
              <div className="skeleton-table-row">
                <div className="skeleton skeleton-table-cell" />
                <div className="skeleton skeleton-table-cell-sm" />
                <div className="skeleton skeleton-table-cell-sm" />
                <div className="skeleton skeleton-table-cell-sm" />
              </div>
            </td></tr>
          ))}
          {items?.map(s => (
            <tr key={s.id}>
              <td style={{ fontSize: 22, textAlign: 'center' }}>{s.icon || '-'}</td>
              <td>{s.titleEn || s.titleZh}</td>
              <td>{s.price}</td>
              <td>{s.sortOrder}</td>
              <td className="cell-actions">
                <button className="btn btn-sm" onClick={() => openEdit(s)}>{t.services.edit}</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>{t.services.delete}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
