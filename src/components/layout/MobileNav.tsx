import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router';
import { ERPTab } from '../../types';
import { LayoutGrid, Store, X } from 'lucide-react';
import { getNavSections, NavMenu } from './Sidebar';
import { BusinessScopeSelect, roleLabel } from './Header';

// Screens most used at the counter; the first four the user may open become bottom tabs.
const PRIMARY_TABS: ERPTab[] = ['pos', 'invoices', 'inventory', 'global_reports', 'audit_reports', 'crm', 'expenses'];

/** Phone/tablet navigation: a bottom tab bar plus a "More" sheet with the full menu. Hidden from lg up. */
export const MobileNav: React.FC = () => {
  const { currentUser, activeTab, setActiveTab } = useApp();
  const { navigate } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const allItems = getNavSections(currentUser).flatMap((s) => s.items);
  const primary = PRIMARY_TABS.map((t) => allItems.find((i) => i.tab === t))
    .filter((i): i is NonNullable<typeof i> => !!i)
    // Global and audit reports share one slot.
    .filter((i, _, arr) => !(i.tab === 'audit_reports' && arr.some((x) => x.tab === 'global_reports')))
    .slice(0, 4);
  const moreActive = !primary.some((i) => i.tab === activeTab);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const go = (tab: ERPTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <nav
        aria-label="Main"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)] print:hidden"
      >
        <div className="grid grid-cols-5 h-16">
          {primary.map(({ tab, short, Icon }) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => go(tab)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 ${
                  active ? 'text-white' : 'text-slate-400'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-12 h-7 rounded-full transition ${
                    active ? 'bg-blue-600 shadow-md shadow-blue-900/50' : ''
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                {short}
              </button>
            );
          })}
          <button
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition active:scale-95 ${
              moreActive ? 'text-white' : 'text-slate-400'
            }`}
          >
            <span
              className={`flex items-center justify-center w-12 h-7 rounded-full transition ${
                moreActive ? 'bg-blue-600 shadow-md shadow-blue-900/50' : ''
              }`}
            >
              <LayoutGrid className="w-[18px] h-[18px]" />
            </span>
            More
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          />
          <div className="absolute bottom-0 inset-x-0 max-h-[88vh] flex flex-col bg-slate-900 text-slate-300 rounded-t-3xl border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-slate-700" />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pb-3 border-b border-slate-800">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{roleLabel(currentUser)}</p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 py-4 space-y-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="space-y-2">
                <BusinessScopeSelect className="w-full py-2.5" selectClassName="text-sm" />
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    navigate('/');
                  }}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-200"
                >
                  <Store className="w-3.5 h-3.5 text-blue-400" />
                  View Storefront
                </a>
              </div>
              <NavMenu activeTab={activeTab} onSelect={go} />
              <p className="pt-2 text-[11px] text-slate-500 text-center">Amanot Enterprise & Electronics v3.4</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
