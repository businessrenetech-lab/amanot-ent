import React from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router';
import { Building2, Store, LogOut } from 'lucide-react';
import { getNavSections } from './Sidebar';

/** Business scope picker (All / Electronics / Enterprise), limited to what the user may see. */
export const BusinessScopeSelect: React.FC<{ className?: string; selectClassName?: string }> = ({
  className = '',
  selectClassName = '',
}) => {
  const { currentUser, activeBusiness, setActiveBusiness } = useApp();
  const isSuperAdmin = currentUser.role === 'super_admin';
  return (
    <label className={`flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs ${className}`}>
      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      <span className="text-slate-400 text-[11px] uppercase font-bold">Scope:</span>
      <select
        value={activeBusiness}
        onChange={(e) => setActiveBusiness(e.target.value as any)}
        className={`min-w-0 flex-1 bg-transparent text-white font-semibold focus:outline-none cursor-pointer ${selectClassName}`}
      >
        {isSuperAdmin && (
          <option value="all" className="bg-slate-900">
            All Businesses (Global)
          </option>
        )}
        {(isSuperAdmin || currentUser.assignedBusiness === 'amanot_electronics') && (
          <option value="amanot_electronics" className="bg-slate-900">
            Amanot Electronics (Gree, Konka, Haiko)
          </option>
        )}
        {(isSuperAdmin || currentUser.assignedBusiness === 'amanot_enterprise') && (
          <option value="amanot_enterprise" className="bg-slate-900">
            Amanot Enterprise (Haier)
          </option>
        )}
      </select>
    </label>
  );
};

export const roleLabel = (user: { role: string; assignedBusiness?: string }) =>
  user.role === 'super_admin'
    ? '⚡ Super Admin'
    : `Staff (${
        user.assignedBusiness === 'amanot_electronics'
          ? 'Electronics'
          : user.assignedBusiness === 'amanot_enterprise'
          ? 'Enterprise'
          : 'All'
      })`;

export const Header: React.FC = () => {
  const { currentUser, activeTab, logout } = useApp();
  const { navigate } = useRouter();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitle =
    getNavSections(currentUser)
      .flatMap((s) => s.items)
      .find((i) => i.tab === activeTab)?.label ?? '';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg pt-[env(safe-area-inset-top)]">
      <div className="w-full px-3 sm:px-6 lg:px-8 h-14 lg:h-16 flex items-center justify-between gap-3">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5 lg:gap-3 min-w-0">
          <div className="flex items-center -space-x-2 shrink-0">
            <div
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center font-black text-xs text-white shadow-md border-2 border-slate-900"
              title="Amanot Electronics (Konka, Gree, Haiko)"
            >
              <div className="flex flex-col items-center leading-none">
                <span className="text-[10px] font-black tracking-tighter">AE</span>
                <span className="text-[7px] text-cyan-200 font-bold">ELECT</span>
              </div>
            </div>
            <div
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-400 flex items-center justify-center font-black text-xs text-white shadow-md border-2 border-slate-900"
              title="Amanot Enterprise (Haier Authorized)"
            >
              <div className="flex flex-col items-center leading-none">
                <span className="text-[10px] font-black tracking-tighter">AE</span>
                <span className="text-[7px] text-emerald-100 font-bold">ENTER</span>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm lg:text-base tracking-tight text-white flex items-center gap-1.5">
                <span>AMANOT</span>
                <span className="text-[11px] font-extrabold text-cyan-400">GROUP</span>
              </h1>
              <div className="hidden xl:flex items-center gap-1">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  Electronics
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Enterprise
                </span>
              </div>
            </div>
            {/* Phones show the current screen; desktop shows the tagline. */}
            <p className="text-[11px] text-slate-300 font-semibold truncate lg:hidden">{pageTitle}</p>
            <p className="text-[10px] text-slate-400 font-medium hidden lg:block">Business ERP — Back Office</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="hidden lg:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <Store className="w-3.5 h-3.5 text-blue-400" />
            <span>View Storefront</span>
          </a>

          <BusinessScopeSelect className="hidden lg:flex" />

          <div className="flex items-center gap-2 bg-slate-800/80 px-1.5 lg:px-2.5 py-1 rounded-xl border border-slate-700">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-white leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{roleLabel(currentUser)}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
