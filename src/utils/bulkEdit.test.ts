import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { Product } from '../types';

/**
 * Bulk edit writes straight to the product records, so its pricing maths and
 * its audit trail both matter. These mirror the modal's patch logic.
 */

const srcDir = path.resolve(process.cwd(), 'src');
const safePrice = (value: number) => Math.max(0, Math.round(value));

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    sku: 'GS-24',
    name: 'AC',
    business: 'amanot_electronics',
    brand: 'Gree',
    category: 'Air Conditioner',
    costPrice: 50000,
    retailPrice: 60000,
    wholesalePrice: 58000,
    stockQty: 10,
    minStockAlert: 3,
    unit: 'Set',
    warranty: '1 Year',
    ...over
  }) as Product;

function applyPricing(
  p: Product,
  cfg: {
    retailMode?: 'none' | 'fixed_value' | 'adjust_percent';
    retailValue?: number;
    costMode?: 'none' | 'percent_mrp' | 'fixed_value' | 'adjust_percent';
    costValue?: number;
  }
) {
  const patch: Partial<Product> = {};
  let retail = p.retailPrice;

  if (cfg.retailMode === 'fixed_value' && (cfg.retailValue ?? 0) > 0) {
    retail = safePrice(cfg.retailValue!);
    patch.retailPrice = retail;
  } else if (cfg.retailMode === 'adjust_percent' && cfg.retailValue) {
    retail = safePrice(p.retailPrice * (1 + cfg.retailValue / 100));
    patch.retailPrice = retail;
  }

  if (cfg.costMode === 'percent_mrp') patch.costPrice = safePrice(retail * (1 - (cfg.costValue ?? 0) / 100));
  else if (cfg.costMode === 'fixed_value' && (cfg.costValue ?? 0) > 0) patch.costPrice = safePrice(cfg.costValue!);
  else if (cfg.costMode === 'adjust_percent' && cfg.costValue)
    patch.costPrice = safePrice(p.costPrice * (1 + cfg.costValue / 100));

  return patch;
}

test('a percentage cut never produces a negative price', () => {
  assert.equal(applyPricing(product(), { retailMode: 'adjust_percent', retailValue: -150 }).retailPrice, 0);
  assert.equal(applyPricing(product(), { retailMode: 'adjust_percent', retailValue: -100 }).retailPrice, 0);
  assert.equal(applyPricing(product(), { costMode: 'adjust_percent', costValue: -200 }).costPrice, 0);
});

test('cost derived from MRP uses the newly set retail, not the old one', () => {
  const patch = applyPricing(product(), {
    retailMode: 'fixed_value',
    retailValue: 80000,
    costMode: 'percent_mrp',
    costValue: 10
  });
  assert.equal(patch.retailPrice, 80000);
  assert.equal(patch.costPrice, 72000, 'cost must follow the new 80000 retail, not the old 60000');
});

test('a normal percentage increase still works', () => {
  assert.equal(applyPricing(product(), { retailMode: 'adjust_percent', retailValue: 10 }).retailPrice, 66000);
});

test('below-cost pricing is detectable before applying', () => {
  const p = product();
  const patch = applyPricing(p, { costMode: 'fixed_value', costValue: 99000 });
  const retail = patch.retailPrice ?? p.retailPrice;
  const cost = patch.costPrice ?? p.costPrice;

  assert.ok(cost >= retail, 'this configuration prices below cost');
});

// ---- Audit trail guards ----

const context = fs.readFileSync(path.join(srcDir, 'context/AppContext.tsx'), 'utf8');

test('bulk stock changes are logged as stock adjustments', () => {
  const fn = context.slice(
    context.indexOf('const bulkUpdateProducts'),
    context.indexOf('const bulkDeleteProducts')
  );
  assert.ok(/setStockAdjustments/.test(fn), 'a bulk stock change must write a StockAdjustment record');
  assert.ok(/patch\.stockQty !== undefined/.test(fn), 'only actual stock changes should be logged');
  assert.ok(/adjustmentType: delta > 0 \? 'increase' : 'decrease'/.test(fn), 'direction must be recorded');
});

test('deleting a product that still holds stock writes the loss off', () => {
  const start = context.indexOf('const bulkDeleteProducts');
  const fn = context.slice(start, context.indexOf('const addCustomer =', start));
  assert.ok(/stockQty > 0/.test(fn), 'products holding stock must be detected');
  assert.ok(/setStockAdjustments/.test(fn), 'the write-off must be logged');
  assert.ok(/Product Deleted \(Bulk\)/.test(fn), 'the reason must be identifiable in the audit report');
});

test('the modal warns before applying a below-cost or stock-moving batch', () => {
  const modal = fs.readFileSync(path.join(srcDir, 'components/inventory/BulkEditProductsModal.tsx'), 'utf8');
  assert.ok(/previewImpact/.test(modal), 'an impact preview must exist');
  assert.ok(/belowCost/.test(modal), 'below-cost products must be counted');
  assert.ok(/window\.confirm/.test(modal), 'a below-cost batch must require confirmation');
  assert.ok(/Math\.max\(0, Math\.round/.test(modal), 'prices must be clamped at zero');
});

test('the inventory view flags selected-but-hidden products', () => {
  const view = fs.readFileSync(path.join(srcDir, 'components/inventory/InventoryView.tsx'), 'utf8');
  assert.ok(/hiddenSelectedCount/.test(view), 'hidden selections must be counted');
  assert.ok(/hidden by the current filter/.test(view), 'and surfaced to the operator');
});
