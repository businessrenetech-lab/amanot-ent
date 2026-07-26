import { CustomerReturn, DamageLog, Expense, PurchaseOrder, SaleInvoice } from '../types';

/**
 * Bank-style consolidated statement.
 *
 * Every sale, purchase, expense, customer return and damage write-off in the
 * selected period is folded into one chronological ledger with money-in (credit)
 * and money-out (debit) columns and a running balance, then summarised.
 */

export type StatementEntryType =
  | 'sale'
  | 'purchase'
  | 'expense'
  | 'return'
  | 'damage';

export interface StatementEntry {
  key: string;
  date: string;
  type: StatementEntryType;
  reference: string;
  particulars: string;
  detail: string;
  /** Money in — sales revenue. */
  credit: number;
  /** Money out — purchases, expenses, returns, damage. */
  debit: number;
  /** Cost of goods for a sale line; drives gross profit. */
  cogs: number;
  /** Running balance after this entry. */
  balance: number;
}

export interface StatementTotals {
  totalCredit: number;
  totalDebit: number;
  netMovement: number;

  grossSales: number;
  customerReturns: number;
  referralExpense: number;
  netSales: number;

  totalCOGS: number;
  grossProfit: number;

  totalPurchase: number;
  totalExpense: number;
  totalDamage: number;

  netProfit: number;
  isProfit: boolean;
}

export interface BuildStatementInput {
  sales: SaleInvoice[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  customerReturns?: CustomerReturn[];
  damageLogs?: DamageLog[];
  /** Audit view scales reported profit; defaults to 1 (no adjustment). */
  profitMarginMultiplier?: number;
}

const dateOf = (value: string): string => (value || '').substring(0, 10);

export function buildStatementEntries(input: BuildStatementInput): StatementEntry[] {
  const { sales, purchaseOrders, expenses, customerReturns = [], damageLogs = [] } = input;
  const rows: Omit<StatementEntry, 'balance'>[] = [];

  sales.forEach((s) => {
    const units = s.items.reduce((sum, i) => sum + i.quantity, 0);
    rows.push({
      key: `sale_${s.id}`,
      date: dateOf(s.createdAt),
      type: 'sale',
      reference: s.id,
      particulars: `Sale — ${s.customerName}`,
      detail: `${s.items.length} line${s.items.length === 1 ? '' : 's'} · ${units} pcs · ${s.paymentStatus}`,
      credit: s.grandTotal,
      debit: 0,
      cogs: s.totalCost
    });
  });

  purchaseOrders.forEach((po) => {
    const units = po.items.reduce((sum, i) => sum + i.quantity, 0);
    rows.push({
      key: `po_${po.id}`,
      date: dateOf(po.createdAt),
      type: 'purchase',
      reference: po.id,
      particulars: `Purchase — ${po.supplierName}`,
      detail: `${po.items.length} line${po.items.length === 1 ? '' : 's'} · ${units} pcs · ${po.paymentStatus}`,
      credit: 0,
      debit: po.totalCost,
      cogs: 0
    });
  });

  expenses.forEach((e) => {
    rows.push({
      key: `exp_${e.id}`,
      date: dateOf(e.date),
      type: 'expense',
      reference: e.voucherNo || e.id,
      particulars: `Expense — ${e.title}`,
      detail: e.category + (e.vendorName ? ` · ${e.vendorName}` : ''),
      credit: 0,
      debit: e.amount,
      cogs: 0
    });
  });

  customerReturns.forEach((r) => {
    rows.push({
      key: `ret_${r.id}`,
      date: dateOf(r.createdAt),
      type: 'return',
      reference: r.id,
      particulars: `Sales Return — ${r.customerName}`,
      detail: `Against ${r.invoiceId} · ${r.reason}`,
      credit: 0,
      debit: r.totalRefundAmount,
      cogs: 0
    });
  });

  damageLogs.forEach((d) => {
    rows.push({
      key: `dmg_${d.id}`,
      date: dateOf(d.createdAt),
      type: 'damage',
      reference: d.id,
      particulars: `Damage — ${d.productName}`,
      detail: `${d.quantity} pcs · ${d.cause}`,
      credit: 0,
      debit: d.totalLoss,
      cogs: 0
    });
  });

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference));

  let balance = 0;
  return rows.map((row) => {
    balance += row.credit - row.debit;
    return { ...row, balance };
  });
}

export function buildStatementTotals(input: BuildStatementInput): StatementTotals {
  const {
    sales,
    purchaseOrders,
    expenses,
    customerReturns = [],
    damageLogs = [],
    profitMarginMultiplier = 1
  } = input;

  const grossSales = sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const returns = customerReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
  // Referral payouts are absorbed by the business, so they reduce net sales
  const referralExpense = sales.reduce((sum, s) => sum + (s.specialDiscount || 0), 0);
  const netSales = grossSales - returns - referralExpense;

  const totalCOGS = sales.reduce((sum, s) => sum + s.totalCost, 0);
  const grossProfit = (grossSales - returns - totalCOGS) * profitMarginMultiplier;

  const totalPurchase = purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDamage = damageLogs.reduce((sum, d) => sum + d.totalLoss, 0);

  const netProfit = grossProfit - totalExpense - totalDamage - referralExpense;

  const totalCredit = grossSales;
  const totalDebit = totalPurchase + totalExpense + returns + totalDamage;

  return {
    totalCredit,
    totalDebit,
    netMovement: totalCredit - totalDebit,

    grossSales,
    customerReturns: returns,
    referralExpense,
    netSales,

    totalCOGS,
    grossProfit,

    totalPurchase,
    totalExpense,
    totalDamage,

    netProfit,
    isProfit: netProfit >= 0
  };
}

export const STATEMENT_TYPE_LABEL: Record<StatementEntryType, string> = {
  sale: 'Sale',
  purchase: 'Purchase',
  expense: 'Expense',
  return: 'Return',
  damage: 'Damage'
};
