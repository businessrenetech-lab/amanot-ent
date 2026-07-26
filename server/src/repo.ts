// ============================================================================
// Data access layer — generic read / replace for collections + singletons.
// Used by both the API routes (server.ts) and the seed script (seed.ts).
// ============================================================================
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getPool } from './db';
import {
  COLLECTIONS,
  MASTER_LIST_KEYS,
  SINGLETON_KEYS,
  type CollectionDef,
} from './collections';

type Executor = Pool | PoolConnection;

function parseData(raw: unknown): any {
  // mysql2 returns JSON columns already parsed, but guard for string drivers.
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

/** Read every collection + singleton + master list into one state object. */
export async function getAllState(): Promise<Record<string, any>> {
  const pool = getPool();
  const state: Record<string, any> = {};

  for (const def of COLLECTIONS) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT data FROM \`${def.table}\` ORDER BY updated_at ASC, id ASC`,
    );
    state[def.key] = rows.map((r) => parseData(r.data));
  }

  const [singRows] = await pool.query<RowDataPacket[]>(`SELECT name, data FROM app_singletons`);
  const singMap: Record<string, any> = {};
  for (const r of singRows) singMap[r.name] = parseData(r.data);

  for (const k of SINGLETON_KEYS) {
    if (singMap[k] !== undefined) state[k] = singMap[k];
  }

  const masterLists: Record<string, any> = {};
  for (const k of MASTER_LIST_KEYS) {
    if (singMap[k] !== undefined) masterLists[k] = singMap[k];
  }
  state.masterLists = masterLists;

  return state;
}

/** Replace an entire collection (delete-all + bulk insert) inside a transaction. */
export async function replaceCollection(def: CollectionDef, items: any[]): Promise<void> {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM \`${def.table}\``);

    if (Array.isArray(items) && items.length > 0) {
      const cols = ['id', ...def.index.map((i) => i.col), 'data'];
      const colList = cols.map((c) => `\`${c}\``).join(', ');
      // Insert in chunks to stay well under max_allowed_packet.
      const CHUNK = 200;
      for (let start = 0; start < items.length; start += CHUNK) {
        const slice = items.slice(start, start + CHUNK);
        const placeholders = slice.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ');
        const values: unknown[] = [];
        for (const o of slice) {
          values.push(o.id, ...def.index.map((i) => i.get(o)), JSON.stringify(o));
        }
        await conn.query(
          `INSERT INTO \`${def.table}\` (${colList}) VALUES ${placeholders}`,
          values,
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Fetch all objects from one collection. */
export async function getCollectionItems(def: CollectionDef): Promise<any[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT data FROM \`${def.table}\` ORDER BY updated_at ASC, id ASC`,
  );
  return rows.map((r) => parseData(r.data));
}

/** Fetch one singleton / master list value by name (or null). */
export async function getSingleton(name: string): Promise<any | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT data FROM app_singletons WHERE name = ? LIMIT 1`,
    [name],
  );
  return rows.length ? parseData(rows[0].data) : null;
}

/** Fetch a single object from a collection by id (or null). */
export async function getItemById(def: CollectionDef, id: string): Promise<any | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT data FROM \`${def.table}\` WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows.length ? parseData(rows[0].data) : null;
}

/** Insert-or-update a single object in a collection (keeps other rows intact). */
export async function upsertItem(def: CollectionDef, obj: any): Promise<void> {
  const cols = ['id', ...def.index.map((i) => i.col), 'data'];
  const colList = cols.map((c) => `\`${c}\``).join(', ');
  const placeholders = cols.map(() => '?').join(', ');
  const updates = [...def.index.map((i) => i.col), 'data']
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');
  const values = [obj.id, ...def.index.map((i) => i.get(obj)), JSON.stringify(obj)];
  await getPool().query(
    `INSERT INTO \`${def.table}\` (${colList}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    values,
  );
}

/** Upsert a singleton / master list JSON blob by name. */
export async function setSingleton(name: string, data: any, exec?: Executor): Promise<void> {
  const runner = exec ?? getPool();
  await runner.query(
    `INSERT INTO app_singletons (name, data) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [name, JSON.stringify(data ?? null)],
  );
}
