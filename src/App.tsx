import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { RouterProvider, useRouter } from './router';
import { canAccessTab, firstAllowedTab } from './auth/permissions';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { POSView } from './components/pos/POSView';
import { InventoryView } from './components/inventory/InventoryView';
import { InvoicesView } from './components/sales/InvoicesView';
import { QuotesView } from './components/quotes/QuotesView';
import { InstallmentsView } from './components/installments/InstallmentsView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { AccountsView } from './components/accounts/AccountsView';
import { CRMView } from './components/crm/CRMView';
import { GlobalReportsView } from './components/reports/GlobalReportsView';
import { AuditReportsView } from './components/reports/AuditReportsView';
import { RBACManager } from './components/admin/RBACManager';
import { SettingsView } from './components/admin/SettingsView';
import { PublicStorefront } from './components/website/PublicStorefront';
import { LoginPage } from './components/auth/LoginPage';
import { BrandedReceiptModal } from './components/receipt/BrandedReceiptModal';
import { Loader2, Ban } from 'lucide-react';

const ToastHost: React.FC = () => {
  const { toastMessage } = useApp();
  if (!toastMessage) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      {toastMessage}
    </div>
  );
};

const FullScreenLoader: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
    <div className="flex items-center gap-3 text-sm font-semibold">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      Loading…
    </div>
  </div>
);

const NoAccess: React.FC = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
    <Ban className="w-10 h-10 text-rose-500 mx-auto mb-3" />
    <h2 className="text-lg font-black text-slate-900">Access Restricted</h2>
    <p className="text-sm text-slate-500 mt-1">
      Your role does not have permission to view this module. Contact a Super Admin.
    </p>
  </div>
);

const AdminApp: React.FC = () => {
  const {
    activeReceiptInvoice,
    setActiveReceiptInvoice,
    activeTab,
    setActiveTab,
    currentUser,
  } = useApp();

  // If the current tab isn't allowed for this user, jump to their first allowed one.
  useEffect(() => {
    if (!canAccessTab(activeTab, currentUser)) {
      setActiveTab(firstAllowedTab(currentUser));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser]);

  const renderERPView = () => {
    if (!canAccessTab(activeTab, currentUser)) return <NoAccess />;
    switch (activeTab) {
      case 'pos':
        return <POSView />;
      case 'inventory':
        return <InventoryView />;
      case 'invoices':
        return <InvoicesView />;
      case 'quotes':
        return <QuotesView />;
      case 'installments':
        return <InstallmentsView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'expenses':
        return <ExpensesView />;
      case 'accounts':
        return <AccountsView />;
      case 'crm':
        return <CRMView />;
      case 'global_reports':
        return currentUser.permissions.canViewGlobalReports ? (
          <GlobalReportsView />
        ) : (
          <AuditReportsView />
        );
      case 'audit_reports':
        return <AuditReportsView />;
      case 'rbac':
        return <RBACManager />;
      case 'settings':
        return <SettingsView />;
      case 'website':
        return <PublicStorefront />;
      default:
        return <POSView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col antialiased">
      <Header />
      <div className="flex-1 flex w-full p-4 md:p-6 gap-6">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 min-w-0">{renderERPView()}</main>
      </div>

      {activeReceiptInvoice && (
        <BrandedReceiptModal
          invoice={activeReceiptInvoice}
          onClose={() => setActiveReceiptInvoice(null)}
        />
      )}
    </div>
  );
};

const Routes: React.FC = () => {
  const { path, navigate } = useRouter();
  const { isAuthenticated, authReady } = useApp();

  useEffect(() => {
    if (path.startsWith('/admin') && authReady && !isAuthenticated) navigate('/login');
    if (path === '/login' && isAuthenticated) navigate('/admin');
  }, [path, authReady, isAuthenticated, navigate]);

  let page: React.ReactNode;
  if (path === '/login') {
    page = isAuthenticated ? <FullScreenLoader /> : <LoginPage />;
  } else if (path.startsWith('/admin')) {
    page = !authReady || !isAuthenticated ? <FullScreenLoader /> : <AdminApp />;
  } else {
    page = <PublicStorefront />;
  }

  return (
    <>
      {page}
      <ToastHost />
    </>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AppProvider>
        <Routes />
      </AppProvider>
    </RouterProvider>
  );
}
