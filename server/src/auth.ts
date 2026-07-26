// ============================================================================
// Authentication: bcrypt password hashing, JWT issuing/verifying, an Express
// middleware to protect routes, and the auth_users data helpers.
// ============================================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from './db';
import { getItemById } from './repo';
import { COLLECTION_BY_KEY } from './collections';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-amanat';
const TOKEN_TTL = process.env.JWT_TTL || '30d';
const STAFF_DEF = COLLECTION_BY_KEY['staffUsers'];

export interface AuthUserRow {
  id: string;
  email: string;
  password_hash: string;
  staff_user_id: string;
  active: number;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: { sub: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL as any });
}

export function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
  } catch {
    return null;
  }
}

export async function findAuthUserByEmail(email: string): Promise<AuthUserRow | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM auth_users WHERE email = ? LIMIT 1`,
    [email.trim().toLowerCase()],
  );
  return rows.length ? (rows[0] as AuthUserRow) : null;
}

/** Create or reset a login. staffUserId links to a row in staff_users. */
export async function upsertAuthUser(params: {
  id: string;
  email: string;
  passwordHash: string;
  staffUserId: string;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO auth_users (id, email, password_hash, staff_user_id, active)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       staff_user_id = VALUES(staff_user_id),
       active = 1`,
    [params.id, params.email.trim().toLowerCase(), params.passwordHash, params.staffUserId],
  );
}

/** Return the StaffUser profile (RBAC) linked to an auth row. */
export async function getStaffProfile(staffUserId: string): Promise<any | null> {
  return getItemById(STAFF_DEF, staffUserId);
}

// Express middleware — requires a valid Bearer token; attaches req.auth.
export interface AuthedRequest extends Request {
  auth?: { sub: string; email: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  req.auth = payload;
  next();
}
