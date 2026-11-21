import type {
  BusinessType,
  Customer,
  CustomerReturn,
  Expense,
  InstallmentPlan,
  PaymentMode,
  Product,
  Quotation,
  SaleInvoice
} from '../../types';

// Pure numbers behind the dashboard, kept apart from the UI so they can be tested.

export type Scope = 'all' | BusinessType;
export type Range = '14d' | '30d' | '12m';

/** Local calendar day, e.g. "2026-11-21". */
export const dayKey = (d: Date | string) => {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const monthKey = (d: Date | string) => dayKey(d).slice(0, 7);

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  bkash_nagad: 'bKash / Nagad',
  installment: 'Installment',
  bank_transfer: 'Bank transfer'
};

const CUSTOMER_TYPE_LABEL: Record<Customer['customerType'], string> = {
  walk_in: 'Walk-in',
  regular: 'Regular',
  wholesale: 'Wholesale',
  vip: 'VIP',
  lead: 'Lead',
  installment: 'Installment',
  inactive: 'Inactive'
};

/** Posted (non-draft) sales only. */
export const isPosted = (s: SaleInvoice) => !s.isDraft && s.paymentStatus !== 'draft';

/** What the sale is worth to us: total less referral payout and returns. */
export const netOf = (s: SaleInvoice) => s.grandTotal - (s.specialDiscount || 0) - (s.returnedAmount || 0);

export interface DashboardInput {
  sales: SaleInvoice[];
  products: Product[];
  customers: Customer[];
  installmentPlans: InstallmentPlan[];
  quotations: Quotation[];
  expenses: Expense[];
  customerReturns: CustomerReturn[];
  scope: Scope;
  now: Date;
  range: Range;
}

export function buildDashboard(input: DashboardInput) {
  const { scope, now } = input;
  const inScope = <T extends { business?: string }>(x: T) => scope === 'all' || x.business === scope;

  const sales = input.sales.filter(isPosted).filter(inScope);
  const products = input.products.filter(inScope);
  const plans = input.installmentPlans.filter(inScope);
  const quotes = input.quotations.filter(inScope);

  const today = dayKey(now);
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const yesterday = dayKey(yest);
  const thisMonth = monthKey(now);
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = monthKey(lm);

  const sum = (list: SaleInvoice[]) => list.reduce((t, s) => t + netOf(s), 0);
  const todays = sales.filter((s) => dayKey(s.createdAt) === today);
  const yesterdays = sales.filter((s) => dayKey(s.createdAt) === yesterday);
  const months = sales.filter((s) => monthKey(s.createdAt) === thisMonth);
  const lastMonths = sales.filter((s) => monthKey(s.createdAt) === lastMonth);

  // Installment money received today.
  let emiCollected = 0;
  for (const p of plans)
    for (const i of p.schedule)
      if (i.paidDate && dayKey(i.paidDate) === today) emiCollected += i.paidAmount ?? i.amount;
  const paidOnSales = todays.reduce((t, s) => t + (s.paidAmount || 0), 0);

  // Month breakdowns
  const byBusiness = (['amanot_electronics', 'amanot_enterprise'] as BusinessType[])
    .filter((b) => scope === 'all' || b === scope)
    .map((business) => ({ business, value: sum(months.filter((s) => s.business === business)) }));

  const payMap = new Map<string, number>();
  for (const s of months) {
    if (s.paymentSplits?.length) for (const sp of s.paymentSplits) add(payMap, sp.paymentMode, sp.amount);
    else if (s.paidAmount) add(payMap, s.paymentMode, s.paidAmount);
  }
  const byPayment = [...payMap.entries()]
    .map(([k, value]) => ({ label: PAYMENT_LABEL[k as PaymentMode] || k, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const prodMap = new Map<string, { label: string; qty: number; value: number }>();
  const catMap = new Map<string, number>();
  let profit = 0;
  for (const s of months) {
    profit += netOf(s) - (s.totalCost || 0) - (s.installationFeeTotal || 0);
    for (const it of s.items) {
      const cur = prodMap.get(it.productId) || { label: it.productName, qty: 0, value: 0 };
      cur.qty += it.quantity;
      cur.value += it.total;
      prodMap.set(it.productId, cur);
      add(catMap, it.category || 'Other', it.total);
    }
  }
  const topProducts = [...prodMap.values()].sort((a, b) => b.qty - a.qty || b.value - a.value).slice(0, 6);
  const byCategory = topWithOther([...catMap.entries()].map(([label, value]) => ({ label, value })), 6);

  // Trend
  const trend = buildTrend(sales, now, input.range);

  // Stock
  let units = 0;
  let costValue = 0;
  let retailValue = 0;
  const stockCat = new Map<string, { units: number; low: number }>();
  for (const p of products) {
    const q = Math.max(0, p.stockQty || 0);
    units += q;
    costValue += q * (p.costPrice || 0);
    retailValue += q * (p.retailPrice || 0);
    const c = stockCat.get(p.category || 'Other') || { units: 0, low: 0 };
    c.units += q;
    if (p.stockQty <= p.minStockAlert) c.low += 1;
    stockCat.set(p.category || 'Other', c);
  }
  const low = products.filter((p) => p.stockQty <= p.minStockAlert);
  const lowList = [...low]
    .sort((a, b) => a.stockQty - a.minStockAlert - (b.stockQty - b.minStockAlert) || a.stockQty - b.stockQty)
    .slice(0, 7)
    .map((p) => ({ ...p, image: p.image || p.images?.[0] }));
  const byStockCategory = [...stockCat.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 12);

  // Customers and dues
  const custList = input.customers; // customers are shared by both businesses
  const owing = custList.filter((c) => (c.currentDue || 0) > 0);
  const typeMap = new Map<string, number>();
  for (const c of custList) add(typeMap, CUSTOMER_TYPE_LABEL[c.customerType] || c.customerType, 1);

  // Installments
  const in7 = new Date(now);
  in7.setDate(now.getDate() + 7);
  let dueSoonAmount = 0;
  let dueSoonCount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  for (const p of plans) {
    if (p.status !== 'active') continue;
    for (const i of p.schedule) {
      if (i.status === 'paid') continue;
      const owed = i.amount - (i.paidAmount || 0);
      const due = dayKey(i.dueDate);
      if (due < today) {
        overdueAmount += owed;
        overdueCount++;
      } else if (due <= dayKey(in7)) {
        dueSoonAmount += owed;
        dueSoonCount++;
      }
    }
  }

  const openQuotes = quotes.filter((q) => q.status === 'draft' || q.status === 'sent');

  return {
    today: { total: sum(todays), count: todays.length, collected: paidOnSales + emiCollected, paidOnSales, emiCollected },
    yesterday: { total: sum(yesterdays) },
    month: { total: sum(months), profit, byBusiness, byPayment, topProducts, byCategory },
    lastMonth: { total: sum(lastMonths) },
    trend: trend.points,
    trendTotal: trend.total,
    trendCount: trend.count,
    dues: { total: owing.reduce((t, c) => t + c.currentDue, 0), count: owing.length },
    stock: {
      units,
      skus: products.length,
      costValue,
      retailValue,
      lowCount: low.length,
      outCount: products.filter((p) => p.stockQty <= 0).length,
      lowList,
      byCategory: byStockCategory
    },
    customers: {
      total: custList.length,
      newThisMonth: custList.filter((c) => c.createdAt && monthKey(c.createdAt) === thisMonth).length,
      byType: [...typeMap.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 5)
    },
    emi: {
      activePlans: plans.filter((p) => p.status === 'active').length,
      dueSoonAmount,
      dueSoonCount,
      overdueAmount,
      overdueCount
    },
    quotes: {
      open: openQuotes.length,
      website: openQuotes.filter((q) => q.source === 'website_inquiry').length,
      value: openQuotes.reduce((t, q) => t + (q.totalAmount || 0), 0)
    },
    recent: [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  };
}

function add(m: Map<string, number>, k: string, v: number) {
  m.set(k, (m.get(k) || 0) + v);
}

function topWithOther(rows: { label: string; value: number }[], n: number) {
  const sorted = rows.sort((a, b) => b.value - a.value);
  if (sorted.length <= n) return sorted;
  const rest = sorted.slice(n - 1).reduce((t, r) => t + r.value, 0);
  return [...sorted.slice(0, n - 1), { label: 'Other', value: rest }];
}

function buildTrend(sales: SaleInvoice[], now: Date, range: Range) {
  const points: { key: string; label: string; short: string; value: number; count: number }[] = [];
  if (range === '12m') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      points.push({
        key: monthKey(d),
        label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        short: d.toLocaleDateString('en-GB', { month: 'short' }),
        value: 0,
        count: 0
      });
    }
  } else {
    const days = range === '14d' ? 14 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      points.push({
        key: dayKey(d),
        label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        short: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        value: 0,
        count: 0
      });
    }
  }
  const idx = new Map(points.map((p, i) => [p.key, i]));
  let total = 0;
  let count = 0;
  for (const s of sales) {
    const k = range === '12m' ? monthKey(s.createdAt) : dayKey(s.createdAt);
    const i = idx.get(k);
    if (i === undefined) continue;
    const v = netOf(s);
    points[i].value += v;
    points[i].count += 1;
    total += v;
    count += 1;
  }
  return { points, total, count };
}
