// ============================================================================
// Seed script — imports the existing frontend seed data (src/data/initialData.ts)
// into MySQL. Idempotent: each run replaces the seeded collections.
//   Run:  npm run db:seed   (after npm run db:migrate)
//
// This is the "import previous db setups under ts file" step: the same objects
// the app used to bootstrap localStorage now become the initial database rows.
// ============================================================================
import 'dotenv/config';
import {
  INITIAL_STAFF_USERS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_EXPENSES,
  INITIAL_SALES,
  INITIAL_INSTALLMENT_PLANS,
  INITIAL_QUOTATIONS,
  INITIAL_SUPPLIER_REQUISITIONS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SMS_LOGS,
  INITIAL_AUDIT_CONFIG,
  INITIAL_APP_SETTINGS,
} from '../../src/data/initialData';
import { COLLECTION_BY_KEY } from './collections';
import { replaceCollection, setSingleton } from './repo';
import { closePool } from './db';

// Master-list defaults mirror the fallbacks in AppContext.tsx so a fresh DB
// starts with the same dropdown options the app has always shown.
const BRAND_DEFAULTS = ['Gree', 'Konka', 'Haiko', 'Haier', 'Singer', 'Samsung', 'Walton', 'LG', 'Vision', 'Chigo'];
const CATEGORY_DEFAULTS = ['Inverter AC', 'Smart LED TV', 'Refrigerator', 'Washing Machine', 'Deep Fridge', 'Microwave Oven', 'Home Appliance'];
const EXPENSE_CATEGORY_DEFAULTS = ['Shop Rent', 'Electricity & Utility', 'Staff Salary & Allowance', 'Transport & Freight', 'Entertainment & Tea', 'Marketing & Promo', 'Repair & Maintenance', 'Legal & License', 'Office Supplies', 'Other'];
const CRM_GROUP_DEFAULTS = ['General', 'VIP Club', 'Wholesale Buyers', 'Installment EMI Clients', 'Website Leads', 'Corporate', 'Inactive'];
const CRM_LEAD_SOURCE_DEFAULTS = ['Showroom Walk-in', 'Website Inquiry', 'Facebook Campaign', 'Phone Call', 'Referral', 'Agent Network'];

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

// key -> seed array (collections with no initial export start empty)
const SEED_COLLECTIONS: Record<string, any[]> = {
  staffUsers: INITIAL_STAFF_USERS,
  products: INITIAL_PRODUCTS,
  customers: INITIAL_CUSTOMERS,
  suppliers: INITIAL_SUPPLIERS,
  sales: INITIAL_SALES,
  installmentPlans: INITIAL_INSTALLMENT_PLANS,
  quotations: INITIAL_QUOTATIONS,
  supplierRequisitions: INITIAL_SUPPLIER_REQUISITIONS,
  purchaseOrders: INITIAL_PURCHASE_ORDERS,
  expenses: INITIAL_EXPENSES,
  smsLogs: INITIAL_SMS_LOGS,
  stockAdjustments: [],
  damageLogs: [],
  supplierReturns: [],
  customerReturns: [],
};

async function seed(): Promise<void> {
  for (const [key, items] of Object.entries(SEED_COLLECTIONS)) {
    const def = COLLECTION_BY_KEY[key];
    if (!def) throw new Error(`Unknown collection key in seed: ${key}`);
    await replaceCollection(def, items);
    console.log(`✓ ${key.padEnd(22)} ${items.length} row(s)`);
  }

  // Singletons
  await setSingleton('settings', INITIAL_APP_SETTINGS);
  await setSingleton('auditConfig', INITIAL_AUDIT_CONFIG);
  console.log('✓ settings + auditConfig');

  // Master lists (defaults + values already present in the seeded products)
  const brands = uniq([...BRAND_DEFAULTS, ...INITIAL_PRODUCTS.map((p) => p.brand)]);
  const categories = uniq([...CATEGORY_DEFAULTS, ...INITIAL_PRODUCTS.map((p) => p.category)]);
  await setSingleton('brands', brands);
  await setSingleton('categories', categories);
  await setSingleton('expenseCategories', EXPENSE_CATEGORY_DEFAULTS);
  await setSingleton('crmGroups', CRM_GROUP_DEFAULTS);
  await setSingleton('crmLeadSources', CRM_LEAD_SOURCE_DEFAULTS);
  console.log(`✓ master lists (${brands.length} brands, ${categories.length} categories)`);
}

seed()
  .then(async () => {
    await closePool();
    console.log('\nSeed complete. Database now mirrors src/data/initialData.ts.');
    process.exit(0);
  })
  .catch(async (err) => {
    await closePool();
    console.error('Seed failed:', err);
    process.exit(1);
  });
