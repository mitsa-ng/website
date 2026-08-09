import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../lib/LocaleContext'
import { rotateAdminApiKey, verifyRotatedApiKey } from '../lib/api'
import AdminKeyRotation from './AdminKeyRotation'

vi.mock('../lib/api', () => ({
  rotateAdminApiKey: vi.fn(),
  verifyRotatedApiKey: vi.fn(),
}))

const renderRotation = (onVerified = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) => {
  render(
    <LocaleProvider>
      <AdminKeyRotation serverUrl="https://admin.example" onVerified={onVerified} onClose={onClose} />
    </LocaleProvider>,
  )
  return { onVerified, onClose }
}

function RotationHarness() {
  const [open, setOpen] = useState(false)
  return (
    <LocaleProvider>
      <button type="button" onClick={() => setOpen(true)}>Open rotation</button>
      <main data-testid="background">Background content</main>
      {open ? (
        <AdminKeyRotation
          serverUrl="https://admin.example"
          onVerified={() => undefined}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </LocaleProvider>
  )
}

describe('AdminKeyRotation', () => {
  const rotate = vi.mocked(rotateAdminApiKey)
  const verify = vi.mocked(verifyRotatedApiKey)
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    values.clear()
    vi.stubGlobal('localStorage', storage)
  })

  afterEach(cleanup)

  it('clears the typed token and persists only after verification', async () => {
    const user = userEvent.setup()
    rotate.mockResolvedValueOnce('pw_new_checksum')
    verify.mockResolvedValueOnce('verified')
    const { onVerified } = renderRotation()

    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))

    expect((screen.getByLabelText('Admin init token') as HTMLInputElement).value).toBe('')
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('pw_new_checksum'))
  })

  it('keeps a candidate only in memory and retries verification without a second rotation', async () => {
    const user = userEvent.setup()
    rotate.mockResolvedValueOnce('pw_new_checksum')
    verify.mockResolvedValueOnce('unreachable').mockResolvedValueOnce('verified')
    const { onVerified } = renderRotation()

    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))
    await user.click(await screen.findByRole('button', { name: 'Retry verification' }))

    expect(rotate).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('pw_new_checksum'))
  })

  it('retains a verified candidate when persistence fails so verification can be retried', async () => {
    const user = userEvent.setup()
    rotate.mockResolvedValueOnce('pw_new_checksum')
    verify.mockResolvedValueOnce('verified').mockResolvedValueOnce('verified')
    const onVerified = vi.fn().mockRejectedValueOnce(new Error('storage-failed')).mockResolvedValueOnce(undefined)
    renderRotation(onVerified)

    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))
    await user.click(await screen.findByRole('button', { name: 'Retry verification' }))

    expect(rotate).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(2))
  })

  it('retries against the server used for the original rotation', async () => {
    const user = userEvent.setup()
    rotate.mockResolvedValueOnce('pw_new_checksum')
    verify.mockResolvedValueOnce('unreachable').mockResolvedValueOnce('verified')
    const onVerified = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const view = render(
      <LocaleProvider>
        <AdminKeyRotation serverUrl="https://admin.example" onVerified={onVerified} onClose={onClose} />
      </LocaleProvider>,
    )

    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))
    await screen.findByRole('button', { name: 'Retry verification' })
    view.rerender(
      <LocaleProvider>
        <AdminKeyRotation serverUrl="https://other.example" onVerified={onVerified} onClose={onClose} />
      </LocaleProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Retry verification' }))

    expect(verify).toHaveBeenLastCalledWith('pw_new_checksum', 'https://admin.example')
  })

  it('keeps keyboard focus in the modal and restores the trigger and background on close', async () => {
    const user = userEvent.setup()
    render(<RotationHarness />)
    const trigger = screen.getByRole('button', { name: 'Open rotation' })
    const background = screen.getByTestId('background')

    await user.click(trigger)
    const tokenInput = await screen.findByLabelText('Admin init token')
    await waitFor(() => expect(document.activeElement).toBe(tokenInput))
    expect(background.hasAttribute('inert')).toBe(true)

    const closeButtons = screen.getAllByRole('button', { name: 'Close' })
    closeButtons[1].focus()
    await user.tab()
    expect(document.activeElement).toBe(closeButtons[0])
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(closeButtons[1])

    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(trigger)
    expect(background.hasAttribute('inert')).toBe(false)
  })

  it('does not close on Escape while rotation I/O is pending', async () => {
    const user = userEvent.setup()
    rotate.mockReturnValueOnce(new Promise(() => undefined))
    const onClose = vi.fn()
    renderRotation(undefined, onClose)

    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(document.activeElement).toBe(dialog))
    expect(dialog.tabIndex).toBe(-1)

    await user.tab()
    expect(document.activeElement).toBe(dialog)
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(document.activeElement).toBe(dialog)
  })
})
