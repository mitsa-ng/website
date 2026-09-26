CREATE TABLE IF NOT EXISTS "visits" (
  "day" date NOT NULL,
  "path" text NOT NULL,
  "locale" text NOT NULL,
  "referrer_host" text,
  "session_id" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "visits_day_path_idx" ON "visits" ("day", "path");
