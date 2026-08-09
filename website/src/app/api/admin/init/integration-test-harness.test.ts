import { describe, expect, it } from 'vitest';
import { createIsolatedIntegrationDatabaseConfig } from './integration-test-harness';

const applicationName = 'personal-web-key-rotation-integration-test';

describe('createIsolatedIntegrationDatabaseConfig', () => {
  it.each([
    'postgresql://tester@127.0.0.1/key_rotation?application_name=personal-web-key-rotation-integration-test',
    'postgresql://tester@localhost/key_rotation?application_name=personal-web-key-rotation-integration-test',
    'postgresql://tester@[::1]/key_rotation?application_name=personal-web-key-rotation-integration-test',
  ])('requires the exact disposable application name for %s', testDatabaseUrl => {
    const config = createIsolatedIntegrationDatabaseConfig(testDatabaseUrl);
    const configuredUrl = new URL(config.connectionString);

    expect(configuredUrl.searchParams.getAll('application_name')).toEqual([applicationName]);
    expect(config.schema).toMatch(/^api_key_rotation_test_[a-f0-9]{32}$/);
    expect(configuredUrl.searchParams.get('options')).toBe(
      `-c search_path=${config.schema},pg_catalog`
    );
  });

  it('creates a distinct generated schema for each isolated run', () => {
    const testDatabaseUrl = `postgresql://tester@localhost/key_rotation?application_name=${applicationName}`;

    const first = createIsolatedIntegrationDatabaseConfig(testDatabaseUrl);
    const second = createIsolatedIntegrationDatabaseConfig(testDatabaseUrl);

    expect(first.schema).not.toBe(second.schema);
  });

  it.each([
    'postgresql://tester@db.example/key_rotation?application_name=personal-web-key-rotation-integration-test',
    'postgresql://tester@%31%32%37.0.0.1/key_rotation?application_name=personal-web-key-rotation-integration-test',
    'https://tester@localhost/key_rotation?application_name=personal-web-key-rotation-integration-test',
    'postgresql://tester@localhost/key_rotation',
    'postgresql://tester@localhost/key_rotation?application_name=other-test',
    'postgresql://tester@127.0.0.1/key_rotation?application_name=personal-web-key-rotation-integration-test%20',
    'postgresql://tester@localhost/key_rotation?application_name=personal-web-key-rotation-integration-test&application_name=other-test',
    'postgresql://tester@[::1]/key_rotation?application_name=personal-web-key-rotation-integration-test&application_name=personal-web-key-rotation-integration-test',
  ])('refuses an unsafe database URL before a pool can be created: %s', testDatabaseUrl => {
    expect(() => createIsolatedIntegrationDatabaseConfig(testDatabaseUrl)).toThrow(
      /TEST_DATABASE_URL must (be a PostgreSQL URL|target only a loopback PostgreSQL host|include exactly one application_name=personal-web-key-rotation-integration-test)/
    );
  });
});
