import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);

// server/src/server.ts
import "dotenv/config";
import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// server/src/db.ts
import "dotenv/config";
import mysql from "mysql2/promise";
function dbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD ?? process.env.DB_PASS ?? "",
    database: process.env.DB_NAME || process.env.DB_DATABASE || "amanat_platform",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
    // JSON columns come back already parsed; keep decimals as JS numbers.
    decimalNumbers: true
  };
}
var pool = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig());
  }
  return pool;
}

// server/src/collections.ts
var num = (v) => v === void 0 || v === null || typeof v === "number" && Number.isNaN(v) ? null : v;
var str = (v) => v === void 0 || v === null ? null : String(v);
var bool = (v) => v ? 1 : 0;
var COLLECTIONS = [
  {
    key: "staffUsers",
    table: "staff_users",
    index: [
      { col: "email", get: (o) => str(o.email) },
      { col: "role", get: (o) => str(o.role) }
    ]
  },
  {
    key: "products",
    table: "products",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "sku", get: (o) => str(o.sku) },
      { col: "brand", get: (o) => str(o.brand) },
      { col: "category", get: (o) => str(o.category) },
      { col: "stock_qty", get: (o) => num(o.stockQty) },
      { col: "retail_price", get: (o) => num(o.retailPrice) }
    ]
  },
  {
    key: "customers",
    table: "customers",
    index: [
      { col: "phone", get: (o) => str(o.phone) },
      { col: "customer_type", get: (o) => str(o.customerType) },
      { col: "current_due", get: (o) => num(o.currentDue) }
    ]
  },
  {
    key: "suppliers",
    table: "suppliers",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "phone", get: (o) => str(o.phone) }
    ]
  },
  {
    key: "sales",
    table: "sales",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "customer_id", get: (o) => str(o.customerId) },
      { col: "payment_status", get: (o) => str(o.paymentStatus) },
      { col: "grand_total", get: (o) => num(o.grandTotal) },
      { col: "is_draft", get: (o) => bool(o.isDraft) },
      { col: "created_at", get: (o) => str(o.createdAt) }
    ]
  },
  {
    key: "installmentPlans",
    table: "installment_plans",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "customer_id", get: (o) => str(o.customerId) },
      { col: "status", get: (o) => str(o.status) }
    ]
  },
  {
    key: "quotations",
    table: "quotations",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "status", get: (o) => str(o.status) }
    ]
  },
  {
    key: "supplierRequisitions",
    table: "supplier_requisitions",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "supplier_id", get: (o) => str(o.supplierId) },
      { col: "status", get: (o) => str(o.status) }
    ]
  },
  {
    key: "purchaseOrders",
    table: "purchase_orders",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "supplier_id", get: (o) => str(o.supplierId) },
      { col: "payment_status", get: (o) => str(o.paymentStatus) }
    ]
  },
  {
    key: "expenses",
    table: "expenses",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "category", get: (o) => str(o.category) },
      { col: "amount", get: (o) => num(o.amount) },
      { col: "expense_date", get: (o) => str(o.date) }
    ]
  },
  {
    key: "smsLogs",
    table: "sms_logs",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "type", get: (o) => str(o.type) },
      { col: "status", get: (o) => str(o.status) }
    ]
  },
  {
    key: "stockAdjustments",
    table: "stock_adjustments",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "product_id", get: (o) => str(o.productId) },
      { col: "adjustment_type", get: (o) => str(o.adjustmentType) }
    ]
  },
  {
    key: "damageLogs",
    table: "damage_logs",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "product_id", get: (o) => str(o.productId) }
    ]
  },
  {
    key: "supplierReturns",
    table: "supplier_returns",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "supplier_id", get: (o) => str(o.supplierId) }
    ]
  },
  {
    key: "customerReturns",
    table: "customer_returns",
    index: [
      { col: "invoice_id", get: (o) => str(o.invoiceId) },
      { col: "business", get: (o) => str(o.business) },
      { col: "customer_id", get: (o) => str(o.customerId) }
    ]
  },
  {
    key: "accounts",
    table: "accounts",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "type", get: (o) => str(o.type) }
    ]
  },
  {
    key: "accountTransfers",
    table: "account_transfers",
    index: [
      { col: "business", get: (o) => str(o.business) }
    ]
  },
  {
    key: "supplierPayments",
    table: "supplier_payments",
    index: [
      { col: "business", get: (o) => str(o.business) },
      { col: "supplier_id", get: (o) => str(o.supplierId) }
    ]
  }
];
var COLLECTION_BY_KEY = Object.fromEntries(
  COLLECTIONS.map((c) => [c.key, c])
);
var SINGLETON_KEYS = ["settings", "auditConfig"];
var MASTER_LIST_KEYS = [
  "brands",
  "categories",
  "expenseCategories",
  "crmGroups",
  "crmLeadSources"
];

// server/src/repo.ts
function parseData(raw) {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}
async function getAllState() {
  const pool2 = getPool();
  const state = {};
  for (const def of COLLECTIONS) {
    const [rows] = await pool2.query(
      `SELECT data FROM \`${def.table}\` ORDER BY updated_at ASC, id ASC`
    );
    state[def.key] = rows.map((r) => parseData(r.data));
  }
  const [singRows] = await pool2.query(`SELECT name, data FROM app_singletons`);
  const singMap = {};
  for (const r of singRows) singMap[r.name] = parseData(r.data);
  for (const k of SINGLETON_KEYS) {
    if (singMap[k] !== void 0) state[k] = singMap[k];
  }
  const masterLists = {};
  for (const k of MASTER_LIST_KEYS) {
    if (singMap[k] !== void 0) masterLists[k] = singMap[k];
  }
  state.masterLists = masterLists;
  return state;
}
async function replaceCollection(def, items) {
  const pool2 = getPool();
  const conn = await pool2.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM \`${def.table}\``);
    if (Array.isArray(items) && items.length > 0) {
      const cols = ["id", ...def.index.map((i) => i.col), "data"];
      const colList = cols.map((c) => `\`${c}\``).join(", ");
      const CHUNK = 200;
      for (let start = 0; start < items.length; start += CHUNK) {
        const slice = items.slice(start, start + CHUNK);
        const placeholders = slice.map(() => `(${cols.map(() => "?").join(", ")})`).join(", ");
        const values = [];
        for (const o of slice) {
          values.push(o.id, ...def.index.map((i) => i.get(o)), JSON.stringify(o));
        }
        await conn.query(
          `INSERT INTO \`${def.table}\` (${colList}) VALUES ${placeholders}`,
          values
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
async function getCollectionItems(def) {
  const [rows] = await getPool().query(
    `SELECT data FROM \`${def.table}\` ORDER BY updated_at ASC, id ASC`
  );
  return rows.map((r) => parseData(r.data));
}
async function getSingleton(name) {
  const [rows] = await getPool().query(
    `SELECT data FROM app_singletons WHERE name = ? LIMIT 1`,
    [name]
  );
  return rows.length ? parseData(rows[0].data) : null;
}
async function getItemById(def, id) {
  const [rows] = await getPool().query(
    `SELECT data FROM \`${def.table}\` WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows.length ? parseData(rows[0].data) : null;
}
async function upsertItem(def, obj) {
  const cols = ["id", ...def.index.map((i) => i.col), "data"];
  const colList = cols.map((c) => `\`${c}\``).join(", ");
  const placeholders = cols.map(() => "?").join(", ");
  const updates = [...def.index.map((i) => i.col), "data"].map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(", ");
  const values = [obj.id, ...def.index.map((i) => i.get(obj)), JSON.stringify(obj)];
  await getPool().query(
    `INSERT INTO \`${def.table}\` (${colList}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    values
  );
}
async function setSingleton(name, data, exec) {
  const runner = exec ?? getPool();
  await runner.query(
    `INSERT INTO app_singletons (name, data) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [name, JSON.stringify(data ?? null)]
  );
}

// server/src/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-amanat";
var TOKEN_TTL = process.env.JWT_TTL || "30d";
var STAFF_DEF = COLLECTION_BY_KEY["staffUsers"];
async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
async function findAuthUserByEmail(email) {
  const [rows] = await getPool().query(
    `SELECT * FROM auth_users WHERE email = ? LIMIT 1`,
    [email.trim().toLowerCase()]
  );
  return rows.length ? rows[0] : null;
}
async function upsertAuthUser(params) {
  await getPool().query(
    `INSERT INTO auth_users (id, email, password_hash, staff_user_id, active)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       staff_user_id = VALUES(staff_user_id),
       active = 1`,
    [params.id, params.email.trim().toLowerCase(), params.passwordHash, params.staffUserId]
  );
}
async function getStaffProfile(staffUserId) {
  return getItemById(STAFF_DEF, staffUserId);
}
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  req.auth = payload;
  next();
}

// server/src/server.ts
var app = express();
var PORT = Number(process.env.PORT || 8e3);
var DIST_DIR = resolve(process.cwd(), "dist");
app.use(express.json({ limit: "25mb" }));
var CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
var wrap = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.error(`${req.method} ${req.path} failed:`, err);
  res.status(500).json({ error: "internal_error", message: String(err?.message || err) });
});
app.get(
  "/api/health",
  wrap(async (_req, res) => {
    let db = false;
    try {
      await getPool().query("SELECT 1");
      db = true;
    } catch {
      db = false;
    }
    res.json({ ok: true, db });
  })
);
app.get(
  "/api/public/catalog",
  wrap(async (_req, res) => {
    const [products, settings, brands, categories] = await Promise.all([
      getCollectionItems(COLLECTION_BY_KEY["products"]),
      getSingleton("settings"),
      getSingleton("brands"),
      getSingleton("categories")
    ]);
    res.json({ products, settings, masterLists: { brands, categories } });
  })
);
app.post(
  "/api/public/quote",
  wrap(async (req, res) => {
    const q = req.body;
    if (!q || typeof q !== "object" || !q.id) {
      return res.status(400).json({ error: "invalid_quotation" });
    }
    await upsertItem(COLLECTION_BY_KEY["quotations"], q);
    res.json({ ok: true, id: q.id });
  })
);
app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ error: "missing_credentials" });
    const authUser = await findAuthUserByEmail(email);
    if (!authUser || !authUser.active) return res.status(401).json({ error: "invalid_login" });
    const ok = await verifyPassword(password, authUser.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid_login" });
    const profile = await getStaffProfile(authUser.staff_user_id);
    if (!profile) return res.status(500).json({ error: "missing_profile" });
    const token = signToken({ sub: authUser.staff_user_id, email });
    res.json({ token, user: profile });
  })
);
app.get(
  "/api/auth/me",
  requireAuth,
  wrap(async (req, res) => {
    const profile = await getStaffProfile(req.auth.sub);
    if (!profile) return res.status(404).json({ error: "not_found" });
    res.json({ user: profile });
  })
);
app.get(
  "/api/state",
  requireAuth,
  wrap(async (_req, res) => {
    const state = await getAllState();
    res.json(state);
  })
);
app.post(
  "/api/admin/users",
  requireAuth,
  wrap(async (req, res) => {
    const requester = await getStaffProfile(req.auth.sub);
    if (!requester || requester.role !== "super_admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    const { name, email, password, assignedBusiness, permissions, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const normEmail = String(email).trim().toLowerCase();
    if (await findAuthUserByEmail(normEmail)) {
      return res.status(409).json({ error: "email_exists" });
    }
    const staffId = `usr_${Date.now()}`;
    const staffUser = {
      id: staffId,
      name: String(name),
      email: normEmail,
      role: role === "super_admin" ? "super_admin" : "staff",
      assignedBusiness: assignedBusiness || "all",
      permissions: permissions || {
        canViewGlobalReports: false,
        canManageAuditConfig: false,
        canManageInventory: true,
        canManagePOS: true,
        canManageExpenses: false,
        canManageCRM: true,
        canManageRBAC: false
      }
    };
    await upsertItem(COLLECTION_BY_KEY["staffUsers"], staffUser);
    await upsertAuthUser({
      id: `auth_${staffId}`,
      email: normEmail,
      passwordHash: await hashPassword(String(password)),
      staffUserId: staffId
    });
    res.json({ ok: true, user: staffUser });
  })
);
app.put(
  "/api/collections/:key",
  requireAuth,
  wrap(async (req, res) => {
    const def = COLLECTION_BY_KEY[req.params.key];
    if (!def) return res.status(404).json({ error: "unknown_collection", key: req.params.key });
    if (!Array.isArray(req.body)) return res.status(400).json({ error: "expected_array" });
    await replaceCollection(def, req.body);
    res.json({ ok: true, key: def.key, count: req.body.length });
  })
);
app.put(
  "/api/singletons/:key",
  requireAuth,
  wrap(async (req, res) => {
    if (!SINGLETON_KEYS.includes(req.params.key))
      return res.status(404).json({ error: "unknown_singleton", key: req.params.key });
    await setSingleton(req.params.key, req.body);
    res.json({ ok: true, key: req.params.key });
  })
);
app.put(
  "/api/master-lists/:key",
  requireAuth,
  wrap(async (req, res) => {
    if (!MASTER_LIST_KEYS.includes(req.params.key))
      return res.status(404).json({ error: "unknown_master_list", key: req.params.key });
    if (!Array.isArray(req.body)) return res.status(400).json({ error: "expected_array" });
    await setSingleton(req.params.key, req.body);
    res.json({ ok: true, key: req.params.key, count: req.body.length });
  })
);
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(resolve(DIST_DIR, "index.html"));
  });
  console.log(`Serving frontend from ${DIST_DIR}`);
} else {
  console.log("No dist/ build found \u2014 running API only (use `npm run build` for production).");
}
app.listen(PORT, () => {
  console.log(`Amanat API listening on http://localhost:${PORT}`);
});
