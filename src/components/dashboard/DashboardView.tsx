import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { BusinessType, SaleInvoice } from '../../types';
import { buildDashboard, dayKey } from './dashboardData';
import {
  ArrowDownRight,
  ArrowUpRight,
  ShoppingCart,
  PackageX,
  ChevronRight
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Tokens. Chart colours were checked for colour-blind separation; the green
// sits under 3:1 on white, so every green mark carries a visible label.
// ---------------------------------------------------------------------------
const C = {
  ink: '#16181D',
  muted: '#6B7280',
  faint: '#9CA3AF',
  line: '#E6E7EA',
  grid: '#F0F1F3',
  bar: '#4F53C8', // single-series and Enterprise marks
  barSoft: '#C9CBF0',
  electronics: '#6AA72A',
  enterprise: '#4F53C8',
  bad: '#B42318',
  good: '#067647'
};

const BUSINESS_COLOR: Record<BusinessType, string> = {
  amanot_electronics: C.electronics,
  amanot_enterprise: C.enterprise
};
const BUSINESS_NAME: Record<BusinessType, string> = {
  amanot_electronics: 'Electronics',
  amanot_enterprise: 'Enterprise'
};

const tk = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;
const tkShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e7) return `৳${(n / 1e7).toFixed(a >= 1e8 ? 0 : 1)} cr`;
  if (a >= 1e5) return `৳${(n / 1e5).toFixed(a >= 1e6 ? 0 : 1)} lakh`;
  if (a >= 1e3) return `৳${(n / 1e3).toFixed(0)}k`;
  return `৳${Math.round(n)}`;
};

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
const Card: React.FC<{ title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  action,
  className = '',
  children
}) => (
  <section className={`bg-white border rounded-xl p-5 min-w-0 ${className}`} style={{ borderColor: C.line }}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 mb-4">
        {title && <h2 className="text-[15px] font-semibold" style={{ color: C.ink }}>{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

const LinkButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="text-[13px] flex items-center gap-0.5 rounded hover:underline underline-offset-4"
    style={{ color: C.muted }}
  >
    {children}
    <ChevronRight className="w-3.5 h-3.5" />
  </button>
);

const Delta: React.FC<{ now: number; before: number; label: string }> = ({ now, before, label }) => {
  if (!before && !now) return <span style={{ color: C.muted }}>No sales {label} either</span>;
  if (!before) return <span style={{ color: C.muted }}>Nothing {label}</span>;
  const pct = ((now - before) / before) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1" style={{ color: up ? C.good : C.bad }}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {Math.abs(pct).toFixed(0)}% {up ? 'more' : 'less'} than {label}
    </span>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: React.ReactNode; onClick?: () => void }> = ({
  label,
  value,
  sub,
  onClick
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white border rounded-xl p-4 sm:p-5 min-w-0 ${onClick ? 'hover:border-[#C9CBF0] transition-colors' : ''}`}
      style={{ borderColor: C.line }}
    >
      <p className="text-[13px]" style={{ color: C.muted }}>{label}</p>
      <p className="mt-1.5 text-[20px] sm:text-[26px] leading-tight font-semibold tracking-tight break-words" style={{ color: C.ink }}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[13px] sm:truncate">{sub}</p>}
    </Tag>
  );
};

/** Vertical bars over time, one series, with a hover tooltip. */
const TimeBars: React.FC<{ data: { key: string; label: string; short: string; value: number; count: number }[] }> = ({ data }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 300;
  const padL = 74;
  const padB = 26;
  const padT = 12;
  const max = Math.max(...data.map((d) => d.value), 1);
  const nice = niceMax(max);
  const plotW = W - padL;
  const plotH = H - padB - padT;
  const slot = plotW / data.length;
  const bw = Math.max(4, Math.min(28, slot * 0.62));
  const ticks = [0, nice / 4, nice / 2, (nice * 3) / 4, nice];
  const every = data.length > 16 ? 3 : data.length > 8 ? 2 : 1;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!total) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm" style={{ color: C.muted }}>
        No sales in this period yet.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto -mx-1 px-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px] h-auto" role="img" aria-label="Sales by period">
        {ticks.map((t) => {
          const y = padT + plotH - (t / nice) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W} y1={y} y2={y} stroke={t === 0 ? C.line : C.grid} strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={11} fill={C.faint}>
                {tkShort(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / nice) * plotH;
          const x = padL + i * slot + (slot - bw) / 2;
          const y = padT + plotH - h;
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={d.key}>
              {h > 0 && (
                <path
                  d={`M${x},${padT + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${padT + plotH} Z`}
                  fill={hover === null || hover === i ? C.bar : C.barSoft}
                />
              )}
              {i % every === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={C.faint}>
                  {d.short}
                </text>
              )}
              <rect
                x={padL + i * slot}
                y={padT}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.label}: ${tk(d.value)}, ${d.count} sales`}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 bg-white border rounded-lg shadow-md px-3 py-2 text-[13px] whitespace-nowrap"
          style={{
            borderColor: C.line,
            left: `${((padL + hover * slot + slot / 2) / W) * 100}%`
          }}
        >
          <p style={{ color: C.muted }}>{data[hover].label}</p>
          <p className="font-semibold" style={{ color: C.ink }}>{tk(data[hover].value)}</p>
          <p style={{ color: C.muted }}>
            {data[hover].count} sale{data[hover].count === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </div>
  );
};

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return step * p;
}

/** Labelled horizontal bars: name, bar, value. */
const HBars: React.FC<{
  rows: { label: string; value: number; display: string; note?: string }[];
  empty: string;
  color?: string;
}> = ({ rows, empty, color = C.bar }) => {
  if (!rows.length) return <p className="text-sm py-6 text-center" style={{ color: C.muted }}>{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-[13px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate" style={{ color: C.ink }}>{r.label}</span>
            <span className="shrink-0 font-medium" style={{ color: C.ink }}>
              {r.display}
              {r.note && <span className="ml-1.5 font-normal" style={{ color: C.muted }}>{r.note}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full" style={{ background: C.grid }}>
            <div
              className="h-2 rounded-full"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Two-business share as one segmented bar with labels underneath. */
const SplitBar: React.FC<{ parts: { business: BusinessType; value: number }[]; format: (n: number) => string }> = ({
  parts,
  format
}) => {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return <p className="text-sm" style={{ color: C.muted }}>Nothing yet.</p>;
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-[2px]" role="img" aria-label="Share by business">
        {shown.map((p) => (
          <div key={p.business} style={{ width: `${(p.value / total) * 100}%`, background: BUSINESS_COLOR[p.business] }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
        {parts.map((p) => (
          <li key={p.business}>
            <span className="flex items-center gap-1.5" style={{ color: C.muted }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BUSINESS_COLOR[p.business] }} aria-hidden />
              {BUSINESS_NAME[p.business]}
            </span>
            <span className="block mt-0.5 font-semibold" style={{ color: C.ink }}>
              {format(p.value)}
              <span className="ml-1 font-normal" style={{ color: C.muted }}>
                {total ? Math.round((p.value / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const DashboardView: React.FC = () => {
  const {
    sales,
    products,
    customers,
    installmentPlans,
    quotations,
    expenses,
    customerReturns,
    activeBusiness,
    currentUser,
    setActiveTab,
    setActiveReceiptInvoice
  } = useApp();
  const [range, setRange] = useState<'14d' | '30d' | '12m'>('14d');

  const canSeeMoney = currentUser.role === 'super_admin' || !!currentUser.permissions.canViewGlobalReports;
  const now = new Date();

  const d = useMemo(
    () =>
      buildDashboard({
        sales,
        products,
        customers,
        installmentPlans,
        quotations,
        expenses,
        customerReturns,
        scope: activeBusiness,
        now,
        range
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sales, products, customers, installmentPlans, quotations, expenses, customerReturns, activeBusiness, range, dayKey(now)]
  );

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser.name.split(/\s+/)[0];
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const scopeLabel =
    activeBusiness === 'all' ? 'Both businesses' : activeBusiness === 'amanot_electronics' ? 'Amanat Electronics' : 'Amanat Enterprise';

  const openSale = (inv: SaleInvoice) => setActiveReceiptInvoice(inv);

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: C.ink }}>
            {greeting}, {firstName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            {dateLabel}. Showing {scopeLabel.toLowerCase() === 'both businesses' ? 'both businesses' : scopeLabel}.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('pos')}
          className="h-10 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-2 bg-[#2E3192] hover:bg-[#25277A]"
        >
          <ShoppingCart className="w-4 h-4" /> New sale
        </button>
      </div>

      {/* Today */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Stat
          label="Sales today"
          value={tk(d.today.total)}
          sub={
            <>
              <span style={{ color: C.muted }}>{d.today.count} invoice{d.today.count === 1 ? '' : 's'}. </span>
              <Delta now={d.today.total} before={d.yesterday.total} label="yesterday" />
            </>
          }
          onClick={() => setActiveTab('invoices')}
        />
        <Stat
          label="Money received today"
          value={tk(d.today.collected)}
          sub={
            <span style={{ color: C.muted }}>
              Sales {tkShort(d.today.paidOnSales)}, installments {tkShort(d.today.emiCollected)}
            </span>
          }
        />
        <Stat
          label="Sales this month"
          value={tk(d.month.total)}
          sub={
            canSeeMoney ? (
              <span style={{ color: C.muted }}>
                Gross profit {tkShort(d.month.profit)}
                {d.month.total > 0 && ` (${Math.round((d.month.profit / d.month.total) * 100)}%)`}
              </span>
            ) : (
              <Delta now={d.month.total} before={d.lastMonth.total} label="last month" />
            )
          }
        />
        <Stat
          label="Customers owe us"
          value={tk(d.dues.total)}
          sub={<span style={{ color: C.muted }}>{d.dues.count} customer{d.dues.count === 1 ? '' : 's'} with dues</span>}
          onClick={() => setActiveTab('crm')}
        />
      </div>

      {/* Sales trend + split */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Sales"
          action={
            <div className="flex p-0.5 rounded-lg bg-[#F0F1F3] text-[13px]" role="group" aria-label="Period">
              {(
                [
                  ['14d', '14 days'],
                  ['30d', '30 days'],
                  ['12m', '12 months']
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setRange(k)}
                  aria-pressed={range === k}
                  className={`px-2.5 h-7 rounded-md transition-colors ${range === k ? 'bg-white shadow-sm font-medium' : ''}`}
                  style={{ color: range === k ? C.ink : C.muted }}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <p className="-mt-2 mb-3 text-sm" style={{ color: C.muted }}>
            <span className="font-semibold text-[15px]" style={{ color: C.ink }}>{tk(d.trendTotal)}</span> from {d.trendCount}{' '}
            sale{d.trendCount === 1 ? '' : 's'}
          </p>
          <TimeBars data={d.trend} />
        </Card>

        <div className="grid gap-4 content-start">
          <Card title="This month by business">
            <SplitBar parts={d.month.byBusiness} format={tkShort} />
          </Card>
          <Card title="How customers paid this month">
            <HBars
              rows={d.month.byPayment.map((p) => ({
                label: p.label,
                value: p.value,
                display: tkShort(p.value)
              }))}
              empty="No payments this month."
            />
          </Card>
        </div>
      </div>

      {/* Stock */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Units in stock" value={d.stock.units.toLocaleString('en-IN')} sub={<span style={{ color: C.muted }}>{d.stock.skus} products</span>} onClick={() => setActiveTab('inventory')} />
        <Stat
          label={canSeeMoney ? 'Stock value at cost' : 'Stock value at retail'}
          value={tkShort(canSeeMoney ? d.stock.costValue : d.stock.retailValue)}
          sub={canSeeMoney ? <span style={{ color: C.muted }}>{tkShort(d.stock.retailValue)} at retail price</span> : undefined}
        />
        <Stat
          label="Running low"
          value={String(d.stock.lowCount)}
          sub={<span style={{ color: d.stock.lowCount ? C.bad : C.muted }}>{d.stock.lowCount ? 'At or below the alert level' : 'All above alert level'}</span>}
          onClick={() => setActiveTab('inventory')}
        />
        <Stat
          label="Out of stock"
          value={String(d.stock.outCount)}
          sub={<span style={{ color: C.muted }}>{d.stock.outCount ? 'Cannot be sold until restocked' : 'Everything is available'}</span>}
          onClick={() => setActiveTab('inventory')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Stock by category" className="xl:col-span-2" action={<LinkButton onClick={() => setActiveTab('inventory')}>Inventory</LinkButton>}>
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            <HBars
              rows={d.stock.byCategory.slice(0, Math.ceil(d.stock.byCategory.length / 2)).map((c) => ({
                label: c.label,
                value: c.units,
                display: `${c.units.toLocaleString('en-IN')} units`,
                note: c.low ? `${c.low} low` : undefined
              }))}
              empty="No stock recorded."
            />
            <HBars
              rows={d.stock.byCategory.slice(Math.ceil(d.stock.byCategory.length / 2)).map((c) => ({
                label: c.label,
                value: c.units,
                display: `${c.units.toLocaleString('en-IN')} units`,
                note: c.low ? `${c.low} low` : undefined
              }))}
              empty=""
            />
          </div>
        </Card>

        <Card title="Restock soon" action={<LinkButton onClick={() => setActiveTab('suppliers')}>Suppliers</LinkButton>}>
          {d.stock.lowList.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: C.muted }}>Nothing is running low.</p>
          ) : (
            <ul className="divide-y -my-2" style={{ borderColor: C.line }}>
              {d.stock.lowList.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center gap-3 text-[13px]">
                  <span className="w-10 h-10 shrink-0 rounded-lg bg-[#F3F3F1] flex items-center justify-center overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt="" loading="lazy" className="w-full h-full object-contain p-1 mix-blend-multiply" />
                    ) : (
                      <PackageX className="w-4 h-4" style={{ color: C.faint }} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" style={{ color: C.ink }}>{p.name}</span>
                    <span className="block truncate" style={{ color: C.muted }}>{p.model || p.category}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-semibold" style={{ color: p.stockQty <= 0 ? C.bad : C.ink }}>
                      {p.stockQty <= 0 ? 'Out' : `${p.stockQty} left`}
                    </span>
                    <span className="block" style={{ color: C.muted }}>alert at {p.minStockAlert}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Selling */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Best sellers this month">
          <HBars
            rows={d.month.topProducts.map((p) => ({
              label: p.label,
              value: p.qty,
              display: `${p.qty} sold`,
              note: tkShort(p.value)
            }))}
            empty="No sales this month yet."
          />
        </Card>
        <Card title="Sales by category this month">
          <HBars
            rows={d.month.byCategory.map((c) => ({ label: c.label, value: c.value, display: tkShort(c.value) }))}
            empty="No sales this month yet."
          />
        </Card>
        <Card title="Customers" action={<LinkButton onClick={() => setActiveTab('crm')}>All customers</LinkButton>}>
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-semibold tracking-tight" style={{ color: C.ink }}>
              {d.customers.total.toLocaleString('en-IN')}
            </span>
            <span className="text-[13px]" style={{ color: C.muted }}>
              {d.customers.newThisMonth} new this month
            </span>
          </div>
          <div className="mt-4">
            <HBars
              rows={d.customers.byType.map((t) => ({ label: t.label, value: t.count, display: String(t.count) }))}
              empty="No customers yet."
            />
          </div>
        </Card>
      </div>

      {/* Follow-ups */}
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Installments due in 7 days"
          value={tk(d.emi.dueSoonAmount)}
          sub={<span style={{ color: C.muted }}>{d.emi.dueSoonCount} payment{d.emi.dueSoonCount === 1 ? '' : 's'}, {d.emi.activePlans} active plans</span>}
          onClick={() => setActiveTab('installments')}
        />
        <Stat
          label="Installments overdue"
          value={tk(d.emi.overdueAmount)}
          sub={
            <span style={{ color: d.emi.overdueCount ? C.bad : C.muted }}>
              {d.emi.overdueCount ? `${d.emi.overdueCount} payment${d.emi.overdueCount === 1 ? '' : 's'} late` : 'Nobody is late'}
            </span>
          }
          onClick={() => setActiveTab('installments')}
        />
        <Stat
          label="Open quotes and website leads"
          value={String(d.quotes.open)}
          sub={<span style={{ color: C.muted }}>{d.quotes.website} from the website, worth {tkShort(d.quotes.value)}</span>}
          onClick={() => setActiveTab('quotes')}
        />
      </div>

      {/* Recent sales */}
      <Card title="Latest sales" action={<LinkButton onClick={() => setActiveTab('invoices')}>All invoices</LinkButton>}>
        {d.recent.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: C.muted }}>No sales yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-[13px] min-w-[640px]">
              <thead>
                <tr style={{ color: C.muted }}>
                  <th className="text-left font-normal px-5 pb-2">Invoice</th>
                  <th className="text-left font-normal px-3 pb-2">Customer</th>
                  <th className="text-left font-normal px-3 pb-2">Business</th>
                  <th className="text-right font-normal px-3 pb-2">Total</th>
                  <th className="text-right font-normal px-5 pb-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openSale(s)}
                    className="border-t cursor-pointer hover:bg-[#F8F9FA]"
                    style={{ borderColor: C.line }}
                  >
                    <td className="px-5 py-2.5">
                      <span className="font-medium" style={{ color: C.ink }}>{s.id}</span>
                      <span className="block" style={{ color: C.muted }}>
                        {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span style={{ color: C.ink }}>{s.customerName}</span>
                      <span className="block" style={{ color: C.muted }}>{s.customerPhone}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5" style={{ color: C.muted }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: BUSINESS_COLOR[s.business] }} aria-hidden />
                        {BUSINESS_NAME[s.business]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium" style={{ color: C.ink }}>{tk(s.grandTotal)}</td>
                    <td className="px-5 py-2.5 text-right" style={{ color: s.dueAmount > 0 ? C.bad : C.muted }}>
                      {s.dueAmount > 0 ? tk(s.dueAmount) : 'Paid'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
