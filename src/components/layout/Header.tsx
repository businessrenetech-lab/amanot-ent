import React from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router';
import { Store, LogOut, PanelLeft } from 'lucide-react';
import { getNavSections } from './Sidebar';

/** Business scope picker (All / Electronics / Enterprise), limited to what the user may see. */
export const BusinessScopeSelect: React.FC<{ className?: string; selectClassName?: string; tone?: 'light' | 'dark' }> = ({
  className = '',
  selectClassName = '',
  tone = 'light'
}) => {
  const { currentUser, activeBusiness, setActiveBusiness } = useApp();
  const isSuperAdmin = currentUser.role === 'super_admin';
  const dark = tone === 'dark';
  const dot =
    activeBusiness === 'amanot_electronics' ? '#5E9B1E' : activeBusiness === 'amanot_enterprise' ? '#2E3192' : '#9CA3AF';
  return (
    <label
      className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-sm ${
        dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#E6E7EA] text-[#16181D]'
      } ${className}`}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} aria-hidden />
      <span className="sr-only">Business</span>
      <select
        value={activeBusiness}
        onChange={(e) => setActiveBusiness(e.target.value as any)}
        className={`min-w-0 flex-1 bg-transparent font-medium focus:outline-none cursor-pointer ${selectClassName}`}
      >
        {isSuperAdmin && <option value="all">Both businesses</option>}
        {(isSuperAdmin || currentUser.assignedBusiness === 'amanot_electronics') && (
          <option value="amanot_electronics">Amanat Electronics</option>
        )}
        {(isSuperAdmin || currentUser.assignedBusiness === 'amanot_enterprise') && (
          <option value="amanot_enterprise">Amanat Enterprise</option>
        )}
      </select>
    </label>
  );
};

export const roleLabel = (user: { role: string; assignedBusiness?: string }) =>
  user.role === 'super_admin'
    ? 'Super admin'
    : `Staff, ${
        user.assignedBusiness === 'amanot_electronics'
          ? 'Electronics'
          : user.assignedBusiness === 'amanot_enterprise'
          ? 'Enterprise'
          : 'both businesses'
      }`;

export const Header: React.FC<{ onToggleSidebar?: () => void }> = ({ onToggleSidebar }) => {
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

  const initials = currentUser.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="bg-white border-b border-[#E6E7EA] sticky top-0 z-40 pt-[env(safe-area-inset-top)] print:hidden">
      <div className="w-full px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#16181D]"
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>
          )}
          <span className="text-[17px] font-bold tracking-tight text-[#16181D] lg:pl-1">Amanat</span>
          {pageTitle && (
            <>
              <span className="text-[#D1D5DB]" aria-hidden>/</span>
              <span className="text-sm font-medium text-[#3B4049] truncate">{pageTitle}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BusinessScopeSelect className="hidden lg:flex" />
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#16181D]"
            title="Open website"
            aria-label="Open website"
          >
            <Store className="w-[18px] h-[18px]" />
          </a>
          <div className="flex items-center gap-2 pl-2 lg:ml-1 lg:border-l border-[#E6E7EA]">
            <span className="w-8 h-8 rounded-full bg-[#EEF0FB] text-[#2E3192] text-xs font-semibold flex items-center justify-center" aria-hidden>
              {initials}
            </span>
            <div className="hidden xl:block leading-tight">
              <p className="text-sm font-medium text-[#16181D]">{currentUser.name}</p>
              <p className="text-xs text-[#6B7280]">{roleLabel(currentUser)}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
