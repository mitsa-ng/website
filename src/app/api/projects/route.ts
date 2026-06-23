import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('drafts') === 'true';

  try {
    const data = includeDrafts
      ? await query<any>('SELECT * FROM projects ORDER BY sort_order DESC')
      : await query<any>('SELECT * FROM projects WHERE published = true AND draft = false ORDER BY sort_order DESC');
    return corsResponse(data);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { titleZh, titleEn, descriptionZh, descriptionEn, tags, link, draft, published, sortOrder } = body;

    const result = await query<any>(
      `INSERT INTO projects (title_zh, title_en, description_zh, description_en, tags, link, draft, published, sort_order)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       RETURNING *`,
      [titleZh, titleEn, descriptionZh || '', descriptionEn || '', JSON.stringify(tags ?? []), link || null, draft ?? true, published ?? false, sortOrder ?? 0]
    );

    revalidatePath('/');
    return corsResponse(result[0]);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}