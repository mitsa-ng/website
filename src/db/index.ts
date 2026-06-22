import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

type DB = ReturnType<typeof drizzle>;

let _db: DB | null = null;
let _pool: Pool | null = null;

function getDb(): DB {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _pool = new Pool({ connectionString: url });
    _db = drizzle(_pool, { schema });
    const keepAlive = () => _pool!.connect().then(c => { c.release(); }).catch(() => {});
    keepAlive();
    setInterval(keepAlive, 30_000);
  }
  return _db;
}

export const db = new Proxy({} as DB, {
  get(_target, prop: keyof DB) {
    return getDb()[prop];
  },
});
