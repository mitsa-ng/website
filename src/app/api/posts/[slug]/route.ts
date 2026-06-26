import { query } from '@/db';
import { revalidatePath } from 'next/cache';
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

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await query<any>(
    'SELECT * FROM posts WHERE slug = $1 LIMIT 1',
    [slug]
  );
  if (result.length === 0) return corsResponse({ error: 'not found' }, { status: 404 });
  return corsResponse(result[0]);
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { slug } = await params;
  const body = await req.json();

  const updateData: Record<string, any> = {};
  if (body.titleZh !== undefined) updateData.title_zh = body.titleZh;
  if (body.titleEn !== undefined) updateData.title_en = body.titleEn;
  if (body.excerptZh !== undefined) updateData.excerpt_zh = body.excerptZh;
  if (body.excerptEn !== undefined) updateData.excerpt_en = body.excerptEn;
  if (body.contentZh !== undefined) updateData.content_zh = body.contentZh;
  if (body.contentEn !== undefined) updateData.content_en = body.contentEn;
  if (body.draft !== undefined) updateData.draft = body.draft;
  if (body.published !== undefined) updateData.published = body.published;
  if (body.slug !== undefined && body.slug !== slug) updateData.slug = body.slug;
  if (body.publishAt !== undefined) updateData.publish_at = body.publishAt ? new Date(body.publishAt) : null;

  if (body.contentZh !== undefined || body.contentEn !== undefined) {
    const fpSettings = await getFingerprintSettings()
    if (fpSettings.enabled) {
      const signer = createSigner(fpSettings.method)
      if (body.contentZh !== undefined) {
        updateData.fingerprint_zh = signer.sign(body.contentZh, fpSettings.publicKey) || null
      }
      if (body.contentEn !== undefined) {
        updateData.fingerprint_en = signer.sign(body.contentEn, fpSettings.publicKey) || null
      }
    } else {
      if (body.contentZh !== undefined) updateData.fingerprint_zh = null
      if (body.contentEn !== undefined) updateData.fingerprint_en = null
    }
  }

  if (body.published && !body.draft) {
    updateData.published_at = new Date();
  }

  updateData.updated_at = new Date();

  const sets = Object.entries(updateData).map(([k, v], i) => `${k} = $${i + 2}`).join(', ');
  const values = Object.values(updateData);
  
  const result = await query<any>(
    `UPDATE posts SET ${sets} WHERE slug = $1 RETURNING *`,
    [slug, ...values]
  );

  if (result.length === 0) return corsResponse({ error: 'not found' }, { status: 404 });
  revalidatePath('/');
  return corsResponse(result[0]);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { slug } = await params;
  await query('DELETE FROM posts WHERE slug = $1', [slug]);
  revalidatePath('/');
  return corsResponse({ ok: true });
}