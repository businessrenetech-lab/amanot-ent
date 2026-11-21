import assert from 'node:assert/strict';
import test from 'node:test';
import type { Product } from '../types';
import { HAIER_PRODUCTS, mergeHaierCatalog, needsHaierImport, markHaierImported } from './haierCatalog';
import { buildCashMemo } from './invoicePdfExport';
import { DEFAULT_BRAND_LOGOS } from '../data/brandLogos';

test('Haier catalogue: all Amanat Enterprise, brand Haier, sane prices', () => {
  assert.equal(HAIER_PRODUCTS.length, 80);
  assert.equal(new Set(HAIER_PRODUCTS.map((p) => p.id)).size, HAIER_PRODUCTS.length);
  for (const p of HAIER_PRODUCTS) {
    assert.equal(p.business, 'amanot_enterprise');
    assert.equal(p.brand, 'Haier');
    assert.ok(p.costPrice > 0 && p.costPrice <= p.wholesalePrice && p.wholesalePrice <= p.retailPrice, p.sku);
  }
});

test('merge adds missing Haier products once and keeps existing ones untouched', () => {
  const existing = { ...HAIER_PRODUCTS[0], id: 'custom_id', stockQty: 7, retailPrice: 1 } as Product;
  const { products, added } = mergeHaierCatalog([existing]);
  assert.equal(added, HAIER_PRODUCTS.length - 1); // matched by model, not duplicated
  assert.equal(products[0], existing);
  assert.equal(mergeHaierCatalog(products).added, 0);
});

test('import tag gates the merge', () => {
  assert.equal(needsHaierImport(undefined), true);
  assert.equal(needsHaierImport(markHaierImported({})), false);
});

const invoice = (business: 'amanot_enterprise' | 'amanot_electronics') =>
  ({
    id: 'INV-T-1',
    business,
    customerName: 'Test',
    customerPhone: '01700000000',
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    amountPaid: 0,
    dueAmount: 0,
    paymentMethod: 'cash',
    status: 'paid',
    createdAt: '2026-11-21T00:00:00.000Z',
    createdByStaffName: 'Admin'
  }) as any;

test('Enterprise cash memo: fixed address/phone and Haier logo only', () => {
  const stale = { amanotEnterpriseAddress: 'Old address', amanotEnterprisePhone: '000' };
  const { html } = buildCashMemo(invoice('amanot_enterprise'), stale);
  assert.ok(html.includes('Godown Quarter, Rail Gate, Feni.'));
  assert.ok(html.includes('01740639192, 01841950117'));
  assert.ok(!html.includes('Old address'));
  assert.ok(html.includes(DEFAULT_BRAND_LOGOS.haier));
  for (const other of ['konka', 'gree', 'haiko']) assert.ok(!html.includes(DEFAULT_BRAND_LOGOS[other]), other);
});

test('Electronics cash memo still shows Konka, Gree, Haiko and not Haier', () => {
  const { html } = buildCashMemo(invoice('amanot_electronics'), {});
  for (const k of ['konka', 'gree', 'haiko']) assert.ok(html.includes(DEFAULT_BRAND_LOGOS[k]), k);
  assert.ok(!html.includes(DEFAULT_BRAND_LOGOS.haier));
});
