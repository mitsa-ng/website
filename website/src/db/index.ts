import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof typeof _db];
  },
});

export async function query<T>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export type TransactionQuery = <Row>(text: string, params?: any[]) => Promise<Row[]>;

export type TransactionWork<T> = (query: TransactionQuery) => Promise<T>;

export interface TransactionClient {
  query(text: string, params?: any[]): Promise<{ rows: unknown[] }>;
  release(): void;
}

export function createTransactionRunner(acquireClient: () => Promise<TransactionClient>) {
  return async function runTransaction<T>(work: TransactionWork<T>): Promise<T> {
    const client = await acquireClient();
    try {
      await client.query('BEGIN');
      const result = await work(async <Row>(text: string, params?: any[]) => {
        const response = await client.query(text, params);
        return response.rows as Row[];
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };
}

export const transaction = createTransactionRunner(() => getPool().connect());
