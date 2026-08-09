import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../lib/LocaleContext'
import Login from './Login'
import * as api from '../lib/api'

vi.mock('../lib/api', () => ({
  addProfile: vi.fn(() => ({ id: 'profile-1' })),
  getConfig: vi.fn(() => Promise.resolve(null)),
  getProfiles: vi.fn(() => []),
  initApiKey: vi.fn(),
  rotateAdminApiKey: vi.fn(),
  setActiveProfileId: vi.fn(),
  setApiKey: vi.fn(() => Promise.resolve()),
  setConfig: vi.fn(),
  setServerUrl: vi.fn(() => Promise.resolve()),
  verifyApiKey: vi.fn(),
  verifyRotatedApiKey: vi.fn(),
}))

describe('Login rotation recovery', () => {
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
    vi.mocked(api.rotateAdminApiKey).mockResolvedValue('pw_new_checksum')
  })

  afterEach(cleanup)

  it('persists the verified rotated key and logs in only after verification', async () => {
    const user = userEvent.setup()
    let resolveVerification: (value: 'verified') => void = () => undefined
    vi.mocked(api.verifyRotatedApiKey).mockReturnValueOnce(new Promise(resolve => {
      resolveVerification = resolve
    }))
    const onLogin = vi.fn()

    render(<LocaleProvider><Login onLogin={onLogin} /></LocaleProvider>)
    await user.type(screen.getByLabelText('Server Domain'), 'https://admin.example')
    await user.click(screen.getByRole('button', { name: 'Don\'t have an API key? Generate one' }))
    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))

    expect(api.setApiKey).not.toHaveBeenCalled()
    expect(api.addProfile).not.toHaveBeenCalled()
    expect(onLogin).not.toHaveBeenCalled()

    resolveVerification('verified')
    await waitFor(() => expect(api.setApiKey).toHaveBeenCalledWith('pw_new_checksum'))
    expect(api.addProfile).toHaveBeenCalledWith('admin.example', 'https://admin.example', 'pw_new_checksum')
    expect(onLogin).toHaveBeenCalledTimes(1)
  })

  it('uses 44px touch targets for both rotation entries', async () => {
    const user = userEvent.setup()
    render(<LocaleProvider><Login onLogin={vi.fn()} /></LocaleProvider>)

    const setupEntry = screen.getByRole('button', { name: 'Don\'t have an API key? Generate one' })
    expect(getComputedStyle(setupEntry).minHeight).toBe('44px')

    cleanup()
    vi.mocked(api.getConfig).mockResolvedValueOnce({
      serverUrl: 'https://admin.example',
      apiSecret: 'pw_existing_checksum',
      configuredAt: 1,
    })
    render(<LocaleProvider><Login onLogin={vi.fn()} /></LocaleProvider>)
    const loginEntry = await screen.findByRole('button', { name: 'First time? Initialize admin key' })
    expect(getComputedStyle(loginEntry).minHeight).toBe('44px')
  })

  it('keeps the real recovery opener mounted and restores focus after closing rotation', async () => {
    const user = userEvent.setup()
    render(<LocaleProvider><Login onLogin={vi.fn()} /></LocaleProvider>)
    const opener = screen.getByRole('button', { name: 'Don\'t have an API key? Generate one' })

    await user.click(opener)
    await screen.findByRole('dialog')
    expect(opener.isConnected).toBe(true)

    await user.click(screen.getAllByRole('button', { name: 'Close' })[1])
    expect(opener.isConnected).toBe(true)
    expect(document.activeElement).toBe(opener)
  })
})
