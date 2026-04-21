import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'satria',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // search_path agar tidak perlu tulis schema di setiap query
  options: '-c search_path=auth,master,pkpt,penugasan,audit,pelaporan,public',
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<import('pg').QueryResult<T & Record<string, unknown>>> {
  const start = Date.now();
  const res = await pool.query<T & Record<string, unknown>>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB]', { text: text.slice(0, 80), duration, rows: res.rowCount });
  }
  return res;
}
