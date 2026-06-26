'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useApp } from '../AppContext'
import { transformKeys } from '@/lib/transform'
import Reveal from './Reveal'

interface SiteSettings {
  contactEmail: string
  contactLocationZh: string
  contactLocationEn: string
  contactReplyTimeZh: string
  contactReplyTimeEn: string
}

export default function ContactSection() {
  const { dict, locale } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const { showToast } = useApp()

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setSettings(transformKeys<SiteSettings>(d)))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name || !email || !message) return
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      if (res.ok) {
        showToast(dict.contact.success)
        setName(''); setEmail(''); setMessage('')
      } else {
        showToast(dict.contact.error, 'error')
      }
    } catch {
      showToast(dict.contact.error, 'error')
    } finally {
      setSending(false)
    }
  }

  const contactLabels = locale === 'zh-TW'
    ? { email: 'Email', location: '地點', replyTime: '回覆時間' }
    : { email: 'Email', location: 'Location', replyTime: 'Reply Time' }

  const contactEmail = settings?.contactEmail || 'xingencai060@gmail.com'
  const contactLocation = locale === 'zh-TW' ? settings?.contactLocationZh : settings?.contactLocationEn
  const contactReplyTime = locale === 'zh-TW' ? settings?.contactReplyTimeZh : settings?.contactReplyTimeEn

  return (
    <>
      <div className="page-header">
        <h2>{dict.nav.contact}</h2>
      </div>
      <div className="contact-content">
        <Reveal>
          <div className="contact-info">
            <div className="row">
              <span className="row-label">{contactLabels.email}</span>
              <span className="row-value">{contactEmail}</span>
            </div>
            <div className="row">
              <span className="row-label">{contactLabels.location}</span>
              <span className="row-value">{contactLocation || 'Taiwan'}</span>
            </div>
            <div className="row">
              <span className="row-label">{contactLabels.replyTime}</span>
              <span className="row-value">{contactReplyTime || (locale === 'zh-TW' ? '最快 24 小時內回覆' : 'Replies within 24h')}</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <div className="contact-form-wrap">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{dict.contact.form.name}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={dict.contact.form.name} required />
              </div>
              <div className="form-group">
                <label>{dict.contact.form.email}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={dict.contact.form.email} required />
              </div>
              <div className="form-group">
                <label>{dict.contact.form.message}</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={dict.contact.form.message} required />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={sending}>
                {sending ? dict.contact.form.sending : dict.contact.form.send}
              </button>
            </form>
          </div>
        </Reveal>
      </div>
    </>
  )
}
