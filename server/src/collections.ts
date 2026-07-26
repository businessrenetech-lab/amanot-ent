// ============================================================================
// Collection registry — the single source of truth shared by the API routes,
// the migrate/seed scripts, and (by key names) the frontend sync layer.
//
// Each collection maps a camelCase state key (as used in AppContext / the
// /api/state payload) to a MySQL table, plus the scalar index columns that get
// pulled out of each object. `id` and the full-object `data` JSON column are
// always present and handled generically in repo.ts.
// ============================================================================

const num = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v)) ? null : v;
const str = (v: unknown) => (v === undefined || v === null ? null : String(v));
const bool = (v: unknown) => (v ? 1 : 0);

export interface IndexColumn {
  col: string;
  get: (o: any) => unknown;
}

export interface CollectionDef {
  /** camelCase key used in the /api/state payload and PUT /api/collections/:key */
  key: string;
  /** MySQL table name */
  table: string;
  /** scalar columns (besides id + data) kept in sync from the object */
  index: IndexColumn[];
}

export const COLLECTIONS: CollectionDef[] = [
  {
    key: 'staffUsers',
    table: 'staff_users',
    index: [
      { col: 'email', get: (o) => str(o.email) },
      { col: 'role', get: (o) => str(o.role) },
    ],
  },
  {
    key: 'products',
    table: 'products',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'sku', get: (o) => str(o.sku) },
      { col: 'brand', get: (o) => str(o.brand) },
      { col: 'category', get: (o) => str(o.category) },
      { col: 'stock_qty', get: (o) => num(o.stockQty) },
      { col: 'retail_price', get: (o) => num(o.retailPrice) },
    ],
  },
  {
    key: 'customers',
    table: 'customers',
    index: [
      { col: 'phone', get: (o) => str(o.phone) },
      { col: 'customer_type', get: (o) => str(o.customerType) },
      { col: 'current_due', get: (o) => num(o.currentDue) },
    ],
  },
  {
    key: 'suppliers',
    table: 'suppliers',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'phone', get: (o) => str(o.phone) },
    ],
  },
  {
    key: 'sales',
    table: 'sales',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'customer_id', get: (o) => str(o.customerId) },
      { col: 'payment_status', get: (o) => str(o.paymentStatus) },
      { col: 'grand_total', get: (o) => num(o.grandTotal) },
      { col: 'is_draft', get: (o) => bool(o.isDraft) },
      { col: 'created_at', get: (o) => str(o.createdAt) },
    ],
  },
  {
    key: 'installmentPlans',
    table: 'installment_plans',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'customer_id', get: (o) => str(o.customerId) },
      { col: 'status', get: (o) => str(o.status) },
    ],
  },
  {
    key: 'quotations',
    table: 'quotations',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'status', get: (o) => str(o.status) },
    ],
  },
  {
    key: 'supplierRequisitions',
    table: 'supplier_requisitions',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'supplier_id', get: (o) => str(o.supplierId) },
      { col: 'status', get: (o) => str(o.status) },
    ],
  },
  {
    key: 'purchaseOrders',
    table: 'purchase_orders',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'supplier_id', get: (o) => str(o.supplierId) },
      { col: 'payment_status', get: (o) => str(o.paymentStatus) },
    ],
  },
  {
    key: 'expenses',
    table: 'expenses',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'category', get: (o) => str(o.category) },
      { col: 'amount', get: (o) => num(o.amount) },
      { col: 'expense_date', get: (o) => str(o.date) },
    ],
  },
  {
    key: 'smsLogs',
    table: 'sms_logs',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'type', get: (o) => str(o.type) },
      { col: 'status', get: (o) => str(o.status) },
    ],
  },
  {
    key: 'stockAdjustments',
    table: 'stock_adjustments',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'product_id', get: (o) => str(o.productId) },
      { col: 'adjustment_type', get: (o) => str(o.adjustmentType) },
    ],
  },
  {
    key: 'damageLogs',
    table: 'damage_logs',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'product_id', get: (o) => str(o.productId) },
    ],
  },
  {
    key: 'supplierReturns',
    table: 'supplier_returns',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'supplier_id', get: (o) => str(o.supplierId) },
    ],
  },
  {
    key: 'accounts',
    table: 'accounts',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'type', get: (o) => str(o.type) },
    ],
  },
  {
    key: 'accountTransfers',
    table: 'account_transfers',
    index: [
      { col: 'business', get: (o) => str(o.business) },
    ],
  },
  {
    key: 'supplierPayments',
    table: 'supplier_payments',
    index: [
      { col: 'business', get: (o) => str(o.business) },
      { col: 'supplier_id', get: (o) => str(o.supplierId) },
    ],
  },
];

export const COLLECTION_BY_KEY: Record<string, CollectionDef> = Object.fromEntries(
  COLLECTIONS.map((c) => [c.key, c]),
);

/** Singleton objects stored in app_singletons (one JSON object each). */
export const SINGLETON_KEYS = ['settings', 'auditConfig'] as const;

/** Master lists stored in app_singletons (one JSON array of strings each). */
export const MASTER_LIST_KEYS = [
  'brands',
  'categories',
  'expenseCategories',
  'crmGroups',
  'crmLeadSources',
] as const;

export type SingletonKey = (typeof SINGLETON_KEYS)[number];
export type MasterListKey = (typeof MASTER_LIST_KEYS)[number];
