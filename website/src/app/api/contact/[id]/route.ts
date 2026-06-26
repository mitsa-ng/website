import { query } from '@/db';
import { corsResponse } from '@/lib/cors';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const result = await query<any>('SELECT * FROM contacts WHERE id = $1', [Number(id)]);
    if (result.length === 0) return corsResponse({ error: 'Not found' }, { status: 404 });
    return corsResponse({ data: result[0] });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    await query('DELETE FROM contacts WHERE id = $1', [Number(id)]);
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

const CONTACT_COLUMNS: Record<string, string> = {
  name: 'name',
  email: 'email',
  message: 'message',
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const body = await req.json();
    const entries = Object.entries(CONTACT_COLUMNS)
      .filter(([k]) => body[k] !== undefined)
      .map(([k, col], i) => ({ col, val: body[k], idx: i + 2 }));
    if (entries.length === 0) return corsResponse({ ok: true });
    const sets = entries.map(e => `${e.col} = $${e.idx}`).join(', ');
    const values = entries.map(e => e.val);
    await query(`UPDATE contacts SET ${sets} WHERE id = $1`, [Number(id), ...values]);
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}