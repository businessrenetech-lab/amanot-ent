// ============================================================================
// Express API server for the Amanat Business Platform.
//
//   Public:
//     GET  /api/health                     -> { ok, db }
//     GET  /api/public/catalog             -> products + settings + master lists
//     POST /api/public/quote               -> store a storefront lead (quotation)
//     POST /api/auth/login                 -> { token, user }
//
//   Authenticated (Bearer token):
//     GET  /api/auth/me                    -> current StaffUser
//     GET  /api/state                      -> full app state (all collections)
//     PUT  /api/collections/:key           -> replace a collection (body: array)
//     PUT  /api/singletons/:key            -> upsert settings | auditConfig
//     PUT  /api/master-lists/:key          -> upsert a master list (body: array)
//
// In production it also serves the built Vite frontend from /dist with an SPA
// fallback, so a single "Setup Node.js App" on Hostinger runs both the API and
// the site on one origin.
// ============================================================================
import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPool } from './db';
import {
  getAllState,
  replaceCollection,
  setSingleton,
  getCollectionItems,
  getSingleton,
  upsertItem,
} from './repo';
import {
  COLLECTION_BY_KEY,
  MASTER_LIST_KEYS,
  SINGLETON_KEYS,
} from './collections';
import {
  findAuthUserByEmail,
  getStaffProfile,
  hashPassword,
  requireAuth,
  signToken,
  upsertAuthUser,
  verifyPassword,
  type AuthedRequest,
} from './auth';

const app = express();
const PORT = Number(process.env.PORT || 8000);
const DIST_DIR = resolve(process.cwd(), 'dist');

app.use(express.json({ limit: '25mb' }));

// --- CORS (needed only for dev, when the Vite site runs on a different port) ---
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// small wrapper so async route errors return 500 instead of hanging
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) =>
    fn(req, res).catch((err) => {
      console.error(`${req.method} ${req.path} failed:`, err);
      res.status(500).json({ error: 'internal_error', message: String(err?.message || err) });
    });

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------
app.get(
  '/api/health',
  wrap(async (_req, res) => {
    let db = false;
    try {
      await getPool().query('SELECT 1');
      db = true;
    } catch {
      db = false;
    }
    res.json({ ok: true, db });
  }),
);

// Storefront needs products + display settings only (no financials).
app.get(
  '/api/public/catalog',
  wrap(async (_req, res) => {
    const [products, settings, brands, categories] = await Promise.all([
      getCollectionItems(COLLECTION_BY_KEY['products']),
      getSingleton('settings'),
      getSingleton('brands'),
      getSingleton('categories'),
    ]);
    res.json({ products, settings, masterLists: { brands, categories } });
  }),
);

// Storefront "Get a Quote" — stores a lead without requiring login.
app.post(
  '/api/public/quote',
  wrap(async (req, res) => {
    const q = req.body;
    if (!q || typeof q !== 'object' || !q.id) {
      return res.status(400).json({ error: 'invalid_quotation' });
    }
    await upsertItem(COLLECTION_BY_KEY['quotations'], q);
    res.json({ ok: true, id: q.id });
  }),
);

app.post(
  '/api/auth/login',
  wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });

    const authUser = await findAuthUserByEmail(email);
    if (!authUser || !authUser.active) return res.status(401).json({ error: 'invalid_login' });

    const ok = await verifyPassword(password, authUser.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_login' });

    const profile = await getStaffProfile(authUser.staff_user_id);
    if (!profile) return res.status(500).json({ error: 'missing_profile' });

    const token = signToken({ sub: authUser.staff_user_id, email });
    res.json({ token, user: profile });
  }),
);

// ---------------------------------------------------------------------------
// Authenticated routes
// ---------------------------------------------------------------------------
app.get(
  '/api/auth/me',
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const profile = await getStaffProfile(req.auth!.sub);
    if (!profile) return res.status(404).json({ error: 'not_found' });
    res.json({ user: profile });
  }),
);

app.get(
  '/api/state',
  requireAuth,
  wrap(async (_req, res) => {
    const state = await getAllState();
    res.json(state);
  }),
);

// Create a new staff login (super-admin only). Also creates the RBAC profile.
app.post(
  '/api/admin/users',
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const requester = await getStaffProfile(req.auth!.sub);
    if (!requester || requester.role !== 'super_admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    const { name, email, password, assignedBusiness, permissions, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const normEmail = String(email).trim().toLowerCase();
    if (await findAuthUserByEmail(normEmail)) {
      return res.status(409).json({ error: 'email_exists' });
    }
    const staffId = `usr_${Date.now()}`;
    const staffUser = {
      id: staffId,
      name: String(name),
      email: normEmail,
      role: role === 'super_admin' ? 'super_admin' : 'staff',
      assignedBusiness: assignedBusiness || 'all',
      permissions: permissions || {
        canViewGlobalReports: false,
        canManageAuditConfig: false,
        canManageInventory: true,
        canManagePOS: true,
        canManageExpenses: false,
        canManageCRM: true,
        canManageRBAC: false,
      },
    };
    await upsertItem(COLLECTION_BY_KEY['staffUsers'], staffUser);
    await upsertAuthUser({
      id: `auth_${staffId}`,
      email: normEmail,
      passwordHash: await hashPassword(String(password)),
      staffUserId: staffId,
    });
    res.json({ ok: true, user: staffUser });
  }),
);

app.put(
  '/api/collections/:key',
  requireAuth,
  wrap(async (req, res) => {
    const def = COLLECTION_BY_KEY[req.params.key];
    if (!def) return res.status(404).json({ error: 'unknown_collection', key: req.params.key });
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'expected_array' });
    await replaceCollection(def, req.body);
    res.json({ ok: true, key: def.key, count: req.body.length });
  }),
);

app.put(
  '/api/singletons/:key',
  requireAuth,
  wrap(async (req, res) => {
    if (!(SINGLETON_KEYS as readonly string[]).includes(req.params.key))
      return res.status(404).json({ error: 'unknown_singleton', key: req.params.key });
    await setSingleton(req.params.key, req.body);
    res.json({ ok: true, key: req.params.key });
  }),
);

app.put(
  '/api/master-lists/:key',
  requireAuth,
  wrap(async (req, res) => {
    if (!(MASTER_LIST_KEYS as readonly string[]).includes(req.params.key))
      return res.status(404).json({ error: 'unknown_master_list', key: req.params.key });
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'expected_array' });
    await setSingleton(req.params.key, req.body);
    res.json({ ok: true, key: req.params.key, count: req.body.length });
  }),
);

// --- Serve the built frontend (production) with SPA fallback ---------------
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(resolve(DIST_DIR, 'index.html'));
  });
  console.log(`Serving frontend from ${DIST_DIR}`);
} else {
  console.log('No dist/ build found — running API only (use `npm run build` for production).');
}

app.listen(PORT, () => {
  console.log(`Amanat API listening on http://localhost:${PORT}`);
});
