// ============================================================================
// MySQL connection pool (mysql2/promise), configured from environment vars.
// Reads .env from the project root (loaded once here).
// ============================================================================
import 'dotenv/config';
import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';

export interface DbConfig extends PoolOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function dbConfig(): DbConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'amanat_platform',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
    // JSON columns come back already parsed; keep decimals as JS numbers.
    decimalNumbers: true,
  };
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig());
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
