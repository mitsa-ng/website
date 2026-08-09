import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  transactionQuery: vi.fn(),
  generateApiKey: vi.fn(),
}));

vi.mock('@/db', () => ({ transaction: mocks.transaction }));
vi.mock('@/lib/api-key', () => ({ generateApiKey: mocks.generateApiKey }));

import { POST } from './route';

function requestWithToken(token: string, body: object): Request {
  return new Request('http://test/api/admin/init', {
    method: 'POST',
    headers: { 'x-admin-init-token': token },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/init', () => {
  const transactionQueries: string[] = [];

  beforeEach(() => {
    process.env.ADMIN_INIT_TOKEN = 'server-token';
    transactionQueries.length = 0;

    mocks.generateApiKey.mockReset();
    mocks.generateApiKey.mockReturnValue({
      raw: 'pw_fixed_00000',
      hash: 'scrypt$32768$8$1$salt$hash',
      prefix: 'pw',
    });

    mocks.transactionQuery.mockReset();
    mocks.transactionQuery.mockImplementation(async (text: string) => {
      transactionQueries.push(text);
      if (text === 'SELECT id FROM api_keys WHERE revoked = false LIMIT 1') {
        return [{ id: 1 }];
      }
      return [];
    });

    mocks.transaction.mockReset();
    mocks.transaction.mockImplementation(async (work) => work(mocks.transactionQuery));
  });

  it('requires the configured init token before entering the transaction', async () => {
    const response = await POST(new Request('http://test/api/admin/init', {
      method: 'POST',
      body: JSON.stringify({ force: true }),
    }));

    expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('revokes then inserts inside one forced transaction', async () => {
    const response = await POST(requestWithToken('server-token', { force: true }));

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(transactionQueries).toEqual([
      'SELECT id FROM api_keys WHERE revoked = false LIMIT 1',
      'UPDATE api_keys SET revoked = true WHERE revoked = false',
      'INSERT INTO api_keys (key_hash, key_prefix, label) VALUES ($1, $2, $3)',
    ]);
  });

  it('keeps a non-forced existing key', async () => {
    const response = await POST(requestWithToken('server-token', {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'api key already exists' });
    expect(transactionQueries).toEqual([
      'SELECT id FROM api_keys WHERE revoked = false LIMIT 1',
    ]);
  });

  it('returns a generic error when the transaction rejects', async () => {
    mocks.transaction.mockRejectedValueOnce(new Error('database connection password=secret'));

    const response = await POST(requestWithToken('server-token', { force: true }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'unable to initialize api key' });
  });
});
