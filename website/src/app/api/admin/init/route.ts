import { timingSafeEqual } from 'node:crypto';
import { transaction } from '@/db';
import { generateApiKey } from '@/lib/api-key';
import { corsResponse } from '@/lib/cors';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  try {
    // Guard the init endpoint with an optional one-time deployment token.
    // When ADMIN_INIT_TOKEN is set, only requests carrying a matching
    // X-Admin-Init-Token header can mint a new admin key. This prevents the
    // first random visitor on a fresh deploy from owning the admin key.
    // When unset (e.g. local dev), init stays open but the response warns.
    const initToken = process.env.ADMIN_INIT_TOKEN;
    if (initToken) {
      const provided = req.headers.get('x-admin-init-token');
      if (!provided || !safeEqual(provided, initToken)) {
        return corsResponse({ error: 'unauthorized' }, { status: 401 });
      }
    }

    let label = 'admin';
    let force = false;
    try {
      const body = await req.json();
      if (body.label) label = body.label;
      if (body.force) force = true;
    } catch {
      // no body — use defaults
    }

    const apiKey = await transaction(async query => {
      // Serialize all init attempts, including the empty-table case where row
      // locks cannot protect a missing active key.
      await query('SELECT pg_advisory_xact_lock(274185901)');
      const existing = await query<{ id: number }>(
        'SELECT id FROM api_keys WHERE revoked = false LIMIT 1'
      );

      if (existing.length > 0) {
        if (force) {
          await query('UPDATE api_keys SET revoked = true WHERE revoked = false');
        } else {
          return null;
        }
      }

      const generated = generateApiKey(label);
      await query(
        'INSERT INTO api_keys (key_hash, key_prefix, label) VALUES ($1, $2, $3)',
        [generated.hash, generated.prefix, label]
      );
      return generated;
    });

    if (!apiKey) {
      return corsResponse({ error: 'api key already exists' }, { status: 400 });
    }

    const res = corsResponse({ raw: apiKey.raw, label, warning: 'save this key now, it will not be shown again' });
    if (!initToken) {
      res.headers.set('X-Setup-Warning', 'ADMIN_INIT_TOKEN not set - init is unguarded');
    }
    return res;
  } catch {
    console.error('Init error');
    return corsResponse({ error: 'unable to initialize api key' }, { status: 500 });
  }
}
