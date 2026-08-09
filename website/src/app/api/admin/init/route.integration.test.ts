import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { POST } from './route';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalInitToken = process.env.ADMIN_INIT_TOKEN;
let pool: Pool;

function forceRequest(): Request {
  return new Request('http://test/api/admin/init', {
    method: 'POST',
    headers: { 'x-admin-init-token': 'server-token' },
    body: JSON.stringify({ force: true }),
  });
}

describeWithDatabase('POST /api/admin/init with PostgreSQL', () => {
  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required');
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.ADMIN_INIT_TOKEN = 'server-token';
    pool = new Pool({ connectionString: testDatabaseUrl });
    await pool.query('DROP TABLE IF EXISTS api_keys');
    await pool.query(`
      CREATE TABLE api_keys (
        id serial PRIMARY KEY,
        key_hash text NOT NULL,
        key_prefix text NOT NULL,
        label text NOT NULL,
        revoked boolean NOT NULL DEFAULT false
      )
    `);
  });

  beforeEach(async () => {
    await pool.query('DROP TRIGGER IF EXISTS api_key_insert_test_trigger ON api_keys');
    await pool.query('DROP FUNCTION IF EXISTS api_key_insert_test_trigger()');
    await pool.query('TRUNCATE api_keys RESTART IDENTITY');
  });

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS api_keys');
    await pool.end();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalInitToken === undefined) delete process.env.ADMIN_INIT_TOKEN;
    else process.env.ADMIN_INIT_TOKEN = originalInitToken;
  });

  it('leaves exactly one active key after concurrent forced initialization', async () => {
    await pool.query(`
      CREATE FUNCTION api_key_insert_test_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_sleep(0.25);
        RETURN NEW;
      END;
      $$
    `);
    await pool.query(`
      CREATE TRIGGER api_key_insert_test_trigger
      BEFORE INSERT ON api_keys
      FOR EACH ROW EXECUTE FUNCTION api_key_insert_test_trigger()
    `);

    const responses = await Promise.all([POST(forceRequest()), POST(forceRequest())]);

    expect(responses.map(response => response.status)).toEqual([200, 200]);
    const active = await pool.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM api_keys WHERE revoked = false'
    );
    expect(active.rows[0].count).toBe(1);
  });

  it('rolls back the forced revoke when insertion fails', async () => {
    await pool.query(
      'INSERT INTO api_keys (key_hash, key_prefix, label) VALUES ($1, $2, $3)',
      ['old-hash', 'pw', 'existing']
    );
    await pool.query(`
      CREATE FUNCTION api_key_insert_test_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced insert failure';
      END;
      $$
    `);
    await pool.query(`
      CREATE TRIGGER api_key_insert_test_trigger
      BEFORE INSERT ON api_keys
      FOR EACH ROW EXECUTE FUNCTION api_key_insert_test_trigger()
    `);

    const response = await POST(forceRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'unable to initialize api key' });
    const existing = await pool.query<{ revoked: boolean }>(
      'SELECT revoked FROM api_keys WHERE key_hash = $1',
      ['old-hash']
    );
    expect(existing.rows).toEqual([{ revoked: false }]);
  });
});
