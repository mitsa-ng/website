
import { db } from '@/db';
import { projects } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('drafts') === 'true';

  try {
    const data = includeDrafts
      ? await db.select().from(projects).orderBy(desc(projects.sortOrder))
      : await db.select().from(projects)
        .where(and(eq(projects.published, true), eq(projects.draft, false)))
        .orderBy(desc(projects.sortOrder));
    return corsResponse(data);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const [project] = await db.insert(projects).values({
      titleZh: body.titleZh, titleEn: body.titleEn,
      descriptionZh: body.descriptionZh ?? body.descZh,
      descriptionEn: body.descriptionEn ?? body.descEn,
      tags: body.tags ?? [],
      link: body.link ?? null,
      draft: body.draft ?? true,
      published: body.published ?? false,
      sortOrder: body.sortOrder ?? 0,
    }).returning();

    revalidatePath('/');
    return corsResponse(project);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}
