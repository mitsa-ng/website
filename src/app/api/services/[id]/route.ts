import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';
import { requireAdmin } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, any> = {};
  if (body.titleZh !== undefined) updateData.title_zh = body.titleZh;
  if (body.titleEn !== undefined) updateData.title_en = body.titleEn;
  if (body.descriptionZh !== undefined) updateData.description_zh = body.descriptionZh;
  if (body.descriptionEn !== undefined) updateData.description_en = body.descriptionEn;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.featured !== undefined) updateData.featured = body.featured;
  if (body.draft !== undefined) updateData.draft = body.draft;
  if (body.published !== undefined) updateData.published = body.published;
  if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;
  updateData.updated_at = new Date();

  const sets = Object.entries(updateData).map(([k, v], i) => `${k} = $${i + 2}`).join(', ');
  const values = Object.values(updateData);

  const result = await query<any>(
    `UPDATE services SET ${sets} WHERE id = $1 RETURNING *`,
    [parseInt(id), ...values]
  );

  if (result.length === 0) return corsResponse({ error: 'not found' }, { status: 404 });
  revalidatePath('/');
  return corsResponse(result[0]);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  await query('DELETE FROM services WHERE id = $1', [parseInt(id)]);
  revalidatePath('/');
  return corsResponse({ ok: true });
}