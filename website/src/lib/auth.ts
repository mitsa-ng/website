import { corsResponse } from './cors';
import { query } from '@/db';
import { verifyApiKey, validateApiKeyFormat } from './api-key';

export async function requireAdmin(req: Request): Promise<Response | null> {
  const key = req.headers.get('X-Api-Key');
  if (!key || !validateApiKeyFormat(key)) {
    return corsResponse({ error: 'unauthorized' }, { status: 401 });
  }

  // Filter by the key's prefix so scrypt verification (expensive) only runs
  // against rows that share this prefix, rather than every non-revoked key.
  const prefix = key.split('_')[0];
  const result = await query<{ key_hash: string }>(
    'SELECT key_hash FROM api_keys WHERE revoked = false AND key_prefix = $1',
    [prefix]
  );

  for (const row of result) {
    if (verifyApiKey(key, row.key_hash)) {
      return null;
    }
  }

  return corsResponse({ error: 'unauthorized' }, { status: 401 });
}
