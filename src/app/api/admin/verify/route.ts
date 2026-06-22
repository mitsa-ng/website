import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { verifyApiKey, validateApiKeyFormat } from '@/lib/api-key';
import { corsResponse } from '@/lib/cors';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    if (!key || !validateApiKeyFormat(key)) {
      return corsResponse({ valid: false }, { status: 401 });
    }

    const keys = await db.select().from(apiKeys).where(eq(apiKeys.revoked, false));
    for (const k of keys) {
      if (verifyApiKey(key, k.keyHash)) {
        await db.update(apiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiKeys.id, k.id));
        return corsResponse({ valid: true, label: k.label });
      }
    }

    return corsResponse({ valid: false }, { status: 401 });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}
