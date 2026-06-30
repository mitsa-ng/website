import { query } from '@/db';
import { corsResponse } from '@/lib/cors';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM site_settings');
    const settings: Record<string, any> = {};
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
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
    const allowed = [
      'contact_email', 'contact_location_zh', 'contact_location_en',
      'contact_reply_time_zh', 'contact_reply_time_en',
      'about_content', 'brand_text', 'site_icon',
      'fingerprint_enabled', 'fingerprint_method', 'fingerprint_public_key',
      'site_description', 'site_title', 'default_og_image', 'twitter_handle',
      'ga_id', 'theme_color', 'favicon_url',
      'verification_google', 'verification_bing',
      'author_name', 'author_url',
    ];
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key)) {
        const sqlValue = JSON.stringify(value);
        await query(
          `INSERT INTO site_settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
          [key, sqlValue]
        );
      }
    }
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM site_settings');
    const settings: Record<string, any> = {};
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }
    return corsResponse(settings);
  } catch (e) {
    return corsResponse({ error: String(e) }, { status: 500 });
  }
}
