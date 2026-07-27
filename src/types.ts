export type BusinessType = 'amanot_electronics' | 'amanot_enterprise';

export type PaymentMode =
  | 'cash'
  | 'card'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'bkash_nagad'
  | 'installment'
  | 'bank_transfer';

export type ERPTab =
  | 'pos'
  | 'inventory'
  | 'invoices'
  | 'quotes'
  | 'installments'
  | 'suppliers'
  | 'expenses'
  | 'accounts'
  | 'crm'
  | 'global_reports'
  | 'audit_reports'
  | 'rbac'
  | 'settings'
  | 'website';

export type UserRole = 'super_admin' | 'staff';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedBusiness: 'all' | BusinessType;
  permissions: {
    canViewGlobalReports: boolean;
    canManageAuditConfig: boolean;
    canManageInventory: boolean;
    canManagePOS: boolean;
    canManageExpenses: boolean;
    canManageCRM: boolean;
    canManageRBAC: boolean;
  };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  business: BusinessType; // Amanot Electronics or Amanot Enterprise
  brand: string; // Konka, Gree, Haiko, Haier, etc.
  category: string; // Inverter AC, Refrigerator, LED TV, Washing Machine, Deep Fridge, Oven
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  stockQty: number;
  minStockAlert: number;
  unit: string; // Pcs, Set
  warranty: string; // e.g. "10 Years Compressor, 1 Year Spare Parts"
  image?: string;
  images?: string[]; // Photo gallery array of image URLs
  tags?: string[]; // Product tags e.g. ['Inverter', '5-Star Energy', 'Hot Sale']
  description?: string;
  storefrontDescription?: string; // Detailed options and bullet specs for storefront
  isFeaturedOnWebsite?: boolean;
  supplierId?: string;
  supplierName?: string;

  // AC & Appliance Technical Specifications
  model?: string; // e.g., GS-12XZNA3V, GS-18XSMA1
  typeSeries?: string; // e.g., Zeno, Shimo, Charmo, Cosmo, Pular, Fairy, Lomo, Muse, Airy, Clivia
  acType?: string; // e.g., Split Inverter, Split, Floor Standing, Cassette, Portable, Ducted
  capacity?: string; // e.g., 12000BTU, 18000BTU, 24000BTU, 135 LTR (BTU/volume rating)
  size?: string; // e.g., 1.0 Ton, 1.5 Ton, 32", 135 Litre, 8.0 KG (headline size)
  installationCharge?: number; // Default installation charge BDT e.g. 3000, 3500, 4500
  extraPipingFeePerFt?: number; // Extra over 10' charge per foot BDT e.g. 550, 630, 675
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  customerType: 'walk_in' | 'regular' | 'wholesale' | 'vip' | 'lead' | 'installment' | 'inactive';
  group?: 'General' | 'VIP Club' | 'Wholesale Buyers' | 'Installment EMI Clients' | 'Website Leads' | 'Corporate' | 'Inactive';
  totalPurchases: number;
  currentDue: number;
  createdAt: string;
  notes?: string;
  leadStatus?: 'new' | 'contacted' | 'negotiating' | 'converted' | 'lost';
}

export interface POSItem {
  product: Product;
  quantity: number;
  selectedPriceType: 'retail' | 'wholesale';
  unitPrice: number;
  discount: number;
  total: number;
  includeInstallationFee?: boolean; // Toggle for default installation fee
  installationFee?: number; // Fee charge (not store profit)
  extraPipingFt?: number; // Piping feet over 10 ft
  extraPipingFee?: number; // Extra piping fee (extraPipingFt * extraPipingFeePerFt)
}

export interface SaleInvoice {
  id: string; // e.g., "INV-2026-001" or "DRAFT-2026-001"
  business: BusinessType;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    productId: string;
    productName: string;
    brand: string;
    category: string;
    quantity: number;
    priceType: 'retail' | 'wholesale';
    unitPrice: number;
    costPrice: number;
    discount: number;
    total: number;
    model?: string;
    typeSeries?: string;
    acType?: string;
    capacity?: string;
    size?: string;
    includeInstallationFee?: boolean;
    installationFee?: number;
    extraPipingFt?: number;
    extraPipingFee?: number;
  }[];
  subtotal: number;
  discountTotal: number; // Customer discount — the only discount ever printed on a customer invoice
  taxAmount: number;
  /**
   * Special (referral) discount. Internal only — never shown on customer documents.
   * The customer still pays the full grandTotal; this is a referral payout we absorb,
   * so actual/net sales = grandTotal - specialDiscount.
   */
  specialDiscount?: number;
  specialDiscountMode?: 'amount' | 'percent'; // How the operator entered it
  specialDiscountRate?: number; // The percentage typed, when mode is 'percent'
  referralName?: string;
  installationFeeTotal?: number; // Total installation & piping charges (pass-through fee, excluded from profit)
  grandTotal: number;
  totalCost: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: PaymentMode;
  paymentStatus: 'paid' | 'partial' | 'due' | 'draft';
  isInstallment: boolean;
  installmentPlanId?: string;
  smsSent: boolean;
  onlineReceiptUrl: string;
  createdByStaffId: string;
  createdByStaffName: string;
  createdAt: string;
  returnedAmount?: number;
  notes?: string;
  isDraft?: boolean;
  accountId?: string;
  accountName?: string;
  customerPaymentNumber?: string;
}

export interface InstallmentPlan {
  id: string;
  invoiceId: string;
  business: BusinessType;
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  downPayment: number;
  financedAmount: number;
  totalInstallments: number;
  monthlyEmi: number;
  paidInstallments: number;
  status: 'active' | 'completed' | 'defaulted';
  schedule: {
    installmentNo: number;
    dueDate: string;
    amount: number;
    status: 'paid' | 'due' | 'overdue' | 'partial';
    paidAmount?: number;
    paidDate?: string;
    paymentMode?: 'cash' | 'bkash_nagad' | 'card' | 'bank_transfer';
    // Account the collection was banked into (business-scoped at collection time)
    accountId?: string;
    accountName?: string;
    receiptId?: string;
  }[];
  createdAt: string;
  notes?: string;
  // KYC & Guarantor Profile
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  idType?: 'nid' | 'passport' | 'driving_license' | 'other';
  idNumber?: string;
  dob?: string;
  customerEmail?: string;
  profession?: string;
  presentAddress?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  customerPhotoUrl?: string;
  customerNidUrl?: string;
  addressProofUrl?: string;
  otherDocsUrl?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorNid?: string;
  guarantorAddress?: string;
  guarantorRelation?: string;
  guarantorPhotoUrl?: string;
  guarantorNidUrl?: string;
  agreementSigned?: boolean;
}

export interface Quotation {
  id: string; // e.g. "QTE-2026-101"
  business: BusinessType;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  source: 'pos_walkin' | 'website_inquiry';
  items: {
    productId: string;
    productName: string;
    brand: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  validUntil: string;
  status: 'draft' | 'sent' | 'converted' | 'expired';
  createdAt: string;
  notes?: string;
  discountTotal?: number;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  business: BusinessType;
  phone: string;
  email?: string;
  address: string;
  brandsSupplied: string[];
  balance: number; // Amount owed to supplier
}

export interface RequisitionItem {
  isNewProduct?: boolean;
  productId?: string;
  productName: string;
  brand: string;
  category: string;
  sku?: string;
  unit: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  warranty?: string;
  totalCost: number;
}

export interface SupplierRequisition {
  id: string; // e.g., "REQ-2026-101"
  business: BusinessType;
  supplierId: string;
  supplierName: string;
  requisitionDate: string;
  requiredByDate: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'fulfilled';
  items: RequisitionItem[];
  totalEstimatedCost: number;
  notes?: string;
  createdByStaffName: string;
  createdAt: string;
  fulfilledPOId?: string;
}

export interface PurchaseOrder {
  id: string;
  business: BusinessType;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    productName: string;
    brand?: string;
    category?: string;
    unit?: string;
    sku?: string;
    quantity: number;
    costPrice: number;
    retailPrice?: number;
    wholesalePrice?: number;
    totalCost: number;
  }[];
  totalCost: number;
  paidAmount: number;
  paymentStatus: 'paid' | 'partial' | 'due';
  createdAt: string;
  notes?: string;
  requisitionId?: string;
  accountId?: string;
  accountName?: string;
}

export interface Expense {
  id: string;
  business: BusinessType;
  category: string; // Dynamic expense category e.g. Shop Rent, Utility, Freight, Staff Allowance, etc.
  amount: number;
  title: string;
  vendorName?: string;
  paymentMode?: 'cash' | 'bank_transfer' | 'bkash_nagad' | 'card';
  voucherNo?: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  notes?: string;
  date: string;
  recordedBy: string;
  accountId?: string;
  accountName?: string;
}

export type AccountType = 'cash' | 'bank' | 'mfs' | 'cheque';

export interface Account {
  id: string;
  accountName: string;
  type: AccountType;
  business: 'all' | BusinessType;
  accountNumber?: string;
  bankName?: string;
  branch?: string;
  mfsProvider?: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'other';
  openingBalance: number;
  currentBalance: number;
  isDefault?: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  notes?: string;
}

export interface AccountTransfer {
  id: string;
  business: 'all' | BusinessType;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  transferFee?: number;
  date: string;
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  business: BusinessType;
  purchaseOrderId?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank' | 'mfs' | 'cheque';
  accountId: string;
  accountName: string;
  chequeNo?: string;
  chequeDate?: string;
  chequeStatus?: 'pending' | 'cleared' | 'bounced';
  voucherNo?: string;
  bankSlipUrl?: string; // uploaded bank/MFS transfer slip (base64 data URI or URL)
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  business: BusinessType;
  productId: string;
  productName: string;
  sku: string;
  brand: string;
  category: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string; // e.g., Audit Variance, Found Stock, Physical Count Shift, Barcode Correction
  notes?: string;
  performedBy: string;
  createdAt: string;
}

export interface DamageLog {
  id: string;
  business: BusinessType;
  productId: string;
  productName: string;
  sku: string;
  brand: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalLoss: number;
  cause: string; // e.g., Transport Transit Damage, Display Scratch, Factory Defect, Water/Short-circuit
  actionTaken: 'written_off' | 'scrapped' | 'sent_for_repair' | 'returned_to_supplier';
  notes?: string;
  reportedBy: string;
  createdAt: string;
}

export interface SupplierReturnItem {
  productId: string;
  productName: string;
  sku?: string;
  brand: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface SupplierReturn {
  id: string; // e.g., "RET-SUP-2026-001"
  business: BusinessType;
  supplierId: string;
  supplierName: string;
  items: SupplierReturnItem[];
  totalRefundAmount: number;
  refundMode: 'cash' | 'supplier_credit' | 'bank_transfer' | 'bkash_nagad';
  reason: string; // e.g., Defective Batch, Wrong Specs, Overstock
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface CustomerReturnItem {
  productId: string;
  productName: string;
  sku?: string;
  brand: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  condition: 'good_restock' | 'damaged';
}

export interface CustomerReturn {
  id: string; // e.g., "RET-CUST-2026-001"
  invoiceId: string;
  business: BusinessType;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: CustomerReturnItem[];
  totalRefundAmount: number;
  refundMode: 'cash' | 'customer_credit' | 'bkash_nagad' | 'bank_transfer';
  restockItems: boolean;
  reason: string; // e.g., Customer Mind Change, Minor Scratch, Defective Unit
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface SMSLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  message: string;
  type: 'sale_receipt' | 'due_reminder' | 'installment_reminder' | 'marketing_campaign';
  business: BusinessType;
  status: 'delivered' | 'pending' | 'failed';
  gateway: 'Alpha SMS API';
  sentAt: string;
}

export interface AuditConfig {
  salesPercentageToInclude: number; // e.g. 50% of real sales shown in audit report
  maxSalesCountToInclude: number; // e.g. 20 max sales list count (or 0 for unlimited)
  allowedCategories: string[]; // e.g. show only LED TV and Refrigerator
  allowedBrands: string[]; // e.g. Konka, Haier
  profitMarginMultiplier: number; // e.g. 0.85 to scale down profit
  maxMonthlyExpenseCap: number; // e.g. 150000 BDT limit on reported expenses
  includeInstallmentSales: boolean;
  purchasePercentageToInclude: number; // e.g. 50% of real purchase orders
  maxPurchaseCountToInclude: number; // e.g. 10 max purchase orders
  maxProductCountToInclude: number; // e.g. 20 max products listed
}

export interface AppSettings {
  showPricesOnWebsite: boolean;
  allowOnlineQuoteRequest: boolean;
  alphaSmsApiKey: string;
  alphaSmsSenderId: string;
  alphaSmsApiUrl: string;
  currencySymbol: string;
  amanotElectronicsPhone: string;
  amanotElectronicsAddress: string;
  amanotEnterprisePhone: string;
  amanotEnterpriseAddress: string;
  // Brand logos shown on POS cards, storefront & receipts.
  // Keyed by lowercased brand name → image URL or base64 data URI.
  brandLogos?: Record<string, string>;
}
