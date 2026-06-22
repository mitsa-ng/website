import { query } from '@/db';
import { generateApiKey } from '@/lib/api-key';
import { corsResponse } from '@/lib/cors';

export async function POST(req: Request) {
  try {
    let label = 'admin';
    try {
      const body = await req.json();
      if (body.label) label = body.label;
    } catch {
      // no body — use default label
    }

    const existing = await query<{ id: number }>(
      'SELECT id FROM api_keys WHERE revoked = false LIMIT 1'
    );
    
    if (existing.length > 0) {
      return corsResponse({ error: 'api key already exists' }, { status: 400 });
    }

    const { raw, hash, prefix } = generateApiKey(label);

    await query(
      'INSERT INTO api_keys (key_hash, key_prefix, label) VALUES ($1, $2, $3)',
      [hash, prefix, label]
    );

    return corsResponse({ raw, label, warning: 'save this key now, it will not be shown again' });
  } catch (e) {
    console.error('Init error:', e);
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}