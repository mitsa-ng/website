import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { corsResponse } from '@/lib/cors';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db.select().from(contacts).where(eq(contacts.id, Number(id)));
    if (result.length === 0) return corsResponse({ error: 'Not found' }, { status: 404 });
    return corsResponse({ data: result[0] });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(contacts).where(eq(contacts.id, Number(id)));
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

// Handle PATCH /api/contact/[id] to update contact fields
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await _req.json();
    await db.update(contacts).set(body).where(eq(contacts.id, Number(id)));
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}