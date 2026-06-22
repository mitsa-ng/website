import { db } from '@/db';
import { verifyApiKey, validateApiKeyFormat } from '@/lib/api-key';
import { corsResponse } from '@/lib/cors';
import { sql } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    if (!key || !validateApiKeyFormat(key)) {
      return corsResponse({ valid: false }, { status: 401 });
    }

    const result = await db.execute(sql`
      SELECT id, key_hash, key_prefix, label, created_at, last_used_at, revoked
      FROM api_keys
      WHERE revoked = false
    `);

    for (const row of result.rows as any[]) {
      if (verifyApiKey(key, row.key_hash)) {
        await db.execute(sql`
          UPDATE api_keys 
          SET last_used_at = NOW() 
          WHERE id = ${row.id}
        `);
        return corsResponse({ valid: true, label: row.label });
      }
    }

    return corsResponse({ valid: false }, { status: 401 });
  } catch (e) {
    console.error('Verify error:', e);
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}