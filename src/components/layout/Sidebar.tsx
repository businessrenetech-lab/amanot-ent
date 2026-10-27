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
      title: 'POS & Sales',
      items: [
        {
          tab: 'pos',
          label: 'POS Terminal',
          short: 'POS',
          Icon: ShoppingCart,
          tint: 'text-blue-400',
          badge: { text: 'Live', className: 'bg-emerald-500/20 text-emerald-300' },
        },
        { tab: 'invoices', label: 'Invoices & Sales', short: 'Sales', Icon: FileText, tint: 'text-cyan-400' },
        { tab: 'quotes', label: 'Quotes & Website Leads', short: 'Quotes', Icon: FileCheck, tint: 'text-yellow-400' },
        { tab: 'installments', label: 'Monthly Installments', short: 'EMI', Icon: CalendarClock, tint: 'text-purple-400' },
      ],
    },
    {
      title: 'Products & Operations',
      items: [
        { tab: 'inventory', label: 'Inventory & Stock', short: 'Stock', Icon: Package, tint: 'text-emerald-400' },
        { tab: 'suppliers', label: 'Suppliers & Restock', short: 'Suppliers', Icon: Truck, tint: 'text-teal-400' },
        { tab: 'accounts', label: 'Bank & Accounts', short: 'Accounts', Icon: Landmark, tint: 'text-blue-400' },
        { tab: 'expenses', label: 'Expense Manager', short: 'Expenses', Icon: DollarSign, tint: 'text-rose-400' },
        { tab: 'crm', label: 'CRM & Alpha SMS', short: 'CRM', Icon: Users, tint: 'text-amber-400' },
      ],
    },
    {
      title: 'Analytics & Reporting',
      items: [
        {
          tab: 'global_reports',
          label: 'Global Reporting',
          short: 'Reports',
          Icon: BarChart3,
          tint: 'text-fuchsia-400',
          badge: { text: 'Real', className: 'bg-purple-500/20 text-purple-300' },
          activeClass: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md',
        },
        {
          tab: 'audit_reports',
          label: isSuperAdmin ? 'Audit Reports (Tax)' : 'Reports',
          short: isSuperAdmin ? 'Audit' : 'Reports',
          Icon: PieChart,
          tint: 'text-cyan-400',
        },
      ],
    },
    {
      title: 'Administration',
      divided: true,
      items: [
        { tab: 'rbac', label: 'Staff RBAC & Access', short: 'Staff', Icon: ShieldAlert, tint: 'text-orange-400' },
        { tab: 'settings', label: 'System & SMS Settings', short: 'Settings', Icon: Settings, tint: 'text-slate-400' },
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
}

/** Grouped ERP navigation, shared by the desktop sidebar and the mobile menu sheet. */
export const NavMenu: React.FC<NavMenuProps> = ({ activeTab, onSelect }) => {
  const { currentUser } = useApp();
  return (
    <>
      {getNavSections(currentUser).map((section) => (
        <div key={section.title} className={`space-y-1 ${section.divided ? 'pt-2 border-t border-slate-800' : ''}`}>
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{section.title}</p>
          {section.items.map(({ tab, label, Icon, tint, badge, activeClass }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onSelect(tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? activeClass ?? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${tint}`} />
                  <span>{label}</span>
                </span>
                {badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${badge.className}`}>{badge.text}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
};

interface SidebarProps {
  activeTab?: ERPTab;
  setActiveTab?: (tab: ERPTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }) => {
  const context = useApp();
  const activeTab = propActiveTab ?? context.activeTab;
  const setActiveTab = propSetActiveTab ?? context.setActiveTab;
  const isSuperAdmin = context.currentUser.role === 'super_admin';

  return (
    <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] border-r border-slate-800 flex-col justify-between p-4 shrink-0 select-none rounded-2xl">
      <div className="space-y-6">
        <div className="px-3 py-2 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logged User Permissions</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isSuperAdmin ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
            <span className="font-bold text-white text-xs">
              {isSuperAdmin ? 'Full Super Admin Access' : 'Staff Restricted Access'}
            </span>
          </div>
        </div>

        <NavMenu activeTab={activeTab} onSelect={setActiveTab} />
      </div>

      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
        Amanot Enterprise & Electronics v3.4
      </div>
    </aside>
  );
};
