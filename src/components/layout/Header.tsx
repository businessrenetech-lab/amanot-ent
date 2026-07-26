import React from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router';
import { Building2, Store, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, activeBusiness, setActiveBusiness, logout } = useApp();
  const { navigate } = useRouter();

  const isSuperAdmin = currentUser.role === 'super_admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center font-black text-xs text-white shadow-md border-2 border-slate-900"
              title="Amanot Electronics (Konka, Gree, Haiko)"
            >
              <div className="flex flex-col items-center leading-none">
                <span className="text-[10px] font-black tracking-tighter">AE</span>
                <span className="text-[7px] text-cyan-200 font-bold">ELECT</span>
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-400 flex items-center justify-center font-black text-xs text-white shadow-md border-2 border-slate-900"
              title="Amanot Enterprise (Haier Authorized)"
            >
              <div className="flex flex-col items-center leading-none">
                <span className="text-[10px] font-black tracking-tighter">AE</span>
                <span className="text-[7px] text-emerald-100 font-bold">ENTER</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                <span>AMANOT</span>
                <span className="text-[11px] font-extrabold text-cyan-400">GROUP</span>
              </h1>
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  Electronics
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Enterprise
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              Business ERP — Back Office
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* View storefront */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="hidden md:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <Store className="w-3.5 h-3.5 text-blue-400" />
            <span>View Storefront</span>
          </a>

          {/* Business scope */}
          <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 text-[11px] uppercase font-bold">Scope:</span>
            <select
              value={activeBusiness}
              onChange={(e) => setActiveBusiness(e.target.value as any)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
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
          </div>

          {/* Current user + logout */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {isSuperAdmin
                  ? '⚡ Super Admin'
                  : `Staff (${
                      currentUser.assignedBusiness === 'amanot_electronics'
                        ? 'Electronics'
                        : currentUser.assignedBusiness === 'amanot_enterprise'
                        ? 'Enterprise'
                        : 'All'
                    })`}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
