import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { POST } from './route';
import { createIsolatedIntegrationDatabaseConfig } from './integration-test-harness';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalInitToken = process.env.ADMIN_INIT_TOKEN;
let pool: Pool | undefined;
let schema: string | undefined;

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
    const config = createIsolatedIntegrationDatabaseConfig(testDatabaseUrl);
    schema = config.schema;
    process.env.DATABASE_URL = config.connectionString;
    process.env.ADMIN_INIT_TOKEN = 'server-token';
    pool = new Pool({ connectionString: config.connectionString });
    await pool.query(`CREATE SCHEMA ${schema}`);
    const currentSchema = await pool.query<{ schema: string }>('SELECT current_schema() AS schema');
    expect(currentSchema.rows).toEqual([{ schema }]);
    await pool.query(`
      CREATE TABLE ${schema}.api_keys (
        id serial PRIMARY KEY,
        key_hash text NOT NULL,
        key_prefix text NOT NULL,
        label text NOT NULL,
        revoked boolean NOT NULL DEFAULT false
      )
    `);
  });

  afterAll(async () => {
    if (pool && schema) await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await pool?.end();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalInitToken === undefined) delete process.env.ADMIN_INIT_TOKEN;
    else process.env.ADMIN_INIT_TOKEN = originalInitToken;
  });

  it('leaves exactly one active key after concurrent forced initialization', async () => {
    if (!pool || !schema) throw new Error('integration test pool was not initialized');
    await pool.query(`
      CREATE FUNCTION ${schema}.api_key_concurrent_insert_delay() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_sleep(0.25);
        RETURN NEW;
      END;
      $$
    `);
    await pool.query(`
      CREATE TRIGGER api_key_concurrent_insert_delay
      BEFORE INSERT ON ${schema}.api_keys
      FOR EACH ROW EXECUTE FUNCTION ${schema}.api_key_concurrent_insert_delay()
    `);

    const responses = await Promise.all([POST(forceRequest()), POST(forceRequest())]);

    expect(responses.map(response => response.status)).toEqual([200, 200]);
    const active = await pool.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM api_keys WHERE revoked = false'
    );
    expect(active.rows[0].count).toBe(1);
  });

  it('rolls back the forced revoke when insertion fails', async () => {
    if (!pool || !schema) throw new Error('integration test pool was not initialized');
    await pool.query(
      'INSERT INTO api_keys (key_hash, key_prefix, label) VALUES ($1, $2, $3)',
      ['old-hash', 'pw', 'existing']
    );
    await pool.query(`
      CREATE FUNCTION ${schema}.api_key_rollback_insert_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced insert failure';
      END;
      $$
    `);
    await pool.query(`
      CREATE TRIGGER api_key_rollback_insert_failure
      BEFORE INSERT ON ${schema}.api_keys
      FOR EACH ROW EXECUTE FUNCTION ${schema}.api_key_rollback_insert_failure()
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
