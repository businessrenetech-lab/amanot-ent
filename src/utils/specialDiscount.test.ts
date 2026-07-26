import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { SaleInvoice } from '../types';

/**
 * The special (referral) discount is internal. The customer pays the full
 * grandTotal; the SP amount is a payout we absorb. These tests lock down both
 * the arithmetic and the rule that it never reaches a customer document.
 */

// ESM: resolve from the project root rather than __dirname
const srcDir = path.resolve(process.cwd(), 'src');

/** Mirrors the POS calculation. */
const computeSpecialDiscount = (
  grandTotal: number,
  mode: 'amount' | 'percent',
  input: number
): number => {
  if (input <= 0) return 0;
  const raw = mode === 'percent' ? (grandTotal * input) / 100 : input;
  return Math.max(0, Math.min(grandTotal, Math.round(raw)));
};

test('percentage mode resolves against the grand total', () => {
  assert.equal(computeSpecialDiscount(98000, 'percent', 3), 2940);
  assert.equal(computeSpecialDiscount(100000, 'percent', 2.5), 2500);
});

test('amount mode is taken literally', () => {
  assert.equal(computeSpecialDiscount(98000, 'amount', 3000), 3000);
});

test('a referral payout can never exceed the sale or go negative', () => {
  assert.equal(computeSpecialDiscount(5000, 'amount', 9000), 5000);
  assert.equal(computeSpecialDiscount(5000, 'percent', 250), 5000);
  assert.equal(computeSpecialDiscount(5000, 'amount', -100), 0);
  assert.equal(computeSpecialDiscount(5000, 'amount', 0), 0);
});

test('the customer still pays the full grand total', () => {
  const subtotal = 100000;
  const customerDiscount = 2000;
  const grandTotal = subtotal - customerDiscount;
  const sp = computeSpecialDiscount(grandTotal, 'amount', 3000);

  assert.equal(grandTotal, 98000, 'grand total must not be reduced by the SP discount');
  assert.equal(grandTotal - sp, 95000, 'net/actual sales is grand total minus the referral payout');
});

test('report split separates regular sales from referral sales', () => {
  const sales = [
    { id: 'A', grandTotal: 50000, specialDiscount: 0 },
    { id: 'B', grandTotal: 120000, specialDiscount: 3000, referralName: 'Karim' },
    { id: 'C', grandTotal: 30000 },
    { id: 'D', grandTotal: 80000, specialDiscount: 1500, referralName: 'Karim' }
  ] as Pick<SaleInvoice, 'id' | 'grandTotal' | 'specialDiscount' | 'referralName'>[];

  const referral = sales.filter((s) => (s.specialDiscount || 0) > 0);
  const regular = sales.filter((s) => (s.specialDiscount || 0) <= 0);

  assert.deepEqual(regular.map((s) => s.id), ['A', 'C']);
  assert.deepEqual(referral.map((s) => s.id), ['B', 'D']);

  const regularRevenue = regular.reduce((sum, s) => sum + s.grandTotal, 0);
  const referralGross = referral.reduce((sum, s) => sum + s.grandTotal, 0);
  const referralExpense = referral.reduce((sum, s) => sum + (s.specialDiscount || 0), 0);

  assert.equal(regularRevenue, 80000);
  assert.equal(referralGross, 200000);
  assert.equal(referralExpense, 4500);
  assert.equal(regularRevenue + referralGross - referralExpense, 275500, 'net sales after referral');
});

test('referral payouts group by the person who earned them', () => {
  const referral = [
    { grandTotal: 120000, specialDiscount: 3000, referralName: 'Karim' },
    { grandTotal: 80000, specialDiscount: 1500, referralName: 'Karim' },
    { grandTotal: 40000, specialDiscount: 800, referralName: '' }
  ];

  const map: Record<string, number> = {};
  referral.forEach((s) => {
    const name = s.referralName?.trim() || 'Unnamed Referral';
    map[name] = (map[name] || 0) + s.specialDiscount;
  });

  assert.equal(map['Karim'], 4500);
  assert.equal(map['Unnamed Referral'], 800);
});

// ---- Leak guard: customer-facing documents must never render the referral ----

const CUSTOMER_DOCUMENTS = [
  'utils/invoicePdfExport.ts',
  'components/receipt/BrandedReceiptModal.tsx',
  'components/receipt/OnlineReceiptView.tsx',
  'components/receipt/InstallmentReceiptModal.tsx'
];

test('no customer document references the special discount or referral name', () => {
  CUSTOMER_DOCUMENTS.forEach((relative) => {
    const source = fs.readFileSync(path.join(srcDir, relative), 'utf8');
    assert.ok(
      !source.includes('specialDiscount'),
      `${relative} must not render specialDiscount — it is internal only`
    );
    assert.ok(
      !source.includes('referralName'),
      `${relative} must not render referralName — it is internal only`
    );
  });
});

test('customer documents still render the customer discount', () => {
  const invoice = fs.readFileSync(path.join(srcDir, 'utils/invoicePdfExport.ts'), 'utf8');
  assert.ok(invoice.includes('discountTotal'), 'customer discount must stay on the invoice');
});

test('the invoice no longer prints a separate Model summary row', () => {
  const invoice = fs.readFileSync(path.join(srcDir, 'utils/invoicePdfExport.ts'), 'utf8');
  assert.ok(!invoice.includes('itemModels'), 'duplicate Model summary row should be gone');
  // the per-line Brand | Model | Cap detail must remain
  assert.ok(invoice.includes('Model:'), 'per-line model detail must remain');
});
