import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);

// server/src/import-electronics.ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

// server/src/repo.ts
function parseData(raw) {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
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
async function getSingleton(name) {
  const [rows] = await getPool().query(
    `SELECT data FROM app_singletons WHERE name = ? LIMIT 1`,
    [name]
  );
  return rows.length ? parseData(rows[0].data) : null;
}
async function setSingleton(name, data, exec) {
  const runner = exec ?? getPool();
  await runner.query(
    `INSERT INTO app_singletons (name, data) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [name, JSON.stringify(data ?? null)]
  );
}

// server/src/import-electronics.ts
var uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
async function run() {
  const file = resolve(process.cwd(), "src", "data", "electronicsProducts.json");
  const products = JSON.parse(readFileSync(file, "utf8"));
  console.log(`Loaded ${products.length} products from ${file}`);
  await replaceCollection(COLLECTION_BY_KEY["products"], products);
  console.log(`\u2713 products collection replaced (${products.length} rows)`);
  const existingBrands = await getSingleton("brands") || [];
  const existingCats = await getSingleton("categories") || [];
  const brands = uniq([...products.map((p) => p.brand), ...existingBrands]);
  const categories = uniq([...products.map((p) => p.category), ...existingCats]);
  await setSingleton("brands", brands);
  await setSingleton("categories", categories);
  console.log(`\u2713 master lists refreshed (${brands.length} brands, ${categories.length} categories)`);
}
run().then(async () => {
  await closePool();
  console.log("\nImport complete. Amanot Electronics catalogue is live.");
  process.exit(0);
}).catch(async (err) => {
  await closePool();
  console.error("Import failed:", err);
  process.exit(1);
});
