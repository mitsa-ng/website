import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('drafts') === 'true';

  const data = includeDrafts
    ? await query<any>('SELECT * FROM services ORDER BY sort_order DESC')
    : await query<any>('SELECT * FROM services WHERE published = true AND draft = false ORDER BY sort_order DESC');
  return corsResponse(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { titleZh, titleEn, descriptionZh, descriptionEn, price, featured, draft, published, sortOrder } = body;

  const result = await query<any>(
    `INSERT INTO services (title_zh, title_en, description_zh, description_en, price, featured, draft, published, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [titleZh, titleEn, descriptionZh || '', descriptionEn || '', price || '', featured ?? false, draft ?? true, published ?? false, sortOrder ?? 0]
  );

  revalidatePath('/');
  return corsResponse(result[0]);
}