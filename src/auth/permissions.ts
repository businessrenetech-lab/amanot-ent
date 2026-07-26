// ============================================================================
// RBAC: maps ERP tabs to the permission that gates them. Used by the sidebar
// (to hide items) and by App (to block direct access to a disallowed view).
// ============================================================================
import { ERPTab, StaffUser } from '../types';

type PermKey = keyof StaffUser['permissions'];

// Which permission each tab requires. `null` = always available to any logged-in user.
const TAB_PERMISSION: Record<ERPTab, PermKey | 'super_admin' | null> = {
  pos: 'canManagePOS',
  invoices: 'canManagePOS',
  quotes: 'canManagePOS',
  installments: 'canManagePOS',
  inventory: 'canManageInventory',
  suppliers: 'canManageInventory',
  expenses: 'canManageExpenses',
  crm: 'canManageCRM',
  global_reports: 'canViewGlobalReports',
  audit_reports: null,
  accounts: 'canManageExpenses',
  rbac: 'canManageRBAC',
  settings: 'super_admin',
  website: null,
};

export function canAccessTab(tab: ERPTab, user: StaffUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const req = TAB_PERMISSION[tab];
  if (req === null) return true;
  if (req === 'super_admin') return false;
  return !!user.permissions[req];
}

/** First tab the user is allowed to see (for a sensible default landing). */
export function firstAllowedTab(user: StaffUser | null | undefined): ERPTab {
  const order: ERPTab[] = [
    'pos',
    'inventory',
    'invoices',
    'crm',
    'expenses',
    'suppliers',
    'quotes',
    'installments',
    'audit_reports',
  ];
  for (const t of order) if (canAccessTab(t, user)) return t;
  return 'audit_reports';
}
