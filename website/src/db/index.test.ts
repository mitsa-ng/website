import { describe, expect, it } from 'vitest'
import { createTransactionRunner } from './index'

function fakeClient(responses: Array<unknown[] | Error>) {
  const calls: string[] = []

  return {
    calls,
    async query(text: string) {
      calls.push(text)
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rows: [] }
      }
      const response = responses.shift()
      if (response instanceof Error) throw response
      return { rows: response ?? [] }
    },
    release() {
      calls.push('RELEASE')
    },
  }
}

describe('createTransactionRunner', () => {
  it('commits work on one client and releases it', async () => {
    const client = fakeClient([['UPDATE api_keys'], ['INSERT INTO api_keys']])
    const run = createTransactionRunner(async () => client)

    await run(async query => {
      await query('UPDATE api_keys SET revoked = true')
      await query('INSERT INTO api_keys DEFAULT VALUES')
    })

    expect(client.calls).toEqual([
      'BEGIN',
      'UPDATE api_keys SET revoked = true',
      'INSERT INTO api_keys DEFAULT VALUES',
      'COMMIT',
      'RELEASE',
    ])
  })

  it('rolls back and releases when work rejects', async () => {
    const client = fakeClient([new Error('insert failed')])
    const run = createTransactionRunner(async () => client)

    await expect(run(async query => query('INSERT INTO api_keys DEFAULT VALUES'))).rejects.toThrow('insert failed')

    expect(client.calls).toEqual([
      'BEGIN',
      'INSERT INTO api_keys DEFAULT VALUES',
      'ROLLBACK',
      'RELEASE',
    ])
  })
})
