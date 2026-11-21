import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDashboard, dayKey } from './dashboardData';

const now = new Date(2026, 10, 21, 15, 0); // 21 Nov 2026, 3 pm local
const at = (d: number, m = 10) => new Date(2026, m, d, 11, 0).toISOString();

const sale = (o: any) => ({
  id: o.id, business: o.business || 'amanot_electronics', customerId: 'c', customerName: 'C', customerPhone: '', customerAddress: '',
  items: o.items || [{ productId: 'p1', productName: 'AC', brand: 'Gree', category: 'Air Conditioner', quantity: 1, priceType: 'retail', unitPrice: o.total, costPrice: 0, discount: 0, total: o.total }],
  subtotal: o.total, discountTotal: 0, taxAmount: 0, grandTotal: o.total, totalCost: o.cost || 0, paidAmount: o.paid ?? o.total,
  dueAmount: 0, paymentMode: 'cash', paymentStatus: o.draft ? 'draft' : 'paid', isInstallment: false, smsSent: false,
  onlineReceiptUrl: '', createdByStaffId: '', createdByStaffName: '', createdAt: o.at, isDraft: o.draft, returnedAmount: o.returned
}) as any;

const base = {
  products: [
    { id: 'p1', business: 'amanot_electronics', category: 'Air Conditioner', stockQty: 2, minStockAlert: 3, costPrice: 100, retailPrice: 150 },
    { id: 'p2', business: 'amanot_enterprise', category: 'LED TV', stockQty: 0, minStockAlert: 1, costPrice: 50, retailPrice: 80 },
    { id: 'p3', business: 'amanot_enterprise', category: 'LED TV', stockQty: 10, minStockAlert: 1, costPrice: 50, retailPrice: 80 }
  ] as any[],
  customers: [
    { id: 'c1', customerType: 'regular', currentDue: 500, createdAt: at(2) },
    { id: 'c2', customerType: 'walk_in', currentDue: 0, createdAt: at(1, 5) }
  ] as any[],
  quotations: [{ business: 'amanot_electronics', status: 'sent', source: 'website_inquiry', totalAmount: 900 }] as any[],
  expenses: [], customerReturns: [], now, range: '14d' as const
};

test('today, yesterday and month totals skip drafts and subtract returns', () => {
  const sales = [
    sale({ id: 'a', total: 1000, cost: 600, at: at(21) }),
    sale({ id: 'b', total: 400, at: at(21), draft: true }),
    sale({ id: 'c', total: 500, at: at(20), returned: 100 }),
    sale({ id: 'd', total: 700, business: 'amanot_enterprise', at: at(3) }),
    sale({ id: 'e', total: 999, at: at(15, 9) })
  ];
  const plans = [{ business: 'amanot_electronics', status: 'active', schedule: [
    { installmentNo: 1, dueDate: at(10), amount: 300, status: 'due' },
    { installmentNo: 2, dueDate: at(25), amount: 300, status: 'due' },
    { installmentNo: 3, dueDate: at(1), amount: 200, status: 'paid', paidAmount: 200, paidDate: at(21) }
  ] }] as any[];
  const d = buildDashboard({ ...base, sales, installmentPlans: plans, scope: 'all' });
  assert.equal(d.today.total, 1000);
  assert.equal(d.today.count, 1);
  assert.equal(d.today.collected, 1200); // 1000 on sales + 200 installment
  assert.equal(d.yesterday.total, 400);
  assert.equal(d.month.total, 2100);
  assert.equal(d.lastMonth.total, 999);
  assert.equal(d.month.profit, 2100 - 600);
  assert.equal(d.emi.overdueAmount, 300);
  assert.equal(d.emi.dueSoonAmount, 300);
  assert.equal(d.trend.length, 14);
  assert.equal(d.trend[13].key, dayKey(now));
  assert.equal(d.trend[13].value, 1000);
  assert.equal(d.dues.total, 500);
  assert.equal(d.customers.newThisMonth, 1);
  assert.equal(d.quotes.website, 1);
});

test('stock figures and business scope', () => {
  const all = buildDashboard({ ...base, sales: [], installmentPlans: [], scope: 'all' });
  assert.equal(all.stock.units, 12);
  assert.equal(all.stock.costValue, 2 * 100 + 10 * 50);
  assert.equal(all.stock.lowCount, 2);
  assert.equal(all.stock.outCount, 1);
  assert.deepEqual(all.stock.lowList.map((p) => p.id), ['p2', 'p1']); // same gap: out of stock first
  assert.deepEqual(all.stock.byCategory.map((c) => c.label), ['LED TV', 'Air Conditioner']);
  const ent = buildDashboard({ ...base, sales: [], installmentPlans: [], scope: 'amanot_enterprise' });
  assert.equal(ent.stock.units, 10);
  assert.equal(ent.quotes.open, 0);
  assert.equal(ent.month.byBusiness.length, 1);
});

test('12-month trend buckets by month', () => {
  const d = buildDashboard({ ...base, sales: [sale({ id: 'x', total: 50, at: at(2, 0) })], installmentPlans: [], scope: 'all', range: '12m' });
  assert.equal(d.trend.length, 12);
  assert.equal(d.trend[1].key, '2026-01');
  assert.equal(d.trend[1].value, 50);
});
