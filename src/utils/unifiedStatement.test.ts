import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerReturn, DamageLog, Expense, PurchaseOrder, SaleInvoice } from '../types';
import { buildStatementEntries, buildStatementTotals } from './unifiedStatement';

const sale = (
  id: string,
  createdAt: string,
  grandTotal: number,
  totalCost: number,
  extra: Partial<SaleInvoice> = {}
): SaleInvoice =>
  ({
    id,
    business: 'amanot_electronics',
    customerId: 'c1',
    customerName: 'Customer',
    customerPhone: '01711123456',
    customerAddress: 'Dhaka',
    items: [
      { productId: 'p1', productName: 'AC', brand: 'Gree', category: 'Air Conditioner', quantity: 1, priceType: 'retail', unitPrice: grandTotal, costPrice: totalCost, discount: 0, total: grandTotal }
    ],
    subtotal: grandTotal,
    discountTotal: 0,
    taxAmount: 0,
    grandTotal,
    totalCost,
    paidAmount: grandTotal,
    dueAmount: 0,
    paymentMode: 'cash',
    paymentStatus: 'paid',
    isInstallment: false,
    smsSent: true,
    onlineReceiptUrl: '',
    createdByStaffId: 'u1',
    createdByStaffName: 'Staff',
    createdAt,
    ...extra
  }) as SaleInvoice;

const po = (id: string, createdAt: string, totalCost: number): PurchaseOrder => ({
  id,
  business: 'amanot_electronics',
  supplierId: 's1',
  supplierName: 'Electro Mart',
  items: [{ productId: 'p1', productName: 'AC', quantity: 1, costPrice: totalCost, totalCost }],
  totalCost,
  paidAmount: totalCost,
  paymentStatus: 'paid',
  createdAt
});

const expense = (id: string, date: string, amount: number): Expense =>
  ({ id, business: 'amanot_electronics', category: 'Shop Rent', amount, title: 'Rent', date, paymentMode: 'cash', recordedBy: 'Staff' }) as Expense;

const ret = (id: string, createdAt: string, amount: number): CustomerReturn =>
  ({ id, invoiceId: 'INV-1', business: 'amanot_electronics', customerId: 'c1', customerName: 'Customer', customerPhone: '01711123456', items: [], totalRefundAmount: amount, refundMode: 'cash', restockItems: true, reason: 'Defective', createdBy: 'Staff', createdAt }) as CustomerReturn;

const damage = (id: string, createdAt: string, totalLoss: number): DamageLog =>
  ({ id, business: 'amanot_electronics', productId: 'p1', productName: 'AC', sku: 'X', brand: 'Gree', category: 'Air Conditioner', quantity: 1, unitCost: totalLoss, totalLoss, cause: 'Transit', actionTaken: 'written_off', reportedBy: 'Staff', createdAt }) as DamageLog;

test('every transaction type lands in one ledger, sorted by date', () => {
  const entries = buildStatementEntries({
    sales: [sale('INV-2', '2026-07-10', 50000, 40000)],
    purchaseOrders: [po('PO-1', '2026-07-05', 30000)],
    expenses: [expense('EXP-1', '2026-07-20', 5000)],
    customerReturns: [ret('RET-1', '2026-07-15', 2000)],
    damageLogs: [damage('DMG-1', '2026-07-25', 1000)]
  });

  assert.deepEqual(entries.map((e) => e.type), ['purchase', 'sale', 'return', 'expense', 'damage']);
  assert.deepEqual(entries.map((e) => e.date), [
    '2026-07-05', '2026-07-10', '2026-07-15', '2026-07-20', '2026-07-25'
  ]);
});

test('sales are credits, everything else is a debit', () => {
  const entries = buildStatementEntries({
    sales: [sale('INV-1', '2026-07-01', 50000, 40000)],
    purchaseOrders: [po('PO-1', '2026-07-02', 30000)],
    expenses: [expense('EXP-1', '2026-07-03', 5000)]
  });

  assert.equal(entries[0].credit, 50000);
  assert.equal(entries[0].debit, 0);
  assert.equal(entries[1].debit, 30000);
  assert.equal(entries[2].debit, 5000);
});

test('the running balance accumulates like a bank statement', () => {
  const entries = buildStatementEntries({
    sales: [sale('INV-1', '2026-07-02', 50000, 40000)],
    purchaseOrders: [po('PO-1', '2026-07-01', 30000)],
    expenses: [expense('EXP-1', '2026-07-03', 5000)]
  });

  assert.deepEqual(entries.map((e) => e.balance), [-30000, 20000, 15000]);
});

test('column totals equal the sum of the ledger columns', () => {
  const input = {
    sales: [sale('INV-1', '2026-07-01', 100000, 70000)],
    purchaseOrders: [po('PO-1', '2026-07-01', 30000)],
    expenses: [expense('EXP-1', '2026-07-01', 5000)],
    customerReturns: [ret('RET-1', '2026-07-01', 2000)],
    damageLogs: [damage('DMG-1', '2026-07-01', 1000)]
  };
  const entries = buildStatementEntries(input);
  const totals = buildStatementTotals(input);

  assert.equal(entries.reduce((s, e) => s + e.credit, 0), totals.totalCredit);
  assert.equal(entries.reduce((s, e) => s + e.debit, 0), totals.totalDebit);
  assert.equal(totals.totalCredit, 100000);
  assert.equal(totals.totalDebit, 38000);
  assert.equal(totals.netMovement, 62000);
});

test('the summary figures reconcile down to net profit', () => {
  const totals = buildStatementTotals({
    sales: [sale('INV-1', '2026-07-01', 100000, 70000, { specialDiscount: 3000, referralName: 'Karim' })],
    purchaseOrders: [po('PO-1', '2026-07-01', 30000)],
    expenses: [expense('EXP-1', '2026-07-01', 5000)],
    customerReturns: [ret('RET-1', '2026-07-01', 2000)],
    damageLogs: [damage('DMG-1', '2026-07-01', 1000)]
  });

  assert.equal(totals.grossSales, 100000);
  assert.equal(totals.customerReturns, 2000);
  assert.equal(totals.referralExpense, 3000);
  assert.equal(totals.netSales, 95000);          // 100000 - 2000 - 3000
  assert.equal(totals.totalCOGS, 70000);
  assert.equal(totals.grossProfit, 28000);       // (100000 - 2000) - 70000
  assert.equal(totals.totalPurchase, 30000);
  assert.equal(totals.totalExpense, 5000);
  assert.equal(totals.totalDamage, 1000);
  assert.equal(totals.netProfit, 19000);         // 28000 - 5000 - 1000 - 3000
  assert.equal(totals.isProfit, true);
});

test('a loss is reported as a loss, not a negative profit flag', () => {
  const totals = buildStatementTotals({
    sales: [sale('INV-1', '2026-07-01', 10000, 9000)],
    purchaseOrders: [],
    expenses: [expense('EXP-1', '2026-07-01', 50000)]
  });

  assert.equal(totals.netProfit, -49000);
  assert.equal(totals.isProfit, false);
});

test('the audit profit multiplier scales gross and net profit only', () => {
  const input = {
    sales: [sale('INV-1', '2026-07-01', 100000, 60000)],
    purchaseOrders: [],
    expenses: [expense('EXP-1', '2026-07-01', 10000)],
    profitMarginMultiplier: 0.8
  };
  const totals = buildStatementTotals(input);

  assert.equal(totals.grossSales, 100000, 'gross sales are never scaled');
  assert.equal(totals.grossProfit, 32000, '(100000 - 60000) * 0.8');
  assert.equal(totals.netProfit, 22000, '32000 - 10000');
});

test('purchases do not reduce profit directly — only through COGS', () => {
  const withPurchase = buildStatementTotals({
    sales: [sale('INV-1', '2026-07-01', 100000, 60000)],
    purchaseOrders: [po('PO-1', '2026-07-01', 500000)],
    expenses: []
  });
  const withoutPurchase = buildStatementTotals({
    sales: [sale('INV-1', '2026-07-01', 100000, 60000)],
    purchaseOrders: [],
    expenses: []
  });

  assert.equal(withPurchase.netProfit, withoutPurchase.netProfit);
  assert.equal(withPurchase.totalPurchase, 500000);
  // but it does move the cash balance
  assert.ok(withPurchase.netMovement < withoutPurchase.netMovement);
});

test('an empty period produces zeroes rather than NaN', () => {
  const totals = buildStatementTotals({ sales: [], purchaseOrders: [], expenses: [] });
  Object.entries(totals).forEach(([key, value]) => {
    if (typeof value === 'number') assert.equal(value, 0, `${key} should be 0`);
  });
  assert.deepEqual(buildStatementEntries({ sales: [], purchaseOrders: [], expenses: [] }), []);
});
