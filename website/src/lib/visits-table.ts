import { query } from '@/db'

// Production cannot run `drizzle-kit migrate` without the sensitive
// DATABASE_URL, so the table is created lazily and idempotently on first
// use. The drizzle migration (0004) documents the same schema and is a
// no-op here thanks to IF NOT EXISTS.
let ensured = false

export async function ensureVisitsTable(): Promise<void> {
  if (ensured) return
  await query(`CREATE TABLE IF NOT EXISTS "visits" (
  "day" date NOT NULL,
  "path" text NOT NULL,
  "locale" text NOT NULL,
  "referrer_host" text,
  "session_id" text NOT NULL,
  "created_at" timestamp DEFAULT now()
)`)
  await query(`CREATE INDEX IF NOT EXISTS "visits_day_path_idx" ON "visits" ("day", "path")`)
  ensured = true
}
