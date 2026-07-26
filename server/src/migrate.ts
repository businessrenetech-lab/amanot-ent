// ============================================================================
// Migration runner — creates the database (if permitted) and all tables.
//   Run:  npm run db:migrate
// Safe to run repeatedly (CREATE TABLE IF NOT EXISTS).
// ============================================================================
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { dbConfig } from './db';

const __dirname = dirname(fileURLToPath(import.meta.url));
// schema.sql lives one level up from this module (server/schema.sql) in both
// the tsx (server/src) and the bundled (server/dist) layouts.
const SCHEMA_PATH = resolve(__dirname, '..', 'schema.sql');

async function migrate(): Promise<void> {
  const cfg = dbConfig();
  const schemaSql = readFileSync(SCHEMA_PATH, 'utf8');

  // Phase 1: try to create the database. On shared hosting (Hostinger) the DB
  // usually already exists and the user lacks CREATE DATABASE privilege — that
  // is fine, we just fall through to creating the tables.
  const bootstrap = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  });
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`✓ Database "${cfg.database}" ready.`);
  } catch (err: any) {
    console.warn(
      `! Could not create database "${cfg.database}" (${err.code || err.message}). ` +
        `Assuming it already exists.`,
    );
  } finally {
    await bootstrap.end();
  }

  // Phase 2: create the tables inside the target database.
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: true,
  });
  try {
    await conn.query(schemaSql);
    console.log('✓ Schema applied — all tables are in place.');
  } finally {
    await conn.end();
  }
}

migrate()
  .then(() => {
    console.log('Migration complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
