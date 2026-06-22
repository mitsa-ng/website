import { query } from '@/db';
import { corsResponse } from '@/lib/cors';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await query<any>('SELECT * FROM contacts WHERE id = $1', [Number(id)]);
    if (result.length === 0) return corsResponse({ error: 'Not found' }, { status: 404 });
    return corsResponse({ data: result[0] });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM contacts WHERE id = $1', [Number(id)]);
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await _req.json();
    const sets = Object.entries(body).map(([k, v], i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(body);
    await query(`UPDATE contacts SET ${sets} WHERE id = $1`, [Number(id), ...values]);
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}