import {
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
  SupplierRequisition,
  PurchaseOrder,
  Account,
  AccountTransfer,
  SupplierPayment
} from '../types';
// Amanot Electronics catalogue generated from the official price list.
// Regenerate with: node scripts/generate-electronics.mjs
import electronicsProducts from './electronicsProducts.json';
import { DEFAULT_BRAND_LOGOS } from './brandLogos';
import { AMANOT_ELECTRONICS_ADDRESS } from '../constants/business';

export const INITIAL_STAFF_USERS: StaffUser[] = [
  {
    id: 'usr_super_admin',
    name: 'Super Admin (Owner)',
    email: 'admin@amanot.com',
    role: 'super_admin',
    assignedBusiness: 'all',
    permissions: {
      canViewGlobalReports: true,
      canManageAuditConfig: true,
      canManageInventory: true,
      canManagePOS: true,
      canManageExpenses: true,
      canManageCRM: true,
      canManageRBAC: true,
    }
  },
  {
    id: 'usr_staff_electronics',
    name: 'Rahim (Electronics Manager)',
    email: 'rahim@amanotelectronics.com',
    role: 'staff',
    assignedBusiness: 'amanot_electronics',
    permissions: {
      canViewGlobalReports: false,
      canManageAuditConfig: false,
      canManageInventory: true,
      canManagePOS: true,
      canManageExpenses: true,
      canManageCRM: true,
      canManageRBAC: false,
    }
  },
  {
    id: 'usr_staff_enterprise',
    name: 'Karim (Enterprise Manager)',
    email: 'karim@amanotenterprise.com',
    role: 'staff',
    assignedBusiness: 'amanot_enterprise',
    permissions: {
      canViewGlobalReports: false,
      canManageAuditConfig: false,
      canManageInventory: true,
      canManagePOS: true,
      canManageExpenses: true,
      canManageCRM: true,
      canManageRBAC: false,
    }
  }
];

export const INITIAL_PRODUCTS: Product[] = electronicsProducts as unknown as Product[];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_walkin',
    name: 'Walk-in Customer',
    phone: '01700000000',
    address: 'Showroom Counter, Dhaka',
    customerType: 'walk_in',
    totalPurchases: 125000,
    currentDue: 0,
    createdAt: '2026-01-10'
  },
  {
    id: 'cust_01',
    name: 'Md. Al-Amin Hossain',
    phone: '01712345678',
    address: 'House 42, Road 7, Sector 3, Uttara, Dhaka',
    email: 'alamin.hossain@gmail.com',
    customerType: 'regular',
    totalPurchases: 185000,
    currentDue: 35000,
    createdAt: '2026-02-15',
    notes: 'Purchased Gree AC on 3-month installment plan'
  },
  {
    id: 'cust_02',
    name: 'Engineers Tech Solutions Ltd',
    phone: '01898765432',
    address: 'Level 5, Concord Tower, Motijheel, Dhaka',
    email: 'procurement@engineers-tech.bd',
    customerType: 'wholesale',
    totalPurchases: 450000,
    currentDue: 85000,
    createdAt: '2026-03-01',
    notes: 'Wholesale buyer for office Gree AC & Konka TVs'
  },
  {
    id: 'cust_03',
    name: 'Nusrat Jahan Tanvin',
    phone: '01911223344',
    address: 'Flat 4B, Green Villa, Dhanmondi 27, Dhaka',
    customerType: 'regular',
    totalPurchases: 65900,
    currentDue: 0,
    createdAt: '2026-04-12'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'supp_electro_mart',
    name: 'Electro Mart Bangladesh Ltd',
    companyName: 'Electro Mart Ltd (Official Dist. Gree & Konka)',
    business: 'amanot_electronics',
    phone: '02-9881122',
    email: 'sales@electromart.com.bd',
    address: 'Gulshan 1, Dhaka, Bangladesh',
    brandsSupplied: ['Gree', 'Konka', 'Haiko'],
    balance: 140000
  },
  {
    id: 'supp_haier_bd',
    name: 'Haier Bangladesh Sales Dept',
    companyName: 'Haier Bangladesh Industrial Ltd',
    business: 'amanot_enterprise',
    phone: '02-8877665',
    email: 'orders@haier.com.bd',
    address: 'Tejgaon I/A, Dhaka',
    brandsSupplied: ['Haier'],
    balance: 210000
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_01',
    business: 'amanot_electronics',
    category: 'Shop Rent',
    amount: 45000,
    title: 'July Showroom Rent (Amanot Electronics)',
    date: '2026-07-01',
    recordedBy: 'Rahim'
  },
  {
    id: 'exp_02',
    business: 'amanot_electronics',
    category: 'Electricity & Utility',
    amount: 18500,
    title: 'AC Commercial Electricity Bill',
    date: '2026-07-05',
    recordedBy: 'Rahim'
  },
  {
    id: 'exp_03',
    business: 'amanot_enterprise',
    category: 'Shop Rent',
    amount: 40000,
    title: 'July Outlet Rent (Amanot Enterprise)',
    date: '2026-07-01',
    recordedBy: 'Karim'
  },
  {
    id: 'exp_04',
    business: 'amanot_enterprise',
    category: 'Transport & Freight',
    amount: 9500,
    title: 'Truck transport cost for Haier stock delivery',
    date: '2026-07-10',
    recordedBy: 'Karim'
  }
];

export const INITIAL_SALES: SaleInvoice[] = [
  {
    id: 'INV-2026-1001',
    business: 'amanot_electronics',
    customerId: 'cust_01',
    customerName: 'Md. Al-Amin Hossain',
    customerPhone: '01712345678',
    customerAddress: 'House 42, Road 7, Uttara',
    items: [
      {
        productId: 'prod_gree_15t_ac',
        productName: 'Gree 1.5 Ton Inverter Air Conditioner (GS-18XPUV32)',
        brand: 'Gree',
        category: 'Inverter AC',
        quantity: 1,
        priceType: 'retail',
        unitPrice: 68500,
        costPrice: 56000,
        discount: 1000,
        total: 67500
      }
    ],
    subtotal: 68500,
    discountTotal: 1000,
    taxAmount: 0,
    grandTotal: 67500,
    totalCost: 56000,
    paidAmount: 32500,
    dueAmount: 35000,
    paymentMode: 'installment',
    paymentStatus: 'partial',
    isInstallment: true,
    installmentPlanId: 'inst_plan_01',
    smsSent: true,
    onlineReceiptUrl: '/receipt/INV-2026-1001',
    createdByStaffId: 'usr_staff_electronics',
    createdByStaffName: 'Rahim',
    createdAt: '2026-06-15'
  },
  {
    id: 'INV-2026-1002',
    business: 'amanot_enterprise',
    customerId: 'cust_03',
    customerName: 'Nusrat Jahan Tanvin',
    customerPhone: '01911223344',
    customerAddress: 'Dhanmondi 27, Dhaka',
    items: [
      {
        productId: 'prod_haier_ref_358l',
        productName: 'Haier 358L French Door Inverter Refrigerator (HRF-358TGB)',
        brand: 'Haier',
        category: 'Refrigerator',
        quantity: 1,
        priceType: 'retail',
        unitPrice: 65900,
        costPrice: 52000,
        discount: 0,
        total: 65900
      }
    ],
    subtotal: 65900,
    discountTotal: 0,
    taxAmount: 0,
    grandTotal: 65900,
    totalCost: 52000,
    paidAmount: 65900,
    dueAmount: 0,
    paymentMode: 'bkash_nagad',
    paymentStatus: 'paid',
    isInstallment: false,
    smsSent: true,
    onlineReceiptUrl: '/receipt/INV-2026-1002',
    createdByStaffId: 'usr_staff_enterprise',
    createdByStaffName: 'Karim',
    createdAt: '2026-07-02'
  }
];

export const INITIAL_INSTALLMENT_PLANS: InstallmentPlan[] = [
  {
    id: 'inst_plan_01',
    invoiceId: 'INV-2026-1001',
    business: 'amanot_electronics',
    customerId: 'cust_01',
    customerName: 'Md. Al-Amin Hossain',
    customerPhone: '01712345678',
    totalAmount: 67500,
    downPayment: 32500,
    financedAmount: 35000,
    totalInstallments: 3,
    monthlyEmi: 11667,
    paidInstallments: 0,
    status: 'active',
    schedule: [
      { installmentNo: 1, dueDate: '2026-07-15', amount: 11667, status: 'overdue' },
      { installmentNo: 2, dueDate: '2026-08-15', amount: 11667, status: 'due' },
      { installmentNo: 3, dueDate: '2026-09-15', amount: 11666, status: 'due' }
    ],
    createdAt: '2026-06-15'
  }
];

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'QTE-2026-201',
    business: 'amanot_electronics',
    customerName: 'Afrin Sultana',
    customerPhone: '01819001122',
    customerAddress: 'Mirpur DOHS, Dhaka',
    source: 'website_inquiry',
    items: [
      {
        productId: 'prod_gree_20t_ac',
        productName: 'Gree 2.0 Ton Inverter AC (GS-24XPUV32)',
        brand: 'Gree',
        quantity: 2,
        unitPrice: 83000,
        total: 166000
      }
    ],
    totalAmount: 166000,
    validUntil: '2026-08-15',
    status: 'sent',
    createdAt: '2026-07-20',
    notes: 'Requested quotation via website "Get a Quote" modal for duplex flat.'
  }
];

export const INITIAL_SUPPLIER_REQUISITIONS: SupplierRequisition[] = [
  {
    id: 'REQ-2026-101',
    business: 'amanot_electronics',
    supplierId: 'supp_electro_mart',
    supplierName: 'Electro Mart Bangladesh Ltd',
    requisitionDate: '2026-07-20',
    requiredByDate: '2026-07-28',
    priority: 'high',
    status: 'approved',
    items: [
      {
        productId: 'prod_gree_15t_ac',
        productName: 'Gree 1.5 Ton Inverter AC (GS-18XPUV32)',
        brand: 'Gree',
        category: 'Inverter AC',
        unit: 'Pcs',
        quantity: 10,
        costPrice: 48000,
        retailPrice: 59500,
        wholesalePrice: 54000,
        warranty: '10 Years Compressor, 1 Year Parts',
        totalCost: 480000
      },
      {
        isNewProduct: true,
        productName: 'Konka 43 Inch 4K Android Smart LED TV',
        brand: 'Konka',
        category: 'Smart LED TV',
        sku: 'KON-TV-43-4K',
        unit: 'Pcs',
        quantity: 5,
        costPrice: 28000,
        retailPrice: 36000,
        wholesalePrice: 32000,
        warranty: '2 Years Panel Warranty',
        totalCost: 140000
      }
    ],
    totalEstimatedCost: 620000,
    notes: 'Urgent stock requisition for upcoming monsoon summer campaign.',
    createdByStaffName: 'Al-Amin (Manager)',
    createdAt: '2026-07-20'
  }
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-2026-501',
    business: 'amanot_electronics',
    supplierId: 'supp_electro_mart',
    supplierName: 'Electro Mart Bangladesh Ltd',
    items: [
      {
        productId: 'prod_gree_15t_ac',
        productName: 'Gree 1.5 Ton Inverter AC (GS-18XPUV32)',
        brand: 'Gree',
        category: 'Inverter AC',
        unit: 'Pcs',
        quantity: 5,
        costPrice: 48000,
        retailPrice: 59500,
        wholesalePrice: 54000,
        totalCost: 240000
      }
    ],
    totalCost: 240000,
    paidAmount: 200000,
    paymentStatus: 'partial',
    createdAt: '2026-07-15',
    notes: 'Bulk stock restock shipment'
  }
];

export const INITIAL_SMS_LOGS: SMSLog[] = [
  {
    id: 'sms_101',
    recipientPhone: '01712345678',
    recipientName: 'Md. Al-Amin Hossain',
    message: 'Amanot Electronics: Thank you for your purchase! INV-2026-1001. Paid: 32,500 BDT. View e-receipt: https://amanot.app/receipt/INV-2026-1001',
    type: 'sale_receipt',
    business: 'amanot_electronics',
    status: 'delivered',
    gateway: 'Alpha SMS API',
    sentAt: '2026-06-15 14:32'
  }
];

export const INITIAL_AUDIT_CONFIG: AuditConfig = {
  salesPercentageToInclude: 50, // 50% of real sales shown in tax report
  maxSalesCountToInclude: 20, // 20 sales max listed
  allowedCategories: ['Smart LED TV', 'Inverter AC', 'Refrigerator', 'Smartphone', 'Home Appliance'],
  allowedBrands: ['Konka', 'Gree', 'Haier', 'Samsung', 'Singer', 'Walton'],
  profitMarginMultiplier: 0.80, // scale down profit report to 80%
  maxMonthlyExpenseCap: 100000, // cap reported expenses at 1 Lakh BDT
  includeInstallmentSales: true,
  purchasePercentageToInclude: 50,
  maxPurchaseCountToInclude: 10,
  maxProductCountToInclude: 20
};

export const INITIAL_APP_SETTINGS: AppSettings = {
  showPricesOnWebsite: true,
  allowOnlineQuoteRequest: true,
  // Set the live key at runtime in Admin > Settings — never commit a real credential
  alphaSmsApiKey: '',
  alphaSmsSenderId: 'AMANOT_BD',
  alphaSmsApiUrl: 'https://api.alphasms.biz/api/v1/sendsms',
  currencySymbol: 'BDT ৳',
  amanotElectronicsPhone: '+880 1711-001122, +880 1819-223344',
  amanotElectronicsAddress: AMANOT_ELECTRONICS_ADDRESS,
  amanotEnterprisePhone: '+880 1911-556677, +880 1612-889900',
  amanotEnterpriseAddress: 'Showroom #4, Haier City Plaza, Stadium Market, Dhaka, Bangladesh',
  brandLogos: DEFAULT_BRAND_LOGOS
};

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc_cash_amanot_electronics',
    accountName: 'Amanot Electronics Counter Cash',
    type: 'cash',
    business: 'amanot_electronics',
    openingBalance: 25000,
    currentBalance: 87400,
    isDefault: true,
    status: 'active',
    createdAt: '2026-01-01',
    notes: 'Electronics showroom POS cash drawer'
  },
  {
    id: 'acc_cash_amanot_enterprise',
    accountName: 'Amanot Enterprise Counter Cash',
    type: 'cash',
    business: 'amanot_enterprise',
    openingBalance: 0,
    currentBalance: 0,
    isDefault: true,
    status: 'active',
    createdAt: '2026-01-01',
    notes: 'Enterprise POS cash drawer'
  },
  {
    id: 'acc_bank_01',
    accountName: 'Dutch Bangla Bank (DBBL Current)',
    type: 'bank',
    business: 'amanot_electronics',
    accountNumber: '110-120-458921',
    bankName: 'Dutch Bangla Bank Ltd',
    branch: 'Elephant Road Branch',
    openingBalance: 250000,
    currentBalance: 485000,
    isDefault: true,
    status: 'active',
    createdAt: '2026-01-01',
    notes: 'Main business operational bank account'
  },
  {
    id: 'acc_mfs_bkash',
    accountName: 'bKash Merchant Account',
    type: 'mfs',
    business: 'all',
    accountNumber: '01711001122',
    mfsProvider: 'bkash',
    openingBalance: 15000,
    currentBalance: 64200,
    isDefault: true,
    status: 'active',
    createdAt: '2026-01-01',
    notes: 'Merchant QR and counter payment gateway'
  },
  {
    id: 'acc_mfs_nagad',
    accountName: 'Nagad Merchant Wallet',
    type: 'mfs',
    business: 'all',
    accountNumber: '01819223344',
    mfsProvider: 'nagad',
    openingBalance: 10000,
    currentBalance: 32800,
    isDefault: false,
    status: 'active',
    createdAt: '2026-01-01'
  },
  {
    id: 'acc_mfs_rocket',
    accountName: 'Rocket Merchant Wallet',
    type: 'mfs',
    business: 'all',
    mfsProvider: 'rocket',
    openingBalance: 0,
    currentBalance: 0,
    isDefault: true,
    status: 'active',
    createdAt: '2026-01-01',
    notes: 'Rocket counter payment wallet'
  },
  {
    id: 'acc_cheque_01',
    accountName: 'Cheque Clearance Register',
    type: 'cheque',
    business: 'all',
    openingBalance: 0,
    currentBalance: 150000,
    isDefault: false,
    status: 'active',
    createdAt: '2026-01-01',
    notes: 'Account for tracking issued supplier cheques'
  }
];

export const INITIAL_ACCOUNT_TRANSFERS: AccountTransfer[] = [
  {
    id: 'tr_101',
    business: 'amanot_electronics',
    fromAccountId: 'acc_cash_amanot_electronics',
    fromAccountName: 'Amanot Electronics Counter Cash',
    toAccountId: 'acc_bank_01',
    toAccountName: 'Dutch Bangla Bank (DBBL Current)',
    amount: 50000,
    transferFee: 0,
    date: '2026-07-15',
    referenceNo: 'DEP-2026-0715',
    notes: 'End of week counter cash deposit to bank',
    createdBy: 'Super Admin',
    createdAt: '2026-07-15 17:30'
  },
  {
    id: 'tr_102',
    business: 'amanot_electronics',
    fromAccountId: 'acc_mfs_bkash',
    fromAccountName: 'bKash Merchant Account',
    toAccountId: 'acc_bank_01',
    toAccountName: 'Dutch Bangla Bank (DBBL Current)',
    amount: 25000,
    transferFee: 375,
    date: '2026-07-20',
    referenceNo: 'WTH-BKASH-882',
    notes: 'bKash merchant wallet bank settlement transfer',
    createdBy: 'Rahim',
    createdAt: '2026-07-20 11:15'
  }
];

export const INITIAL_SUPPLIER_PAYMENTS: SupplierPayment[] = [
  {
    id: 'sp_101',
    supplierId: 'sup_gree_bd',
    supplierName: 'Electro Mart Ltd (Gree & Konka Distributor)',
    business: 'amanot_electronics',
    purchaseOrderId: 'po_101',
    amount: 150000,
    paymentDate: '2026-07-16',
    paymentMethod: 'bank',
    accountId: 'acc_bank_01',
    accountName: 'Dutch Bangla Bank (DBBL Current)',
    voucherNo: 'VCH-SUP-2026-01',
    notes: 'Partial payment against PO po_101 via DBBL bank transfer',
    recordedBy: 'Super Admin',
    createdAt: '2026-07-16 10:00'
  },
  {
    id: 'sp_102',
    supplierId: 'sup_haier_bd',
    supplierName: 'Haier Bangladesh Sales Ltd',
    business: 'amanot_enterprise',
    purchaseOrderId: 'po_102',
    amount: 100000,
    paymentDate: '2026-07-18',
    paymentMethod: 'cheque',
    accountId: 'acc_cheque_01',
    accountName: 'Cheque Clearance Register',
    chequeNo: 'CQ-7788991',
    chequeDate: '2026-07-25',
    chequeStatus: 'pending',
    voucherNo: 'VCH-SUP-2026-02',
    notes: 'Post-dated cheque issued for Haier bulk inventory shipment',
    recordedBy: 'Karim',
    createdAt: '2026-07-18 16:45'
  }
];
