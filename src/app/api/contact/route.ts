import { query } from '@/db';
import { corsResponse } from '@/lib/cors';

export async function GET() {
  try {
    const data = await query<any>('SELECT * FROM contacts ORDER BY created_at DESC');
    return corsResponse(data);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
      return corsResponse({ error: 'all fields required' }, { status: 400 });
    }

    await query(
      'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}