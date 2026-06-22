import { db } from '@/db';
import { generateApiKey } from '@/lib/api-key';
import { corsResponse } from '@/lib/cors';
import { sql } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    let label = 'admin';
    try {
      const body = await req.json();
      if (body.label) label = body.label;
    } catch {
      // no body — use default label
    }

    const existing = await db.execute(sql`
      SELECT id FROM api_keys WHERE revoked = false LIMIT 1
    `);
    
    if (existing.rows.length > 0) {
      return corsResponse({ error: 'api key already exists' }, { status: 400 });
    }

    const { raw, hash, prefix } = generateApiKey(label);

    await db.execute(sql`
      INSERT INTO api_keys (key_hash, key_prefix, label)
      VALUES (${hash}, ${prefix}, ${label})
    `);

    return corsResponse({ raw, label, warning: 'save this key now, it will not be shown again' });
  } catch (e) {
    console.error('Init error:', e);
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}