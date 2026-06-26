import { query } from '@/db';
import { corsResponse } from '@/lib/cors';
import { requireAdmin } from '@/lib/auth';
import { createSigner } from '@/lib/signer';

async function getFingerprintSettings() {
  const rows = await query<{ key: string; value: string }>('SELECT key, value FROM site_settings WHERE key IN ($1,$2,$3)', ['fingerprint_enabled', 'fingerprint_method', 'fingerprint_public_key']);
  const map: Record<string, any> = {};
  for (const r of rows) {
    try { map[r.key] = JSON.parse(r.value); } catch { map[r.key] = r.value; }
  }
  return {
    enabled: !!map.fingerprint_enabled,
    method: (map.fingerprint_method === 'signature' ? 'signature' : 'hash') as 'hash' | 'signature',
    publicKey: map.fingerprint_public_key || '',
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('drafts') === 'true';

  const posts = includeDrafts
    ? await query<any>('SELECT * FROM posts ORDER BY created_at DESC')
    : await query<any>('SELECT * FROM posts WHERE published = true AND draft = false ORDER BY created_at DESC');
  return corsResponse(posts);
}

export async function POST(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await req.json();
  const { slug, titleZh, titleEn, excerptZh, excerptEn, contentZh, contentEn, draft, published, publishAt } = body;

  if (!slug || !titleZh || !titleEn) {
    return corsResponse({ error: 'missing required fields' }, { status: 400 });
  }

  let fingerprintZh: string | null = null
  let fingerprintEn: string | null = null
  const fpSettings = await getFingerprintSettings()
  if (fpSettings.enabled) {
    const signer = createSigner(fpSettings.method)
    fingerprintZh = signer.sign(contentZh || '', fpSettings.publicKey) || null
    fingerprintEn = signer.sign(contentEn || '', fpSettings.publicKey) || null
  }

  const result = await query<any>(
    `INSERT INTO posts (slug, title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en, fingerprint_zh, fingerprint_en, draft, published, publish_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [slug, titleZh, titleEn, excerptZh || '', excerptEn || '', contentZh || '', contentEn || '', fingerprintZh, fingerprintEn, draft ?? true, published ?? false, publishAt ? new Date(publishAt) : null]
  );

  return corsResponse(result[0], { status: 201 });
}