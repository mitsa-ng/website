
import { db } from '@/db';
import { posts } from '@/db/schema';
import { desc, eq, and, isNotNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('drafts') === 'true';

  try {
    const data = includeDrafts
      ? await db.select().from(posts).orderBy(desc(posts.createdAt))
      : await db.select().from(posts)
        .where(and(eq(posts.published, true), eq(posts.draft, false)))
        .orderBy(desc(posts.publishedAt));

    return corsResponse(data);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, titleZh, titleEn, excerptZh, excerptEn, contentZh, contentEn, draft, published, publishAt } = body;

    const existing = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
    if (existing.length > 0) {
      return corsResponse({ error: 'slug already exists' }, { status: 400 });
    }

    const now = published ? new Date() : null;

    const [post] = await db.insert(posts).values({
      slug, titleZh, titleEn,
      excerptZh: excerptZh ?? '',
      excerptEn: excerptEn ?? '',
      contentZh: contentZh ?? '',
      contentEn: contentEn ?? '',
      draft: draft ?? true,
      published: published ?? false,
      publishedAt: now,
      publishAt: publishAt ? new Date(publishAt) : null,
    }).returning();

    revalidatePath('/');
    return corsResponse(post);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}
