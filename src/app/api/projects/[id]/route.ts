import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, any> = {};
  if (body.titleZh !== undefined) updateData.title_zh = body.titleZh;
  if (body.titleEn !== undefined) updateData.title_en = body.titleEn;
  if (body.descriptionZh !== undefined) updateData.description_zh = body.descriptionZh;
  if (body.descriptionEn !== undefined) updateData.description_en = body.descriptionEn;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.link !== undefined) updateData.link = body.link;
  if (body.draft !== undefined) updateData.draft = body.draft;
  if (body.published !== undefined) updateData.published = body.published;
  if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;
  updateData.updated_at = new Date();

  const sets = Object.entries(updateData).map(([k, v], i) => `${k} = $${i + 2}`).join(', ');
  const values = Object.values(updateData);

  const result = await query<any>(
    `UPDATE projects SET ${sets} WHERE id = $1 RETURNING *`,
    [parseInt(id), ...values]
  );

  if (result.length === 0) return corsResponse({ error: 'not found' }, { status: 404 });
  revalidatePath('/');
  return corsResponse(result[0]);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query('DELETE FROM projects WHERE id = $1', [parseInt(id)]);
  revalidatePath('/');
  return corsResponse({ ok: true });
}