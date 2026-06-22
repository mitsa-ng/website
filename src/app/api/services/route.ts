
import { db } from '@/db';
import { services } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('drafts') === 'true';

  const data = includeDrafts
    ? await db.select().from(services).orderBy(desc(services.sortOrder))
    : await db.select().from(services)
      .where(and(eq(services.published, true), eq(services.draft, false)))
      .orderBy(desc(services.sortOrder));
  return corsResponse(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [svc] = await db.insert(services).values({
    titleZh: body.titleZh, titleEn: body.titleEn,
    descriptionZh: body.descriptionZh ?? body.descZh,
    descriptionEn: body.descriptionEn ?? body.descEn,
    price: body.price ?? '',
    featured: body.featured ?? false,
    draft: body.draft ?? true,
    published: body.published ?? false,
    sortOrder: body.sortOrder ?? 0,
  }).returning();
  revalidatePath('/');
  return corsResponse(svc);
}
