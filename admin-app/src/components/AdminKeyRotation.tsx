import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { rotateAdminApiKey, verifyRotatedApiKey } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

export interface AdminKeyRotationProps {
  serverUrl: string
  onVerified: (rawKey: string) => Promise<void> | void
  onClose: () => void
}

type RotationStatus = 'idle' | 'retry' | 'error'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function AdminKeyRotation({ serverUrl, onVerified, onClose }: AdminKeyRotationProps) {
  const { t } = useLocale()
  const [initToken, setInitToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<RotationStatus>('idle')
  const candidateRef = useRef<string | null>(null)
  const rotationServerUrlRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const tokenInputRef = useRef<HTMLInputElement>(null)
  const retryButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const overlay = overlayRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const inertedElements: Array<{ element: HTMLElement; wasInert: boolean }> = []
    let foreground: HTMLElement | null = overlay

    while (foreground?.parentElement) {
      const parent: HTMLElement = foreground.parentElement
      for (const sibling of Array.from(parent.children)) {
        if (sibling === foreground || !(sibling instanceof HTMLElement)) continue
        const wasInert = sibling.hasAttribute('inert')
        inertedElements.push({ element: sibling, wasInert })
        sibling.setAttribute('inert', '')
      }
      if (parent === document.body) break
      foreground = parent
    }

    tokenInputRef.current?.focus()

    return () => {
      for (const { element, wasInert } of inertedElements) {
        if (!wasInert) element.removeAttribute('inert')
      }
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    if (status === 'retry' && !submitting) retryButtonRef.current?.focus()
  }, [status, submitting])

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

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!inFlightRef.current) handleClose()
      return
    }
    if (event.key !== 'Tab') return

    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (controls.length === 0) {
      event.preventDefault()
      return
    }

    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div ref={overlayRef} className="modal-overlay" onClick={handleOverlayClick}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="admin-key-rotation-title" onKeyDown={handleDialogKeyDown}>
        <div className="modal-header">
          <h3 id="admin-key-rotation-title">{t.rotation.title}</h3>
          <button className="modal-close" type="button" onClick={handleClose} disabled={submitting} aria-label={t.rotation.close} style={{ minHeight: 44, minWidth: 44 }}>&times;</button>
        </div>
        <div className="modal-body">
          {status === 'retry' ? (
            <>
              <p className="form-error" role="status">{t.rotation.unreachable}</p>
              <button ref={retryButtonRef} className="btn btn-primary btn-block" type="button" onClick={handleRetry} disabled={submitting} style={{ minHeight: 44 }}>
                {t.rotation.retry}
              </button>
            </>
          ) : (
            <form onSubmit={handleRotate}>
              <div className="form-group">
                <label htmlFor="admin-init-token">{t.rotation.initToken}</label>
                <input
                  id="admin-init-token"
                  ref={tokenInputRef}
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
