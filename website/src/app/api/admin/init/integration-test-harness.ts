import { randomBytes } from 'node:crypto';

const integrationApplicationName = 'personal-web-key-rotation-integration-test';
const schemaPrefix = 'api_key_rotation_test_';

export interface IsolatedIntegrationDatabaseConfig {
  connectionString: string;
  schema: string;
}

export function requireDisposableIntegrationDatabaseUrl(testDatabaseUrl: string): URL {
  let url: URL;
  try {
    url = new URL(testDatabaseUrl);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('TEST_DATABASE_URL must be a PostgreSQL URL');
  }

  const host = url.hostname.toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]' && host !== '::1') {
    throw new Error('TEST_DATABASE_URL must target only a loopback PostgreSQL host');
  }

  const queryParameters = Array.from(url.searchParams.entries());
  if (queryParameters.length !== 1 || queryParameters[0][0] !== 'application_name') {
    throw new Error('TEST_DATABASE_URL must contain only the required application_name parameter');
  }

  if (queryParameters[0][1] !== integrationApplicationName) {
    throw new Error(
      'TEST_DATABASE_URL must include exactly one application_name=personal-web-key-rotation-integration-test'
    );
  }

  return url;
}

export function createIsolatedIntegrationDatabaseConfig(
  testDatabaseUrl: string
): IsolatedIntegrationDatabaseConfig {
  const url = requireDisposableIntegrationDatabaseUrl(testDatabaseUrl);
  const schema = `${schemaPrefix}${randomBytes(16).toString('hex')}`;

  url.searchParams.set('options', `-c search_path=${schema},pg_catalog`);
  return { connectionString: url.toString(), schema };
}
