
import { db } from '@/db';
import { posts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  if (!post) return corsResponse({ error: 'not found' }, { status: 404 });
  return corsResponse(post);
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.titleZh !== undefined) updateData.titleZh = body.titleZh;
  if (body.titleEn !== undefined) updateData.titleEn = body.titleEn;
  if (body.excerptZh !== undefined) updateData.excerptZh = body.excerptZh;
  if (body.excerptEn !== undefined) updateData.excerptEn = body.excerptEn;
  if (body.contentZh !== undefined) updateData.contentZh = body.contentZh;
  if (body.contentEn !== undefined) updateData.contentEn = body.contentEn;
  if (body.draft !== undefined) updateData.draft = body.draft;
  if (body.published !== undefined) updateData.published = body.published;
  if (body.slug !== undefined && body.slug !== slug) updateData.slug = body.slug;
  if (body.publishAt !== undefined) updateData.publishAt = body.publishAt ? new Date(body.publishAt) : null;

  if (body.published && !body.draft) {
    updateData.publishedAt = new Date();
  }

  updateData.updatedAt = new Date();

  const [updated] = await db.update(posts)
    .set(updateData)
    .where(eq(posts.slug, slug))
    .returning();

  if (!updated) return corsResponse({ error: 'not found' }, { status: 404 });
  revalidatePath('/');
  return corsResponse(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await db.delete(posts).where(eq(posts.slug, slug));
  revalidatePath('/');
  return corsResponse({ ok: true });
}
