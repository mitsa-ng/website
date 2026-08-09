import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../lib/LocaleContext'
import Settings from './Settings'
import * as api from '../lib/api'

vi.mock('../lib/api', () => ({
  getActiveProfileId: vi.fn(() => null),
  getApiKey: vi.fn(() => Promise.resolve(localStorage.getItem('api_key'))),
  getProfiles: vi.fn(() => []),
  getServerUrl: vi.fn(() => Promise.resolve('https://admin.example')),
  rotateAdminApiKey: vi.fn(),
  saveProfiles: vi.fn(),
  setApiKey: vi.fn((key: string) => {
    localStorage.setItem('api_key', key)
    return Promise.resolve()
  }),
  setServerUrl: vi.fn(() => Promise.resolve()),
  verifyRotatedApiKey: vi.fn(),
}))

describe('Settings rotation', () => {
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
    storage.setItem('api_key', 'pw_old_checksum')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    vi.mocked(api.rotateAdminApiKey).mockResolvedValue('pw_new_checksum')
  })

  afterEach(cleanup)

  it('keeps the rendered and stored key until the new key is verified', async () => {
    const user = userEvent.setup()
    let resolveVerification: (value: 'verified') => void = () => undefined
    vi.mocked(api.verifyRotatedApiKey).mockReturnValueOnce(new Promise(resolve => {
      resolveVerification = resolve
    }))

    render(<LocaleProvider><Settings /></LocaleProvider>)
    const keyInput = await screen.findByLabelText('API Key') as HTMLInputElement
    expect(keyInput.value).toBe('pw_old_checksum')
    await user.click(screen.getByRole('button', { name: 'Regenerate Key' }))
    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))

    expect(keyInput.value).toBe('pw_old_checksum')
    expect(localStorage.getItem('api_key')).toBe('pw_old_checksum')

    resolveVerification('verified')
    await waitFor(() => expect(keyInput.value).toBe('pw_new_checksum'))
    expect(localStorage.getItem('api_key')).toBe('pw_new_checksum')
  })

  it('submits one rotation request while a request is pending', async () => {
    const user = userEvent.setup()
    let resolveRotation: (value: string) => void = () => undefined
    vi.mocked(api.rotateAdminApiKey).mockReturnValueOnce(new Promise(resolve => {
      resolveRotation = resolve
    }))

    render(<LocaleProvider><Settings /></LocaleProvider>)
    await screen.findByLabelText('API Key')
    await user.click(screen.getByRole('button', { name: 'Regenerate Key' }))
    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    const rotateButton = screen.getByRole('button', { name: 'Rotate admin key' })
    await user.click(rotateButton)
    await user.click(rotateButton)

    expect(api.rotateAdminApiKey).toHaveBeenCalledTimes(1)
    resolveRotation('pw_new_checksum')
  })

  it('updates the profile selected when rotation opened, not a later active profile', async () => {
    const user = userEvent.setup()
    const profiles = [
      { id: 'profile-a', name: 'A', serverUrl: 'https://admin.example', apiKey: 'pw_old_checksum' },
      { id: 'profile-b', name: 'B', serverUrl: 'https://other.example', apiKey: 'pw_other_checksum' },
    ]
    let resolveVerification: (value: 'verified') => void = () => undefined
    vi.mocked(api.getActiveProfileId).mockReturnValue('profile-a')
    vi.mocked(api.getProfiles).mockReturnValue(profiles)
    vi.mocked(api.verifyRotatedApiKey).mockReturnValueOnce(new Promise(resolve => {
      resolveVerification = resolve
    }))

    render(<LocaleProvider><Settings /></LocaleProvider>)
    await screen.findByLabelText('API Key')
    await user.click(screen.getByRole('button', { name: 'Regenerate Key' }))
    await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
    await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))
    vi.mocked(api.getActiveProfileId).mockReturnValue('profile-b')

    resolveVerification('verified')
    await waitFor(() => expect(api.saveProfiles).toHaveBeenCalled())
    expect(api.saveProfiles).toHaveBeenLastCalledWith([
      { ...profiles[0], apiKey: 'pw_new_checksum' },
      profiles[1],
    ])
  })

  it('uses a 44px touch target for the rotation entry', async () => {
    render(<LocaleProvider><Settings /></LocaleProvider>)

    const rotationEntry = await screen.findByRole('button', { name: 'Regenerate Key' })
    expect(getComputedStyle(rotationEntry).minHeight).toBe('44px')
  })
})
