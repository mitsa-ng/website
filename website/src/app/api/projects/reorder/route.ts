import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { corsResponse } from '@/lib/cors';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { orders } = await req.json() as { orders: { id: number; sortOrder: number }[] };

    for (const item of orders) {
      await query(
        'UPDATE projects SET sort_order = $1, updated_at = NOW() WHERE id = $2',
        [item.sortOrder, item.id]
      );
    }

    revalidatePath('/');
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}
