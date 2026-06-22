import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { generateApiKey, verifyApiKey } from '@/lib/api-key';
import { corsResponse } from '@/lib/cors';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    let label = 'admin';
    try {
      const body = await req.json();
      if (body.label) label = body.label;
    } catch {
      // no body — use default label
    }

    const existing = await db.select().from(apiKeys).where(eq(apiKeys.revoked, false)).limit(1);
    if (existing.length > 0) {
      return corsResponse({ error: 'api key already exists' }, { status: 400 });
    }

    const { raw, hash, prefix } = generateApiKey(label);

    await db.insert(apiKeys).values({
      keyHash: hash,
      keyPrefix: prefix,
      label,
    });

    return corsResponse({ raw, label, warning: 'save this key now, it will not be shown again' });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}
