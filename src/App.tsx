import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { RouterProvider, useRouter } from './router';
import { canAccessTab, firstAllowedTab } from './auth/permissions';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
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
    <div role="status" className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] inset-x-4 lg:inset-x-auto lg:bottom-6 lg:right-6 z-[100] bg-[#16181D] text-white font-medium text-sm px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      {toastMessage}
    </div>
  );
};

const FullScreenLoader: React.FC = () => (
  <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center text-[#6B7280]">
    <div className="flex items-center gap-3 text-sm font-semibold">
      <Loader2 className="w-5 h-5 animate-spin text-[#2E3192]" />
      Loading…
    </div>
  </div>
);

const NoAccess: React.FC = () => (
  <div className="bg-white border border-[#E6E7EA] rounded-xl p-12 text-center">
    <Ban className="w-8 h-8 text-[#9CA3AF] mx-auto mb-3" />
    <h2 className="text-base font-semibold">You don't have access to this page</h2>
    <p className="text-sm text-[#6B7280] mt-1">Ask a super admin to turn it on for your login.</p>
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

  // Sidebar: remembered per browser; the POS terminal always opens with it collapsed for room.
  const [sidebarPref, setSidebarPref] = useState<boolean>(() => {
    try {
      return localStorage.getItem('amanat_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [posExpanded, setPosExpanded] = useState(false);
  useEffect(() => {
    if (activeTab !== 'pos') setPosExpanded(false);
  }, [activeTab]);
  const collapsed = activeTab === 'pos' ? !posExpanded : sidebarPref;
  const toggleSidebar = () => {
    if (activeTab === 'pos') {
      setPosExpanded((v) => !v);
      return;
    }
    setSidebarPref((v) => {
      try {
        localStorage.setItem('amanat_sidebar_collapsed', v ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !v;
    });
  };

  return (
    <div className="admin-shell min-h-screen bg-[#F6F7F9] text-[#16181D] flex flex-col antialiased">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex-1 flex w-full">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} onToggle={toggleSidebar} />
        <main
          className={`flex-1 min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6 ${
            activeTab === 'pos' ? 'p-3 lg:p-4' : 'p-3 sm:p-5 lg:p-8'
          }`}
        >
          <div className={activeTab === 'pos' ? '' : 'mx-auto max-w-[1440px]'}>{renderERPView()}</div>
        </main>
      </div>
      <MobileNav />

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
