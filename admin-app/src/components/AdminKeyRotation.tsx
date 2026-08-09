import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
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
  const mountedRef = useRef(true)
  const operationGenerationRef = useRef(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const tokenInputRef = useRef<HTMLInputElement>(null)
  const retryButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const clearCandidate = () => {
    candidateRef.current = null
    rotationServerUrlRef.current = null
  }

  const isCurrentOperation = (generation: number) => (
    mountedRef.current && operationGenerationRef.current === generation
  )

  const handleClose = () => {
    if (inFlightRef.current) return
    operationGenerationRef.current += 1
    clearCandidate()
    setInitToken('')
    onCloseRef.current()
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      operationGenerationRef.current += 1
      candidateRef.current = null
      rotationServerUrlRef.current = null
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    const overlay = overlayRef.current
    const dialog = dialogRef.current
    if (!overlay || !dialog) return

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

    const focusInside = (preferLast = false) => {
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const target = preferLast ? controls[controls.length - 1] : controls[0]
      ;(target || dialog).focus()
    }

    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        event.stopPropagation()
        focusInside()
      }
    }

    const containKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (inFlightRef.current) dialog.focus()
        else handleClose()
        return
      }
      if (event.key !== 'Tab') return

      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const activeIndex = controls.indexOf(document.activeElement as HTMLElement)
      if (controls.length === 0 || activeIndex === -1) {
        event.preventDefault()
        const target = event.shiftKey ? controls[controls.length - 1] : controls[0]
        ;(target || dialog).focus()
      } else if (event.shiftKey && activeIndex === 0) {
        event.preventDefault()
        controls[controls.length - 1].focus()
      } else if (!event.shiftKey && activeIndex === controls.length - 1) {
        event.preventDefault()
        controls[0].focus()
      }
    }

    document.addEventListener('focusin', containFocus, true)
    document.addEventListener('keydown', containKeyboard, true)
    tokenInputRef.current?.focus()

    return () => {
      document.removeEventListener('focusin', containFocus, true)
      document.removeEventListener('keydown', containKeyboard, true)
      for (const { element, wasInert } of inertedElements) {
        if (!wasInert) element.removeAttribute('inert')
      }
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    if (status === 'retry' && !submitting) retryButtonRef.current?.focus()
  }, [status, submitting])

  useEffect(() => {
    if (submitting) dialogRef.current?.focus()
  }, [submitting])

  const persistVerifiedCandidate = async (candidate: string, generation: number) => {
    if (!isCurrentOperation(generation)) return
    try {
      await onVerified(candidate)
      if (!isCurrentOperation(generation)) return
      clearCandidate()
      onCloseRef.current()
    } catch {
      if (!isCurrentOperation(generation)) return
      setStatus('retry')
    }
  }

  const handleRotate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inFlightRef.current || !initToken.trim()) return

    const generation = operationGenerationRef.current + 1
    operationGenerationRef.current = generation
    inFlightRef.current = true
    setSubmitting(true)
    setStatus('idle')
    try {
      rotationServerUrlRef.current = serverUrl
      let candidate: string
      try {
        candidate = await rotateAdminApiKey(rotationServerUrlRef.current, initToken)
      } finally {
        if (isCurrentOperation(generation)) setInitToken('')
      }
      if (!isCurrentOperation(generation)) return
      candidateRef.current = candidate
      const verification = await verifyRotatedApiKey(candidate, rotationServerUrlRef.current)
      if (!isCurrentOperation(generation)) return
      if (verification === 'verified') {
        await persistVerifiedCandidate(candidate, generation)
        if (!isCurrentOperation(generation)) return
      } else if (verification === 'unreachable') {
        setStatus('retry')
      } else {
        clearCandidate()
        setStatus('error')
      }
    } catch {
      if (!isCurrentOperation(generation)) return
      clearCandidate()
      setStatus('error')
    } finally {
      if (isCurrentOperation(generation)) {
        inFlightRef.current = false
        setSubmitting(false)
      }
    }
  }

  const handleRetry = async () => {
    const candidate = candidateRef.current
    const rotationServerUrl = rotationServerUrlRef.current
    if (inFlightRef.current || !candidate || !rotationServerUrl) return

    const generation = operationGenerationRef.current + 1
    operationGenerationRef.current = generation
    inFlightRef.current = true
    setSubmitting(true)
    try {
      const verification = await verifyRotatedApiKey(candidate, rotationServerUrl)
      if (!isCurrentOperation(generation)) return
      if (verification === 'verified') {
        await persistVerifiedCandidate(candidate, generation)
        if (!isCurrentOperation(generation)) return
      } else if (verification === 'rejected') {
        clearCandidate()
        setStatus('error')
      }
    } catch {
      if (!isCurrentOperation(generation)) return
      clearCandidate()
      setStatus('error')
    } finally {
      if (isCurrentOperation(generation)) {
        inFlightRef.current = false
        setSubmitting(false)
      }
    }
  }

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) handleClose()
  }

  return (
    <div ref={overlayRef} className="modal-overlay" onClick={handleOverlayClick}>
      <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="admin-key-rotation-title" tabIndex={-1}>
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
