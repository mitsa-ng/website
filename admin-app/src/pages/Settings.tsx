import { useState, useEffect } from 'react'
import { getApiKey, setApiKey, getServerUrl, setServerUrl, initApiKey } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

async function apiHeaders() {
  const key = await getApiKey()
  return {
    'Content-Type': 'application/json',
    ...(key ? { 'X-Api-Key': key } : {}),
  } as Record<string, string>
}

async function apiUrl(path: string) {
  const base = await getServerUrl()
  return `${base}${path}`
}

async function settingsGet<T>(): Promise<T> {
  const res = await fetch(await apiUrl('/api/settings'), { headers: await apiHeaders() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function settingsPut(body: unknown): Promise<void> {
  const res = await fetch(await apiUrl('/api/settings'), {
    method: 'PUT',
    headers: await apiHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
}

interface StatItem { id: string; num: string; labelZh: string; labelEn: string }
interface ExpItem { id: string; period: string; titleZh: string; titleEn: string; orgZh: string; orgEn: string }
interface EduItem { id: string; period: string; degreeZh: string; degreeEn: string; schoolZh: string; schoolEn: string }
interface CertItem { id: string; year: string; nameZh: string; nameEn: string; issuerZh: string; issuerEn: string }

interface AboutContent {
  avatarUrl: string
  nameZh: string
  nameEn: string
  subtitleZh: string
  subtitleEn: string
  bioZh: string
  bioEn: string
  heroBgColor: string
  heroBgImage: string
  heroTextColor: string
  stats: StatItem[]
  skillsZh: string[]
  skillsEn: string[]
  experience: ExpItem[]
  education: EduItem[]
  certifications: CertItem[]
}

interface SiteSettings {
  contact_email: string
  contact_location_zh: string
  contact_location_en: string
  contact_reply_time_zh: string
  contact_reply_time_en: string
  brand_text?: string
  about_content?: AboutContent
  fingerprint_enabled?: boolean
  fingerprint_method?: 'hash' | 'signature'
  fingerprint_public_key?: string
}

const defaultSettings: SiteSettings = {
  contact_email: '',
  contact_location_zh: '',
  contact_location_en: '',
  contact_reply_time_zh: '',
  contact_reply_time_en: '',
}

function defaultAbout(): AboutContent {
  return {
    avatarUrl: '',
    nameZh: '',
    nameEn: '',
    subtitleZh: '',
    subtitleEn: '',
    bioZh: '',
    bioEn: '',
    heroBgColor: '',
    heroBgImage: '',
    heroTextColor: '',
    stats: [],
    skillsZh: [],
    skillsEn: [],
    experience: [],
    education: [],
    certifications: [],
  }
}

let idCounter = Date.now()
function uid() { return String(++idCounter) }

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) { onChange([...tags, v]); setInput('') }
  }
  return (
    <div className="tag-input-wrap" style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: 36 }}>
      {tags.map(t => (
        <span key={t} className="tag-pill">
          {t}
          <button type="button" className="tag-remove" onClick={() => onChange(tags.filter(x => x !== t))}>&times;</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{ flex: 1, minWidth: 80, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }}
      />
    </div>
  )
}

export default function Settings() {
  const { t } = useLocale()
  const [key, setKeyState] = useState('')
  const [url, setUrlState] = useState('')
  const [saved, setSaved] = useState(false)
  const [site, setSite] = useState<SiteSettings>(defaultSettings)
  const [about, setAbout] = useState<AboutContent>(defaultAbout)
  const [siteSaved, setSiteSaved] = useState(false)
  const [fingerprintSaved, setFingerprintSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getApiKey().then(k => setKeyState(k || ''))
    getServerUrl().then(setUrlState)
    settingsGet<any>().then(s => {
      setSite({ ...defaultSettings, ...s })
      const raw = s.about_content
      setAbout(raw ? { ...defaultAbout(), ...(typeof raw === 'string' ? JSON.parse(raw) : raw) } : defaultAbout())
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    await setApiKey(key)
    await setServerUrl(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleRegen = async () => {
    if (!confirm(t.settings.confirmRegen)) return
    await setServerUrl(url)
    const raw = await initApiKey()
    await setApiKey(raw)
    setKeyState(raw)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSiteSave = async () => {
    try {
      const payload = { ...site, about_content: about }
      await settingsPut(payload)
      setSiteSaved(true)
      setTimeout(() => setSiteSaved(false), 2000)
    } catch (e: any) {
      alert(t.settings.error + ': ' + (e.message || e))
    }
  }

  const handleFingerprintSave = async () => {
    try {
      await settingsPut(site)
      setFingerprintSaved(true)
      setTimeout(() => setFingerprintSaved(false), 2000)
    } catch (e: any) {
      alert(t.settings.error + ': ' + (e.message || e))
    }
  }

  const updateAbout = (patch: Partial<AboutContent>) => setAbout(p => ({ ...p, ...patch }))

  return (
    <div className="page">
      <h2 className="page-title">{t.settings.title}</h2>

      <div className="card-form" style={{ maxWidth: 500, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>{t.settings.apiSection}</h3>
        <div className="form-group">
          <label>{t.settings.serverUrl}</label>
          <input value={url} onChange={e => setUrlState(e.target.value)} placeholder={t.settings.serverPlaceholder} />
        </div>
        <div className="form-group">
          <label>{t.settings.apiKey}</label>
          <input value={key} onChange={e => setKeyState(e.target.value)} type="text" />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSave}>{saved ? t.settings.saved : t.settings.save}</button>
          <button className="btn btn-outline" onClick={handleRegen}>{t.settings.regen}</button>
        </div>
      </div>

      <div className="card-form" style={{ maxWidth: 500, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>{t.settings.siteSection}</h3>
        {loading ? (
          <p>{t.settings.loading}</p>
        ) : (
          <>
            <div className="form-group">
              <label>{t.settings.contactEmail}</label>
              <input value={site.contact_email} onChange={e => setSite(s => ({ ...s, contact_email: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t.settings.locationZh}</label>
                <input value={site.contact_location_zh} onChange={e => setSite(s => ({ ...s, contact_location_zh: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>{t.settings.locationEn}</label>
                <input value={site.contact_location_en} onChange={e => setSite(s => ({ ...s, contact_location_en: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t.settings.replyTimeZh}</label>
                <input value={site.contact_reply_time_zh} onChange={e => setSite(s => ({ ...s, contact_reply_time_zh: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>{t.settings.replyTimeEn}</label>
                <input value={site.contact_reply_time_en} onChange={e => setSite(s => ({ ...s, contact_reply_time_en: e.target.value }))} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card-form" style={{ maxWidth: 500, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Brand</h3>
        {loading ? (
          <p>{t.settings.loading}</p>
        ) : (
          <div className="form-group">
            <label>{t.settings.brandText}</label>
            <input value={site.brand_text || ''} onChange={e => setSite(s => ({ ...s, brand_text: e.target.value }))} />
          </div>
        )}
      </div>

      <div className="card-form" style={{ maxWidth: 500, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Content Fingerprint</h3>
        {loading ? (
          <p>{t.settings.loading}</p>
        ) : (
          <>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!site.fingerprint_enabled}
                  onChange={e => setSite(s => ({ ...s, fingerprint_enabled: e.target.checked }))}
                />
                Enable Content Fingerprint
              </label>
            </div>
            {site.fingerprint_enabled && (
              <>
                <div className="form-group">
                  <label>Method</label>
                  <select
                    value={site.fingerprint_method || 'hash'}
                    onChange={e => setSite(s => ({ ...s, fingerprint_method: e.target.value as 'hash' | 'signature' }))}
                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, background: 'var(--surface-warm)' }}
                  >
                    <option value="hash">SHA-256 Hash</option>
                    <option value="signature">Digital Signature (coming soon)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Public Key (for signature verification)</label>
                  <textarea
                    rows={3}
                    value={site.fingerprint_public_key || ''}
                    onChange={e => setSite(s => ({ ...s, fingerprint_public_key: e.target.value }))}
                    placeholder="PEM public key for signature verification..."
                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                  />
                </div>
              </>
            )}
            <div className="form-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleFingerprintSave}>{fingerprintSaved ? t.settings.saved : t.settings.save}</button>
            </div>
          </>
        )}
      </div>

      {!loading && (
        <div className="card-form" style={{ maxWidth: 600 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>{t.settings.aboutSection}</h3>

          {/* Hero */}
          <div className="about-section">
            <h4>Hero</h4>
            <div className="form-group">
              <label>{t.settings.avatarUrl}</label>
              <input value={about.avatarUrl} onChange={e => updateAbout({ avatarUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t.settings.nameZh}</label>
                <input value={about.nameZh} onChange={e => updateAbout({ nameZh: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t.settings.nameEn}</label>
                <input value={about.nameEn} onChange={e => updateAbout({ nameEn: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t.settings.subtitleZh}</label>
                <input value={about.subtitleZh} onChange={e => updateAbout({ subtitleZh: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t.settings.subtitleEn}</label>
                <input value={about.subtitleEn} onChange={e => updateAbout({ subtitleEn: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t.settings.bioZh}</label>
                <textarea value={about.bioZh} onChange={e => updateAbout({ bioZh: e.target.value })} rows={3} />
              </div>
              <div className="form-group">
                <label>{t.settings.bioEn}</label>
                <textarea value={about.bioEn} onChange={e => updateAbout({ bioEn: e.target.value })} rows={3} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t.settings.heroBgColor}</label>
                <div className="color-picker-row">
                  <input type="color" value={about.heroBgColor || '#000000'} onChange={e => updateAbout({ heroBgColor: e.target.value })} />
                  <input value={about.heroBgColor} onChange={e => updateAbout({ heroBgColor: e.target.value })} placeholder={'#000 / linear-gradient(...)'} />
                </div>
              </div>
              <div className="form-group">
                <label>{t.settings.heroBgImage}</label>
                <input value={about.heroBgImage} onChange={e => updateAbout({ heroBgImage: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="form-group">
              <label>{t.settings.heroTextColor}</label>
              <div className="color-picker-row">
                <input type="color" value={about.heroTextColor || '#ffffff'} onChange={e => updateAbout({ heroTextColor: e.target.value })} />
                <input value={about.heroTextColor} onChange={e => updateAbout({ heroTextColor: e.target.value })} placeholder={'#fff'} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="about-section">
            <h4>{t.settings.stats}</h4>
            {about.stats.map((s, i) => (
              <div key={s.id} className="about-dynamic-row">
                <div className="form-group">
                  <label>{t.settings.statNum}</label>
                  <input value={s.num} onChange={e => {
                    const next = [...about.stats]; next[i] = { ...next[i], num: e.target.value }; updateAbout({ stats: next })
                  }} />
                </div>
                <div className="form-group">
                  <label>{t.settings.statLabelZh}</label>
                  <input value={s.labelZh} onChange={e => {
                    const next = [...about.stats]; next[i] = { ...next[i], labelZh: e.target.value }; updateAbout({ stats: next })
                  }} />
                </div>
                <div className="form-group">
                  <label>{t.settings.statLabelEn}</label>
                  <input value={s.labelEn} onChange={e => {
                    const next = [...about.stats]; next[i] = { ...next[i], labelEn: e.target.value }; updateAbout({ stats: next })
                  }} />
                </div>
                <button className="btn btn-outline" style={{ flexShrink: 0, marginBottom: 4 }} onClick={() => updateAbout({ stats: about.stats.filter(x => x.id !== s.id) })}>{t.settings.remove}</button>
              </div>
            ))}
            <button className="btn btn-outline" onClick={() => updateAbout({ stats: [...about.stats, { id: uid(), num: '', labelZh: '', labelEn: '' }] })}>{t.settings.addStat}</button>
          </div>

          {/* Skills */}
          <div className="about-section">
            <h4>{t.settings.skillsZh} / {t.settings.skillsEn}</h4>
            <div className="form-group">
              <label>{t.settings.skillsZh}</label>
              <TagInput tags={about.skillsZh} onChange={v => updateAbout({ skillsZh: v })} placeholder={t.settings.skillPlaceholder} />
            </div>
            <div className="form-group">
              <label>{t.settings.skillsEn}</label>
              <TagInput tags={about.skillsEn} onChange={v => updateAbout({ skillsEn: v })} placeholder={t.settings.skillPlaceholder} />
            </div>
          </div>

          {/* Experience */}
          <div className="about-section">
            <h4>{t.settings.experience}</h4>
            {about.experience.map((e, i) => (
              <div key={e.id} className="about-dynamic-card">
                <div className="form-group">
                  <label>{t.settings.expPeriod}</label>
                  <input value={e.period} onChange={ev => {
                    const next = [...about.experience]; next[i] = { ...next[i], period: ev.target.value }; updateAbout({ experience: next })
                  }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t.settings.expTitleZh}</label>
                    <input value={e.titleZh} onChange={ev => {
                      const next = [...about.experience]; next[i] = { ...next[i], titleZh: ev.target.value }; updateAbout({ experience: next })
                    }} />
                  </div>
                  <div className="form-group">
                    <label>{t.settings.expTitleEn}</label>
                    <input value={e.titleEn} onChange={ev => {
                      const next = [...about.experience]; next[i] = { ...next[i], titleEn: ev.target.value }; updateAbout({ experience: next })
                    }} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t.settings.expOrgZh}</label>
                    <input value={e.orgZh} onChange={ev => {
                      const next = [...about.experience]; next[i] = { ...next[i], orgZh: ev.target.value }; updateAbout({ experience: next })
                    }} />
                  </div>
                  <div className="form-group">
                    <label>{t.settings.expOrgEn}</label>
                    <input value={e.orgEn} onChange={ev => {
                      const next = [...about.experience]; next[i] = { ...next[i], orgEn: ev.target.value }; updateAbout({ experience: next })
                    }} />
                  </div>
                </div>
                <button className="btn btn-outline" onClick={() => updateAbout({ experience: about.experience.filter(x => x.id !== e.id) })}>{t.settings.remove}</button>
              </div>
            ))}
            <button className="btn btn-outline" onClick={() => updateAbout({ experience: [...about.experience, { id: uid(), period: '', titleZh: '', titleEn: '', orgZh: '', orgEn: '' }] })}>{t.settings.addExperience}</button>
          </div>

          {/* Education */}
          <div className="about-section">
            <h4>{t.settings.education}</h4>
            {about.education.map((e, i) => (
              <div key={e.id} className="about-dynamic-card">
                <div className="form-group">
                  <label>{t.settings.eduPeriod}</label>
                  <input value={e.period} onChange={ev => {
                    const next = [...about.education]; next[i] = { ...next[i], period: ev.target.value }; updateAbout({ education: next })
                  }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t.settings.eduDegreeZh}</label>
                    <input value={e.degreeZh} onChange={ev => {
                      const next = [...about.education]; next[i] = { ...next[i], degreeZh: ev.target.value }; updateAbout({ education: next })
                    }} />
                  </div>
                  <div className="form-group">
                    <label>{t.settings.eduDegreeEn}</label>
                    <input value={e.degreeEn} onChange={ev => {
                      const next = [...about.education]; next[i] = { ...next[i], degreeEn: ev.target.value }; updateAbout({ education: next })
                    }} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t.settings.eduSchoolZh}</label>
                    <input value={e.schoolZh} onChange={ev => {
                      const next = [...about.education]; next[i] = { ...next[i], schoolZh: ev.target.value }; updateAbout({ education: next })
                    }} />
                  </div>
                  <div className="form-group">
                    <label>{t.settings.eduSchoolEn}</label>
                    <input value={e.schoolEn} onChange={ev => {
                      const next = [...about.education]; next[i] = { ...next[i], schoolEn: ev.target.value }; updateAbout({ education: next })
                    }} />
                  </div>
                </div>
                <button className="btn btn-outline" onClick={() => updateAbout({ education: about.education.filter(x => x.id !== e.id) })}>{t.settings.remove}</button>
              </div>
            ))}
            <button className="btn btn-outline" onClick={() => updateAbout({ education: [...about.education, { id: uid(), period: '', degreeZh: '', degreeEn: '', schoolZh: '', schoolEn: '' }] })}>{t.settings.addEducation}</button>
          </div>

          {/* Certifications */}
          <div className="about-section">
            <h4>{t.settings.certifications}</h4>
            {about.certifications.map((c, i) => (
              <div key={c.id} className="about-dynamic-card">
                <div className="form-group">
                  <label>{t.settings.certYear}</label>
                  <input value={c.year} onChange={ev => {
                    const next = [...about.certifications]; next[i] = { ...next[i], year: ev.target.value }; updateAbout({ certifications: next })
                  }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t.settings.certNameZh}</label>
                    <input value={c.nameZh} onChange={ev => {
                      const next = [...about.certifications]; next[i] = { ...next[i], nameZh: ev.target.value }; updateAbout({ certifications: next })
                    }} />
                  </div>
                  <div className="form-group">
                    <label>{t.settings.certNameEn}</label>
                    <input value={c.nameEn} onChange={ev => {
                      const next = [...about.certifications]; next[i] = { ...next[i], nameEn: ev.target.value }; updateAbout({ certifications: next })
                    }} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t.settings.certIssuerZh}</label>
                    <input value={c.issuerZh} onChange={ev => {
                      const next = [...about.certifications]; next[i] = { ...next[i], issuerZh: ev.target.value }; updateAbout({ certifications: next })
                    }} />
                  </div>
                  <div className="form-group">
                    <label>{t.settings.certIssuerEn}</label>
                    <input value={c.issuerEn} onChange={ev => {
                      const next = [...about.certifications]; next[i] = { ...next[i], issuerEn: ev.target.value }; updateAbout({ certifications: next })
                    }} />
                  </div>
                </div>
                <button className="btn btn-outline" onClick={() => updateAbout({ certifications: about.certifications.filter(x => x.id !== c.id) })}>{t.settings.remove}</button>
              </div>
            ))}
            <button className="btn btn-outline" onClick={() => updateAbout({ certifications: [...about.certifications, { id: uid(), year: '', nameZh: '', nameEn: '', issuerZh: '', issuerEn: '' }] })}>{t.settings.addCert}</button>
          </div>

          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSiteSave}>{siteSaved ? t.settings.saved : t.settings.save}</button>
          </div>
        </div>
      )}
    </div>
  )
}
