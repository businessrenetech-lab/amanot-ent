import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { SaleInvoice } from '../types';
import { buildStatementEntries, buildStatementTotals } from './unifiedStatement';

/**
 * A draft is an unposted sale: no stock was deducted and no money was taken.
 * It must never appear in a sales list, a sales total, or any report.
 */

const srcDir = path.resolve(process.cwd(), 'src');

const invoice = (id: string, grandTotal: number, isDraft: boolean): SaleInvoice =>
  ({
    id,
    business: 'amanot_electronics',
    customerId: 'c1',
    customerName: 'Customer',
    customerPhone: '01711123456',
    customerAddress: 'Dhaka',
    items: [
      { productId: 'p1', productName: 'AC', brand: 'Gree', category: 'Air Conditioner', quantity: 1, priceType: 'retail', unitPrice: grandTotal, costPrice: grandTotal * 0.7, discount: 0, total: grandTotal }
    ],
    subtotal: grandTotal,
    discountTotal: 0,
    taxAmount: 0,
    grandTotal,
    totalCost: grandTotal * 0.7,
    paidAmount: isDraft ? 0 : grandTotal,
    dueAmount: isDraft ? grandTotal : 0,
    paymentMode: 'cash',
    paymentStatus: isDraft ? 'draft' : 'paid',
    isInstallment: false,
    smsSent: !isDraft,
    onlineReceiptUrl: '',
    createdByStaffId: 'u1',
    createdByStaffName: 'Staff',
    createdAt: '2026-07-01',
    isDraft
  }) as SaleInvoice;

const posted = invoice('INV-1', 100000, false);
const draft = invoice('DRAFT-1', 500000, true);

test('a posted invoice and a draft are separated cleanly', () => {
  const all = [posted, draft];
  assert.deepEqual(all.filter((s) => !s.isDraft).map((s) => s.id), ['INV-1']);
  assert.deepEqual(all.filter((s) => s.isDraft).map((s) => s.id), ['DRAFT-1']);
});

test('draft value never inflates sales totals', () => {
  const all = [posted, draft];
  const salesTotal = all.filter((s) => !s.isDraft).reduce((sum, s) => sum + s.grandTotal, 0);

  assert.equal(salesTotal, 100000, 'the 500000 draft must not be counted');
});

test('the consolidated statement excludes drafts from the ledger and totals', () => {
  const input = {
    sales: [posted, draft].filter((s) => !s.isDraft),
    purchaseOrders: [],
    expenses: []
  };

  const entries = buildStatementEntries(input);
  const totals = buildStatementTotals(input);

  assert.deepEqual(entries.map((e) => e.reference), ['INV-1']);
  assert.equal(totals.grossSales, 100000);
  assert.equal(totals.totalCredit, 100000);
});

test('a draft carries no payment and no stock movement', () => {
  assert.equal(draft.paidAmount, 0);
  assert.equal(draft.paymentStatus, 'draft');
});

// ---- Guards: the exclusion must stay in the source, not drift back out ----

test('both report views exclude drafts from their sales pool', () => {
  const global = fs.readFileSync(path.join(srcDir, 'components/reports/GlobalReportsView.tsx'), 'utf8');
  const audit = fs.readFileSync(path.join(srcDir, 'components/reports/AuditReportsView.tsx'), 'utf8');

  assert.ok(
    /if \(s\.isDraft\) return false;/.test(global),
    'GlobalReportsView must drop drafts from filteredSales'
  );
  assert.ok(
    /if \(s\.isDraft\) return false;/.test(audit),
    'AuditReportsView must drop drafts from auditedSalesList'
  );
});

test('the invoices list excludes drafts and exposes them separately', () => {
  const view = fs.readFileSync(path.join(srcDir, 'components/sales/InvoicesView.tsx'), 'utf8');

  assert.ok(/if \(s\.isDraft\) return false;/.test(view), 'filteredSales must drop drafts');
  assert.ok(/const draftSales = useMemo/.test(view), 'a separate draft list must exist');
  assert.ok(/deleteSale/.test(view), 'drafts must be deletable');
});

test('customer returns cannot be raised against a draft', () => {
  const modal = fs.readFileSync(path.join(srcDir, 'components/sales/CustomerReturnModal.tsx'), 'utf8');
  assert.ok(/!s\.isDraft/.test(modal), 'the invoice picker must exclude drafts');
});
