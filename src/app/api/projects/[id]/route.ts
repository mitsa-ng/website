
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.titleZh !== undefined) updateData.titleZh = body.titleZh;
  if (body.titleEn !== undefined) updateData.titleEn = body.titleEn;
  if (body.descriptionZh !== undefined) updateData.descriptionZh = body.descriptionZh;
  if (body.descriptionEn !== undefined) updateData.descriptionEn = body.descriptionEn;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.link !== undefined) updateData.link = body.link;
  if (body.draft !== undefined) updateData.draft = body.draft;
  if (body.published !== undefined) updateData.published = body.published;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
  updateData.updatedAt = new Date();

  const [updated] = await db.update(projects)
    .set(updateData)
    .where(eq(projects.id, parseInt(id)))
    .returning();
  if (!updated) return corsResponse({ error: 'not found' }, { status: 404 });
  revalidatePath('/');
  return corsResponse(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(projects).where(eq(projects.id, parseInt(id)));
  revalidatePath('/');
  return corsResponse({ ok: true });
}
