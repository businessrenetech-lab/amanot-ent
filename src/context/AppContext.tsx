import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  API_ENABLED,
  fetchState,
  fetchPublicCatalog,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  getToken,
  submitPublicQuote,
  pushCollection,
  pushSingleton,
  pushMasterList
} from '../api/sync';
import { findCustomerByPhone, normalizePhone } from '../utils/phone';
import {
  BusinessType,
  ERPTab,
  Product,
  Customer,
  Supplier,
  Expense,
  StaffUser,
  AuditConfig,
  AppSettings,
  SaleInvoice,
  Quotation,
  InstallmentPlan,
  SMSLog,
  PurchaseOrder,
  SupplierRequisition,
  RequisitionItem,
  StockAdjustment,
  DamageLog,
  SupplierReturn,
  CustomerReturn,
  Account,
  AccountTransfer,
  SupplierPayment,
  PaymentMode
} from '../types';
import {
  applySalePaymentToAccounts,
  ensureBusinessCashAccounts,
  resolveBusinessAccount,
  resolvePaymentAccount
} from '../utils/paymentAccounts';
import {
  INITIAL_STAFF_USERS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_EXPENSES,
  INITIAL_SALES,
  INITIAL_INSTALLMENT_PLANS,
  INITIAL_QUOTATIONS,
  INITIAL_SMS_LOGS,
  INITIAL_AUDIT_CONFIG,
  INITIAL_APP_SETTINGS,
  INITIAL_SUPPLIER_REQUISITIONS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_ACCOUNTS,
  INITIAL_ACCOUNT_TRANSFERS,
  INITIAL_SUPPLIER_PAYMENTS
} from '../data/initialData';

interface AppContextType {
  // Navigation / Auth / Environment
  currentMode: 'website' | 'erp';
  setCurrentMode: (mode: 'website' | 'erp') => void;
  activeTab: ERPTab;
  setActiveTab: (tab: ERPTab) => void;
  currentUser: StaffUser;
  setCurrentUser: (user: StaffUser) => void;
  staffUsers: StaffUser[];

  // Authentication (real login via backend)
  isAuthenticated: boolean;
  authReady: boolean; // initial token check finished
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateStaffUsers: (users: StaffUser[]) => void;
  activeBusiness: 'all' | BusinessType;
  setActiveBusiness: (business: 'all' | BusinessType) => void;

  // Editing POS Sale State
  editingSaleInvoice: SaleInvoice | null;
  setEditingSaleInvoice: (invoice: SaleInvoice | null) => void;
  loadSaleIntoPOS: (invoice: SaleInvoice) => void;

  // App Settings & Audit Config
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  auditConfig: AuditConfig;
  updateAuditConfig: (newConfig: Partial<AuditConfig>) => void;

  // Dynamic Brands & Categories
  brands: string[];
  addBrand: (brandName: string) => void;
  categories: string[];
  addCategory: (categoryName: string) => void;

  // Custom Expense Items & Categories
  expenseCategories: string[];
  addExpenseCategory: (categoryName: string) => void;
  deleteExpenseCategory: (categoryName: string) => void;

  // Custom CRM Lists & Groups
  crmGroups: string[];
  addCrmGroup: (groupName: string) => void;
  crmLeadSources: string[];
  addCrmLeadSource: (sourceName: string) => void;

  // Inventory Control: Stock Adjustments, Damage Control, Returns
  stockAdjustments: StockAdjustment[];
  addStockAdjustment: (adj: Omit<StockAdjustment, 'id' | 'createdAt' | 'performedBy'>) => void;

  damageLogs: DamageLog[];
  addDamageLog: (damage: Omit<DamageLog, 'id' | 'createdAt' | 'reportedBy'>) => void;

  supplierReturns: SupplierReturn[];
  addSupplierReturn: (ret: Omit<SupplierReturn, 'id' | 'createdAt' | 'createdBy'>) => void;

  customerReturns: CustomerReturn[];
  addCustomerReturn: (ret: Omit<CustomerReturn, 'id' | 'createdAt' | 'createdBy'>) => void;

  // Core Collections
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  bulkUpdateProducts: (
    ids: string[],
    updates: Partial<Product> | ((product: Product) => Partial<Product>),
    options?: { stockReason?: string }
  ) => void;
  bulkDeleteProducts: (ids: string[]) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'totalPurchases' | 'currentDue' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, updated: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  importCustomersFromExcel: (newCustomers: Array<{ name: string; phone: string; address: string; notes?: string }>) => number;

  sales: SaleInvoice[];
  addSale: (saleData: {
    business: BusinessType;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: Array<{
      productId: string;
      quantity: number;
      priceType: 'retail' | 'wholesale';
      unitPrice: number;
      discount: number;
      includeInstallationFee?: boolean;
      installationFee?: number;
      extraPipingFt?: number;
      extraPipingFee?: number;
    }>;
    discountTotal: number;
    specialDiscount?: number;
    specialDiscountMode?: 'amount' | 'percent';
    specialDiscountRate?: number;
    referralName?: string;
    taxAmount: number;
    paidAmount: number;
    paymentMode: PaymentMode;
    accountId?: string;
    customerPaymentNumber?: string;
    isInstallment: boolean;
    installmentMonths?: number;
    downPayment?: number;
    notes?: string;
    isDraft?: boolean;
  }) => SaleInvoice;
  updateSale: (
    invoiceId: string,
    saleData: {
      business: BusinessType;
      customerId: string;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      items: Array<{
        productId: string;
        quantity: number;
        priceType: 'retail' | 'wholesale';
        unitPrice: number;
        discount: number;
        includeInstallationFee?: boolean;
        installationFee?: number;
        extraPipingFt?: number;
        extraPipingFee?: number;
      }>;
      discountTotal: number;
      specialDiscount?: number;
      specialDiscountMode?: 'amount' | 'percent';
      specialDiscountRate?: number;
      referralName?: string;
      taxAmount: number;
      paidAmount: number;
      paymentMode: PaymentMode;
      accountId?: string;
      customerPaymentNumber?: string;
      isInstallment: boolean;
      installmentMonths?: number;
      downPayment?: number;
      notes?: string;
      isDraft?: boolean;
    }
  ) => SaleInvoice;
  deleteSale: (invoiceId: string) => void;
  payInvoiceDue: (
    invoiceId: string,
    amountPaid: number,
    paymentMode?: Exclude<PaymentMode, 'installment'>,
    accountId?: string
  ) => void;

  installmentPlans: InstallmentPlan[];
  processInstallmentPayment: (
    planId: string,
    installmentNo: number,
    amount: number,
    customSchedule?: InstallmentPlan['schedule'],
    payment?: { accountId?: string; paymentMode?: InstallmentPlan['schedule'][number]['paymentMode'] }
  ) => void;
  updateInstallmentPlan: (planId: string, updatedPlan: Partial<InstallmentPlan>) => void;

  quotations: Quotation[];
  addQuotation: (quoteData: {
    business: BusinessType;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    source: 'pos_walkin' | 'website_inquiry';
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    notes?: string;
  }) => Quotation;
  updateQuotation: (id: string, updated: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  convertQuoteToSale: (quoteId: string) => void;

  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'balance'>) => void;
  
  // Requisitions & POs
  supplierRequisitions: SupplierRequisition[];
  addSupplierRequisition: (reqData: Omit<SupplierRequisition, 'id' | 'createdAt' | 'createdByStaffName'>) => SupplierRequisition;
  updateSupplierRequisition: (id: string, updated: Partial<SupplierRequisition>) => void;
  deleteSupplierRequisition: (id: string) => void;

  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (poData: {
    business: BusinessType;
    supplierId: string;
    items: Array<{
      productId: string;
      quantity: number;
      costPrice: number;
    }>;
    paidAmount: number;
    notes?: string;
  }) => void;
  processBulkProductEntry: (data: {
    business: BusinessType;
    supplierId: string;
    items: Array<RequisitionItem>;
    paidAmount: number;
    notes?: string;
    requisitionId?: string;
    accountId?: string;
    paymentMethod?: 'cash' | 'bank' | 'mfs' | 'cheque';
  }) => void;
  updatePurchaseOrder: (id: string, updated: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;

  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'recordedBy'>) => void;
  updateExpense: (id: string, updated: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Financial Accounts & Transfers
  accounts: Account[];
  addAccount: (accData: Omit<Account, 'id' | 'createdAt' | 'currentBalance'> & { openingBalance?: number }) => void;
  updateAccount: (id: string, updatedFields: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  accountTransfers: AccountTransfer[];
  addAccountTransfer: (trData: Omit<AccountTransfer, 'id' | 'createdAt' | 'createdBy'>) => void;
  updateAccountTransfer: (id: string, updatedFields: Partial<AccountTransfer>) => void;
  deleteAccountTransfer: (id: string) => void;

  supplierPayments: SupplierPayment[];
  addSupplierPayment: (payData: Omit<SupplierPayment, 'id' | 'createdAt' | 'recordedBy'>) => void;
  updateSupplierPayment: (id: string, updatedFields: Partial<SupplierPayment>) => void;
  deleteSupplierPayment: (id: string) => void;

  smsLogs: SMSLog[];
  sendSMS: (phone: string, name: string, message: string, type: SMSLog['type'], business: BusinessType) => void;

  // Active Receipt Modal
  activeReceiptInvoice: SaleInvoice | null;
  setActiveReceiptInvoice: (invoice: SaleInvoice | null) => void;
  
  // Quick Quote Modal Trigger for Website
  websiteQuoteModalProduct: Product | null;
  setWebsiteQuoteModalProduct: (product: Product | null) => void;

  // Notification Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMode, setCurrentMode] = useState<'website' | 'erp'>('erp');
  const [activeTab, setActiveTab] = useState<ERPTab>('pos');
  const [editingSaleInvoice, setEditingSaleInvoice] = useState<SaleInvoice | null>(null);

  const loadSaleIntoPOS = (invoice: SaleInvoice) => {
    // Check permission: Posted sales can only be edited by super_admin
    if (!invoice.isDraft && currentUser.role !== 'super_admin') {
      showToast('Permission Denied: Posted sales can only be edited by Super Admin.');
      return;
    }
    setEditingSaleInvoice(invoice);
    setActiveTab('pos');
  };
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() => {
    const saved = localStorage.getItem('amanot_staff');
    return saved ? JSON.parse(saved) : INITIAL_STAFF_USERS;
  });
  const [currentUser, setCurrentUser] = useState<StaffUser>(staffUsers[0]);

  const [activeBusiness, setActiveBusiness] = useState<'all' | BusinessType>('all');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('amanot_settings');
    return saved ? JSON.parse(saved) : INITIAL_APP_SETTINGS;
  });
  const [auditConfig, setAuditConfig] = useState<AuditConfig>(() => {
    const saved = localStorage.getItem('amanot_audit_config');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_CONFIG;
  });

  const [brands, setBrands] = useState<string[]>(() => {
    const saved = localStorage.getItem('amanot_brands');
    if (saved) return JSON.parse(saved);
    const defaults = ['Gree', 'Konka', 'Haiko', 'Haier', 'Singer', 'Samsung', 'Walton', 'LG', 'Vision', 'Chigo'];
    const fromProducts = INITIAL_PRODUCTS.map((p) => p.brand);
    return Array.from(new Set([...defaults, ...fromProducts]));
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('amanot_categories');
    if (saved) return JSON.parse(saved);
    const defaults = ['Inverter AC', 'Smart LED TV', 'Refrigerator', 'Washing Machine', 'Deep Fridge', 'Microwave Oven', 'Home Appliance'];
    const fromProducts = INITIAL_PRODUCTS.map((p) => p.category);
    return Array.from(new Set([...defaults, ...fromProducts]));
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('amanot_expense_categories');
    if (saved) return JSON.parse(saved);
    return [
      'Shop Rent',
      'Electricity & Utility',
      'Staff Salary & Allowance',
      'Transport & Freight',
      'Entertainment & Tea',
      'Marketing & Promo',
      'Repair & Maintenance',
      'Legal & License',
      'Office Supplies',
      'Other'
    ];
  });

  const [crmGroups, setCrmGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem('amanot_crm_groups');
    if (saved) return JSON.parse(saved);
    return ['General', 'VIP Club', 'Wholesale Buyers', 'Installment EMI Clients', 'Website Leads', 'Corporate', 'Inactive'];
  });

  const [crmLeadSources, setCrmLeadSources] = useState<string[]>(() => {
    const saved = localStorage.getItem('amanot_crm_lead_sources');
    if (saved) return JSON.parse(saved);
    return ['Showroom Walk-in', 'Website Inquiry', 'Facebook Campaign', 'Phone Call', 'Referral', 'Agent Network'];
  });

  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() => {
    const saved = localStorage.getItem('amanot_stock_adjustments');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'ADJ-101',
        business: 'amanot_electronics',
        productId: 'prod_1',
        productName: 'Gree 1.5 Ton Inverter AC - Fairy Series',
        sku: 'GREE-15-INV',
        brand: 'Gree',
        category: 'Inverter AC',
        adjustmentType: 'increase',
        quantity: 2,
        reason: 'Physical Audit Count Surplus',
        notes: 'Found 2 extra units during physical inventory audit.',
        performedBy: 'Amanot Admin',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [damageLogs, setDamageLogs] = useState<DamageLog[]>(() => {
    const saved = localStorage.getItem('amanot_damage_logs');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'DMG-101',
        business: 'amanot_electronics',
        productId: 'prod_2',
        productName: 'Konka 43 Inch Smart Android LED TV',
        sku: 'KONKA-43-TV',
        brand: 'Konka',
        category: 'Smart LED TV',
        quantity: 1,
        unitCost: 28000,
        totalLoss: 28000,
        cause: 'Transport Transit Damage',
        actionTaken: 'written_off',
        notes: 'Screen crack occurred during truck loading.',
        reportedBy: 'Warehouse Inspector',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>(() => {
    const saved = localStorage.getItem('amanot_supplier_returns');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'RET-SUP-2026-001',
        business: 'amanot_electronics',
        supplierId: 'sup_1',
        supplierName: 'Gree Bangladesh (Electro Mart Ltd)',
        items: [
          {
            productId: 'prod_1',
            productName: 'Gree 1.5 Ton Inverter AC - Fairy Series',
            sku: 'GREE-15-INV',
            brand: 'Gree',
            category: 'Inverter AC',
            quantity: 1,
            unitCost: 48000,
            totalCost: 48000
          }
        ],
        totalRefundAmount: 48000,
        refundMode: 'supplier_credit',
        reason: 'Factory PCB Defect on Arrival',
        notes: 'Credited to supplier balance account.',
        createdBy: 'Amanot Manager',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [customerReturns, setCustomerReturns] = useState<CustomerReturn[]>(() => {
    const saved = localStorage.getItem('amanot_customer_returns');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'RET-CUST-2026-001',
        invoiceId: 'INV-2026-001',
        business: 'amanot_electronics',
        customerId: 'cust_1',
        customerName: 'Kazi Mahbubur Rahman',
        customerPhone: '01711223344',
        items: [
          {
            productId: 'prod_1',
            productName: 'Gree 1.5 Ton Inverter AC - Fairy Series',
            sku: 'GREE-15-INV',
            brand: 'Gree',
            category: 'Inverter AC',
            quantity: 1,
            unitPrice: 58000,
            totalAmount: 58000,
            condition: 'good_restock'
          }
        ],
        totalRefundAmount: 58000,
        refundMode: 'cash',
        restockItems: true,
        reason: 'Customer requested model upgrade',
        notes: 'Restocked item to active inventory and issued cash refund.',
        createdBy: 'Sales Counter 1',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('amanot_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('amanot_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });
  const [sales, setSales] = useState<SaleInvoice[]>(() => {
    const saved = localStorage.getItem('amanot_sales');
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>(() => {
    const saved = localStorage.getItem('amanot_installment_plans');
    return saved ? JSON.parse(saved) : INITIAL_INSTALLMENT_PLANS;
  });
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    const saved = localStorage.getItem('amanot_quotations');
    return saved ? JSON.parse(saved) : INITIAL_QUOTATIONS;
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('amanot_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });
  const [supplierRequisitions, setSupplierRequisitions] = useState<SupplierRequisition[]>(() => {
    const saved = localStorage.getItem('amanot_requisitions');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER_REQUISITIONS;
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('amanot_purchase_orders');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASE_ORDERS;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('amanot_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('amanot_accounts');
    // Backfill guarantees each business owns a cash drawer, so counter takings never pool
    return ensureBusinessCashAccounts(saved ? JSON.parse(saved) : INITIAL_ACCOUNTS);
  });
  const [accountTransfers, setAccountTransfers] = useState<AccountTransfer[]>(() => {
    const saved = localStorage.getItem('amanot_account_transfers');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNT_TRANSFERS;
  });
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>(() => {
    const saved = localStorage.getItem('amanot_supplier_payments');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER_PAYMENTS;
  });

  useEffect(() => {
    localStorage.setItem('amanot_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('amanot_account_transfers', JSON.stringify(accountTransfers));
  }, [accountTransfers]);

  useEffect(() => {
    localStorage.setItem('amanot_supplier_payments', JSON.stringify(supplierPayments));
  }, [supplierPayments]);

  const [smsLogs, setSmsLogs] = useState<SMSLog[]>(() => {
    const saved = localStorage.getItem('amanot_sms_logs');
    return saved ? JSON.parse(saved) : INITIAL_SMS_LOGS;
  });

  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<SaleInvoice | null>(null);
  const [websiteQuoteModalProduct, setWebsiteQuoteModalProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // ===========================================================================
  // Authentication + cloud (MySQL) sync — active only when VITE_API_BASE is set.
  //  - No token: load the PUBLIC catalog only (storefront works, no writes).
  //  - Valid token: load the FULL state and enable debounced write-back.
  // localStorage stays as an offline cache.
  // ===========================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(!API_ENABLED);
  const hydratedRef = useRef(false);
  const authRef = useRef(false);

  const applyMasterLists = (ml: any) => {
    if (!ml) return;
    if (ml.brands) setBrands(ml.brands);
    if (ml.categories) setCategories(ml.categories);
    if (ml.expenseCategories) setExpenseCategories(ml.expenseCategories);
    if (ml.crmGroups) setCrmGroups(ml.crmGroups);
    if (ml.crmLeadSources) setCrmLeadSources(ml.crmLeadSources);
  };

  const applyPublicCatalog = (cat: any) => {
    if (!cat) return;
    if (cat.products) setProducts(cat.products);
    if (cat.settings) setSettings(cat.settings);
    applyMasterLists(cat.masterLists);
  };

  const applyFullState = (state: any) => {
    if (!state) return;
    if (state.staffUsers) setStaffUsers(state.staffUsers);
    if (state.products) setProducts(state.products);
    if (state.customers) setCustomers(state.customers);
    if (state.suppliers) setSuppliers(state.suppliers);
    if (state.sales) setSales(state.sales);
    if (state.installmentPlans) setInstallmentPlans(state.installmentPlans);
    if (state.quotations) setQuotations(state.quotations);
    if (state.supplierRequisitions) setSupplierRequisitions(state.supplierRequisitions);
    if (state.purchaseOrders) setPurchaseOrders(state.purchaseOrders);
    if (state.expenses) setExpenses(state.expenses);
    if (state.accounts) setAccounts(ensureBusinessCashAccounts(state.accounts));
    if (state.accountTransfers) setAccountTransfers(state.accountTransfers);
    if (state.supplierPayments) setSupplierPayments(state.supplierPayments);
    if (state.smsLogs) setSmsLogs(state.smsLogs);
    if (state.stockAdjustments) setStockAdjustments(state.stockAdjustments);
    if (state.damageLogs) setDamageLogs(state.damageLogs);
    if (state.supplierReturns) setSupplierReturns(state.supplierReturns);
    if (state.customerReturns) setCustomerReturns(state.customerReturns);
    if (state.settings) setSettings(state.settings);
    if (state.auditConfig) setAuditConfig(state.auditConfig);
    applyMasterLists(state.masterLists);
  };

  useEffect(() => {
    let cancelled = false;
    if (!API_ENABLED) {
      hydratedRef.current = true;
      setAuthReady(true);
      return;
    }
    (async () => {
      if (getToken()) {
        const me = await fetchMe();
        if (cancelled) return;
        if (me) {
          setCurrentUser(me as unknown as StaffUser);
          setIsAuthenticated(true);
          authRef.current = true;
          if ((me as any).assignedBusiness && (me as any).assignedBusiness !== 'all') {
            setActiveBusiness((me as any).assignedBusiness);
          }
          const state = await fetchState();
          if (!cancelled) applyFullState(state);
          return;
        }
        apiLogout(); // token invalid/expired
      }
      const cat = await fetchPublicCatalog();
      if (!cancelled) applyPublicCatalog(cat);
    })().finally(() => {
      if (!cancelled) {
        hydratedRef.current = true;
        setAuthReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    if (res.ok && res.user) {
      const user = res.user as unknown as StaffUser;
      setCurrentUser(user);
      setIsAuthenticated(true);
      authRef.current = true;
      hydratedRef.current = true;
      if (user.assignedBusiness && user.assignedBusiness !== 'all') {
        setActiveBusiness(user.assignedBusiness);
      }
      const state = await fetchState();
      applyFullState(state);
      showToast(`Welcome, ${user.name}`);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  };

  const logout = () => {
    apiLogout();
    setIsAuthenticated(false);
    authRef.current = false;
    showToast('Signed out');
  };

  const updateStaffUsers = (users: StaffUser[]) => {
    setStaffUsers(users);
    showToast('Staff access & permissions updated.');
  };

  // Debounced push-back to the API (authenticated sessions only).
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('staffUsers', staffUsers); }, [staffUsers]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('products', products); }, [products]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('customers', customers); }, [customers]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('suppliers', suppliers); }, [suppliers]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('sales', sales); }, [sales]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('installmentPlans', installmentPlans); }, [installmentPlans]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('quotations', quotations); }, [quotations]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('supplierRequisitions', supplierRequisitions); }, [supplierRequisitions]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('purchaseOrders', purchaseOrders); }, [purchaseOrders]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('expenses', expenses); }, [expenses]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('smsLogs', smsLogs); }, [smsLogs]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('stockAdjustments', stockAdjustments); }, [stockAdjustments]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('damageLogs', damageLogs); }, [damageLogs]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('supplierReturns', supplierReturns); }, [supplierReturns]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushCollection('customerReturns', customerReturns); }, [customerReturns]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushSingleton('settings', settings); }, [settings]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushSingleton('auditConfig', auditConfig); }, [auditConfig]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushMasterList('brands', brands); }, [brands]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushMasterList('categories', categories); }, [categories]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushMasterList('expenseCategories', expenseCategories); }, [expenseCategories]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushMasterList('crmGroups', crmGroups); }, [crmGroups]);
  useEffect(() => { if (hydratedRef.current && authRef.current) pushMasterList('crmLeadSources', crmLeadSources); }, [crmLeadSources]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('amanot_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('amanot_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('amanot_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('amanot_installment_plans', JSON.stringify(installmentPlans));
  }, [installmentPlans]);

  useEffect(() => {
    localStorage.setItem('amanot_quotations', JSON.stringify(quotations));
  }, [quotations]);

  useEffect(() => {
    localStorage.setItem('amanot_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('amanot_requisitions', JSON.stringify(supplierRequisitions));
  }, [supplierRequisitions]);

  useEffect(() => {
    localStorage.setItem('amanot_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem('amanot_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('amanot_sms_logs', JSON.stringify(smsLogs));
  }, [smsLogs]);

  useEffect(() => {
    localStorage.setItem('amanot_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('amanot_audit_config', JSON.stringify(auditConfig));
  }, [auditConfig]);

  useEffect(() => {
    localStorage.setItem('amanot_brands', JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem('amanot_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('amanot_expense_categories', JSON.stringify(expenseCategories));
  }, [expenseCategories]);

  useEffect(() => {
    localStorage.setItem('amanot_crm_groups', JSON.stringify(crmGroups));
  }, [crmGroups]);

  useEffect(() => {
    localStorage.setItem('amanot_crm_lead_sources', JSON.stringify(crmLeadSources));
  }, [crmLeadSources]);

  useEffect(() => {
    localStorage.setItem('amanot_stock_adjustments', JSON.stringify(stockAdjustments));
  }, [stockAdjustments]);

  useEffect(() => {
    localStorage.setItem('amanot_damage_logs', JSON.stringify(damageLogs));
  }, [damageLogs]);

  useEffect(() => {
    localStorage.setItem('amanot_supplier_returns', JSON.stringify(supplierReturns));
  }, [supplierReturns]);

  useEffect(() => {
    localStorage.setItem('amanot_customer_returns', JSON.stringify(customerReturns));
  }, [customerReturns]);

  const addBrand = (brandName: string) => {
    const trimmed = brandName.trim();
    if (!trimmed) return;
    setBrands((prev) => (prev.some((b) => b.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]));
  };

  const addCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setCategories((prev) => (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]));
  };

  const addExpenseCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setExpenseCategories((prev) => (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]));
    showToast(`New expense category "${trimmed}" added.`);
  };

  const deleteExpenseCategory = (categoryName: string) => {
    setExpenseCategories((prev) => prev.filter((c) => c !== categoryName));
    showToast(`Expense category "${categoryName}" removed.`);
  };

  const addCrmGroup = (groupName: string) => {
    const trimmed = groupName.trim();
    if (!trimmed) return;
    setCrmGroups((prev) => (prev.some((g) => g.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]));
    showToast(`New CRM list group "${trimmed}" created.`);
  };

  const addCrmLeadSource = (sourceName: string) => {
    const trimmed = sourceName.trim();
    if (!trimmed) return;
    setCrmLeadSources((prev) => (prev.some((s) => s.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]));
    showToast(`New Lead Source "${trimmed}" added to CRM.`);
  };

  // Handler: Stock Adjustment
  const addStockAdjustment = (adj: Omit<StockAdjustment, 'id' | 'createdAt' | 'performedBy'>) => {
    const newAdj: StockAdjustment = {
      ...adj,
      id: `ADJ-${Date.now().toString().slice(-5)}`,
      performedBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    // Update product stock quantity
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === adj.productId) {
          const change = adj.adjustmentType === 'increase' ? adj.quantity : -adj.quantity;
          const updatedQty = Math.max(0, p.stockQty + change);
          return { ...p, stockQty: updatedQty };
        }
        return p;
      })
    );

    setStockAdjustments((prev) => [newAdj, ...prev]);
    showToast(`Stock adjusted for "${adj.productName}" (${adj.adjustmentType === 'increase' ? '+' : '-'}${adj.quantity}).`);
  };

  // Handler: Damage Control Log
  const addDamageLog = (dmg: Omit<DamageLog, 'id' | 'createdAt' | 'reportedBy'>) => {
    const newDamage: DamageLog = {
      ...dmg,
      id: `DMG-${Date.now().toString().slice(-5)}`,
      reportedBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    // Deduct stock from active inventory
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === dmg.productId) {
          return { ...p, stockQty: Math.max(0, p.stockQty - dmg.quantity) };
        }
        return p;
      })
    );

    setDamageLogs((prev) => [newDamage, ...prev]);
    showToast(`Damage logged: ${dmg.quantity} x "${dmg.productName}" recorded as loss.`);
  };

  // Handler: Return to Supplier
  const addSupplierReturn = (ret: Omit<SupplierReturn, 'id' | 'createdAt' | 'createdBy'>) => {
    const newReturn: SupplierReturn = {
      ...ret,
      id: `RET-SUP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    // Deduct returned items from inventory stock
    setProducts((prev) =>
      prev.map((p) => {
        const item = ret.items.find((i) => i.productId === p.id);
        if (item) {
          return { ...p, stockQty: Math.max(0, p.stockQty - item.quantity) };
        }
        return p;
      })
    );

    // Adjust supplier balance if refund mode is supplier credit
    if (ret.refundMode === 'supplier_credit') {
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.id === ret.supplierId) {
            return { ...s, balance: Math.max(0, s.balance - ret.totalRefundAmount) };
          }
          return s;
        })
      );
    }

    setSupplierReturns((prev) => [newReturn, ...prev]);
    showToast(`Supplier return ${newReturn.id} processed for ৳${ret.totalRefundAmount.toLocaleString()}.`);
  };

  // Handler: Customer Sales Return
  const addCustomerReturn = (ret: Omit<CustomerReturn, 'id' | 'createdAt' | 'createdBy'>) => {
    const newReturn: CustomerReturn = {
      ...ret,
      id: `RET-CUST-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    // Restock items if condition is good_restock
    ret.items.forEach((item) => {
      if (item.condition === 'good_restock') {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === item.productId) {
              return { ...p, stockQty: p.stockQty + item.quantity };
            }
            return p;
          })
        );
      } else if (item.condition === 'damaged') {
        // Automatically add to damage logs
        const damageEntry: DamageLog = {
          id: `DMG-${Date.now().toString().slice(-5)}`,
          business: ret.business,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku || 'N/A',
          brand: item.brand || 'N/A',
          category: item.category || 'General',
          quantity: item.quantity,
          unitCost: item.unitPrice * 0.8, // estimated cost
          totalLoss: item.unitPrice * 0.8 * item.quantity,
          cause: `Customer Return Damage - Invoice ${ret.invoiceId}`,
          actionTaken: 'written_off',
          notes: ret.reason,
          reportedBy: currentUser.name,
          createdAt: new Date().toISOString()
        };
        setDamageLogs((prev) => [damageEntry, ...prev]);
      }
    });

    setCustomerReturns((prev) => [newReturn, ...prev]);

    // Update matching sale invoice returnedAmount
    setSales((prevSales) =>
      prevSales.map((s) => {
        if (s.id === ret.invoiceId) {
          const currentReturned = s.returnedAmount || 0;
          return {
            ...s,
            returnedAmount: currentReturned + ret.totalRefundAmount
          };
        }
        return s;
      })
    );

    // Update customer total purchases and credit due
    if (ret.customerId) {
      setCustomers((prevCusts) =>
        prevCusts.map((c) => {
          if (c.id === ret.customerId) {
            const updatedPurchases = Math.max(0, c.totalPurchases - ret.totalRefundAmount);
            let updatedDue = c.currentDue;
            if (ret.refundMode === 'customer_credit') {
              updatedDue = Math.max(0, c.currentDue - ret.totalRefundAmount);
            }
            return {
              ...c,
              totalPurchases: updatedPurchases,
              currentDue: updatedDue
            };
          }
          return c;
        })
      );
    }

    showToast(`Customer return processed for Invoice ${ret.invoiceId} (Refund: ৳${ret.totalRefundAmount.toLocaleString()}).`);
  };

  useEffect(() => {
    localStorage.setItem('amanot_brands', JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem('amanot_categories', JSON.stringify(categories));
  }, [categories]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast('System settings updated successfully');
  };

  const updateAuditConfig = (newConfig: Partial<AuditConfig>) => {
    setAuditConfig((prev) => ({ ...prev, ...newConfig }));
    showToast('Audit report settings saved');
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prodData,
      id: `prod_${Date.now()}`
    };
    if (newProd.brand) addBrand(newProd.brand);
    if (newProd.category) addCategory(newProd.category);
    setProducts((prev) => [newProd, ...prev]);
    showToast(`Product "${newProd.name}" added to inventory under ${newProd.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'}`);
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    showToast('Product details updated');
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('Product removed');
  };

  const bulkUpdateProducts = (
    ids: string[],
    updates: Partial<Product> | ((product: Product) => Partial<Product>),
    options?: { stockReason?: string }
  ) => {
    if (!ids || ids.length === 0) return;

    // Stock moved by a bulk edit must leave the same audit trail as a manual
    // adjustment, otherwise inventory changes silently and never reaches the
    // Stock Adjustments & Damage Audit report.
    const stockLogs: StockAdjustment[] = [];
    const stamp = Date.now();

    setProducts((prev) =>
      prev.map((p) => {
        if (!ids.includes(p.id)) return p;

        const patch = typeof updates === 'function' ? updates(p) : updates;
        const updated = { ...p, ...patch };

        if (patch.stockQty !== undefined && patch.stockQty !== p.stockQty) {
          const delta = patch.stockQty - p.stockQty;
          stockLogs.push({
            id: `ADJ-BULK-${stamp}-${stockLogs.length + 1}`,
            business: updated.business,
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            brand: p.brand,
            category: p.category,
            adjustmentType: delta > 0 ? 'increase' : 'decrease',
            quantity: Math.abs(delta),
            reason: options?.stockReason?.trim() || 'Bulk Edit Stock Update',
            notes: `Bulk edit: ${p.stockQty} → ${patch.stockQty} (${ids.length} products in batch)`,
            performedBy: currentUser.name,
            createdAt: new Date().toISOString()
          });
        }

        return updated;
      })
    );

    if (stockLogs.length > 0) {
      setStockAdjustments((prev) => [...stockLogs, ...prev]);
    }

    showToast(
      `Bulk updated ${ids.length} product(s).` +
        (stockLogs.length > 0 ? ` ${stockLogs.length} stock change(s) logged for audit.` : '')
    );
  };

  const bulkDeleteProducts = (ids: string[]) => {
    if (!ids || ids.length === 0) return;

    // Removing a product that still holds stock writes off its inventory value,
    // so log it the same way a damage/write-off would be logged.
    const doomed = products.filter((p) => ids.includes(p.id) && p.stockQty > 0);
    if (doomed.length > 0) {
      const stamp = Date.now();
      const writeOffs: StockAdjustment[] = doomed.map((p, idx) => ({
        id: `ADJ-DEL-${stamp}-${idx + 1}`,
        business: p.business,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        brand: p.brand,
        category: p.category,
        adjustmentType: 'decrease',
        quantity: p.stockQty,
        reason: 'Product Deleted (Bulk)',
        notes: `Product removed from catalogue while holding ${p.stockQty} pcs (cost value BDT ${(p.stockQty * p.costPrice).toLocaleString()}).`,
        performedBy: currentUser.name,
        createdAt: new Date().toISOString()
      }));
      setStockAdjustments((prev) => [...writeOffs, ...prev]);
    }

    setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
    showToast(
      `Removed ${ids.length} product(s).` +
        (doomed.length > 0 ? ` ${doomed.length} still held stock — written off and logged.` : '')
    );
  };

  const addCustomer = (custData: Omit<Customer, 'id' | 'totalPurchases' | 'currentDue' | 'createdAt'>): Customer => {
    const existing = findCustomerByPhone(customers, custData.phone);
    if (existing) {
      return existing;
    }
    const newCust: Customer = {
      ...custData,
      id: `cust_${Date.now()}`,
      totalPurchases: 0,
      currentDue: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setCustomers((prev) => [newCust, ...prev]);
    return newCust;
  };

  const updateCustomer = (id: string, updatedFields: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedFields } : c))
    );
    showToast('Customer profile updated.');
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    showToast('Customer record removed.');
  };

  const importCustomersFromExcel = (newCustomers: Array<{ name: string; phone: string; address: string; notes?: string }>): number => {
    let count = 0;
    const addedList: Customer[] = [];
    newCustomers.forEach((nc) => {
      if (!nc.phone) return;
      const normalized = normalizePhone(nc.phone);
      const exists =
        customers.some((c) => normalizePhone(c.phone) === normalized) ||
        addedList.some((c) => normalizePhone(c.phone) === normalized);
      if (!exists) {
        addedList.push({
          id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: nc.name || 'Valued Customer',
          phone: nc.phone,
          address: nc.address || 'Dhaka',
          customerType: 'regular',
          totalPurchases: 0,
          currentDue: 0,
          createdAt: new Date().toISOString().split('T')[0],
          notes: nc.notes || 'Imported via Excel'
        });
        count++;
      }
    });
    if (addedList.length > 0) {
      setCustomers((prev) => [...addedList, ...prev]);
      showToast(`Successfully imported ${count} new contacts into CRM database`);
    } else {
      showToast('No new contacts imported (phone numbers already existed)');
    }
    return count;
  };

  const sendSMS = (phone: string, name: string, message: string, type: SMSLog['type'], business: BusinessType) => {
    const newLog: SMSLog = {
      id: `sms_${Date.now()}`,
      recipientPhone: phone,
      recipientName: name,
      message,
      type,
      business,
      status: 'delivered',
      gateway: 'Alpha SMS API',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setSmsLogs((prev) => [newLog, ...prev]);
    showToast(`Alpha SMS API: Message sent to ${phone}`);
  };

  const addSale = (saleData: {
    business: BusinessType;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: Array<{
      productId: string;
      quantity: number;
      priceType: 'retail' | 'wholesale';
      unitPrice: number;
      discount: number;
      includeInstallationFee?: boolean;
      installationFee?: number;
      extraPipingFt?: number;
      extraPipingFee?: number;
    }>;
    discountTotal: number;
    specialDiscount?: number;
    specialDiscountMode?: 'amount' | 'percent';
    specialDiscountRate?: number;
    referralName?: string;
    taxAmount: number;
    paidAmount: number;
    paymentMode: PaymentMode;
    accountId?: string;
    customerPaymentNumber?: string;
    isInstallment: boolean;
    installmentMonths?: number;
    downPayment?: number;
    notes?: string;
    isDraft?: boolean;
  }): SaleInvoice => {
    // 1. Ensure Customer exists in CRM database (match by id, then by phone, else create)
    let cust = customers.find((c) => c.id === saleData.customerId)
      || findCustomerByPhone(customers, saleData.customerPhone);
    if (!cust) {
      cust = addCustomer({
        name: saleData.customerName || 'Walk-in Customer',
        phone: saleData.customerPhone || '01700000000',
        address: saleData.customerAddress || 'Showroom Counter',
        customerType: saleData.isInstallment ? 'regular' : 'walk_in'
      });
    }

    // Invoice snapshot prefers what the counter typed (e.g. a one-off delivery address
    // edited after the CRM details were fetched), falling back to the stored profile.
    const invoiceCustomerName = saleData.customerName?.trim() || cust.name;
    const invoiceCustomerPhone = saleData.customerPhone?.trim() || cust.phone;
    const invoiceCustomerAddress = saleData.customerAddress?.trim() || cust.address;

    // 2. Prepare items with snapshot data & deduct stock if not draft
    let subtotal = 0;
    let totalCost = 0;
    let installationFeeTotal = 0;

    const snapshotItems = saleData.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const lineTotal = item.quantity * item.unitPrice - item.discount;
      subtotal += item.quantity * item.unitPrice;
      const lineCost = (prod ? prod.costPrice : 0) * item.quantity;
      totalCost += lineCost;

      const instFee = item.includeInstallationFee ? (item.installationFee ?? prod?.installationCharge ?? 0) : 0;
      const pipeFee = item.includeInstallationFee ? (item.extraPipingFee ?? ((item.extraPipingFt || 0) * (prod?.extraPipingFeePerFt || 550))) : 0;
      installationFeeTotal += instFee + pipeFee;

      // Deduct stock if NOT draft
      if (prod && !saleData.isDraft) {
        setProducts((prev) =>
          prev.map((p) => (p.id === item.productId ? { ...p, stockQty: Math.max(0, p.stockQty - item.quantity) } : p))
        );
      }

      return {
        productId: item.productId,
        productName: prod ? prod.name : 'Unknown Product',
        brand: prod ? prod.brand : 'Generic',
        category: prod ? prod.category : 'General',
        quantity: item.quantity,
        priceType: item.priceType,
        unitPrice: item.unitPrice,
        costPrice: prod ? prod.costPrice : 0,
        discount: item.discount,
        total: lineTotal,
        model: prod?.model,
        typeSeries: prod?.typeSeries,
        acType: prod?.acType,
        capacity: prod?.capacity,
        size: prod?.size,
        includeInstallationFee: item.includeInstallationFee,
        installationFee: instFee,
        extraPipingFt: item.extraPipingFt || 0,
        extraPipingFee: pipeFee
      };
    });

    const grandTotal = subtotal + installationFeeTotal - saleData.discountTotal + saleData.taxAmount;
    const dueAmount = saleData.isDraft ? grandTotal : Math.max(0, grandTotal - saleData.paidAmount);
    const targetAccount = saleData.isDraft
      ? undefined
      : resolvePaymentAccount(accounts, saleData.paymentMode, saleData.business, saleData.accountId);
    const invoiceNum = saleData.isDraft
      ? `DRAFT-2026-${Math.floor(1000 + Math.random() * 9000)}`
      : `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const onlineReceiptUrl = `/receipt/${invoiceNum}`;

    let installmentPlanId: string | undefined = undefined;

    // 3. Create Installment plan if chosen and NOT draft
    if (!saleData.isDraft && saleData.isInstallment && saleData.installmentMonths && dueAmount > 0) {
      const totalInst = saleData.installmentMonths;
      const emi = Math.ceil(dueAmount / totalInst);
      const instId = `inst_plan_${Date.now()}`;
      installmentPlanId = instId;

      const schedule = Array.from({ length: totalInst }).map((_, idx) => {
        const d = new Date();
        d.setMonth(d.getMonth() + (idx + 1));
        return {
          installmentNo: idx + 1,
          dueDate: d.toISOString().split('T')[0],
          amount: idx === totalInst - 1 ? dueAmount - emi * (totalInst - 1) : emi,
          status: 'due' as const
        };
      });

      const newPlan: InstallmentPlan = {
        id: instId,
        invoiceId: invoiceNum,
        business: saleData.business,
        customerId: cust.id,
        customerName: invoiceCustomerName,
        customerPhone: invoiceCustomerPhone,
        totalAmount: grandTotal,
        downPayment: saleData.paidAmount,
        financedAmount: dueAmount,
        totalInstallments: totalInst,
        monthlyEmi: emi,
        paidInstallments: 0,
        status: 'active',
        schedule,
        createdAt: new Date().toISOString().split('T')[0]
      };

      setInstallmentPlans((prev) => [newPlan, ...prev]);
    }

    const newInvoice: SaleInvoice = {
      id: invoiceNum,
      business: saleData.business,
      customerId: cust.id,
      customerName: invoiceCustomerName,
      customerPhone: invoiceCustomerPhone,
      customerAddress: invoiceCustomerAddress,
      items: snapshotItems,
      subtotal,
      discountTotal: saleData.discountTotal,
      // Referral payout — internal only, does not change what the customer pays
      specialDiscount: saleData.specialDiscount || 0,
      specialDiscountMode: saleData.specialDiscountMode,
      specialDiscountRate: saleData.specialDiscountRate,
      referralName: saleData.referralName,
      taxAmount: saleData.taxAmount,
      installationFeeTotal,
      grandTotal,
      totalCost,
      paidAmount: saleData.isDraft ? 0 : saleData.paidAmount,
      dueAmount,
      paymentMode: saleData.paymentMode,
      paymentStatus: saleData.isDraft ? 'draft' : dueAmount === 0 ? 'paid' : saleData.paidAmount > 0 ? 'partial' : 'due',
      isInstallment: saleData.isInstallment,
      installmentPlanId,
      smsSent: !saleData.isDraft,
      onlineReceiptUrl,
      createdByStaffId: currentUser.id,
      createdByStaffName: currentUser.name,
      createdAt: new Date().toISOString().split('T')[0],
      notes: saleData.notes,
      isDraft: saleData.isDraft,
      accountId: targetAccount?.id,
      accountName: targetAccount?.accountName,
      customerPaymentNumber: saleData.customerPaymentNumber
    };

    setSales((prev) => [newInvoice, ...prev]);

    if (!saleData.isDraft) {
      if (targetAccount && saleData.paidAmount > 0) {
        setAccounts((prev) => applySalePaymentToAccounts(prev, undefined, newInvoice));
      }

      // Update Customer purchase total & due balance
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === cust!.id
            ? {
                ...c,
                totalPurchases: c.totalPurchases + grandTotal,
                currentDue: c.currentDue + dueAmount
              }
            : c
        )
      );

      // Auto send SMS confirmation
      const bName = saleData.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise';
      const smsMsg = `Dear ${invoiceCustomerName}, purchase complete at ${bName}. Inv #${invoiceNum}. Total: BDT ${grandTotal.toLocaleString()}. Paid: BDT ${saleData.paidAmount.toLocaleString()}. Receipt link: ${settings.alphaSmsApiUrl.replace('/api/v1/sendsms', '')}${onlineReceiptUrl}`;
      sendSMS(invoiceCustomerPhone, invoiceCustomerName, smsMsg, 'sale_receipt', saleData.business);

      // Open active receipt modal automatically
      setActiveReceiptInvoice(newInvoice);
      showToast(`Sale #${invoiceNum} successfully posted.`);
    } else {
      showToast(`Sale saved as Draft #${invoiceNum}.`);
    }

    return newInvoice;
  };

  const updateSale = (
    invoiceId: string,
    saleData: {
      business: BusinessType;
      customerId: string;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      items: Array<{
        productId: string;
        quantity: number;
        priceType: 'retail' | 'wholesale';
        unitPrice: number;
        discount: number;
        includeInstallationFee?: boolean;
        installationFee?: number;
        extraPipingFt?: number;
        extraPipingFee?: number;
      }>;
      discountTotal: number;
      specialDiscount?: number;
      specialDiscountMode?: 'amount' | 'percent';
      specialDiscountRate?: number;
      referralName?: string;
      taxAmount: number;
      paidAmount: number;
      paymentMode: PaymentMode;
      accountId?: string;
      customerPaymentNumber?: string;
      isInstallment: boolean;
      installmentMonths?: number;
      downPayment?: number;
      notes?: string;
      isDraft?: boolean;
    }
  ): SaleInvoice => {
    const existing = sales.find((s) => s.id === invoiceId);
    if (!existing) {
      throw new Error('Invoice not found');
    }

    // 1. If old invoice was posted (not draft), restore previous product stock
    if (!existing.isDraft) {
      setProducts((prev) =>
        prev.map((p) => {
          const oldItem = existing.items.find((i) => i.productId === p.id);
          if (oldItem) {
            return { ...p, stockQty: p.stockQty + oldItem.quantity };
          }
          return p;
        })
      );
    }

    // 2. Prepare updated items & snapshot data
    let subtotal = 0;
    let totalCost = 0;
    let installationFeeTotal = 0;

    const snapshotItems = saleData.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const lineTotal = item.quantity * item.unitPrice - item.discount;
      subtotal += item.quantity * item.unitPrice;
      const lineCost = (prod ? prod.costPrice : 0) * item.quantity;
      totalCost += lineCost;

      const instFee = item.includeInstallationFee ? (item.installationFee ?? prod?.installationCharge ?? 0) : 0;
      const pipeFee = item.includeInstallationFee ? (item.extraPipingFee ?? ((item.extraPipingFt || 0) * (prod?.extraPipingFeePerFt || 550))) : 0;
      installationFeeTotal += instFee + pipeFee;

      // Deduct stock if updated status is NOT draft
      if (prod && !saleData.isDraft) {
        setProducts((prev) =>
          prev.map((p) => (p.id === item.productId ? { ...p, stockQty: Math.max(0, p.stockQty - item.quantity) } : p))
        );
      }

      return {
        productId: item.productId,
        productName: prod ? prod.name : 'Unknown Product',
        brand: prod ? prod.brand : 'Generic',
        category: prod ? prod.category : 'General',
        quantity: item.quantity,
        priceType: item.priceType,
        unitPrice: item.unitPrice,
        costPrice: prod ? prod.costPrice : 0,
        discount: item.discount,
        total: lineTotal,
        model: prod?.model,
        typeSeries: prod?.typeSeries,
        acType: prod?.acType,
        capacity: prod?.capacity,
        size: prod?.size,
        includeInstallationFee: item.includeInstallationFee,
        installationFee: instFee,
        extraPipingFt: item.extraPipingFt || 0,
        extraPipingFee: pipeFee
      };
    });

    const grandTotal = subtotal + installationFeeTotal - saleData.discountTotal + saleData.taxAmount;
    const dueAmount = saleData.isDraft ? grandTotal : Math.max(0, grandTotal - saleData.paidAmount);
    const targetAccount = saleData.isDraft
      ? undefined
      : resolvePaymentAccount(
          accounts,
          saleData.paymentMode,
          saleData.business,
          saleData.accountId || existing.accountId
        );

    const updatedInvoice: SaleInvoice = {
      ...existing,
      business: saleData.business,
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      customerAddress: saleData.customerAddress,
      items: snapshotItems,
      subtotal,
      discountTotal: saleData.discountTotal,
      // Referral payout — internal only, does not change what the customer pays
      specialDiscount: saleData.specialDiscount || 0,
      specialDiscountMode: saleData.specialDiscountMode,
      specialDiscountRate: saleData.specialDiscountRate,
      referralName: saleData.referralName,
      taxAmount: saleData.taxAmount,
      installationFeeTotal,
      grandTotal,
      totalCost,
      paidAmount: saleData.isDraft ? 0 : saleData.paidAmount,
      dueAmount,
      paymentMode: saleData.paymentMode,
      paymentStatus: saleData.isDraft ? 'draft' : dueAmount === 0 ? 'paid' : saleData.paidAmount > 0 ? 'partial' : 'due',
      isInstallment: saleData.isInstallment,
      notes: saleData.notes,
      isDraft: saleData.isDraft,
      accountId: targetAccount?.id,
      accountName: targetAccount?.accountName,
      customerPaymentNumber: saleData.customerPaymentNumber
    };

    setSales((prev) => prev.map((s) => (s.id === invoiceId ? updatedInvoice : s)));

    setAccounts((prev) => applySalePaymentToAccounts(prev, existing, updatedInvoice));

    if (!saleData.isDraft) {
      showToast(`Sale Invoice ${invoiceId} updated successfully.`);
      setActiveReceiptInvoice(updatedInvoice);
    } else {
      showToast(`Draft Invoice ${invoiceId} saved.`);
    }

    return updatedInvoice;
  };

  const deleteSale = (invoiceId: string) => {
    const existing = sales.find((s) => s.id === invoiceId);
    if (!existing) return;

    // Restore stock if it was a posted sale
    if (!existing.isDraft) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = existing.items.find((i) => i.productId === p.id);
          if (item) {
            return { ...p, stockQty: p.stockQty + item.quantity };
          }
          return p;
        })
      );
    }

    setSales((prev) => prev.filter((s) => s.id !== invoiceId));
    if (!existing.isDraft && existing.accountId && existing.paidAmount > 0) {
      setAccounts((prev) => applySalePaymentToAccounts(prev, existing, undefined));
    }
    showToast(`Invoice ${invoiceId} deleted.`);
  };

  const payInvoiceDue = (
    invoiceId: string,
    amountPaid: number,
    paymentMode: Exclude<PaymentMode, 'installment'> = 'cash',
    accountId?: string
  ) => {
    if (amountPaid <= 0) return;

    const invoice = sales.find((s) => s.id === invoiceId);
    if (!invoice) {
      showToast('Invoice not found.');
      return;
    }

    // Route the due collection into this business's own account (or its shared/combined one)
    const dueAccount = resolvePaymentAccount(accounts, paymentMode, invoice.business, accountId);
    if (!dueAccount) {
      showToast(`Add an active ${paymentMode.replace('_', ' ')} account for this business before collecting.`);
      return;
    }

    let targetInv: SaleInvoice | undefined;

    setSales((prevSales) =>
      prevSales.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        targetInv = inv;
        const newPaid = inv.paidAmount + amountPaid;
        const newDue = Math.max(0, inv.grandTotal - newPaid);
        const newStatus = newDue === 0 ? 'paid' : 'partial';

        return {
          ...inv,
          paidAmount: newPaid,
          dueAmount: newDue,
          paymentStatus: newStatus,
          paymentMode: paymentMode
        };
      })
    );

    if (targetInv) {
      // Update customer due
      setCustomers((cPrev) =>
        cPrev.map((c) =>
          c.id === targetInv!.customerId
            ? { ...c, currentDue: Math.max(0, c.currentDue - amountPaid) }
            : c
        )
      );

      // Bank the collected due into the resolved account
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === dueAccount.id ? { ...a, currentBalance: a.currentBalance + amountPaid } : a
        )
      );

      // Send SMS notice
      const bName = targetInv.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise';
      const remainingDue = Math.max(0, targetInv.dueAmount - amountPaid);
      sendSMS(
        targetInv.customerPhone,
        targetInv.customerName,
        `Due Payment Received! BDT ${amountPaid.toLocaleString()} paid for Inv #${targetInv.id}. Remaining Due: BDT ${remainingDue.toLocaleString()}. Thank you - ${bName}.`,
        'due_reminder',
        targetInv.business
      );

      showToast(
        `Due payment of BDT ${amountPaid.toLocaleString()} for Invoice ${invoiceId} banked into ${dueAccount.accountName}.`
      );
    }
  };

  const processInstallmentPayment = (
    planId: string,
    installmentNo: number,
    amount: number,
    customSchedule?: InstallmentPlan['schedule'],
    payment?: { accountId?: string; paymentMode?: InstallmentPlan['schedule'][number]['paymentMode'] }
  ) => {
    const targetPlan = installmentPlans.find((p) => p.id === planId);
    if (!targetPlan) {
      showToast('Installment plan not found.');
      return;
    }

    // Route the collection into this business's own account (or its shared/combined one)
    const collectionMode: PaymentMode = payment?.paymentMode || 'cash';
    const targetAccount = resolvePaymentAccount(
      accounts,
      collectionMode,
      targetPlan.business,
      payment?.accountId
    );

    if (!targetAccount) {
      showToast(`Add an active ${collectionMode.replace('_', ' ')} account for this business before collecting.`);
      return;
    }

    setInstallmentPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;

        const baseSchedule = customSchedule || plan.schedule.map((s) => {
          if (s.installmentNo === installmentNo) {
            return {
              ...s,
              status: 'paid' as const,
              paidDate: new Date().toISOString().split('T')[0]
            };
          }
          return s;
        });

        // Stamp where this collection was banked so receipts and reports can trace it
        const updatedSchedule = baseSchedule.map((s) =>
          s.installmentNo === installmentNo
            ? {
                ...s,
                paymentMode: payment?.paymentMode || s.paymentMode,
                accountId: targetAccount.id,
                accountName: targetAccount.accountName
              }
            : s
        );

        const paidCount = updatedSchedule.filter((s) => s.status === 'paid').length;
        const isAllDone = paidCount === plan.totalInstallments;

        // Also update invoice paid/due
        setSales((sPrev) =>
          sPrev.map((inv) => {
            if (inv.id === plan.invoiceId) {
              const newPaid = inv.paidAmount + amount;
              const newDue = Math.max(0, inv.grandTotal - newPaid);
              return {
                ...inv,
                paidAmount: newPaid,
                dueAmount: newDue,
                paymentStatus: newDue === 0 ? 'paid' : 'partial'
              };
            }
            return inv;
          })
        );

        // Update customer due
        setCustomers((cPrev) =>
          cPrev.map((c) =>
            c.id === plan.customerId
              ? { ...c, currentDue: Math.max(0, c.currentDue - amount) }
              : c
          )
        );

        return {
          ...plan,
          paidInstallments: paidCount,
          status: isAllDone ? ('completed' as const) : ('active' as const),
          schedule: updatedSchedule
        };
      })
    );

    // Bank the collected cash into the resolved account
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === targetAccount.id ? { ...a, currentBalance: a.currentBalance + amount } : a
      )
    );

    const bName = targetPlan.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise';
    sendSMS(
      targetPlan.customerPhone,
      targetPlan.customerName,
      `Payment received! BDT ${amount.toLocaleString()} for Installment #${installmentNo}. Thank you - ${bName}.`,
      'installment_reminder',
      targetPlan.business
    );

    showToast(
      `Payment of BDT ${amount.toLocaleString()} for Installment #${installmentNo} banked into ${targetAccount.accountName}.`
    );
  };

  const updateInstallmentPlan = (planId: string, updatedFields: Partial<InstallmentPlan>) => {
    setInstallmentPlans((prev) =>
      prev.map((plan) => (plan.id === planId ? { ...plan, ...updatedFields } : plan))
    );
    showToast('Installment plan updated successfully.');
  };

  const addQuotation = (quoteData: {
    business: BusinessType;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    source: 'pos_walkin' | 'website_inquiry';
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    notes?: string;
  }): Quotation => {
    let total = 0;
    const snapItems = quoteData.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const line = item.quantity * item.unitPrice;
      total += line;
      return {
        productId: item.productId,
        productName: prod ? prod.name : 'Requested Product',
        brand: prod ? prod.brand : 'Generic',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: line
      };
    });

    const vDate = new Date();
    vDate.setDate(vDate.getDate() + 15);

    const newQuote: Quotation = {
      id: `QTE-2026-${Math.floor(200 + Math.random() * 800)}`,
      business: quoteData.business,
      customerName: quoteData.customerName,
      customerPhone: quoteData.customerPhone,
      customerAddress: quoteData.customerAddress || 'Website Inquirer',
      source: quoteData.source,
      items: snapItems,
      totalAmount: total,
      validUntil: vDate.toISOString().split('T')[0],
      status: 'sent',
      createdAt: new Date().toISOString().split('T')[0],
      notes: quoteData.notes
    };

    setQuotations((prev) => [newQuote, ...prev]);

    // Public storefront visitors (not logged in) still persist the lead.
    if (!authRef.current) {
      submitPublicQuote(newQuote);
    }

    // Save customer if new
    addCustomer({
      name: quoteData.customerName,
      phone: quoteData.customerPhone,
      address: quoteData.customerAddress || 'Website Inquirer',
      customerType: 'regular'
    });

    showToast(`Quotation #${newQuote.id} created for ${newQuote.customerName}`);
    return newQuote;
  };

  const updateQuotation = (id: string, updatedFields: Partial<Quotation>) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, ...updatedFields };
        // Recalculate total if items were updated
        if (updatedFields.items) {
          updated.totalAmount = updatedFields.items.reduce((acc, item) => acc + item.total, 0) - (updated.discountTotal || 0);
        }
        return updated;
      })
    );
    showToast(`Quotation #${id} updated successfully.`);
  };

  const deleteQuotation = (id: string) => {
    setQuotations((prev) => prev.filter((q) => q.id !== id));
    showToast(`Quotation #${id} deleted.`);
  };

  const convertQuoteToSale = (quoteId: string) => {
    const q = quotations.find((quote) => quote.id === quoteId);
    if (!q) return;

    addSale({
      business: q.business,
      customerId: '',
      customerName: q.customerName,
      customerPhone: q.customerPhone,
      customerAddress: q.customerAddress,
      items: q.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        priceType: 'retail',
        unitPrice: i.unitPrice,
        discount: 0
      })),
      discountTotal: 0,
      taxAmount: 0,
      paidAmount: q.totalAmount,
      paymentMode: 'cash',
      isInstallment: false,
      notes: `Converted from Quotation #${q.id}`
    });

    setQuotations((prev) =>
      prev.map((quote) => (quote.id === quoteId ? { ...quote, status: 'converted' } : quote))
    );

    showToast(`Quotation #${q.id} converted into official Sale Invoice!`);
  };

  const addSupplier = (supData: Omit<Supplier, 'id' | 'balance'>) => {
    const newSup: Supplier = {
      ...supData,
      id: `supp_${Date.now()}`,
      balance: 0
    };
    setSuppliers((prev) => [...prev, newSup]);
    showToast(`Supplier ${newSup.companyName} added`);
  };

  const addSupplierRequisition = (
    reqData: Omit<SupplierRequisition, 'id' | 'createdAt' | 'createdByStaffName'>
  ): SupplierRequisition => {
    const supp = suppliers.find((s) => s.id === reqData.supplierId);
    const newReq: SupplierRequisition = {
      ...reqData,
      id: `REQ-2026-${Math.floor(100 + Math.random() * 900)}`,
      supplierName: supp ? supp.companyName : reqData.supplierName || 'General Supplier',
      createdByStaffName: currentUser.name,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setSupplierRequisitions((prev) => [newReq, ...prev]);
    showToast(`Supplier Requisition #${newReq.id} created successfully.`);
    return newReq;
  };

  const updateSupplierRequisition = (id: string, updatedFields: Partial<SupplierRequisition>) => {
    setSupplierRequisitions((prev) =>
      prev.map((req) => {
        if (req.id !== id) return req;
        const updated = { ...req, ...updatedFields };
        if (updatedFields.items) {
          updated.totalEstimatedCost = updatedFields.items.reduce(
            (acc, item) => acc + (item.totalCost || item.quantity * item.costPrice),
            0
          );
        }
        return updated;
      })
    );
    showToast(`Requisition #${id} updated successfully.`);
  };

  const deleteSupplierRequisition = (id: string) => {
    setSupplierRequisitions((prev) => prev.filter((r) => r.id !== id));
    showToast(`Requisition #${id} deleted.`);
  };

  const addPurchaseOrder = (poData: {
    business: BusinessType;
    supplierId: string;
    items: Array<{
      productId: string;
      quantity: number;
      costPrice: number;
    }>;
    paidAmount: number;
    notes?: string;
  }) => {
    const supp = suppliers.find((s) => s.id === poData.supplierId);
    let totalCost = 0;

    const snapItems = poData.items.map((i) => {
      const prod = products.find((p) => p.id === i.productId);
      const lineCost = i.quantity * i.costPrice;
      totalCost += lineCost;

      // Increase inventory stock
      if (prod) {
        setProducts((prev) =>
          prev.map((p) => (p.id === i.productId ? { ...p, stockQty: p.stockQty + i.quantity } : p))
        );
      }

      return {
        productId: i.productId,
        productName: prod ? prod.name : 'Restock Product',
        brand: prod ? prod.brand : 'Generic',
        category: prod ? prod.category : 'General',
        unit: prod ? prod.unit : 'Pcs',
        quantity: i.quantity,
        costPrice: i.costPrice,
        retailPrice: prod ? prod.retailPrice : 0,
        wholesalePrice: prod ? prod.wholesalePrice : 0,
        totalCost: lineCost
      };
    });

    const due = Math.max(0, totalCost - poData.paidAmount);

    const newPO: PurchaseOrder = {
      id: `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
      business: poData.business,
      supplierId: poData.supplierId,
      supplierName: supp ? supp.companyName : 'Supplier',
      items: snapItems,
      totalCost,
      paidAmount: poData.paidAmount,
      paymentStatus: due === 0 ? 'paid' : poData.paidAmount > 0 ? 'partial' : 'due',
      createdAt: new Date().toISOString().split('T')[0],
      notes: poData.notes
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Update supplier balance
    if (supp) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supp.id ? { ...s, balance: s.balance + due } : s))
      );
    }

    showToast(`Purchase order ${newPO.id} recorded. Stock restocked successfully.`);
  };

  const processBulkProductEntry = (data: {
    business: BusinessType;
    supplierId: string;
    items: Array<RequisitionItem>;
    paidAmount: number;
    notes?: string;
    requisitionId?: string;
    accountId?: string;
    paymentMethod?: 'cash' | 'bank' | 'mfs' | 'cheque';
  }) => {
    const supp = suppliers.find((s) => s.id === data.supplierId);
    let grandTotalCost = 0;
    const poItems: PurchaseOrder['items'] = [];

    data.items.forEach((item) => {
      const lineCost = item.quantity * item.costPrice;
      grandTotalCost += lineCost;

      let targetProdId = item.productId;

      if (item.productId && !item.isNewProduct) {
        // Existing product: increase stock and update prices if provided
        setProducts((pPrev) =>
          pPrev.map((p) => {
            if (p.id === item.productId) {
              return {
                ...p,
                stockQty: p.stockQty + item.quantity,
                costPrice: item.costPrice > 0 ? item.costPrice : p.costPrice,
                retailPrice: item.retailPrice > 0 ? item.retailPrice : p.retailPrice,
                wholesalePrice: item.wholesalePrice > 0 ? item.wholesalePrice : p.wholesalePrice,
                supplierId: data.supplierId,
                supplierName: supp ? supp.companyName : p.supplierName
              };
            }
            return p;
          })
        );
      } else {
        // New product: create product entry in inventory
        const newProdId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        targetProdId = newProdId;
        const genSku =
          item.sku ||
          `${item.brand.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newProduct: Product = {
          id: newProdId,
          sku: genSku,
          name: item.productName,
          business: data.business,
          brand: item.brand || 'Generic',
          category: item.category || 'General',
          costPrice: item.costPrice || 0,
          retailPrice: item.retailPrice || 0,
          wholesalePrice: item.wholesalePrice || 0,
          stockQty: item.quantity || 0,
          minStockAlert: 3,
          unit: item.unit || 'Pcs',
          warranty: item.warranty || '1 Year Warranty',
          supplierId: data.supplierId,
          supplierName: supp ? supp.companyName : 'Supplier',
          isFeaturedOnWebsite: true
        };

        setProducts((pPrev) => [newProduct, ...pPrev]);
      }

      poItems.push({
        productId: targetProdId || 'prod_new',
        productName: item.productName,
        brand: item.brand,
        category: item.category,
        unit: item.unit,
        sku: item.sku,
        quantity: item.quantity,
        costPrice: item.costPrice,
        retailPrice: item.retailPrice,
        wholesalePrice: item.wholesalePrice,
        totalCost: lineCost
      });
    });

    const due = Math.max(0, grandTotalCost - data.paidAmount);
    const newPOId = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;

    // Pay from this business's own account, falling back to a shared/combined one
    const acc = resolveBusinessAccount(accounts, data.business, data.accountId);
    const targetAccId = acc?.id || 'cash-default';
    const targetAccName = acc?.accountName || 'Cash Drawer';

    const newPO: PurchaseOrder = {
      id: newPOId,
      business: data.business,
      supplierId: data.supplierId,
      supplierName: supp ? supp.companyName : 'Supplier',
      items: poItems,
      totalCost: grandTotalCost,
      paidAmount: data.paidAmount,
      paymentStatus: due === 0 ? 'paid' : data.paidAmount > 0 ? 'partial' : 'due',
      createdAt: new Date().toISOString().split('T')[0],
      notes:
        data.notes ||
        (data.requisitionId
          ? `Fulfilled from Requisition #${data.requisitionId}`
          : 'Bulk Product Entry from Supplier'),
      requisitionId: data.requisitionId,
      accountId: targetAccId,
      accountName: targetAccName
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Update supplier balance (add the net due owed)
    if (supp) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supp.id ? { ...s, balance: s.balance + due } : s))
      );
    }

    // Auto-record Supplier Payment if paidAmount > 0
    if (data.paidAmount > 0) {
      const newPayment: SupplierPayment = {
        id: `SPAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierId: data.supplierId,
        supplierName: supp ? supp.companyName : 'Supplier',
        business: data.business,
        purchaseOrderId: newPOId,
        amount: data.paidAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: data.paymentMethod || 'cash',
        accountId: targetAccId,
        accountName: targetAccName,
        voucherNo: `VCH-PO-${newPOId}`,
        notes: data.notes || `Bulk product stock entry payment for PO #${newPOId}`,
        recordedBy: currentUser?.name || 'Admin',
        createdAt: new Date().toISOString().split('T')[0]
      };

      setSupplierPayments((prev) => [newPayment, ...prev]);

      // Deduct paid amount from selected account
      setAccounts((prev) =>
        prev.map((a) => (a.id === targetAccId ? { ...a, currentBalance: a.currentBalance - data.paidAmount } : a))
      );
    }

    // Mark requisition as fulfilled if converting
    if (data.requisitionId) {
      setSupplierRequisitions((prev) =>
        prev.map((r) =>
          r.id === data.requisitionId ? { ...r, status: 'fulfilled', fulfilledPOId: newPOId } : r
        )
      );
    }

    showToast(
      `Bulk Product Entry complete! PO #${newPOId} created & inventory updated with ${data.items.length} product(s).`
    );
  };

  const updatePurchaseOrder = (id: string, updatedFields: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== id) return po;
        const updated = { ...po, ...updatedFields };
        if (updatedFields.items) {
          updated.totalCost = updatedFields.items.reduce(
            (acc, i) => acc + (i.totalCost || i.quantity * i.costPrice),
            0
          );
        }
        return updated;
      })
    );
    showToast(`Purchase Order #${id} updated.`);
  };

  const deletePurchaseOrder = (id: string) => {
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));
    showToast(`Purchase Order #${id} deleted.`);
  };

  const addExpense = (expData: Omit<Expense, 'id' | 'recordedBy'>) => {
    const newExp: Expense = {
      ...expData,
      id: `exp_${Date.now()}`,
      recordedBy: currentUser.name
    };

    if (expData.accountId) {
      setAccounts((prevAccs) =>
        prevAccs.map((a) =>
          a.id === expData.accountId
            ? { ...a, currentBalance: a.currentBalance - expData.amount }
            : a
        )
      );
    }

    setExpenses((prev) => [newExp, ...prev]);
    showToast(
      `Expense of BDT ${newExp.amount.toLocaleString()} logged under ${
        newExp.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'
      }`
    );
  };

  const updateExpense = (id: string, updatedFields: Partial<Expense>) => {
    const existing = expenses.find((e) => e.id === id);
    if (existing && updatedFields.amount !== undefined && existing.accountId) {
      const diff = updatedFields.amount - existing.amount;
      if (diff !== 0) {
        setAccounts((prevAccs) =>
          prevAccs.map((a) =>
            a.id === existing.accountId
              ? { ...a, currentBalance: a.currentBalance - diff }
              : a
          )
        );
      }
    }
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updatedFields } : e))
    );
    showToast('Expense entry updated.');
  };

  const deleteExpense = (id: string) => {
    const existing = expenses.find((e) => e.id === id);
    if (existing && existing.accountId) {
      setAccounts((prevAccs) =>
        prevAccs.map((a) =>
          a.id === existing.accountId
            ? { ...a, currentBalance: a.currentBalance + existing.amount }
            : a
        )
      );
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast('Expense entry deleted.');
  };

  // Financial Accounts Management
  const addAccount = (
    accData: Omit<Account, 'id' | 'createdAt' | 'currentBalance'> & { openingBalance?: number }
  ) => {
    const openBal = accData.openingBalance || 0;
    const newAccount: Account = {
      ...accData,
      id: `acc_${Date.now()}`,
      openingBalance: openBal,
      currentBalance: openBal,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setAccounts((prev) => [newAccount, ...prev]);
    showToast(`Account "${newAccount.accountName}" added successfully.`);
  };

  const updateAccount = (id: string, updatedFields: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedFields } : a)));
    showToast('Account updated successfully.');
  };

  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast('Account deleted.');
  };

  // Internal Transfer Handlers (Atomic Double-Entry Balances)
  const addAccountTransfer = (trData: Omit<AccountTransfer, 'id' | 'createdAt' | 'createdBy'>) => {
    const fromAcc = accounts.find((a) => a.id === trData.fromAccountId);
    const toAcc = accounts.find((a) => a.id === trData.toAccountId);
    if (!fromAcc || !toAcc) {
      showToast('Invalid accounts selected for transfer.');
      return;
    }
    const fee = trData.transferFee || 0;
    const totalDeduct = trData.amount + fee;

    const newTransfer: AccountTransfer = {
      ...trData,
      id: `tr_${Date.now()}`,
      fromAccountName: fromAcc.accountName,
      toAccountName: toAcc.accountName,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === trData.fromAccountId) {
          return { ...a, currentBalance: a.currentBalance - totalDeduct };
        }
        if (a.id === trData.toAccountId) {
          return { ...a, currentBalance: a.currentBalance + trData.amount };
        }
        return a;
      })
    );

    setAccountTransfers((prev) => [newTransfer, ...prev]);
    showToast(
      `Transferred ৳${trData.amount.toLocaleString()} from ${fromAcc.accountName} to ${toAcc.accountName}.`
    );
  };

  const updateAccountTransfer = (id: string, updatedFields: Partial<AccountTransfer>) => {
    const existingTr = accountTransfers.find((t) => t.id === id);
    if (!existingTr) return;

    const oldTotalDeduct = existingTr.amount + (existingTr.transferFee || 0);
    const oldAmount = existingTr.amount;

    const mergedTr = { ...existingTr, ...updatedFields };
    const newTotalDeduct = mergedTr.amount + (mergedTr.transferFee || 0);
    const newAmount = mergedTr.amount;

    setAccounts((prev) =>
      prev.map((a) => {
        let bal = a.currentBalance;
        if (a.id === existingTr.fromAccountId) bal += oldTotalDeduct;
        if (a.id === existingTr.toAccountId) bal -= oldAmount;
        if (a.id === mergedTr.fromAccountId) bal -= newTotalDeduct;
        if (a.id === mergedTr.toAccountId) bal += newAmount;
        return { ...a, currentBalance: bal };
      })
    );

    setAccountTransfers((prev) => prev.map((t) => (t.id === id ? mergedTr : t)));
    showToast('Transfer record updated and account balances reconciled.');
  };

  const deleteAccountTransfer = (id: string) => {
    const existingTr = accountTransfers.find((t) => t.id === id);
    if (!existingTr) return;

    const oldTotalDeduct = existingTr.amount + (existingTr.transferFee || 0);
    const oldAmount = existingTr.amount;

    setAccounts((prev) =>
      prev.map((a) => {
        let bal = a.currentBalance;
        if (a.id === existingTr.fromAccountId) bal += oldTotalDeduct;
        if (a.id === existingTr.toAccountId) bal -= oldAmount;
        return { ...a, currentBalance: bal };
      })
    );

    setAccountTransfers((prev) => prev.filter((t) => t.id !== id));
    showToast('Transfer record deleted and balances restored.');
  };

  // Supplier Payment Handlers
  const addSupplierPayment = (payData: Omit<SupplierPayment, 'id' | 'createdAt' | 'recordedBy'>) => {
    const supp = suppliers.find((s) => s.id === payData.supplierId);
    const acc = accounts.find((a) => a.id === payData.accountId);
    if (!supp || !acc) {
      showToast('Invalid supplier or account selected.');
      return;
    }

    const newPayment: SupplierPayment = {
      ...payData,
      id: `sp_${Date.now()}`,
      supplierName: supp.companyName || supp.name,
      accountName: acc.accountName,
      recordedBy: currentUser.name,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setAccounts((prev) =>
      prev.map((a) => (a.id === payData.accountId ? { ...a, currentBalance: a.currentBalance - payData.amount } : a))
    );

    setSuppliers((prev) =>
      prev.map((s) => (s.id === payData.supplierId ? { ...s, balance: Math.max(0, s.balance - payData.amount) } : s))
    );

    if (payData.purchaseOrderId) {
      setPurchaseOrders((prev) =>
        prev.map((po) => {
          if (po.id === payData.purchaseOrderId) {
            const newPaid = po.paidAmount + payData.amount;
            const newStatus = newPaid >= po.totalCost ? 'paid' : newPaid > 0 ? 'partial' : 'due';
            return { ...po, paidAmount: newPaid, paymentStatus: newStatus };
          }
          return po;
        })
      );
    }

    setSupplierPayments((prev) => [newPayment, ...prev]);
    showToast(`Recorded payment of ৳${payData.amount.toLocaleString()} to ${supp.companyName || supp.name}.`);
  };

  const updateSupplierPayment = (id: string, updatedFields: Partial<SupplierPayment>) => {
    const existing = supplierPayments.find((p) => p.id === id);
    if (!existing) return;

    const merged = { ...existing, ...updatedFields };
    const diffAmount = merged.amount - existing.amount;

    if (diffAmount !== 0) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === merged.accountId ? { ...a, currentBalance: a.currentBalance - diffAmount } : a))
      );
      setSuppliers((prev) =>
        prev.map((s) => (s.id === merged.supplierId ? { ...s, balance: Math.max(0, s.balance - diffAmount) } : s))
      );
    }

    setSupplierPayments((prev) => prev.map((p) => (p.id === id ? merged : p)));
    showToast('Supplier payment record updated.');
  };

  const deleteSupplierPayment = (id: string) => {
    const existing = supplierPayments.find((p) => p.id === id);
    if (!existing) return;

    setAccounts((prev) =>
      prev.map((a) => (a.id === existing.accountId ? { ...a, currentBalance: a.currentBalance + existing.amount } : a))
    );
    setSuppliers((prev) =>
      prev.map((s) => (s.id === existing.supplierId ? { ...s, balance: s.balance + existing.amount } : s))
    );

    setSupplierPayments((prev) => prev.filter((p) => p.id !== id));
    showToast('Supplier payment record deleted and balances restored.');
  };

  return (
    <AppContext.Provider
      value={{
        currentMode,
        setCurrentMode,
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        staffUsers,
        isAuthenticated,
        authReady,
        login,
        logout,
        updateStaffUsers,
        activeBusiness,
        setActiveBusiness,
        editingSaleInvoice,
        setEditingSaleInvoice,
        loadSaleIntoPOS,
        settings,
        updateSettings,
        auditConfig,
        updateAuditConfig,
        brands,
        addBrand,
        categories,
        addCategory,
        expenseCategories,
        addExpenseCategory,
        deleteExpenseCategory,
        crmGroups,
        addCrmGroup,
        crmLeadSources,
        addCrmLeadSource,
        stockAdjustments,
        addStockAdjustment,
        damageLogs,
        addDamageLog,
        supplierReturns,
        addSupplierReturn,
        customerReturns,
        addCustomerReturn,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        bulkUpdateProducts,
        bulkDeleteProducts,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        importCustomersFromExcel,
        sales,
        addSale,
        updateSale,
        deleteSale,
        payInvoiceDue,
        installmentPlans,
        processInstallmentPayment,
        updateInstallmentPlan,
        quotations,
        addQuotation,
        updateQuotation,
        deleteQuotation,
        convertQuoteToSale,
        suppliers,
        addSupplier,
        supplierRequisitions,
        addSupplierRequisition,
        updateSupplierRequisition,
        deleteSupplierRequisition,
        purchaseOrders,
        addPurchaseOrder,
        processBulkProductEntry,
        updatePurchaseOrder,
        deletePurchaseOrder,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        accountTransfers,
        addAccountTransfer,
        updateAccountTransfer,
        deleteAccountTransfer,
        supplierPayments,
        addSupplierPayment,
        updateSupplierPayment,
        deleteSupplierPayment,
        smsLogs,
        sendSMS,
        activeReceiptInvoice,
        setActiveReceiptInvoice,
        websiteQuoteModalProduct,
        setWebsiteQuoteModalProduct,
        toastMessage,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
