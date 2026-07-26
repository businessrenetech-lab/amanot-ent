import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Product-wise sales aggregation used by the Tax / Audit report.
 *
 * The original implementation seeded the map from `products.slice(0, maxProds)`
 * and only counted a sale when `map[item.productId]` already existed. With a
 * 353-product catalogue and a cap of 20 that silently discarded the sales of
 * 333 products, so the product report never reconciled with audited sales.
 */

interface Line {
  productId: string;
  productName: string;
  brand: string;
  category: string;
  quantity: number;
  costPrice: number;
  total: number;
}

interface Row {
  id: string;
  name: string;
  brand: string;
  category: string;
  qtySold: number;
  revenue: number;
  cogs: number;
  netProfit: number;
}

/** The fixed aggregation: driven by sales, capped last, sold-only. */
function aggregate(
  sales: { items: Line[] }[],
  opts: { maxProducts?: number; allowedCategories?: string[]; allowedBrands?: string[] } = {}
): Row[] {
  const map: Record<string, Row> = {};

  sales.forEach((s) => {
    s.items.forEach((item) => {
      if (!map[item.productId]) {
        map[item.productId] = {
          id: item.productId,
          name: item.productName,
          brand: item.brand,
          category: item.category,
          qtySold: 0,
          revenue: 0,
          cogs: 0,
          netProfit: 0
        };
      }
      const c = item.costPrice * item.quantity;
      map[item.productId].qtySold += item.quantity;
      map[item.productId].revenue += item.total;
      map[item.productId].cogs += c;
      map[item.productId].netProfit += item.total - c;
    });
  });

  let list = Object.values(map).filter((p) => p.qtySold > 0);

  if (opts.allowedCategories?.length) {
    list = list.filter((p) => opts.allowedCategories!.includes(p.category));
  }
  if (opts.allowedBrands?.length) {
    list = list.filter((p) => opts.allowedBrands!.includes(p.brand));
  }

  list.sort((a, b) => b.revenue - a.revenue || b.qtySold - a.qtySold);

  const max = opts.maxProducts ?? 20;
  if (max > 0 && list.length > max) list = list.slice(0, max);
  return list;
}

const line = (id: string, qty: number, unit: number, cost: number, extra?: Partial<Line>): Line => ({
  productId: id,
  productName: `Product ${id}`,
  brand: 'Gree',
  category: 'Air Conditioner',
  quantity: qty,
  costPrice: cost,
  total: qty * unit,
  ...extra
});

test('counts a sale of a product that sits beyond the display cap', () => {
  // p999 would have been item 300 in the catalogue — previously dropped entirely
  const sales = [{ items: [line('p999', 2, 60000, 50000)] }];
  const rows = aggregate(sales, { maxProducts: 20 });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'p999');
  assert.equal(rows[0].qtySold, 2);
  assert.equal(rows[0].revenue, 120000);
});

test('product revenue reconciles with total audited sales', () => {
  const sales = [
    { items: [line('a', 1, 50000, 40000), line('b', 2, 30000, 25000)] },
    { items: [line('c', 3, 10000, 8000)] }
  ];
  const invoiceTotal = sales.reduce(
    (sum, s) => sum + s.items.reduce((t, i) => t + i.total, 0),
    0
  );
  const reportTotal = aggregate(sales, { maxProducts: 0 }).reduce((sum, r) => sum + r.revenue, 0);

  assert.equal(invoiceTotal, 140000);
  assert.equal(reportTotal, invoiceTotal, 'product report must reconcile with audited sales');
});

test('the cap keeps the top sellers by revenue, not an arbitrary slice', () => {
  const sales = [
    {
      items: [
        line('low', 1, 1000, 500),
        line('high', 1, 900000, 500000),
        line('mid', 1, 50000, 40000)
      ]
    }
  ];
  const rows = aggregate(sales, { maxProducts: 2 });
  assert.deepEqual(rows.map((r) => r.id), ['high', 'mid']);
});

test('products that never sold are excluded', () => {
  const rows = aggregate([{ items: [line('sold', 1, 5000, 4000)] }], { maxProducts: 0 });
  assert.deepEqual(rows.map((r) => r.id), ['sold']);
  assert.ok(rows.every((r) => r.qtySold > 0));
});

test('quantities and cost accumulate across separate invoices', () => {
  const sales = [
    { items: [line('x', 2, 10000, 7000)] },
    { items: [line('x', 3, 10000, 7000)] }
  ];
  const [row] = aggregate(sales, { maxProducts: 0 });

  assert.equal(row.qtySold, 5);
  assert.equal(row.revenue, 50000);
  assert.equal(row.cogs, 35000);
  assert.equal(row.netProfit, 15000);
});

test('category and brand scoping still filter the audit list', () => {
  const sales = [
    {
      items: [
        line('ac', 1, 60000, 50000),
        line('tv', 1, 40000, 30000, { brand: 'Konka', category: 'LED TV' })
      ]
    }
  ];

  assert.deepEqual(
    aggregate(sales, { maxProducts: 0, allowedCategories: ['LED TV'] }).map((r) => r.id),
    ['tv']
  );
  assert.deepEqual(
    aggregate(sales, { maxProducts: 0, allowedBrands: ['Gree'] }).map((r) => r.id),
    ['ac']
  );
});

test('a sale of a since-deleted product still counts, using the invoice snapshot', () => {
  const sales = [{ items: [line('deleted-prod', 1, 25000, 20000)] }];
  const [row] = aggregate(sales, { maxProducts: 0 });

  assert.equal(row.name, 'Product deleted-prod');
  assert.equal(row.revenue, 25000);
});
