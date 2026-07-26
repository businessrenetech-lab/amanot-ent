import React from 'react';
import { useApp } from '../../context/AppContext';
import { canAccessTab } from '../../auth/permissions';
import { ERPTab } from '../../types';
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

interface SidebarProps {
  activeTab?: ERPTab;
  setActiveTab?: (tab: ERPTab) => void;
}

interface NavItem {
  tab: ERPTab;
  label: string;
  icon: React.ReactNode;
  badge?: { text: string; className: string };
  activeClass?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) => {
  const context = useApp();
  const activeTab = propActiveTab ?? context.activeTab;
  const setActiveTab = propSetActiveTab ?? context.setActiveTab;
  const currentUser = context.currentUser;
  const isSuperAdmin = currentUser.role === 'super_admin';

  const can = (tab: ERPTab) => canAccessTab(tab, currentUser);

  const renderButton = (item: NavItem) => {
    const isActive = activeTab === item.tab;
    const activeClass = item.activeClass ?? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md';
    return (
      <button
        key={item.tab}
        onClick={() => setActiveTab(item.tab)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
          isActive ? activeClass : 'hover:bg-slate-800 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {item.icon}
          <span>{item.label}</span>
        </div>
        {item.badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${item.badge.className}`}>
            {item.badge.text}
          </span>
        )}
      </button>
    );
  };

  const salesItems: NavItem[] = [
    {
      tab: 'pos',
      label: 'POS Terminal',
      icon: <ShoppingCart className="w-4 h-4 text-blue-400" />,
      badge: { text: 'Live', className: 'bg-emerald-500/20 text-emerald-300' },
    },
    { tab: 'invoices', label: 'Invoices & Sales', icon: <FileText className="w-4 h-4 text-cyan-400" /> },
    { tab: 'quotes', label: 'Quotes & Website Leads', icon: <FileCheck className="w-4 h-4 text-yellow-400" /> },
    { tab: 'installments', label: 'Monthly Installments', icon: <CalendarClock className="w-4 h-4 text-purple-400" /> },
  ];

  const opsItems: NavItem[] = [
    { tab: 'inventory', label: 'Inventory & Stock', icon: <Package className="w-4 h-4 text-emerald-400" /> },
    { tab: 'suppliers', label: 'Suppliers & Restock', icon: <Truck className="w-4 h-4 text-teal-400" /> },
    { tab: 'accounts', label: 'Bank & Accounts', icon: <Landmark className="w-4 h-4 text-blue-400" /> },
    { tab: 'expenses', label: 'Expense Manager', icon: <DollarSign className="w-4 h-4 text-rose-400" /> },
    { tab: 'crm', label: 'CRM & Alpha SMS', icon: <Users className="w-4 h-4 text-amber-400" /> },
  ];

  const visibleSales = salesItems.filter((i) => can(i.tab));
  const visibleOps = opsItems.filter((i) => can(i.tab));

  const Section: React.FC<{ title: string; items: NavItem[] }> = ({ title, items }) =>
    items.length === 0 ? null : (
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
        {items.map(renderButton)}
      </div>
    );

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] border-r border-slate-800 flex flex-col justify-between p-4 shrink-0 select-none rounded-2xl">
      <div className="space-y-6">
        {/* Permissions banner */}
        <div className="px-3 py-2 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logged User Permissions</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isSuperAdmin ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
            <span className="font-bold text-white text-xs">
              {isSuperAdmin ? 'Full Super Admin Access' : 'Staff Restricted Access'}
            </span>
          </div>
        </div>

        <Section title="POS & Sales" items={visibleSales} />
        <Section title="Products & Operations" items={visibleOps} />

        {/* Analytics */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Analytics & Reporting</p>
          {can('global_reports') &&
            renderButton({
              tab: 'global_reports',
              label: 'Global Reporting',
              icon: <BarChart3 className="w-4 h-4 text-fuchsia-400" />,
              badge: { text: 'Real', className: 'bg-purple-500/20 text-purple-300' },
              activeClass: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md',
            })}
          {renderButton({
            tab: 'audit_reports',
            label: isSuperAdmin ? 'Audit Reports (Tax)' : 'Reports',
            icon: <PieChart className="w-4 h-4 text-cyan-400" />,
          })}
        </div>

        {/* Administration */}
        {(can('rbac') || can('settings')) && (
          <div className="space-y-1 pt-2 border-t border-slate-800">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Administration</p>
            {can('rbac') &&
              renderButton({
                tab: 'rbac',
                label: 'Staff RBAC & Access',
                icon: <ShieldAlert className="w-4 h-4 text-orange-400" />,
              })}
            {can('settings') &&
              renderButton({
                tab: 'settings',
                label: 'System & SMS Settings',
                icon: <Settings className="w-4 h-4 text-slate-400" />,
              })}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
        Amanot Enterprise & Electronics v3.4
      </div>
    </aside>
  );
};
