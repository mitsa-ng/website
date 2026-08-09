import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { rotateAdminApiKey, verifyRotatedApiKey } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

export interface AdminKeyRotationProps {
  serverUrl: string
  onVerified: (rawKey: string) => Promise<void> | void
  onClose: () => void
}

type RotationStatus = 'idle' | 'retry' | 'error'

export default function AdminKeyRotation({ serverUrl, onVerified, onClose }: AdminKeyRotationProps) {
  const { t } = useLocale()
  const [initToken, setInitToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<RotationStatus>('idle')
  const candidateRef = useRef<string | null>(null)
  const rotationServerUrlRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)

  const clearCandidate = () => {
    candidateRef.current = null
    rotationServerUrlRef.current = null
  }

  const persistVerifiedCandidate = async (candidate: string) => {
    try {
      await onVerified(candidate)
      clearCandidate()
      onClose()
    } catch {
      setStatus('retry')
    }
  }

  const handleRotate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inFlightRef.current || !initToken.trim()) return

    inFlightRef.current = true
    setSubmitting(true)
    setStatus('idle')
    try {
      rotationServerUrlRef.current = serverUrl
      const candidate = await rotateAdminApiKey(rotationServerUrlRef.current, initToken)
      candidateRef.current = candidate
      const verification = await verifyRotatedApiKey(candidate, rotationServerUrlRef.current)
      if (verification === 'verified') {
        await persistVerifiedCandidate(candidate)
      } else if (verification === 'unreachable') {
        setStatus('retry')
      } else {
        clearCandidate()
        setStatus('error')
      }
    } catch {
      clearCandidate()
      setStatus('error')
    } finally {
      setInitToken('')
      inFlightRef.current = false
      setSubmitting(false)
    }
  }

  const handleRetry = async () => {
    const candidate = candidateRef.current
    const rotationServerUrl = rotationServerUrlRef.current
    if (inFlightRef.current || !candidate || !rotationServerUrl) return

    inFlightRef.current = true
    setSubmitting(true)
    try {
      const verification = await verifyRotatedApiKey(candidate, rotationServerUrl)
      if (verification === 'verified') {
        await persistVerifiedCandidate(candidate)
      } else if (verification === 'rejected') {
        clearCandidate()
        setStatus('error')
      }
    } catch {
      clearCandidate()
      setStatus('error')
    } finally {
      inFlightRef.current = false
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (inFlightRef.current) return
    clearCandidate()
    setInitToken('')
    onClose()
  }

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) handleClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="admin-key-rotation-title">
        <div className="modal-header">
          <h3 id="admin-key-rotation-title">{t.rotation.title}</h3>
          <button className="modal-close" type="button" onClick={handleClose} disabled={submitting} aria-label={t.rotation.close} style={{ minHeight: 44, minWidth: 44 }}>&times;</button>
        </div>
        <div className="modal-body">
          {status === 'retry' ? (
            <>
              <p className="form-error" role="status">{t.rotation.unreachable}</p>
              <button className="btn btn-primary btn-block" type="button" onClick={handleRetry} disabled={submitting} style={{ minHeight: 44 }}>
                {t.rotation.retry}
              </button>
            </>
          ) : (
            <form onSubmit={handleRotate}>
              <div className="form-group">
                <label htmlFor="admin-init-token">{t.rotation.initToken}</label>
                <input
                  id="admin-init-token"
                  type="password"
                  value={initToken}
                  onChange={event => setInitToken(event.target.value)}
                  autoComplete="off"
                  required
                  disabled={submitting}
                  style={{ minHeight: 44 }}
                />
              </div>
              {status === 'error' ? <p className="form-error" role="alert">{t.rotation.failed}</p> : null}
              <button className="btn btn-primary btn-block" type="submit" disabled={submitting || !initToken.trim()} style={{ minHeight: 44 }}>
                {t.rotation.rotate}
              </button>
            </form>
          )}
          <button className="btn btn-text btn-block" type="button" onClick={handleClose} disabled={submitting} style={{ marginTop: 12, minHeight: 44 }}>
            {t.rotation.close}
          </button>
        </div>
      </section>
    </div>
  )
}
