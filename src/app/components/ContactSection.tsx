'use client'

import { useState, type FormEvent } from 'react'
import { useApp } from '../AppContext'
import Reveal from './Reveal'

export default function ContactSection() {
  const { dict } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const { showToast } = useApp()

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

  const contactInfo = dict.contact.info as Record<string, string>

  return (
    <>
      <div className="page-header">
        <h2>{dict.nav.contact}</h2>
      </div>
      <div className="contact-content">
        <Reveal>
          <div className="contact-info">
            {Object.entries(contactInfo).map(([key, val]) => (
              <div className="row" key={key}>
                <span className="row-label">{key}</span>
                <span className="row-value">{val}</span>
              </div>
            ))}
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
