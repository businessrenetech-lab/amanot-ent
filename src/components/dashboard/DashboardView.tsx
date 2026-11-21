import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { BusinessType, SaleInvoice } from '../../types';
import { buildDashboard, dayKey } from './dashboardData';
import { ArrowDownRight, ArrowUpRight, ShoppingCart, PackageX, ChevronRight } from 'lucide-react';

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

/** Vertical bars over time, one series, with a hover tooltip. */
const TimeBars: React.FC<{ data: { key: string; label: string; short: string; value: number; count: number }[] }> = ({ data }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 290;
  const padL = 74;
  const padB = 26;
  const padT = 12;
  const max = Math.max(...data.map((d) => d.value), 1);
  const nice = niceMax(max);
  const plotW = W - padL;
  const plotH = H - padB - padT;
  const slot = plotW / data.length;
  const bw = Math.max(4, Math.min(28, slot * 0.62));
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => (nice * i) / 5);
  const every = data.length > 16 ? 3 : data.length > 8 ? 2 : 1;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!total) {
    return (
      <div className="h-[290px] flex items-center justify-center text-sm" style={{ color: C.muted }}>
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
const Kpi: React.FC<{ label: string; value: string; sub?: React.ReactNode; onClick?: () => void; className?: string }> = ({
  label,
  value,
  sub,
  onClick,
  className = ''
}) => {
  const body = (
    <>
      <p className="text-[13px]" style={{ color: C.muted }}>{label}</p>
      <p className="mt-1 text-[22px] xl:text-[24px] leading-tight font-semibold tracking-tight" style={{ color: C.ink }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[12.5px] leading-snug">{sub}</p>}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className={`text-left px-5 py-4 min-w-0 hover:bg-[#FAFAFB] transition-colors ${className}`}>
      {body}
    </button>
  ) : (
    <div className={`px-5 py-4 min-w-0 ${className}`}>{body}</div>
  );
};

const AttentionRow: React.FC<{
  label: string;
  detail: string;
  value: string;
  urgent?: boolean;
  onClick: () => void;
}> = ({ label, detail, value, urgent, onClick }) => (
  <li>
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left group">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: urgent ? C.bad : '#D1D5DB' }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px]" style={{ color: C.ink }}>{label}</span>
        <span className="block text-[12.5px] truncate" style={{ color: urgent ? C.bad : C.muted }}>{detail}</span>
      </span>
      <span className="text-[14px] font-semibold shrink-0" style={{ color: C.ink }}>{value}</span>
      <ChevronRight className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: C.muted }} />
    </button>
  </li>
);

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
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const scopeLabel =
    activeBusiness === 'all' ? 'Both businesses' : activeBusiness === 'amanot_electronics' ? 'Amanat Electronics' : 'Amanat Enterprise';
  const rangeLabel = range === '14d' ? 'previous 14 days' : range === '30d' ? 'previous 30 days' : 'previous 12 months';
  const half = Math.ceil(d.stock.byCategory.length / 2);
  const catRows = (list: typeof d.stock.byCategory) =>
    list.map((c) => ({
      label: c.label,
      value: c.units,
      display: c.units.toLocaleString('en-IN'),
      note: c.low ? `${c.low} low` : undefined
    }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px]" style={{ color: C.muted }}>{dateLabel}</p>
          <h1 className="mt-0.5 text-[24px] font-semibold tracking-tight" style={{ color: C.ink }}>
            {greeting}, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-2 bg-[#2E3192] hover:bg-[#25277A]"
          >
            <ShoppingCart className="w-4 h-4" /> New sale
          </button>
        </div>
      </div>

      {/* Key figures: one strip, not a wall of boxes */}
      <section
        className="bg-white border rounded-xl grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x overflow-hidden [&>*:nth-child(odd):not(:last-child)]:max-lg:border-r"
        style={{ borderColor: C.line }}
        aria-label="Key figures"
      >
        <Kpi
          label="Sales today"
          value={tk(d.today.total)}
          sub={<Delta now={d.today.total} before={d.yesterday.total} label="yesterday" />}
          onClick={() => setActiveTab('invoices')}
        />
        <Kpi
          label="Received today"
          value={tk(d.today.collected)}
          sub={<span style={{ color: C.muted }}>{d.today.count} invoice{d.today.count === 1 ? '' : 's'}, EMI {tkShort(d.today.emiCollected)}</span>}
        />
        <Kpi
          label="This month"
          value={tkShort(d.month.total)}
          sub={
            canSeeMoney ? (
              <span style={{ color: C.muted }}>
                Profit {tkShort(d.month.profit)}
                {d.month.total > 0 && `, ${Math.round((d.month.profit / d.month.total) * 100)}%`}
              </span>
            ) : (
              <Delta now={d.month.total} before={d.lastMonth.total} label="last month" />
            )
          }
        />
        <Kpi
          label="Customers owe"
          value={tkShort(d.dues.total)}
          sub={<span style={{ color: C.muted }}>{d.dues.count} customer{d.dues.count === 1 ? '' : 's'}</span>}
          onClick={() => setActiveTab('crm')}
        />
        <Kpi
          className="max-lg:col-span-2"
          label="Customers"
          value={d.customers.total.toLocaleString('en-IN')}
          sub={<span style={{ color: C.muted }}>{d.customers.newThisMonth} new this month</span>}
          onClick={() => setActiveTab('crm')}
        />
      </section>

      {/* Sales trend + what needs attention */}
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2 bg-white border rounded-xl p-5 min-w-0" style={{ borderColor: C.line }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[13px]" style={{ color: C.muted }}>Sales</h2>
              <p className="mt-1 text-[24px] font-semibold tracking-tight leading-tight" style={{ color: C.ink }}>
                {tk(d.trendTotal)}
              </p>
              <p className="mt-1 text-[12.5px]">
                <Delta now={d.trendTotal} before={d.trendPrev} label={`the ${rangeLabel}`} />
                <span style={{ color: C.muted }}>
                  {' '}
                  from {d.trendCount} sale{d.trendCount === 1 ? '' : 's'}
                </span>
              </p>
            </div>
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
                  className={`px-3 h-7 rounded-md transition-colors ${range === k ? 'bg-white shadow-sm font-medium' : ''}`}
                  style={{ color: range === k ? C.ink : C.muted }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <TimeBars data={d.trend} />
          </div>
        </section>

        <section className="bg-white border rounded-xl px-5 pt-5 pb-2 min-w-0" style={{ borderColor: C.line }}>
          <h2 className="text-[15px] font-semibold" style={{ color: C.ink }}>Needs attention</h2>
          <ul className="mt-1 divide-y" style={{ borderColor: C.line }}>
            <AttentionRow
              label="Overdue installments"
              detail={d.emi.overdueCount ? `${d.emi.overdueCount} payment${d.emi.overdueCount === 1 ? '' : 's'} late` : 'Nobody is late'}
              value={tkShort(d.emi.overdueAmount)}
              urgent={d.emi.overdueCount > 0}
              onClick={() => setActiveTab('installments')}
            />
            <AttentionRow
              label="Installments due this week"
              detail={`${d.emi.dueSoonCount} payment${d.emi.dueSoonCount === 1 ? '' : 's'} in the next 7 days`}
              value={tkShort(d.emi.dueSoonAmount)}
              onClick={() => setActiveTab('installments')}
            />
            <AttentionRow
              label="Out of stock"
              detail={d.stock.outCount ? 'Cannot be sold until restocked' : 'Everything is available'}
              value={String(d.stock.outCount)}
              urgent={d.stock.outCount > 0}
              onClick={() => setActiveTab('inventory')}
            />
            <AttentionRow
              label="Running low"
              detail="At or below the alert level"
              value={String(Math.max(0, d.stock.lowCount - d.stock.outCount))}
              onClick={() => setActiveTab('inventory')}
            />
            <AttentionRow
              label="Unpaid customer balances"
              detail={`${d.dues.count} customer${d.dues.count === 1 ? '' : 's'} to follow up`}
              value={tkShort(d.dues.total)}
              onClick={() => setActiveTab('crm')}
            />
            <AttentionRow
              label="Open quotes and leads"
              detail={`${d.quotes.website} from the website`}
              value={String(d.quotes.open)}
              onClick={() => setActiveTab('quotes')}
            />
          </ul>
        </section>
      </div>

      {/* This month */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Best sellers this month">
          {d.month.topProducts.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: C.muted }}>No sales this month yet.</p>
          ) : (
            <ol className="-my-1">
              {d.month.topProducts.slice(0, 5).map((p, i) => (
                <li key={p.label} className="flex items-center gap-3 py-2 text-[13px]">
                  <span className="w-5 text-right shrink-0" style={{ color: C.faint }}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate" style={{ color: C.ink }}>{p.label}</span>
                  <span className="shrink-0" style={{ color: C.muted }}>{p.qty} sold</span>
                  <span className="w-[72px] text-right shrink-0 font-medium" style={{ color: C.ink }}>{tkShort(p.value)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Sales by category">
          <HBars
            rows={d.month.byCategory.map((c) => ({ label: c.label, value: c.value, display: tkShort(c.value) }))}
            empty="No sales this month yet."
          />
        </Card>
        <Card title="Where sales came from">
          <SplitBar parts={d.month.byBusiness} format={tkShort} />
          <div className="mt-5 pt-4 border-t" style={{ borderColor: C.line }}>
            <p className="text-[13px] mb-3" style={{ color: C.muted }}>Payment method</p>
            {d.month.byPayment.length === 0 ? (
              <p className="text-sm" style={{ color: C.muted }}>No payments this month.</p>
            ) : (
              <ul className="space-y-2 text-[13px]">
                {d.month.byPayment.map((p) => {
                  const total = d.month.byPayment.reduce((t, x) => t + x.value, 0);
                  return (
                    <li key={p.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0" style={{ color: C.ink }}>{p.label}</span>
                      <span className="flex-1 h-1.5 rounded-full" style={{ background: C.grid }}>
                        <span className="block h-1.5 rounded-full" style={{ width: `${(p.value / total) * 100}%`, background: C.bar }} />
                      </span>
                      <span className="w-16 text-right shrink-0" style={{ color: C.muted }}>{tkShort(p.value)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Inventory */}
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2 bg-white border rounded-xl p-5 min-w-0" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold" style={{ color: C.ink }}>Inventory</h2>
            <LinkButton onClick={() => setActiveTab('inventory')}>Open inventory</LinkButton>
          </div>
          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Units in stock', d.stock.units.toLocaleString('en-IN'), `${d.stock.skus} products`],
              canSeeMoney
                ? ['Value at cost', tkShort(d.stock.costValue), `${tkShort(d.stock.retailValue)} at retail`]
                : ['Value at retail', tkShort(d.stock.retailValue), ''],
              ['Running low', String(Math.max(0, d.stock.lowCount - d.stock.outCount)), 'Below alert level'],
              ['Out of stock', String(d.stock.outCount), 'Need restocking']
            ].map(([k, v, sub]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[13px]" style={{ color: C.muted }}>{k}</dt>
                <dd className="mt-0.5 text-[20px] font-semibold tracking-tight" style={{ color: C.ink }}>{v}</dd>
                {sub && <dd className="text-[12.5px]" style={{ color: C.muted }}>{sub}</dd>}
              </div>
            ))}
          </dl>
          <div className="mt-5 pt-5 border-t" style={{ borderColor: C.line }}>
            <p className="text-[13px] mb-3" style={{ color: C.muted }}>Units by category</p>
            <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              <HBars rows={catRows(d.stock.byCategory.slice(0, half))} empty="No stock recorded." />
              <HBars rows={catRows(d.stock.byCategory.slice(half))} empty="" />
            </div>
          </div>
        </section>

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
                  <span className="shrink-0 text-right" style={{ color: p.stockQty <= 0 ? C.bad : C.ink }}>
                    {p.stockQty <= 0 ? 'Out' : `${p.stockQty} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent sales */}
      <Card title="Latest sales" action={<LinkButton onClick={() => setActiveTab('invoices')}>All invoices</LinkButton>}>
        {d.recent.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: C.muted }}>No sales yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-[13px] min-w-[640px]">
              <thead>
                <tr className="border-y" style={{ borderColor: C.line, color: C.muted, background: '#FAFAFB' }}>
                  <th className="text-left font-normal px-5 py-2">Invoice</th>
                  <th className="text-left font-normal px-3 py-2">Customer</th>
                  <th className="text-left font-normal px-3 py-2">Business</th>
                  <th className="text-right font-normal px-3 py-2">Total</th>
                  <th className="text-right font-normal px-5 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((s: SaleInvoice) => (
                  <tr
                    key={s.id}
                    onClick={() => setActiveReceiptInvoice(s)}
                    className="border-b last:border-b-0 cursor-pointer hover:bg-[#FAFAFB]"
                    style={{ borderColor: C.line }}
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium" style={{ color: C.ink }}>{s.id}</span>
                      <span className="ml-2" style={{ color: C.muted }}>
                        {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-3 py-3" style={{ color: C.ink }}>{s.customerName}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5" style={{ color: C.muted }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: BUSINESS_COLOR[s.business] }} aria-hidden />
                        {BUSINESS_NAME[s.business]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium" style={{ color: C.ink }}>{tk(s.grandTotal)}</td>
                    <td className="px-5 py-3 text-right">
                      {s.dueAmount > 0 ? (
                        <span style={{ color: C.bad }}>{tk(s.dueAmount)} due</span>
                      ) : (
                        <span style={{ color: C.good }}>Paid</span>
                      )}
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
