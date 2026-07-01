import { useEffect, useState, useRef, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, apiPatch, type Project } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

const empty = { titleZh: '', titleEn: '', descriptionZh: '', descriptionEn: '', link: '', imageUrl: '', tags: [] as string[], draft: true, published: false, sortOrder: 0 }

export default function Projects() {
  const { t } = useLocale()
  const [items, setItems] = useState<Project[] | null>(null)
  const [edit, setEdit] = useState<Partial<Project> & { tagsStr?: string }>(empty)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const tagRef = useRef<HTMLInputElement>(null)

  useEffect(() => { apiGet<Project[]>('/api/projects?drafts=true').then(setItems).catch(() => setItems([])) }, [])

  const openNew = () => {
    setEdit({ ...empty })
    setEditTags([])
    setTagInput('')
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (p: Project) => {
    setEdit({ ...p })
    setEditTags(Array.isArray(p.tags) ? p.tags : [])
    setTagInput('')
    setEditingId(p.id)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEdit(empty)
    setEditTags([])
    setTagInput('')
    setEditingId(null)
  }

  const addTag = () => {
    const val = tagInput.trim()
    if (val && !editTags.includes(val)) {
      setEditTags(prev => [...prev, val])
    }
    setTagInput('')
    tagRef.current?.focus()
  }

  const removeTag = (val: string) => {
    setEditTags(prev => prev.filter(t => t !== val))
  }

  const handleTagKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSave = async () => {
    try {
      const body = { ...edit, tags: editTags }
      if (editingId) {
        await apiPut(`/api/projects/${editingId}`, body)
      } else {
        await apiPost('/api/projects', body)
      }
      const saved = await apiGet<Project[]>('/api/projects?drafts=true')
      setItems(saved)
      closeForm()
    } catch (e: any) {
      alert(t.projects.error + ': ' + (e.message || e))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t.projects.confirmDelete)) return
    await apiDelete(`/api/projects/${id}`)
    setItems(p => (p || []).filter(x => x.id !== id))
  }

  const persistOrder = useCallback(async (ordered: Project[]) => {
    const base = ordered.length * 10
    const orders = ordered.map((p, i) => ({ id: p.id, sortOrder: base - i * 10 }))
    try {
      await apiPatch('/api/projects/reorder', { orders })
    } catch (e: any) {
      alert('Reorder failed: ' + (e.message || e))
    }
  }, [])

  const handleDragStart = (idx: number) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (idx !== dragIdx) setDragOverIdx(idx)
  }

  const handleDragLeave = () => {
    setDragOverIdx(null)
  }

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx || !items) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }

    const updated = [...items]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(dropIdx, 0, moved)

    setItems(updated)
    setDragIdx(null)
    setDragOverIdx(null)
    persistOrder(updated)
  }

  const handleMoveUp = (idx: number) => {
    if (!items || idx === 0) return
    const updated = [...items]
    ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
    setItems(updated)
    persistOrder(updated)
  }

  const handleMoveDown = (idx: number) => {
    if (!items || idx === items.length - 1) return
    const updated = [...items]
    ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
    setItems(updated)
    persistOrder(updated)
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">{t.projects.title}</h2>
        <button className="btn btn-primary" onClick={openNew}>{t.projects.new}</button>
      </div>

      {showForm && (
        <div className="card-form">
          <div className="form-row">
            <div className="form-group"><label>{t.projects.titleZh}</label><input value={edit.titleZh || ''} onChange={e => setEdit(f => ({ ...f, titleZh: e.target.value }))} /></div>
            <div className="form-group"><label>{t.projects.titleEn}</label><input value={edit.titleEn || ''} onChange={e => setEdit(f => ({ ...f, titleEn: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{t.projects.descZh}</label><textarea rows={2} value={edit.descriptionZh || ''} onChange={e => setEdit(f => ({ ...f, descriptionZh: e.target.value }))} /></div>
            <div className="form-group"><label>{t.projects.descEn}</label><textarea rows={2} value={edit.descriptionEn || ''} onChange={e => setEdit(f => ({ ...f, descriptionEn: e.target.value }))} /></div>
          </div>
          <div className="form-group">
            <label>{t.projects.tags}</label>
            <div className="tag-input-wrap">
              <input ref={tagRef} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey} placeholder={typeof t.projects.tagPlaceholder === 'string' ? t.projects.tagPlaceholder : ''} />
              <button className="btn btn-sm" onClick={addTag} type="button">+</button>
            </div>
            <div className="tag-list">
              {editTags.map(tag => (
                <span key={tag} className="tag-pill">
                  {tag}
                  <button className="tag-remove" onClick={() => removeTag(tag)} type="button">&times;</button>
                </span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>{t.projects.link}</label>
            <input value={edit.link || ''} onChange={e => setEdit(f => ({ ...f, link: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>{t.projects.imageUrl}</label>
            <input value={edit.imageUrl || ''} onChange={e => setEdit(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={!edit.draft} onChange={e => setEdit(f => ({ ...f, draft: !e.target.checked, published: e.target.checked }))} />
              {t.projects.published}
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSave}>{t.projects.save}</button>
            <button className="btn btn-outline" onClick={closeForm}>{t.projects.cancel}</button>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead><tr><th style={{ width: 40 }}></th><th>{t.projects.titleCol}</th><th>{t.projects.tagsCol}</th><th style={{ width: 80 }}>{t.projects.orderCol}</th><th style={{ width: 100 }}></th></tr></thead>
        <tbody>
          {items === null && [1,2,3].map(i => (
            <tr key={i}><td colSpan={5}>
              <div className="skeleton-table-row">
                <div className="skeleton skeleton-table-cell" />
                <div className="skeleton skeleton-table-cell-sm" />
                <div className="skeleton skeleton-table-cell-sm" />
              </div>
            </td></tr>
          ))}
          {items?.map((p, idx) => {
            const isOver = dragOverIdx === idx && dragIdx !== null && dragOverIdx !== dragIdx
            return (
              <tr
                key={p.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, idx)}
                style={{ opacity: dragIdx === idx ? 0.5 : 1, cursor: 'grab' }}
                className={isOver ? 'drop-target' : ''}
              >
                <td style={{ textAlign: 'center', cursor: 'grab', fontSize: 16, userSelect: 'none' }}>
                  <span className="drag-handle">⠿</span>
                </td>
                <td>{p.titleEn || p.titleZh}</td>
                <td>{(Array.isArray(p.tags) ? p.tags : []).join(', ')}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-text" onClick={() => handleMoveUp(idx)} disabled={idx === 0} title="Move up">▲</button>
                  <button className="btn btn-sm btn-text" onClick={() => handleMoveDown(idx)} disabled={idx === items.length - 1} title="Move down">▼</button>
                </td>
                <td className="cell-actions">
                  <button className="btn btn-sm" onClick={() => openEdit(p)}>{t.projects.edit}</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>{t.projects.delete}</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
