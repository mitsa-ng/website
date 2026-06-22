
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { corsResponse } from '@/lib/cors';

export async function GET() {
  try {
    const data = await db.select().from(contacts).orderBy(desc(contacts.createdAt));
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

    await db.insert(contacts).values({ name, email, message });
    return corsResponse({ ok: true });
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}
