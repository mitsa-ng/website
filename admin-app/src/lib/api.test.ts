import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rotateAdminApiKey, verifyRotatedApiKey } from './api'

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

describe('admin API key rotation helpers', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }

  beforeEach(() => {
    fetchMock.mockReset()
    storage.getItem.mockReset()
    storage.setItem.mockReset()
    storage.removeItem.mockReset()
    storage.clear.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', storage)
    delete window.electronAPI
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends force and the init token only in the header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ raw: 'pw_candidate_checksum' }))

    await expect(rotateAdminApiKey('https://admin.example', 'typed-token'))
      .resolves.toBe('pw_candidate_checksum')

    expect(fetchMock).toHaveBeenCalledWith('https://admin.example/api/admin/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Init-Token': 'typed-token',
      },
      body: JSON.stringify({ force: true }),
    })
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it.each([undefined, '', '  '])('rejects an empty init token', async (token) => {
    await expect(rotateAdminApiKey('https://admin.example', token as string))
      .rejects.toThrow('rotation-request-failed')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it.each([{ raw: '' }, {}, { raw: 42 }, 'not-an-object'])
    ('rejects malformed rotation responses', async (reply) => {
      fetchMock.mockResolvedValue(jsonResponse(reply))

      await expect(rotateAdminApiKey('https://admin.example', 'typed-token'))
        .rejects.toThrow('rotation-request-failed')

      expect(storage.setItem).not.toHaveBeenCalled()
      expect(storage.removeItem).not.toHaveBeenCalled()
    })

  it.each([
    [jsonResponse({ valid: true }), 'verified'],
    [new Response(JSON.stringify({ valid: false }), { status: 401 }), 'rejected'],
    [new TypeError('network down'), 'unreachable'],
    [jsonResponse({ valid: false }), 'unreachable'],
    [new Response(JSON.stringify({ valid: true }), { status: 500 }), 'unreachable'],
  ])('classifies rotated-key verification as %s', async (reply, expected) => {
    fetchMock.mockImplementationOnce(() => reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply))

    await expect(verifyRotatedApiKey('pw_candidate_checksum', 'https://admin.example'))
      .resolves.toBe(expected)

    expect(fetchMock).toHaveBeenCalledWith('https://admin.example/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'pw_candidate_checksum' }),
    })
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it('classifies malformed verification JSON as unreachable', async () => {
    fetchMock.mockResolvedValue(new Response('not-json', { status: 200 }))

    await expect(verifyRotatedApiKey('pw_candidate_checksum', 'https://admin.example'))
      .resolves.toBe('unreachable')

    expect(storage.setItem).not.toHaveBeenCalled()
    expect(storage.removeItem).not.toHaveBeenCalled()
  })
})
