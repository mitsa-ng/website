import { query } from '@/db';
import { verifyApiKey, validateApiKeyFormat } from '@/lib/api-key';
import { corsResponse } from '@/lib/cors';

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    if (!key || !validateApiKeyFormat(key)) {
      return corsResponse({ valid: false }, { status: 401 });
    }

    const result = await query<{
      id: number;
      key_hash: string;
      label: string;
    }>(
      'SELECT id, key_hash, label FROM api_keys WHERE revoked = false'
    );

    for (const row of result) {
      if (verifyApiKey(key, row.key_hash)) {
        await query(
          'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
          [row.id]
        );
        return corsResponse({ valid: true, label: row.label });
      }
    }

    return corsResponse({ valid: false }, { status: 401 });
  } catch (e) {
    console.error('Verify error:', e);
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}