import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
})
