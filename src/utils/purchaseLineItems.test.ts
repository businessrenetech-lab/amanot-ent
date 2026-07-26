import assert from 'node:assert/strict';
import test from 'node:test';
import { PurchaseOrder } from '../types';

/**
 * Flattening used by the purchase reports so every PO number and every
 * purchased product line is listed, rather than a per-PO item count only.
 */
function flatten(orders: PurchaseOrder[]) {
  return orders.flatMap((po) =>
    po.items.map((item, idx) => ({
      key: `${po.id}_${idx}`,
      poId: po.id,
      date: po.createdAt,
      supplierName: po.supplierName,
      business: po.business,
      paymentStatus: po.paymentStatus,
      productName: item.productName,
      sku: item.sku || '',
      brand: item.brand || '',
      category: item.category || '',
      unit: item.unit || 'Pcs',
      quantity: item.quantity,
      costPrice: item.costPrice,
      totalCost: item.totalCost ?? item.quantity * item.costPrice
    }))
  );
}

const po = (
  id: string,
  items: Partial<PurchaseOrder['items'][number]>[],
  extra?: Partial<PurchaseOrder>
): PurchaseOrder => ({
  id,
  business: 'amanot_electronics',
  supplierId: 'sup1',
  supplierName: 'Electro Mart',
  items: items.map((i) => ({
    productId: i.productId || 'p1',
    productName: i.productName || 'Product',
    quantity: i.quantity ?? 1,
    costPrice: i.costPrice ?? 1000,
    totalCost: i.totalCost ?? (i.quantity ?? 1) * (i.costPrice ?? 1000),
    ...i
  })),
  totalCost: 0,
  paidAmount: 0,
  paymentStatus: 'due',
  createdAt: '2026-07-01',
  ...extra
});

test('every PO number appears, once per purchased product', () => {
  const rows = flatten([
    po('PO-1', [{ productName: 'AC' }, { productName: 'Fridge' }]),
    po('PO-2', [{ productName: 'TV' }])
  ]);

  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.poId), ['PO-1', 'PO-1', 'PO-2']);
  assert.deepEqual(rows.map((r) => r.productName), ['AC', 'Fridge', 'TV']);
});

test('line totals reconcile with the sum of the POs', () => {
  const orders = [
    po('PO-1', [
      { productName: 'AC', quantity: 2, costPrice: 50000 },
      { productName: 'Fridge', quantity: 1, costPrice: 40000 }
    ]),
    po('PO-2', [{ productName: 'TV', quantity: 3, costPrice: 20000 }])
  ];
  const rows = flatten(orders);

  assert.equal(rows.reduce((s, r) => s + r.totalCost, 0), 200000);
  assert.equal(rows.reduce((s, r) => s + r.quantity, 0), 6);
});

test('each row carries its PO context for the report columns', () => {
  const [row] = flatten([
    po('PO-9', [{ productName: 'AC', sku: 'GS-24', brand: 'Gree', category: 'Air Conditioner', unit: 'Set' }], {
      supplierName: 'Gree BD',
      paymentStatus: 'partial',
      createdAt: '2026-07-15'
    })
  ]);

  assert.equal(row.poId, 'PO-9');
  assert.equal(row.supplierName, 'Gree BD');
  assert.equal(row.paymentStatus, 'partial');
  assert.equal(row.date, '2026-07-15');
  assert.equal(row.sku, 'GS-24');
  assert.equal(row.brand, 'Gree');
  assert.equal(row.category, 'Air Conditioner');
  assert.equal(row.unit, 'Set');
});

test('missing optional fields fall back without blanking the row', () => {
  const [row] = flatten([po('PO-3', [{ productName: 'Generic Item' }])]);
  assert.equal(row.unit, 'Pcs');
  assert.equal(row.brand, '');
  assert.equal(row.sku, '');
  assert.equal(row.totalCost, 1000);
});

test('a line total is derived when the PO omits it', () => {
  const [row] = flatten([
    po('PO-4', [{ productName: 'X', quantity: 4, costPrice: 250, totalCost: undefined }])
  ]);
  assert.equal(row.totalCost, 1000);
});

test('keys are unique so repeated products in one PO both render', () => {
  const rows = flatten([
    po('PO-5', [
      { productId: 'same', productName: 'Same Product', quantity: 1 },
      { productId: 'same', productName: 'Same Product', quantity: 2 }
    ])
  ]);

  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((r) => r.key)).size, 2);
});

test('no purchase orders yields an empty list, not an error', () => {
  assert.deepEqual(flatten([]), []);
});
