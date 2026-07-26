import React, { useMemo, useState } from 'react';
import { CustomerReturn, DamageLog, Expense, PurchaseOrder, SaleInvoice } from '../../types';
import {
  buildStatementEntries,
  buildStatementTotals,
  StatementEntryType,
  STATEMENT_TYPE_LABEL
} from '../../utils/unifiedStatement';
import { formatDate } from '../../utils/formatDate';
import { BookOpen, Search, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  sales: SaleInvoice[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  customerReturns?: CustomerReturn[];
  damageLogs?: DamageLog[];
  profitMarginMultiplier?: number;
  periodLabel: string;
  /** Audit view is scaled; say so rather than implying raw figures. */
  adjustedNote?: string;
  accent?: 'purple' | 'indigo';
}

const TYPE_STYLES: Record<StatementEntryType, string> = {
  sale: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  purchase: 'bg-blue-50 text-blue-800 border-blue-200',
  expense: 'bg-rose-50 text-rose-800 border-rose-200',
  return: 'bg-amber-50 text-amber-800 border-amber-200',
  damage: 'bg-slate-100 text-slate-700 border-slate-300'
};

const ALL_TYPES: StatementEntryType[] = ['sale', 'purchase', 'expense', 'return', 'damage'];

export const UnifiedStatementView: React.FC<Props> = ({
  sales,
  purchaseOrders,
  expenses,
  customerReturns = [],
  damageLogs = [],
  profitMarginMultiplier = 1,
  periodLabel,
  adjustedNote,
  accent = 'purple'
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | StatementEntryType>('all');
  const [search, setSearch] = useState('');

  const input = { sales, purchaseOrders, expenses, customerReturns, damageLogs, profitMarginMultiplier };

  const entries = useMemo(
    () => buildStatementEntries(input),
    [sales, purchaseOrders, expenses, customerReturns, damageLogs]
  );

  const totals = useMemo(
    () => buildStatementTotals(input),
    [sales, purchaseOrders, expenses, customerReturns, damageLogs, profitMarginMultiplier]
  );

  // Filtering is display-only — the footer always totals the visible rows,
  // while the summary below always reflects the full period.
  const visible = useMemo(() => {
    let list = entries;
    if (typeFilter !== 'all') list = list.filter((e) => e.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.reference.toLowerCase().includes(q) ||
          e.particulars.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, typeFilter, search]);

  const visibleCredit = visible.reduce((s, e) => s + e.credit, 0);
  const visibleDebit = visible.reduce((s, e) => s + e.debit, 0);
  const isFiltered = typeFilter !== 'all' || search.trim().length > 0;

  const accentText = accent === 'indigo' ? 'text-indigo-600' : 'text-purple-600';

  const summary: { label: string; value: number; tone?: 'good' | 'bad' | 'neutral'; note?: string }[] = [
    { label: 'Total Gross Sales', value: totals.grossSales, tone: 'good' },
    { label: 'Total Net Sales', value: totals.netSales, tone: 'good', note: 'after returns & referral' },
    { label: 'Total Gross Profit', value: totals.grossProfit, tone: 'good', note: 'net revenue − COGS' },
    { label: 'Total Purchase', value: totals.totalPurchase, tone: 'bad' },
    { label: 'Total Expense', value: totals.totalExpense, tone: 'bad' },
    { label: 'Total Damage', value: totals.totalDamage, tone: 'bad' },
    { label: 'Total Net Profit', value: totals.netProfit, tone: totals.isProfit ? 'good' : 'bad' }
  ];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BookOpen className={`w-5 h-5 ${accentText}`} />
            Consolidated Statement
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every sale, purchase, expense, return and damage in one ledger — {periodLabel}.
            {adjustedNote ? <span className="font-bold text-amber-700"> {adjustedNote}</span> : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            {(['all', ...ALL_TYPES] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                  typeFilter === t
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t === 'all' ? 'All' : STATEMENT_TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or particulars…"
              className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium w-56 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 font-bold text-slate-700 border-b">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Type</th>
              <th className="p-3">Reference</th>
              <th className="p-3">Particulars</th>
              <th className="p-3 text-right">Debit (Out)</th>
              <th className="p-3 text-right">Credit (In)</th>
              <th className="p-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500 text-xs">
                  No transactions in this period.
                </td>
              </tr>
            ) : (
              visible.map((e) => (
                <tr key={e.key} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${TYPE_STYLES[e.type]}`}>
                      {STATEMENT_TYPE_LABEL[e.type]}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-700 whitespace-nowrap">{e.reference}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{e.particulars}</div>
                    <div className="text-[10px] text-slate-400">{e.detail}</div>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-rose-700">
                    {e.debit > 0 ? `৳${e.debit.toLocaleString()}` : '—'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700">
                    {e.credit > 0 ? `৳${e.credit.toLocaleString()}` : '—'}
                  </td>
                  <td
                    className={`p-3 text-right font-mono font-black ${
                      e.balance >= 0 ? 'text-slate-900' : 'text-rose-700'
                    }`}
                  >
                    ৳{e.balance.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
            <tr>
              <td colSpan={4} className="p-3 text-right uppercase text-[11px]">
                {isFiltered ? `Filtered Totals (${visible.length} entries)` : `Column Totals (${visible.length} entries)`}
              </td>
              <td className="p-3 text-right font-mono text-rose-700">৳{visibleDebit.toLocaleString()}</td>
              <td className="p-3 text-right font-mono text-emerald-700">৳{visibleCredit.toLocaleString()}</td>
              <td className={`p-3 text-right font-mono ${visibleCredit - visibleDebit >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                ৳{(visibleCredit - visibleDebit).toLocaleString()}
              </td>
            </tr>
            {isFiltered && (
              <tr className="text-[11px] text-slate-500 font-bold">
                <td colSpan={4} className="p-2 text-right uppercase">Period Totals (unfiltered)</td>
                <td className="p-2 text-right font-mono">৳{totals.totalDebit.toLocaleString()}</td>
                <td className="p-2 text-right font-mono">৳{totals.totalCredit.toLocaleString()}</td>
                <td className="p-2 text-right font-mono">৳{totals.netMovement.toLocaleString()}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Final summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Period Summary</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summary.map((s) => (
            <div
              key={s.label}
              className={`p-3 rounded-xl border ${
                s.tone === 'bad'
                  ? 'bg-rose-50 border-rose-200'
                  : s.tone === 'good'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">{s.label}</p>
              <p
                className={`text-lg font-black font-mono mt-0.5 ${
                  s.tone === 'bad' ? 'text-rose-700' : 'text-emerald-800'
                }`}
              >
                ৳{Math.round(s.value).toLocaleString()}
              </p>
              {s.note && <p className="text-[9px] font-bold text-slate-400 mt-0.5">{s.note}</p>}
            </div>
          ))}
        </div>

        {/* Bottom line */}
        <div
          className={`p-4 rounded-xl shadow flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            totals.isProfit ? 'bg-slate-900 text-white' : 'bg-rose-700 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {totals.isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                {totals.isProfit ? 'Net Profit' : 'Net Loss'}
              </p>
              <p className="text-[10px] opacity-70">
                Gross Profit − Expense − Damage − Referral
              </p>
            </div>
          </div>
          <p className="text-2xl font-black font-mono">
            ৳{Math.round(Math.abs(totals.netProfit)).toLocaleString()}
          </p>
        </div>

        {/* Reconciliation trail */}
        <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 font-medium">
          <div className="flex justify-between"><span>Gross Sales</span><span className="font-mono font-bold">৳{Math.round(totals.grossSales).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Customer Returns</span><span className="font-mono font-bold text-rose-700">−৳{Math.round(totals.customerReturns).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Referral (SP) Payouts</span><span className="font-mono font-bold text-rose-700">−৳{Math.round(totals.referralExpense).toLocaleString()}</span></div>
          <div className="flex justify-between border-t pt-1"><span className="font-bold">Net Sales</span><span className="font-mono font-black">৳{Math.round(totals.netSales).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Cost of Goods Sold</span><span className="font-mono font-bold text-rose-700">−৳{Math.round(totals.totalCOGS).toLocaleString()}</span></div>
          <div className="flex justify-between border-t pt-1"><span className="font-bold">Gross Profit</span><span className="font-mono font-black">৳{Math.round(totals.grossProfit).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Operating Expenses</span><span className="font-mono font-bold text-rose-700">−৳{Math.round(totals.totalExpense).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Damage & Write-offs</span><span className="font-mono font-bold text-rose-700">−৳{Math.round(totals.totalDamage).toLocaleString()}</span></div>
          <div className="flex justify-between border-t pt-1">
            <span className="font-black">{totals.isProfit ? 'NET PROFIT' : 'NET LOSS'}</span>
            <span className={`font-mono font-black ${totals.isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
              ৳{Math.round(totals.netProfit).toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            Purchases (৳{Math.round(totals.totalPurchase).toLocaleString()}) are stock investment and appear
            in the ledger as cash out; they affect profit through COGS as items sell, not directly.
          </p>
        </div>
      </div>
    </div>
  );
};
