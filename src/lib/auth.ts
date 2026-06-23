import { corsResponse } from './cors';
import { query } from '@/db';
import { verifyApiKey, validateApiKeyFormat } from './api-key';

export async function requireAdmin(req: Request): Promise<Response | null> {
  const key = req.headers.get('X-Api-Key');
  if (!key || !validateApiKeyFormat(key)) {
    return corsResponse({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await query<{ key_hash: string }>(
    'SELECT key_hash FROM api_keys WHERE revoked = false'
  );

  for (const row of result) {
    if (verifyApiKey(key, row.key_hash)) {
      return null;
    }
  }

  return corsResponse({ error: 'unauthorized' }, { status: 401 });
}
