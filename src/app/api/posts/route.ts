import { query } from '@/db';
import { corsResponse } from '@/lib/cors';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('drafts') === 'true';

  const posts = includeDrafts
    ? await query<any>('SELECT * FROM posts ORDER BY created_at DESC')
    : await query<any>('SELECT * FROM posts WHERE published = true AND draft = false ORDER BY created_at DESC');
  return corsResponse(posts);
}

export async function POST(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await req.json();
  const { slug, titleZh, titleEn, excerptZh, excerptEn, contentZh, contentEn, draft, published, publishAt } = body;

  if (!slug || !titleZh || !titleEn) {
    return corsResponse({ error: 'missing required fields' }, { status: 400 });
  }

  const result = await query<any>(
    `INSERT INTO posts (slug, title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en, draft, published, publish_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [slug, titleZh, titleEn, excerptZh || '', excerptEn || '', contentZh || '', contentEn || '', draft ?? true, published ?? false, publishAt ? new Date(publishAt) : null]
  );

  return corsResponse(result[0], { status: 201 });
}