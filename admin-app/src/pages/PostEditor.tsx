import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPut, type Post } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

async function getSettings() {
  const base = localStorage.getItem('server_url')
  const key = localStorage.getItem('api_key')
  const url = base ? `${base}/api/settings` : '/api/settings'
  const res = await fetch(url, {
    headers: { ...(key ? { 'X-Api-Key': key } : {}) },
  })
  if (!res.ok) return {}
  return res.json()
}

export default function PostEditor() {
  const { t } = useLocale()
  const { slug } = useParams()
  const nav = useNavigate()
  const isNew = !slug

  const [form, setForm] = useState<{
    slug: string; titleZh: string; titleEn: string;
    contentZh: string; contentEn: string;
    excerptZh: string; excerptEn: string;
    draft: boolean;
    fingerprintZh?: string; fingerprintEn?: string;
  } | null>(isNew ? {
    slug: '', titleZh: '', titleEn: '',
    contentZh: '', contentEn: '',
    excerptZh: '', excerptEn: '',
    draft: true,
    fingerprintZh: '', fingerprintEn: '',
  } : null)
  const [saving, setSaving] = useState(false)
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false)

  useEffect(() => {
    getSettings().then(d => {
      setFingerprintEnabled(!!d.fingerprint_enabled)
    })
  }, [])

  useEffect(() => {
    if (!slug) return
    apiGet<Post>(`/api/posts/${slug}`).then(p => {
      setForm({
        slug: p.slug,
        titleZh: p.titleZh, titleEn: p.titleEn,
        contentZh: p.contentZh, contentEn: p.contentEn,
        excerptZh: p.excerptZh, excerptEn: p.excerptEn,
        draft: p.draft,
        fingerprintZh: p.fingerprintZh,
        fingerprintEn: p.fingerprintEn,
      })
    }).catch(() => nav('/posts'))
  }, [slug])

  const handleSave = async (publish = false) => {
    if (!form) return
    setSaving(true)
    try {
      const body = { ...form, draft: !publish, published: publish }
      if (isNew) {
        await apiPost('/api/posts', body)
      } else {
        await apiPut(`/api/posts/${slug}`, body)
      }
      nav('/posts')
    } catch (e: any) {
      alert(t.postEditor.error + ': ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">{isNew ? t.postEditor.new : t.postEditor.edit}</h2>

      {!form ? (
        <div className="editor-layout">
          <div className="editor-pane">
            <div className="skeleton skeleton-form-label" />
            <div className="skeleton skeleton-form-input" />
            <div className="skeleton skeleton-form-label" />
            <div className="skeleton skeleton-form-input" />
            <div className="skeleton skeleton-form-label" />
            <div className="skeleton skeleton-form-textarea" />
          </div>
          <div className="editor-pane">
            <div className="skeleton skeleton-form-label" />
            <div className="skeleton skeleton-form-input" />
            <div className="skeleton skeleton-form-label" />
            <div className="skeleton skeleton-form-input" />
            <div className="skeleton skeleton-form-label" />
            <div className="skeleton skeleton-form-textarea" />
          </div>
        </div>
      ) : (
      <><div className="editor-layout">
        <div className="editor-pane">
          <h3>{t.postEditor.chinese}</h3>
          <div className="form-group">
            <label>{t.postEditor.title}</label>
            <input value={form.titleZh} onChange={e => setForm(f => ({ ...f!, titleZh: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>{t.postEditor.excerpt}</label>
            <textarea rows={2} value={form.excerptZh} onChange={e => setForm(f => ({ ...f!, excerptZh: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>{t.postEditor.content}</label>
            <textarea className="editor-textarea" rows={20} value={form.contentZh} onChange={e => setForm(f => ({ ...f!, contentZh: e.target.value }))} />
          </div>
          {fingerprintEnabled && form.fingerprintZh && (
            <div className="form-group">
              <label style={{ color: 'var(--meta)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Content Fingerprint
              </label>
              <code style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)', wordBreak: 'break-all', lineHeight: 1.6 }} title={form.fingerprintZh}>
                {form.fingerprintZh}
              </code>
            </div>
          )}
        </div>
        <div className="editor-pane">
          <h3>{t.postEditor.english}</h3>
          <div className="form-group">
            <label>{t.postEditor.title}</label>
            <input value={form.titleEn} onChange={e => setForm(f => ({ ...f!, titleEn: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>{t.postEditor.excerpt}</label>
            <textarea rows={2} value={form.excerptEn} onChange={e => setForm(f => ({ ...f!, excerptEn: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>{t.postEditor.content}</label>
            <textarea className="editor-textarea" rows={20} value={form.contentEn} onChange={e => setForm(f => ({ ...f!, contentEn: e.target.value }))} />
          </div>
          {fingerprintEnabled && form.fingerprintEn && (
            <div className="form-group">
              <label style={{ color: 'var(--meta)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Content Fingerprint
              </label>
              <code style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)', wordBreak: 'break-all', lineHeight: 1.6 }} title={form.fingerprintEn}>
                {form.fingerprintEn}
              </code>
            </div>
          )}
        </div>
      </div>
      {isNew && (
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>{t.postEditor.slug}</label>
          <input value={form.slug} onChange={e => setForm(f => ({ ...f!, slug: e.target.value }))} placeholder={t.postEditor.slugPlaceholder} />
        </div>
      )}
      <div className="editor-actions">
        <button className="btn btn-outline" onClick={() => nav('/posts')}>{t.postEditor.cancel}</button>
        <button className="btn btn-dark" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? t.postEditor.saving : t.postEditor.saveDraft}
        </button>
        <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
          {saving ? t.postEditor.publishing : t.postEditor.publish}
        </button>
      </div></>
      )}
    </div>
  )
}
