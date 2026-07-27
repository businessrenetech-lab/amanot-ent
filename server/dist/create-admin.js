import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);

// server/src/create-admin.ts
import "dotenv/config";

// server/src/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
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

// server/src/repo.ts
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

// server/src/auth.ts
var JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-amanat";
var TOKEN_TTL = process.env.JWT_TTL || "30d";
var STAFF_DEF = COLLECTION_BY_KEY["staffUsers"];
async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
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

// server/src/create-admin.ts
var EMAIL = (process.env.ADMIN_EMAIL || "admin@amanatgroup.com").toLowerCase();
var PASSWORD = process.env.ADMIN_PASSWORD || "JJstmg3xpt9@!";
var NAME = process.env.ADMIN_NAME || "Amanat Admin (Owner)";
var STAFF_ID = process.env.ADMIN_STAFF_ID || "usr_amanat_owner";
async function run() {
  const staffUser = {
    id: STAFF_ID,
    name: NAME,
    email: EMAIL,
    role: "super_admin",
    assignedBusiness: "all",
    permissions: {
      canViewGlobalReports: true,
      canManageAuditConfig: true,
      canManageInventory: true,
      canManagePOS: true,
      canManageExpenses: true,
      canManageCRM: true,
      canManageRBAC: true
    }
  };
  await upsertItem(COLLECTION_BY_KEY["staffUsers"], staffUser);
  console.log(`\u2713 StaffUser profile ready: ${STAFF_ID}`);
  const passwordHash = await hashPassword(PASSWORD);
  await upsertAuthUser({
    id: `auth_${STAFF_ID}`,
    email: EMAIL,
    passwordHash,
    staffUserId: STAFF_ID
  });
  console.log(`\u2713 Login ready: ${EMAIL}`);
}
run().then(async () => {
  await closePool();
  console.log("\nAdmin account is ready. You can now log in at /login.");
  process.exit(0);
}).catch(async (err) => {
  await closePool();
  console.error("create-admin failed:", err);
  process.exit(1);
});
