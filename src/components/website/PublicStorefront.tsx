import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router';
import { Product } from '../../types';
import { DEFAULT_BRAND_LOGOS } from '../../data/brandLogos';
import {
  AMANOT_ELECTRONICS_ADDRESS,
  AMANAT_ENTERPRISE_ADDRESS,
  AMANAT_ENTERPRISE_PHONE,
  resolveBusinessPhone
} from '../../constants/business';
import {
  Search,
  X,
  Phone,
  CheckCircle2,
  AirVent,
  Tv,
  Refrigerator,
  WashingMachine,
  Microwave,
  Fan,
  ArrowRight,
  Menu
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Storefront tokens. Colours come from the two showroom business cards.
// ---------------------------------------------------------------------------
const T = {
  ink: '#16181D',
  muted: '#646A73',
  line: '#E6E7EA',
  tile: '#F3F3F1',
  enterprise: '#2E3192', // Amanat Enterprise card band
  electronics: '#8DC63F', // Amanat Electronics card highlight
  electronicsInk: '#2F4A12'
};
const FONT = "'Hind Siliguri', ui-sans-serif, system-ui, sans-serif";

// 24 catalogue categories folded into six departments people actually shop by.
const DEPARTMENTS: { id: string; label: string; icon: React.FC<{ className?: string }>; categories: string[] }[] = [
  { id: 'ac', label: 'Air conditioners', icon: AirVent, categories: ['Air Conditioner', 'AC Control Panel', 'Air Curtain', 'Inverter AC'] },
  { id: 'tv', label: 'TVs', icon: Tv, categories: ['LED TV', 'Smart LED TV'] },
  { id: 'fridge', label: 'Fridges & freezers', icon: Refrigerator, categories: ['Refrigerator', 'Deep Fridge'] },
  { id: 'wash', label: 'Washing machines', icon: WashingMachine, categories: ['Washing Machine'] },
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: Microwave,
    categories: [
      'Microwave Oven', 'Rice Cooker', 'Air Fryer', 'Induction Cooker', 'Blender', 'Pressure Cooker',
      'Electric Kettle', 'Gas Stove', 'Kitchen Hood', 'Kitchen Hob'
    ]
  },
  { id: 'home', label: 'Home & comfort', icon: Fan, categories: [] } // everything else
];
const departmentOf = (category: string) =>
  DEPARTMENTS.find((d) => d.categories.includes(category)) || DEPARTMENTS[DEPARTMENTS.length - 1];

const PAGE = 24;

const firstNumber = (phones: string) => (phones.split(/[,/]/)[0] || '').replace(/[^\d+]/g, '');

// "GREE 1.0 TON Zeno Split Inverter AC (GS-12XZNA3V)" → "1.0 Ton Zeno Split Inverter AC"
const displayName = (p: Product) => {
  let n = p.name.trim();
  const model = (p.model || p.sku || '').trim();
  if (model && n.endsWith(`(${model})`)) n = n.slice(0, -model.length - 2).trim();
  if (n.toLowerCase().startsWith(p.brand.toLowerCase() + ' ')) n = n.slice(p.brand.length + 1);
  return n.replace(/\bTON\b/g, 'Ton').replace(/\bLTR\b/g, 'L').replace(/\bKG\b/g, 'kg');
};

// The one figure people compare first: tonnage, screen size, litres, kg.
const specLabel = (p: Product) => {
  const s = (p.size || '').trim();
  if (!/^\d/.test(s) || s.length > 9) return '';
  return s
    .replace(/\bTON\b/i, 'Ton')
    .replace(/\s*(Litre|Ltrs?)\.?$/i, ' L')
    .replace(/\s*KG$/i, ' kg')
    .replace(/"$/, '″');
};

const taka = (n: number) => `৳${n.toLocaleString('en-IN')}`;

export const PublicStorefront: React.FC = () => {
  const { products, settings, addQuotation, showToast } = useApp();
  const { navigate } = useRouter();

  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollToId = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  const goToDept = (id: string) => {
    setDept(id);
    scrollToId('products');
  };
  const [brand, setBrand] = useState<string>('all');
  const [limit, setLimit] = useState(PAGE);
  const [detail, setDetail] = useState<Product | null>(null);
  const [quoteFor, setQuoteFor] = useState<Product | null>(null);

  const showPrices = settings.showPricesOnWebsite;
  const allowQuotes = settings.allowOnlineQuoteRequest !== false;

  const showrooms = {
    amanot_electronics: {
      name: 'Amanat Electronics',
      brands: 'Gree, Konka and Haiko',
      address: settings.amanotElectronicsAddress || AMANOT_ELECTRONICS_ADDRESS,
      phone: resolveBusinessPhone(settings.amanotElectronicsPhone)
    },
    amanot_enterprise: {
      name: 'Amanat Enterprise',
      brands: 'Haier exclusive showroom',
      address: AMANAT_ENTERPRISE_ADDRESS,
      phone: AMANAT_ENTERPRISE_PHONE
    }
  } as const;

  const logoFor = (b: string) => {
    const key = b.trim().toLowerCase();
    return settings.brandLogos?.[key] || DEFAULT_BRAND_LOGOS[key];
  };

  const brandList = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products]
  );

  const allDeptCounts = useMemo(() => {
    const c: Record<string, number> = {};
    products.forEach((p) => {
      const d = departmentOf(p.category).id;
      c[d] = (c[d] || 0) + 1;
    });
    return c;
  }, [products]);

  const deptCounts = useMemo(() => {
    const c: Record<string, number> = {};
    products.forEach((p) => {
      if (brand !== 'all' && p.brand !== brand) return;
      const d = departmentOf(p.category).id;
      c[d] = (c[d] || 0) + 1;
    });
    return c;
  }, [products, brand]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (brand !== 'all' && p.brand !== brand) return false;
      if (dept !== 'all' && departmentOf(p.category).id !== dept) return false;
      if (!q) return true;
      return [p.name, p.brand, p.category, p.sku, p.model || ''].some((s) => s.toLowerCase().includes(q));
    });
  }, [products, brand, dept, query]);

  useEffect(() => setLimit(PAGE), [brand, dept, query]);

  // Close dialogs with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (quoteFor) setQuoteFor(null);
      else if (detail) setDetail(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, quoteFor]);

  const resetFilters = () => {
    setQuery('');
    setDept('all');
    setBrand('all');
  };

  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: FONT, color: T.ink }}>
      <style>{`
        .sf-num { font-variant-numeric: tabular-nums; }
        .sf-focus:focus-visible { outline: 2px solid ${T.enterprise}; outline-offset: 2px; }
        .sf-scroll { scrollbar-width: none; }
        .sf-sheet { animation: sf-sheet-in .22s ease-out; }
        @keyframes sf-sheet-in { from { transform: translateX(24px); opacity: .6; } }
        @media (prefers-reduced-motion: reduce) { .sf-sheet { animation: none; } }
        .sf-scroll::-webkit-scrollbar { display: none; }
        .sf-cat { transition: border-color .2s, box-shadow .2s; }
        .sf-cat:hover { border-color: #CFd2D6; box-shadow: 0 10px 30px -12px rgba(22,24,29,.18); }
        .sf-cat-icon {
          color: ${T.ink};
          background: linear-gradient(145deg, #FFFFFF 0%, #ECEDEF 100%);
          box-shadow: inset 0 0 0 1px rgba(22,24,29,.06), 0 1px 2px rgba(22,24,29,.06), 0 6px 14px -6px rgba(22,24,29,.18);
        }
        .sf-cat:hover .sf-cat-icon { color: #fff; background: linear-gradient(145deg, #3A3DA8 0%, ${T.enterprise} 100%); }
        @media (prefers-reduced-motion: reduce) { .sf-cat, .sf-cat * { transition: none !important; } }
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur supports-[backdrop-filter]:bg-white/85 bg-white"
        style={{ borderColor: T.line }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
          <a href="/" className="sf-focus rounded text-xl font-bold tracking-tight shrink-0">
            Amanat
          </a>
          <nav aria-label="Departments" className="hidden lg:flex items-center gap-1 text-[15px]">
            {DEPARTMENTS.filter((d) => (allDeptCounts[d.id] || 0) > 0).map((d) => (
              <button
                key={d.id}
                onClick={() => goToDept(d.id)}
                aria-current={dept === d.id ? 'true' : undefined}
                className="sf-focus px-3 h-9 rounded-full transition-colors hover:bg-[#F3F3F1]"
                style={{ color: dept === d.id ? T.ink : T.muted, fontWeight: dept === d.id ? 600 : 400 }}
              >
                {d.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => scrollToId('showrooms')}
              className="sf-focus hidden md:inline-flex px-3 h-9 items-center rounded-full text-[15px] hover:bg-[#F3F3F1]"
              style={{ color: T.muted }}
            >
              Showrooms
            </button>
            <a
              href={`tel:${firstNumber(showrooms.amanot_electronics.phone)}`}
              className="sf-focus hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold text-white"
              style={{ background: T.ink }}
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
            <button
              onClick={() => setMenuOpen(true)}
              className="sf-focus lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F3F3F1]"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/30" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[min(20rem,86vw)] bg-white shadow-xl flex flex-col sf-sheet">
            <div className="h-16 px-4 flex items-center justify-between border-b" style={{ borderColor: T.line }}>
              <span className="text-lg font-bold">Amanat</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="sf-focus w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F3F3F1]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2" aria-label="Menu">
              {DEPARTMENTS.filter((d) => (allDeptCounts[d.id] || 0) > 0).map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    onClick={() => goToDept(d.id)}
                    className="sf-focus w-full flex items-center gap-3 px-3 h-12 rounded-lg text-left text-[16px] hover:bg-[#F3F3F1]"
                  >
                    <Icon className="w-5 h-5" style={{ color: T.muted }} />
                    <span className="flex-1">{d.label}</span>
                    <span className="text-sm" style={{ color: T.muted }}>
                      {allDeptCounts[d.id]}
                    </span>
                  </button>
                );
              })}
              <div className="my-2 border-t" style={{ borderColor: T.line }} />
              <button
                onClick={() => scrollToId('showrooms')}
                className="sf-focus w-full flex items-center px-3 h-12 rounded-lg text-left text-[16px] hover:bg-[#F3F3F1]"
              >
                Showrooms
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="sf-focus w-full flex items-center px-3 h-12 rounded-lg text-left text-[16px] hover:bg-[#F3F3F1]"
                style={{ color: T.muted }}
              >
                Staff login
              </button>
            </nav>
            <div className="p-4 grid gap-2 border-t" style={{ borderColor: T.line }}>
              <a
                href={`tel:${firstNumber(showrooms.amanot_electronics.phone)}`}
                className="sf-focus h-11 rounded-full flex items-center justify-center gap-2 text-sm font-semibold text-white"
                style={{ background: T.ink }}
              >
                <Phone className="w-4 h-4" /> Call Electronics
              </a>
              <a
                href={`tel:${firstNumber(showrooms.amanot_enterprise.phone)}`}
                className="sf-focus h-11 rounded-full flex items-center justify-center gap-2 text-sm font-semibold border"
                style={{ borderColor: T.line }}
              >
                <Phone className="w-4 h-4" /> Call Enterprise
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: '#EFEFEC' }}>
        <img
          src="/hero-showroom.webp"
          alt=""
          className="hidden md:block absolute inset-0 h-full w-full object-cover object-right"
        />
        <div
          className="hidden md:block absolute inset-0"
          style={{ background: 'linear-gradient(90deg, #EFEFEC 0%, rgba(239,239,236,.92) 38%, rgba(239,239,236,0) 62%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8 md:py-24 lg:py-28">
          <div className="max-w-md lg:max-w-lg">
            <h1 className="text-[2.1rem] sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.06] tracking-tight">
              Air conditioners, TVs and home appliances in Feni
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed" style={{ color: T.muted }}>
              Gree, Konka, Haiko and Haier with official warranty, from two showrooms in town.
            </p>
            <form
              className="mt-7 relative"
              onSubmit={(e) => {
                e.preventDefault();
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <label className="sr-only" htmlFor="hero-search">Search products</label>
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
              <input
                id="hero-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a model, e.g. 1.5 ton inverter"
                className="w-full rounded-full bg-white pl-12 pr-28 py-4 text-base outline-none shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.06)] focus:ring-2 focus:ring-[#2E3192]"
              />
              <button
                type="submit"
                className="sf-focus absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: T.ink }}
              >
                Search
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {(['amanot_electronics', 'amanot_enterprise'] as const).map((key) => (
                <a
                  key={key}
                  href={`tel:${firstNumber(showrooms[key].phone)}`}
                  className="sf-focus inline-flex items-center gap-2 rounded font-medium hover:underline underline-offset-4"
                >
                  <Phone className="w-4 h-4" style={{ color: key === 'amanot_enterprise' ? T.enterprise : T.electronicsInk }} />
                  Call {showrooms[key].name.replace('Amanat ', '')}
                </a>
              ))}
            </div>
          </div>
        </div>
        <img src="/hero-showroom-mobile.webp" alt="" className="md:hidden block w-full aspect-[4/3] object-cover object-bottom" />
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16">
        <h2 className="text-2xl font-bold tracking-tight">Shop by category</h2>
        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {DEPARTMENTS.map((d) => {
            const count = allDeptCounts[d.id] || 0;
            if (!count) return null;
            const Icon = d.icon;
            return (
              <li key={d.id}>
                <button
                  onClick={() => {
                    setDept(d.id);
                    setBrand('all');
                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="sf-focus sf-cat group w-full h-full text-left rounded-2xl border bg-white p-4 sm:p-5 flex flex-col items-start justify-start"
                  style={{ borderColor: T.line }}
                >
                  <span className="sf-cat-icon flex h-14 w-14 items-center justify-center rounded-2xl">
                    <Icon className="w-7 h-7" strokeWidth={1.5} />
                  </span>
                  <span className="mt-4 block font-semibold leading-snug">{d.label}</span>
                  <span className="mt-0.5 w-full flex items-center justify-between text-sm sf-num" style={{ color: T.muted }}>
                    {count} products
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Catalogue */}
      <main id="products" className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 scroll-mt-16">
        <h2 className="text-2xl font-bold tracking-tight mb-4">All products</h2>
        <div className="sticky top-16 z-20 bg-white/95 backdrop-blur pt-3 pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b" style={{ borderColor: T.line }}>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search products</span>
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by model or product, e.g. 1.5 ton inverter"
                className="w-full rounded-full border pl-10 pr-4 py-2.5 text-base sm:text-sm outline-none focus:border-[#2E3192]"
                style={{ borderColor: T.line, background: '#fff' }}
              />
            </label>
            <div className="flex gap-1 overflow-x-auto sf-scroll" role="group" aria-label="Brand">
              {['all', ...brandList].map((b) => {
                const active = brand === b;
                return (
                  <button
                    key={b}
                    onClick={() => setBrand(b)}
                    aria-pressed={active}
                    className="sf-focus shrink-0 rounded-full px-3.5 py-1.5 text-sm"
                    style={active ? { background: T.ink, color: '#fff' } : { color: T.muted }}
                  >
                    {b === 'all' ? 'All brands' : b}
                  </button>
                );
              })}
            </div>
          </div>

          <nav className="mt-3 flex gap-5 overflow-x-auto sf-scroll text-sm" aria-label="Departments">
            {[{ id: 'all', label: 'Everything' }, ...DEPARTMENTS].map((d) => {
              const active = dept === d.id;
              const count = d.id === 'all' ? undefined : deptCounts[d.id] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={d.id}
                  onClick={() => setDept(d.id)}
                  aria-pressed={active}
                  className="sf-focus shrink-0 pb-1 border-b-2 transition-colors"
                  style={{ borderColor: active ? T.ink : 'transparent', color: active ? T.ink : T.muted, fontWeight: active ? 600 : 400 }}
                >
                  {d.label}
                  {count !== undefined && <span className="sf-num ml-1.5" style={{ color: T.muted }}>{count}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <p className="mt-6 text-sm sf-num" style={{ color: T.muted }}>
          {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
        </p>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold">Nothing matches that search</p>
            <p className="mt-1 text-sm" style={{ color: T.muted }}>Try a shorter model number, or clear the filters.</p>
            <button onClick={resetFilters} className="sf-focus mt-5 rounded-full border px-5 py-2 text-sm font-semibold" style={{ borderColor: T.ink }}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
              {filtered.slice(0, limit).map((p) => {
                const Icon = departmentOf(p.category).icon;
                const logo = logoFor(p.brand);
                const img = p.image || p.images?.[0];
                const spec = specLabel(p);
                return (
                  <li key={p.id}>
                    <button onClick={() => setDetail(p)} className="sf-focus group w-full text-left rounded-xl">
                      <div className="relative aspect-[3/2] rounded-xl flex items-center justify-center overflow-hidden" style={{ background: T.tile }}>
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-contain p-3 mix-blend-multiply" referrerPolicy="no-referrer" loading="lazy" />
                        ) : spec ? (
                          <span className="sf-num text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: T.ink }}>{spec}</span>
                        ) : (
                          <Icon className="w-10 h-10 opacity-30" />
                        )}
                        {logo ? (
                          <img src={logo} alt={p.brand} className="absolute left-2.5 top-2.5 h-7 w-auto max-w-[50%] object-contain" />
                        ) : (
                          <span className="absolute left-3 top-3 text-xs font-semibold">{p.brand}</span>
                        )}
                      </div>
                      <h3 className="mt-3 text-[15px] font-semibold leading-snug line-clamp-2 group-hover:underline underline-offset-4">
                        {displayName(p)}
                      </h3>
                      <p className="mt-0.5 text-xs truncate" style={{ color: T.muted }}>{p.model || p.sku}</p>
                      <p className="mt-1.5 text-base font-bold sf-num">
                        {showPrices ? taka(p.retailPrice) : <span className="font-medium text-sm" style={{ color: T.muted }}>Call for price</span>}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>

            {filtered.length > limit && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => setLimit((l) => l + PAGE)}
                  className="sf-focus rounded-full border px-6 py-2.5 text-sm font-semibold hover:bg-[#F3F3F1]"
                  style={{ borderColor: T.ink }}
                >
                  Show more <span className="sf-num font-normal" style={{ color: T.muted }}>({filtered.length - limit} left)</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Showrooms */}
      <section id="showrooms" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 scroll-mt-20">
        <h2 className="text-2xl font-bold tracking-tight">Visit our showrooms</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(['amanot_electronics', 'amanot_enterprise'] as const).map((key) => {
            const s = showrooms[key];
            const isEnt = key === 'amanot_enterprise';
            return (
              <div key={key} className="rounded-2xl overflow-hidden border" style={{ borderColor: T.line }}>
                <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{s.name}</h3>
                    <p className="mt-0.5 text-sm" style={{ color: T.muted }}>{s.brands}</p>
                    <p className="mt-3 text-sm sf-num">{s.phone}</p>
                  </div>
                  <a
                    href={`tel:${firstNumber(s.phone)}`}
                    className="sf-focus shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                    style={{ background: isEnt ? T.enterprise : T.electronicsInk }}
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                </div>
                <p
                  className="px-5 sm:px-6 py-3 text-sm font-medium"
                  style={isEnt ? { background: T.enterprise, color: '#fff' } : { background: T.electronics, color: T.electronicsInk }}
                >
                  {s.address}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: T.line }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 text-sm">
          {(['amanot_electronics', 'amanot_enterprise'] as const).map((key) => {
            const s = showrooms[key];
            return (
              <div key={key}>
                <p className="font-semibold">{s.name}</p>
                <p className="mt-1" style={{ color: T.muted }}>{s.address}</p>
                <p className="mt-1 sf-num" style={{ color: T.muted }}>{s.phone}</p>
              </div>
            );
          })}
        </div>
        <p className="max-w-6xl mx-auto px-4 sm:px-6 pb-8 text-xs" style={{ color: T.muted }}>
          © {new Date().getFullYear()} Amanat Group, Feni
        </p>
      </footer>

      {/* Product details */}
      {detail && (() => {
        const s = showrooms[detail.business];
        const Icon = departmentOf(detail.category).icon;
        const img = detail.image || detail.images?.[0];
        const logo = logoFor(detail.brand);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => setDetail(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={displayName(detail)}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
            >
              <div className="grid sm:grid-cols-2">
                <div
                  className={`relative ${img ? 'aspect-[4/3]' : 'aspect-[2/1]'} sm:aspect-auto sm:min-h-[22rem] flex items-center justify-center`}
                  style={{ background: T.tile }}
                >
                  {img ? (
                    <img src={img} alt="" className="h-full w-full object-contain p-6 mix-blend-multiply" referrerPolicy="no-referrer" />
                  ) : specLabel(detail) ? (
                    <span className="sf-num text-5xl font-bold tracking-tight">{specLabel(detail)}</span>
                  ) : (
                    <Icon className="w-16 h-16 opacity-25" />
                  )}
                  <button
                    onClick={() => setDetail(null)}
                    className="sf-focus absolute top-3 right-3 sm:hidden rounded-full bg-white p-2"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 sm:p-7 flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    {logo ? <img src={logo} alt={detail.brand} className="h-8 w-auto -ml-1" /> : <span className="font-semibold">{detail.brand}</span>}
                    <button onClick={() => setDetail(null)} className="sf-focus hidden sm:block rounded-full p-1 -m-1" aria-label="Close" style={{ color: T.muted }}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold leading-tight">{displayName(detail)}</h2>
                  <p className="mt-1 text-sm" style={{ color: T.muted }}>Model {detail.model || detail.sku}</p>

                  {showPrices && <p className="mt-5 text-3xl font-bold sf-num">{taka(detail.retailPrice)}</p>}

                  <dl className="mt-5 text-sm divide-y divide-[#E6E7EA] border-y border-[#E6E7EA]">
                    {detail.warranty && (
                      <div className="py-2.5 flex justify-between gap-4">
                        <dt style={{ color: T.muted }}>Warranty</dt>
                        <dd className="text-right">{detail.warranty}</dd>
                      </div>
                    )}
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt style={{ color: T.muted }}>Sold at</dt>
                      <dd className="text-right">{s.name}</dd>
                    </div>
                  </dl>

                  {(detail.storefrontDescription || detail.description) && (
                    <p className="mt-4 text-sm leading-relaxed" style={{ color: T.muted }}>
                      {detail.storefrontDescription || detail.description}
                    </p>
                  )}

                  <div className="mt-6 sm:mt-auto pt-2 flex flex-col gap-2">
                    <a
                      href={`tel:${firstNumber(s.phone)}`}
                      className="sf-focus inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white"
                      style={{ background: detail.business === 'amanot_enterprise' ? T.enterprise : T.electronicsInk }}
                    >
                      <Phone className="w-4 h-4" />
                      Call {s.name}
                    </a>
                    {allowQuotes && (
                      <button
                        onClick={() => {
                          setQuoteFor(detail);
                          setDetail(null);
                        }}
                        className="sf-focus rounded-full border py-3 text-sm font-semibold"
                        style={{ borderColor: T.ink }}
                      >
                        Ask for a price
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {quoteFor && (
        <QuoteDialog
          product={quoteFor}
          showroomName={showrooms[quoteFor.business].name}
          onClose={() => setQuoteFor(null)}
          onSubmit={(name, phone, address, notes) => {
            addQuotation({
              business: quoteFor.business,
              customerName: name,
              customerPhone: phone,
              customerAddress: address || 'Website Inquirer',
              source: 'website_inquiry',
              items: [{ productId: quoteFor.id, quantity: 1, unitPrice: quoteFor.retailPrice }],
              notes: notes || `Inquiry for ${quoteFor.name}`
            });
          }}
          onDone={() => {
            setQuoteFor(null);
            showToast('Price request sent. We will call you soon.');
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
const QuoteDialog: React.FC<{
  product: Product;
  showroomName: string;
  onClose: () => void;
  onSubmit: (name: string, phone: string, address: string, notes: string) => void;
  onDone: () => void;
}> = ({ product, showroomName, onClose, onSubmit, onDone }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [sent, setSent] = useState(false);

  const field = 'mt-1 w-full rounded-xl border px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-[#2E3192]';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSubmit(name.trim(), phone.trim(), address.trim(), notes.trim());
    setSent(true);
    setTimeout(onDone, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask for a price"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6"
        style={{ fontFamily: FONT, color: T.ink }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Ask for a price</h2>
            <p className="mt-1 text-sm" style={{ color: T.muted }}>
              {displayName(product)}
              <br />
              Model {product.model || product.sku}
            </p>
          </div>
          <button onClick={onClose} className="sf-focus rounded-full p-1 -m-1" aria-label="Close" style={{ color: T.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: T.enterprise }} />
            <p className="mt-3 font-semibold">Request sent</p>
            <p className="mt-1 text-sm" style={{ color: T.muted }}>{showroomName} will call you on the number you gave.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4 text-sm">
            <label className="block">
              <span className="font-medium">Your name</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={field} style={{ borderColor: T.line }} autoComplete="name" />
            </label>
            <label className="block">
              <span className="font-medium">Mobile number</span>
              <input
                required
                type="tel"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${field} sf-num`}
                style={{ borderColor: T.line }}
                autoComplete="tel"
              />
            </label>
            <label className="block">
              <span className="font-medium">Area <span style={{ color: T.muted }}>(optional)</span></span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Feni Sadar" className={field} style={{ borderColor: T.line }} />
            </label>
            <label className="block">
              <span className="font-medium">Anything else <span style={{ color: T.muted }}>(optional)</span></span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quantity, installation, EMI…" className={field} style={{ borderColor: T.line }} />
            </label>
            <button type="submit" className="sf-focus w-full rounded-full py-3 font-semibold text-white" style={{ background: T.enterprise }}>
              Send request
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
