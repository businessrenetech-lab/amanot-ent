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

/** Smooth area line for the Today panel. Decorative summary; numbers are in text beside it. */
const Spark: React.FC<{ values: number[]; labels: string[] }> = ({ values, labels }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 120;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, H - 8 - (v / max) * (H - 24)] as const);
  const path = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, '');
  const area = `${path} L${W},${H} L0,${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[96px] sm:h-[120px]" aria-hidden>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F53C8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4F53C8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path d={path} fill="none" stroke="#4F53C8" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {hover !== null && (
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1={0} y2={H} stroke="#C9CBF0" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
        {values.map((_, i) => (
          <rect
            key={i}
            x={pts[i][0] - W / values.length / 2}
            y={0}
            width={W / values.length}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <span
        className="absolute w-2.5 h-2.5 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%`, background: '#4F53C8' }}
        aria-hidden
      />
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full bg-[#16181D] text-white rounded-md px-2.5 py-1.5 text-[12px] whitespace-nowrap"
          style={{ left: `${(pts[hover][0] / W) * 100}%` }}
        >
          {labels[hover]}: {tk(values[hover])}
        </div>
      )}
    </div>
  );
};

const Figure: React.FC<{ label: string; value: string; sub?: React.ReactNode }> = ({ label, value, sub }) => (
  <div className="min-w-0">
    <dt className="text-[13px]" style={{ color: C.muted }}>{label}</dt>
    <dd className="mt-1 text-[20px] font-semibold tracking-tight leading-tight" style={{ color: C.ink }}>{value}</dd>
    {sub && <dd className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>{sub}</dd>}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-end justify-between gap-3 mb-3 px-0.5">
    <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: C.ink }}>{children}</h2>
    {action}
  </div>
);

const Panel: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <section className={`bg-white border rounded-2xl min-w-0 ${className}`} style={{ borderColor: C.line }}>
    {children}
  </section>
);

const ColHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[13px] mb-4" style={{ color: C.muted }}>{children}</h3>
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
  const [range, setRange] = useState<'14d' | '30d' | '12m'>('30d');

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
  const rangeLabel = range === '14d' ? 'previous 14 days' : range === '30d' ? 'previous 30 days' : 'previous 12 months';
  const low = Math.max(0, d.stock.lowCount - d.stock.outCount);
  const paySum = d.month.byPayment.reduce((t, x) => t + x.value, 0);

  const todo = [
    { label: 'Out of stock', value: String(d.stock.outCount), urgent: d.stock.outCount > 0, tab: 'inventory' as const },
    { label: 'Running low', value: String(low), urgent: false, tab: 'inventory' as const },
    { label: 'Unpaid balances', value: tkShort(d.dues.total), urgent: false, tab: 'crm' as const },
    { label: 'Open quotes and leads', value: String(d.quotes.open), urgent: false, tab: 'quotes' as const }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: C.ink }}>
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: C.muted }}>Here is how {dateLabel} is going.</p>
        </div>
        <button
          onClick={() => setActiveTab('pos')}
          className="h-10 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-2 bg-[#2E3192] hover:bg-[#25277A]"
        >
          <ShoppingCart className="w-4 h-4" /> New sale
        </button>
      </div>

      {/* Today: the one bold panel */}
      <div className="space-y-3">
        <Panel className="overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div className="p-6 sm:p-7">
              <p className="text-sm" style={{ color: C.muted }}>Sales today</p>
              <p className="mt-1 text-[40px] sm:text-[46px] leading-none font-semibold tracking-tight" style={{ color: C.ink }}>
                {tk(d.today.total)}
              </p>
              <p className="mt-3 text-[13px]">
                <Delta now={d.today.total} before={d.yesterday.total} label="yesterday" />
              </p>
              <dl className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t" style={{ borderColor: C.line }}>
                <Figure label="Received" value={tkShort(d.today.collected)} />
                <Figure label="Invoices" value={String(d.today.count)} />
                <Figure
                  label="Average"
                  value={d.today.count ? tkShort(d.today.total / d.today.count) : '৳0'}
                />
              </dl>
            </div>
            <div className="relative px-6 sm:px-7 pb-6 lg:pt-7 lg:border-l flex flex-col" style={{ borderColor: C.line }}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span style={{ color: C.muted }}>Last 14 days</span>
                <span style={{ color: C.ink }} className="font-medium">
                  {tk(d.spark.reduce((t, p) => t + p.value, 0))}
                </span>
              </div>
              <div className="mt-auto pt-6">
                <Spark values={d.spark.map((p) => p.value)} labels={d.spark.map((p) => p.label)} />
                <div className="mt-2 flex justify-between text-[11px]" style={{ color: C.faint }}>
                  <span>{d.spark[0]?.short}</span>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Follow-ups, one slim row */}
        <nav
          aria-label="Follow-ups"
          className="bg-white border rounded-2xl grid sm:grid-cols-2 lg:grid-cols-4 max-sm:divide-y sm:divide-x sm:max-lg:[&>*:nth-child(-n+2)]:border-b overflow-hidden"
          style={{ borderColor: C.line }}
        >
          {todo.map((t) => (
            <button
              key={t.label}
              onClick={() => setActiveTab(t.tab)}
              className="flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#FAFAFB] transition-colors group"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.urgent ? C.bad : '#D1D5DB' }} aria-hidden />
              <span className="flex-1 min-w-0 text-[13px] truncate" style={{ color: C.muted }}>{t.label}</span>
              <span className="text-[15px] font-semibold" style={{ color: t.urgent ? C.bad : C.ink }}>{t.value}</span>
              <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-80" style={{ color: C.muted }} />
            </button>
          ))}
        </nav>
      </div>

      {/* Sales over time + the month */}
      <div>
        <SectionTitle>Sales</SectionTitle>
        <Panel>
          <div className="grid xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="p-6 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[28px] font-semibold tracking-tight leading-tight" style={{ color: C.ink }}>
                    {tk(d.trendTotal)}
                  </p>
                  <p className="mt-1 text-[13px]">
                    <Delta now={d.trendTotal} before={d.trendPrev} label={`the ${rangeLabel}`} />
                    <span style={{ color: C.muted }}>
                      , {d.trendCount} sale{d.trendCount === 1 ? '' : 's'}
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
              <div className="mt-5">
                <TimeBars data={d.trend} />
              </div>
            </div>

            <aside className="p-6 border-t xl:border-t-0 xl:border-l space-y-6" style={{ borderColor: C.line }}>
              <dl className="grid grid-cols-2 gap-5">
                <Figure label="This month" value={tkShort(d.month.total)} />
                {canSeeMoney ? (
                  <Figure
                    label="Gross profit"
                    value={tkShort(d.month.profit)}
                    sub={d.month.total > 0 ? `${Math.round((d.month.profit / d.month.total) * 100)}% margin` : undefined}
                  />
                ) : (
                  <Figure label="Last month" value={tkShort(d.lastMonth.total)} />
                )}
                <Figure label="Customers" value={d.customers.total.toLocaleString('en-IN')} sub={`${d.customers.newThisMonth} new this month`} />
                <Figure label="Customers owe" value={tkShort(d.dues.total)} sub={`${d.dues.count} customer${d.dues.count === 1 ? '' : 's'}`} />
              </dl>
              <div className="pt-5 border-t" style={{ borderColor: C.line }}>
                <ColHead>This month by business</ColHead>
                <SplitBar parts={d.month.byBusiness} format={tkShort} />
              </div>
            </aside>
          </div>
        </Panel>
      </div>

      {/* What sold */}
      <div>
        <SectionTitle>What sold this month</SectionTitle>
        <Panel className="grid lg:grid-cols-3 lg:divide-x divide-y lg:divide-y-0" >
          <div className="p-6 min-w-0">
            <ColHead>Best sellers</ColHead>
            {d.month.topProducts.length === 0 ? (
              <p className="text-sm" style={{ color: C.muted }}>No sales this month yet.</p>
            ) : (
              <ol className="space-y-3">
                {d.month.topProducts.slice(0, 5).map((p, i) => (
                  <li key={p.label} className="flex items-center gap-3 text-[13px]">
                    <span
                      className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[12px] font-medium"
                      style={{ background: i === 0 ? '#EEF0FB' : '#F3F4F6', color: i === 0 ? '#2E3192' : C.muted }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate" style={{ color: C.ink }}>{p.label}</span>
                      <span className="block" style={{ color: C.muted }}>{p.qty} sold</span>
                    </span>
                    <span className="shrink-0 font-medium" style={{ color: C.ink }}>{tkShort(p.value)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="p-6 min-w-0" style={{ borderColor: C.line }}>
            <ColHead>By category</ColHead>
            <HBars
              rows={d.month.byCategory.map((c) => ({ label: c.label, value: c.value, display: tkShort(c.value) }))}
              empty="No sales this month yet."
            />
          </div>
          <div className="p-6 min-w-0" style={{ borderColor: C.line }}>
            <ColHead>How customers paid</ColHead>
            {d.month.byPayment.length === 0 ? (
              <p className="text-sm" style={{ color: C.muted }}>No payments this month.</p>
            ) : (
              <HBars
                rows={d.month.byPayment.map((p) => ({
                  label: p.label,
                  value: p.value,
                  display: tkShort(p.value),
                  note: `${Math.round((p.value / paySum) * 100)}%`
                }))}
                empty=""
              />
            )}
          </div>
        </Panel>
      </div>

      {/* Stock */}
      <div>
        <SectionTitle action={<LinkButton onClick={() => setActiveTab('inventory')}>Open inventory</LinkButton>}>Stock</SectionTitle>
        <Panel className="grid xl:grid-cols-[minmax(0,1fr)_360px] xl:divide-x divide-y xl:divide-y-0">
          <div className="p-6 min-w-0">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <Figure label="Units in stock" value={d.stock.units.toLocaleString('en-IN')} sub={`${d.stock.skus} products`} />
              {canSeeMoney ? (
                <Figure label="Value at cost" value={tkShort(d.stock.costValue)} sub={`${tkShort(d.stock.retailValue)} at retail`} />
              ) : (
                <Figure label="Value at retail" value={tkShort(d.stock.retailValue)} />
              )}
              <Figure label="Running low" value={String(low)} sub="Below alert level" />
              <Figure label="Out of stock" value={String(d.stock.outCount)} sub="Need restocking" />
            </dl>
            <div className="mt-6 pt-6 border-t" style={{ borderColor: C.line }}>
              <ColHead>Units by category</ColHead>
              <div className="grid gap-x-10 gap-y-3 md:grid-cols-2">
                <HBars
                  rows={d.stock.byCategory.slice(0, Math.ceil(d.stock.byCategory.length / 2)).map((c) => ({
                    label: c.label,
                    value: c.units,
                    display: c.units.toLocaleString('en-IN'),
                    note: c.low ? `${c.low} low` : undefined
                  }))}
                  empty="No stock recorded."
                />
                <HBars
                  rows={d.stock.byCategory.slice(Math.ceil(d.stock.byCategory.length / 2)).map((c) => ({
                    label: c.label,
                    value: c.units,
                    display: c.units.toLocaleString('en-IN'),
                    note: c.low ? `${c.low} low` : undefined
                  }))}
                  empty=""
                />
              </div>
            </div>
          </div>
          <div className="p-6 min-w-0" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between mb-2">
              <ColHead>Restock soon</ColHead>
              <span className="-mt-4">
                <LinkButton onClick={() => setActiveTab('suppliers')}>Suppliers</LinkButton>
              </span>
            </div>
            {d.stock.lowList.length === 0 ? (
              <p className="text-sm" style={{ color: C.muted }}>Nothing is running low.</p>
            ) : (
              <ul className="-mt-2">
                {d.stock.lowList.slice(0, 6).map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center gap-3 text-[13px] border-b last:border-b-0" style={{ borderColor: C.line }}>
                    <span className="w-9 h-9 shrink-0 rounded-lg bg-[#F3F3F1] flex items-center justify-center overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt="" loading="lazy" className="w-full h-full object-contain p-1 mix-blend-multiply" />
                      ) : (
                        <PackageX className="w-4 h-4" style={{ color: C.faint }} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate" style={{ color: C.ink }}>{p.name}</span>
                      <span className="block truncate" style={{ color: C.muted }}>{p.brand}{p.model ? `, ${p.model}` : ''}</span>
                    </span>
                    <span
                      className="shrink-0 text-[12px] px-2 py-0.5 rounded-full"
                      style={
                        p.stockQty <= 0
                          ? { background: '#FEF3F2', color: C.bad }
                          : { background: '#F3F4F6', color: C.ink }
                      }
                    >
                      {p.stockQty <= 0 ? 'Out' : `${p.stockQty} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      {/* Latest sales */}
      <div>
        <SectionTitle action={<LinkButton onClick={() => setActiveTab('invoices')}>All invoices</LinkButton>}>Latest sales</SectionTitle>
        <Panel className="overflow-hidden">
          {d.recent.length === 0 ? (
            <p className="text-sm p-6 text-center" style={{ color: C.muted }}>No sales yet. Sales you complete in POS appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[640px]">
                <thead>
                  <tr style={{ color: C.muted }}>
                    <th className="text-left font-normal px-6 pt-4 pb-2">Invoice</th>
                    <th className="text-left font-normal px-3 pt-4 pb-2">Customer</th>
                    <th className="text-left font-normal px-3 pt-4 pb-2">Business</th>
                    <th className="text-right font-normal px-3 pt-4 pb-2">Total</th>
                    <th className="text-right font-normal px-6 pt-4 pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent.map((s: SaleInvoice) => (
                    <tr
                      key={s.id}
                      onClick={() => setActiveReceiptInvoice(s)}
                      className="border-t cursor-pointer hover:bg-[#FAFAFB]"
                      style={{ borderColor: C.line }}
                    >
                      <td className="px-6 py-3">
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
                      <td className="px-6 py-3 text-right">
                        {s.dueAmount > 0 ? (
                          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: '#FEF3F2', color: C.bad }}>
                            {tkShort(s.dueAmount)} due
                          </span>
                        ) : (
                          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: '#ECFDF3', color: C.good }}>
                            Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};
