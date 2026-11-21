import React from 'react';
import { useApp } from '../../context/AppContext';
import { canAccessTab } from '../../auth/permissions';
import { ERPTab, StaffUser } from '../../types';
import {
  ShoppingCart,
  Package,
  FileText,
  FileCheck,
  CalendarClock,
  Truck,
  DollarSign,
  Users,
  BarChart3,
  ShieldAlert,
  Settings,
  PieChart,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export type { ERPTab };

export interface NavItem {
  tab: ERPTab;
  label: string;
  /** Short label for the mobile bottom tab bar. */
  short: string;
  Icon: React.ComponentType<{ className?: string }>;
  tint: string;
  badge?: { text: string; className: string };
  activeClass?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  divided?: boolean;
}

/** The ERP menu for this user, already filtered by RBAC. */
export function getNavSections(user: StaffUser): NavSection[] {
  const isSuperAdmin = user.role === 'super_admin';
  const sections: NavSection[] = [
    {
      title: 'Sell',
      items: [
        {
          tab: 'pos',
          label: 'POS',
          short: 'POS',
          Icon: ShoppingCart,
          tint: 'text-blue-400',
          badge: { text: 'Live', className: 'bg-emerald-500/20 text-emerald-300' },
        },
        { tab: 'invoices', label: 'Sales & invoices', short: 'Sales', Icon: FileText, tint: 'text-cyan-400' },
        { tab: 'quotes', label: 'Quotes & leads', short: 'Quotes', Icon: FileCheck, tint: 'text-yellow-400' },
        { tab: 'installments', label: 'Installments', short: 'EMI', Icon: CalendarClock, tint: 'text-purple-400' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { tab: 'inventory', label: 'Inventory', short: 'Stock', Icon: Package, tint: 'text-emerald-400' },
        { tab: 'suppliers', label: 'Suppliers', short: 'Suppliers', Icon: Truck, tint: 'text-teal-400' },
        { tab: 'accounts', label: 'Accounts', short: 'Accounts', Icon: Landmark, tint: 'text-blue-400' },
        { tab: 'expenses', label: 'Expenses', short: 'Expenses', Icon: DollarSign, tint: 'text-rose-400' },
        { tab: 'crm', label: 'Customers & SMS', short: 'CRM', Icon: Users, tint: 'text-amber-400' },
      ],
    },
    {
      title: 'Reports',
      items: [
        {
          tab: 'global_reports',
          label: 'Reports',
          short: 'Reports',
          Icon: BarChart3,
          tint: 'text-fuchsia-400',
          badge: { text: 'Real', className: 'bg-purple-500/20 text-purple-300' },
          activeClass: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md',
        },
        {
          tab: 'audit_reports',
          label: isSuperAdmin ? 'Audit reports' : 'Reports',
          short: isSuperAdmin ? 'Audit' : 'Reports',
          Icon: PieChart,
          tint: 'text-cyan-400',
        },
      ],
    },
    {
      title: 'Admin',
      divided: true,
      items: [
        { tab: 'rbac', label: 'Staff & access', short: 'Staff', Icon: ShieldAlert, tint: 'text-orange-400' },
        { tab: 'settings', label: 'Settings', short: 'Settings', Icon: Settings, tint: 'text-slate-400' },
      ],
    },
  ];

  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => canAccessTab(i.tab, user)) }))
    .filter((s) => s.items.length > 0);
}

interface NavMenuProps {
  activeTab: ERPTab;
  onSelect: (tab: ERPTab) => void;
  /** Icon-only rail (desktop sidebar collapsed). */
  collapsed?: boolean;
  /** Colours for the dark mobile sheet. */
  tone?: 'light' | 'dark';
}

/** Grouped ERP navigation, shared by the desktop sidebar and the mobile menu sheet. */
export const NavMenu: React.FC<NavMenuProps> = ({ activeTab, onSelect, collapsed = false, tone = 'light' }) => {
  const { currentUser } = useApp();
  const dark = tone === 'dark';
  return (
    <div className="space-y-5">
      {getNavSections(currentUser).map((section) => (
        <div key={section.title}>
          {collapsed ? (
            <div className={`mx-3 mb-2 h-px ${dark ? 'bg-slate-800' : 'bg-[#ECEDF0]'}`} />
          ) : (
            <p className={`px-3 mb-1.5 text-xs font-medium ${dark ? 'text-slate-500' : 'text-[#8A9099]'}`}>{section.title}</p>
          )}
          <div className="space-y-0.5">
            {section.items.map(({ tab, label, Icon }) => {
              const isActive = activeTab === tab;
              const cls = dark
                ? isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                : isActive
                ? 'bg-[#EEF0FB] text-[#2E3192] font-semibold'
                : 'text-[#3B4049] hover:bg-[#F3F4F6] hover:text-[#16181D]';
              return (
                <button
                  key={tab}
                  onClick={() => onSelect(tab)}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2E3192] ${
                    collapsed ? 'justify-center h-10' : 'px-3 h-9'
                  } ${cls}`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

interface SidebarProps {
  activeTab?: ERPTab;
  setActiveTab?: (tab: ERPTab) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  collapsed = false,
  onToggle
}) => {
  const context = useApp();
  const activeTab = propActiveTab ?? context.activeTab;
  const setActiveTab = propSetActiveTab ?? context.setActiveTab;

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 select-none bg-white border-r border-[#E6E7EA] sticky top-14 h-[calc(100vh-3.5rem)] transition-[width] duration-200 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      <nav aria-label="Main" className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        <NavMenu activeTab={activeTab} onSelect={setActiveTab} collapsed={collapsed} />
      </nav>
      {onToggle && (
        <button
          onClick={onToggle}
          className={`m-3 h-9 flex items-center gap-2 rounded-lg text-sm text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#16181D] ${
            collapsed ? 'justify-center' : 'px-3'
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      )}
    </aside>
  );
};
