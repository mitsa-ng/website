import { query } from '@/db';
import { corsResponse } from '@/lib/cors';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM site_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return corsResponse(settings);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const allowed = ['contact_email', 'contact_location_zh', 'contact_location_en', 'contact_reply_time_zh', 'contact_reply_time_en', 'about_content'];
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key)) {
        const sqlValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
        const cast = typeof value === 'object' && value !== null ? '::jsonb' : '';
        await query(
          `INSERT INTO site_settings (key, value) VALUES ($1, $2${cast}) ON CONFLICT (key) DO UPDATE SET value = $2${cast}`,
          [key, sqlValue]
        );
      }
    }
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM site_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return corsResponse(settings);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}
