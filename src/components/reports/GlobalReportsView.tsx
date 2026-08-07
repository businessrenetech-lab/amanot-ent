import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { BusinessType, Expense, PurchaseOrder, SaleInvoice } from '../../types';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Building2,
  FileSpreadsheet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Calendar,
  CreditCard,
  Receipt,
  FileText,
  Printer,
  Download,
  Users,
  Briefcase,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Eye,
  X,
  Tag,
  RotateCcw,
  SlidersHorizontal,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateBrandedReportPDF } from '../../utils/reportPdfGenerator';
import { formatDate } from '../../utils/formatDate';
import { paymentModeLabel, splitBreakdownText } from '../../utils/paymentLabel';
import { UnifiedStatementView } from './UnifiedStatementView';

export const GlobalReportsView: React.FC = () => {
  const {
    sales,
    products,
    expenses,
    suppliers,
    purchaseOrders,
    installmentPlans,
    customers,
    customerReturns,
    stockAdjustments,
    damageLogs,
    activeBusiness,
    settings,
    currentUser
  } = useApp();

  const [selectedReportType, setSelectedReportType] = useState<
    | 'profit_loss'
    | 'customer_returns'
    | 'stock_adjustments'
    | 'sales'
    | 'product_profit'
    | 'purchases'
    | 'expenses'
    | 'cash_flow'
    | 'installment_ledger'
    | 'receivables'
    | 'stocks'
    | 'category_sales'
    | 'referral_sales'
    | 'wholesale_sales'
    | 'statement'
  >('profit_loss');

  const [businessScope, setBusinessScope] = useState<'all' | BusinessType>(activeBusiness);

  // Date Filter Range
  const [dateMode, setDateMode] = useState<'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom' | 'all'>('this_month');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Search & Filter States
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'paid' | 'partial' | 'due'>('all');
  const [salesTypeFilter, setSalesTypeFilter] = useState<'all' | 'pos' | 'installment'>('all');
  
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesStatusFilter, setPurchasesStatusFilter] = useState<'all' | 'paid' | 'partial' | 'due'>('all');

  const [productSearch, setProductSearch] = useState('');
  
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCatFilter, setExpenseCatFilter] = useState<string>('all');

  // Expandable inspection rows
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [selectedExpenseVoucher, setSelectedExpenseVoucher] = useState<Expense | null>(null);

  // Date Calculators
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const thisMonthPrefix = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const thisYearPrefix = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}`;
  }, []);

  // Filter raw collections by Business Scope and Date
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Drafts are unposted: no stock moved, no money taken. They are never sales.
      if (s.isDraft) return false;

      if (businessScope !== 'all' && s.business !== businessScope) return false;

      if (dateMode === 'today' && s.createdAt !== todayStr) return false;
      if (dateMode === 'this_month' && !s.createdAt.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !s.createdAt.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && s.createdAt < fromDate) return false;
        if (toDate && s.createdAt > toDate) return false;
      }
      return true;
    });
  }, [sales, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate]);

  // Search/Filter Sales Invoices
  const auditedSalesList = useMemo(() => {
    return filteredSales.filter((s) => {
      if (salesStatusFilter !== 'all' && s.paymentStatus !== salesStatusFilter) return false;
      if (salesTypeFilter === 'pos' && s.isInstallment) return false;
      if (salesTypeFilter === 'installment' && !s.isInstallment) return false;

      if (salesSearch.trim()) {
        const q = salesSearch.toLowerCase();
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesCustomer = s.customerName.toLowerCase().includes(q) || s.customerPhone.includes(q);
        const matchesStaff = (s.createdByStaffName || '').toLowerCase().includes(q);
        const matchesItem = s.items.some((i) => i.productName.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q));
        if (!matchesId && !matchesCustomer && !matchesStaff && !matchesItem) return false;
      }
      return true;
    });
  }, [filteredSales, salesStatusFilter, salesTypeFilter, salesSearch]);

  // Wholesale-only sales for the dedicated wholesale report (respects search + status)
  const wholesaleSalesList = useMemo(() => {
    return filteredSales.filter((s) => {
      if (s.saleType !== 'wholesale') return false;
      if (salesStatusFilter !== 'all' && s.paymentStatus !== salesStatusFilter) return false;
      if (salesSearch.trim()) {
        const q = salesSearch.toLowerCase();
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesCustomer = s.customerName.toLowerCase().includes(q) || s.customerPhone.includes(q);
        const matchesItem = s.items.some((i) => i.productName.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q));
        if (!matchesId && !matchesCustomer && !matchesItem) return false;
      }
      return true;
    });
  }, [filteredSales, salesStatusFilter, salesSearch]);

  // Wholesale sales rolled up per buyer (invoice count, billed, paid, outstanding)
  const wholesaleCustomerSummary = useMemo(() => {
    const map = new Map<
      string,
      { customerId: string; name: string; phone: string; invoices: number; billed: number; paid: number; due: number }
    >();
    wholesaleSalesList.forEach((s) => {
      const key = s.customerId || s.customerPhone || s.customerName;
      const row =
        map.get(key) || { customerId: key, name: s.customerName, phone: s.customerPhone, invoices: 0, billed: 0, paid: 0, due: 0 };
      row.invoices += 1;
      row.billed += s.grandTotal;
      row.paid += s.paidAmount;
      row.due += s.dueAmount;
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.billed - a.billed);
  }, [wholesaleSalesList]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (businessScope !== 'all' && e.business !== businessScope) return false;

      if (dateMode === 'today' && e.date !== todayStr) return false;
      if (dateMode === 'this_month' && !e.date.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !e.date.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
      }
      return true;
    });
  }, [expenses, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate]);

  const auditedExpensesList = useMemo(() => {
    return filteredExpenses.filter((e) => {
      if (expenseCatFilter !== 'all' && e.category !== expenseCatFilter) return false;
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesVendor = (e.vendorName || '').toLowerCase().includes(q);
        const matchesVoucher = (e.voucherNo || '').toLowerCase().includes(q);
        const matchesRecorder = (e.recordedBy || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesVendor && !matchesVoucher && !matchesRecorder) return false;
      }
      return true;
    });
  }, [filteredExpenses, expenseCatFilter, expenseSearch]);

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (businessScope !== 'all' && po.business !== businessScope) return false;

      if (dateMode === 'today' && po.createdAt !== todayStr) return false;
      if (dateMode === 'this_month' && !po.createdAt.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !po.createdAt.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && po.createdAt < fromDate) return false;
        if (toDate && po.createdAt > toDate) return false;
      }
      return true;
    });
  }, [purchaseOrders, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate]);

  const auditedPurchaseOrdersList = useMemo(() => {
    return filteredPurchaseOrders.filter((po) => {
      if (purchasesStatusFilter !== 'all' && po.paymentStatus !== purchasesStatusFilter) return false;
      if (purchasesSearch.trim()) {
        const q = purchasesSearch.toLowerCase();
        const matchesId = po.id.toLowerCase().includes(q);
        const matchesSupplier = po.supplierName.toLowerCase().includes(q);
        const matchesProduct = po.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!matchesId && !matchesSupplier && !matchesProduct) return false;
      }
      return true;
    });
  }, [filteredPurchaseOrders, purchasesStatusFilter, purchasesSearch]);

  /**
   * Every purchased product line across the filtered POs, flattened so the report
   * lists what was actually bought instead of only per-PO totals.
   */
  const purchaseLineItems = useMemo(() => {
    return auditedPurchaseOrdersList.flatMap((po) =>
      po.items.map((item, idx) => ({
        key: `${po.id}_${idx}`,
        poId: po.id,
        date: po.createdAt,
        supplierName: po.supplierName,
        business: po.business,
        paymentStatus: po.paymentStatus,
        productName: item.productName,
        sku: item.sku || '',
        brand: item.brand || '',
        category: item.category || '',
        unit: item.unit || 'Pcs',
        quantity: item.quantity,
        costPrice: item.costPrice,
        totalCost: item.totalCost ?? item.quantity * item.costPrice
      }))
    );
  }, [auditedPurchaseOrdersList]);

  const purchasedUnitsTotal = useMemo(
    () => purchaseLineItems.reduce((sum, l) => sum + l.quantity, 0),
    [purchaseLineItems]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => (businessScope === 'all' ? true : p.business === businessScope));
  }, [products, businessScope]);

  const filteredCustomerReturns = useMemo(() => {
    return customerReturns.filter((r) => {
      if (businessScope !== 'all' && r.business !== businessScope) return false;

      const dateStr = r.createdAt.substring(0, 10);
      if (dateMode === 'today' && dateStr !== todayStr) return false;
      if (dateMode === 'this_month' && !dateStr.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !dateStr.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && dateStr < fromDate) return false;
        if (toDate && dateStr > toDate) return false;
      }
      return true;
    });
  }, [customerReturns, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate]);

  const totalCustomerReturnsAmount = useMemo(() => {
    return filteredCustomerReturns.reduce((acc, r) => acc + r.totalRefundAmount, 0);
  }, [filteredCustomerReturns]);

  const filteredStockAdjustments = useMemo(() => {
    return (stockAdjustments || []).filter((sa) => {
      if (businessScope !== 'all' && sa.business !== businessScope) return false;

      const dateStr = sa.createdAt.substring(0, 10);
      if (dateMode === 'today' && dateStr !== todayStr) return false;
      if (dateMode === 'this_month' && !dateStr.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !dateStr.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && dateStr < fromDate) return false;
        if (toDate && dateStr > toDate) return false;
      }
      return true;
    });
  }, [stockAdjustments, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate]);

  const filteredDamageLogs = useMemo(() => {
    return (damageLogs || []).filter((dl) => {
      if (businessScope !== 'all' && dl.business !== businessScope) return false;

      const dateStr = dl.createdAt.substring(0, 10);
      if (dateMode === 'today' && dateStr !== todayStr) return false;
      if (dateMode === 'this_month' && !dateStr.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !dateStr.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && dateStr < fromDate) return false;
        if (toDate && dateStr > toDate) return false;
      }
      return true;
    });
  }, [damageLogs, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate]);

  const totalDamageLossAmount = useMemo(() => {
    return filteredDamageLogs.reduce((acc, dl) => acc + dl.totalLoss, 0);
  }, [filteredDamageLogs]);

  // Key Accounting Calculations
  const grossInvoicedRevenue = filteredSales.reduce((acc, s) => acc + s.subtotal, 0);
  const totalDiscountsAllowed = filteredSales.reduce((acc, s) => acc + s.discountTotal, 0);
  const grossSalesGrandTotal = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const netRevenue = grossSalesGrandTotal - totalCustomerReturnsAmount;
  const totalCOGS = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const grossProfit = netRevenue - totalCOGS;

  // Referral (special discount) payouts are a real cost of sale, not a customer discount
  const totalReferralExpense = filteredSales.reduce((acc, s) => acc + (s.specialDiscount || 0), 0);
  const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netOperatingProfit =
    grossProfit - totalOperatingExpenses - totalDamageLossAmount - totalReferralExpense;

  // Filtered Installment Schedule EMI Collections in selected Period (mapped by paidDate)
  const filteredInstallmentCollections = useMemo(() => {
    const list: {
      planId: string;
      invoiceId: string;
      business: BusinessType;
      customerName: string;
      customerPhone: string;
      installmentNo: number;
      amountPaid: number;
      paidDate: string;
      paymentMode: string;
      accountName: string;
      dueDate: string;
    }[] = [];

    installmentPlans.forEach((plan) => {
      if (businessScope !== 'all' && plan.business !== businessScope) return;

      plan.schedule.forEach((s) => {
        // Partial collections are real money in the drawer — report them alongside full ones
        if ((s.status === 'paid' || s.status === 'partial') && s.paidDate && (s.paidAmount || s.amount) > 0) {
          let matchesDate = true;
          if (dateMode === 'today' && s.paidDate !== todayStr) matchesDate = false;
          if (dateMode === 'this_month' && !s.paidDate.startsWith(thisMonthPrefix)) matchesDate = false;
          if (dateMode === 'this_year' && !s.paidDate.startsWith(thisYearPrefix)) matchesDate = false;
          if (dateMode === 'custom') {
            if (fromDate && s.paidDate < fromDate) matchesDate = false;
            if (toDate && s.paidDate > toDate) matchesDate = false;
          }

          if (matchesDate) {
            list.push({
              planId: plan.id,
              invoiceId: plan.invoiceId,
              business: plan.business,
              customerName: plan.customerName,
              customerPhone: plan.customerPhone,
              installmentNo: s.installmentNo,
              amountPaid: s.paidAmount || s.amount,
              paidDate: s.paidDate,
              paymentMode: s.paymentMode || 'cash',
              accountName: s.accountName || 'Unassigned',
              dueDate: s.dueDate
            });
          }
        }
      });
    });

    return list.sort((a, b) => b.paidDate.localeCompare(a.paidDate));
  }, [installmentPlans, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate]);

  // ===== Referral (special discount) split =====
  // The customer always paid the full grandTotal; the SP amount is a referral
  // payout we absorb, so net/actual sales = grandTotal - specialDiscount.
  const referralSales = useMemo(
    () => filteredSales.filter((s) => (s.specialDiscount || 0) > 0),
    [filteredSales]
  );

  const regularSales = useMemo(
    () => filteredSales.filter((s) => (s.specialDiscount || 0) <= 0),
    [filteredSales]
  );

  const referralTotals = useMemo(() => {
    const regularRevenue = regularSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const referralGross = referralSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const referralExpense = referralSales.reduce((sum, s) => sum + (s.specialDiscount || 0), 0);
    return {
      regularRevenue,
      referralGross,
      referralExpense,
      referralNet: referralGross - referralExpense,
      grossRevenue: regularRevenue + referralGross,
      netRevenue: regularRevenue + referralGross - referralExpense
    };
  }, [regularSales, referralSales]);

  /** Referral payouts grouped by who earned them. */
  const referralByPerson = useMemo(() => {
    const map: Record<string, { name: string; invoiceCount: number; gross: number; payout: number }> = {};
    referralSales.forEach((s) => {
      const name = s.referralName?.trim() || 'Unnamed Referral';
      if (!map[name]) map[name] = { name, invoiceCount: 0, gross: 0, payout: 0 };
      map[name].invoiceCount += 1;
      map[name].gross += s.grandTotal;
      map[name].payout += s.specialDiscount || 0;
    });
    return Object.values(map).sort((a, b) => b.payout - a.payout);
  }, [referralSales]);

  const periodEmiCollectionTotal = useMemo(() => {
    return filteredInstallmentCollections.reduce((sum, item) => sum + item.amountPaid, 0);
  }, [filteredInstallmentCollections]);

  const periodDownPaymentTotal = useMemo(() => {
    return filteredSales
      .filter((s) => s.isInstallment)
      .reduce((sum, s) => sum + s.paidAmount, 0);
  }, [filteredSales]);

  const periodPosCashTotal = useMemo(() => {
    return filteredSales
      .filter((s) => !s.isInstallment)
      .reduce((sum, s) => sum + s.paidAmount, 0);
  }, [filteredSales]);

  // Realized Cash Flow
  const totalCashInflow = periodPosCashTotal + periodDownPaymentTotal + periodEmiCollectionTotal;
  const totalStockProcurementOutflow = filteredPurchaseOrders.reduce((acc, po) => acc + po.paidAmount, 0);
  const netCashFlow = totalCashInflow - (totalStockProcurementOutflow + totalOperatingExpenses);

  // Receivables & Installment Portfolio Assets
  const totalOutstandingDues = filteredSales.reduce((acc, s) => acc + s.dueAmount, 0);
  const totalFinancedEmiBalance = installmentPlans.reduce((acc, plan) => {
    if (businessScope !== 'all' && plan.business !== businessScope) return acc;
    return acc + (plan.financedAmount - (plan.paidInstallments * plan.monthlyEmi));
  }, 0);

  const totalOverdueEmiAmount = useMemo(() => {
    let sum = 0;
    installmentPlans.forEach((plan) => {
      if (businessScope !== 'all' && plan.business !== businessScope) return;
      plan.schedule.forEach((s) => {
        if (s.status === 'overdue') {
          sum += s.amount;
        }
      });
    });
    return sum;
  }, [installmentPlans, businessScope]);

  // Category Breakdown Detailed Report
  const categorySalesDetailedList = useMemo(() => {
    const map: Record<string, {
      category: string;
      unitsSold: number;
      invoiceCount: number;
      grossRevenue: number;
      cogs: number;
      netProfit: number;
      profitMarginPct: number;
      availableStockQty: number;
      availableStockValue: number;
    }> = {};

    // Map stock availability from filteredProducts
    filteredProducts.forEach((p) => {
      const cat = p.category || 'General';
      if (!map[cat]) {
        map[cat] = {
          category: cat,
          unitsSold: 0,
          invoiceCount: 0,
          grossRevenue: 0,
          cogs: 0,
          netProfit: 0,
          profitMarginPct: 0,
          availableStockQty: 0,
          availableStockValue: 0
        };
      }
      map[cat].availableStockQty += p.stockQty;
      map[cat].availableStockValue += p.stockQty * p.costPrice;
    });

    // Process sales
    filteredSales.forEach((s) => {
      const categoriesInSale = new Set<string>();
      s.items.forEach((item) => {
        const cat = item.category || 'General';
        if (!map[cat]) {
          map[cat] = {
            category: cat,
            unitsSold: 0,
            invoiceCount: 0,
            grossRevenue: 0,
            cogs: 0,
            netProfit: 0,
            profitMarginPct: 0,
            availableStockQty: 0,
            availableStockValue: 0
          };
        }
        map[cat].unitsSold += item.quantity;
        map[cat].grossRevenue += item.total;
        const itemCost = item.costPrice * item.quantity;
        map[cat].cogs += itemCost;
        categoriesInSale.add(cat);
      });

      categoriesInSale.forEach((cat) => {
        if (map[cat]) map[cat].invoiceCount += 1;
      });
    });

    // Calculate profit & margins — categories with no sales are left out
    const list = Object.values(map)
      .filter((item) => item.unitsSold > 0)
      .map((item) => {
      const netProfit = item.grossRevenue - item.cogs;
      const profitMarginPct = item.grossRevenue > 0 ? (netProfit / item.grossRevenue) * 100 : 0;
      return {
        ...item,
        netProfit,
        profitMarginPct
      };
    });

    return list.sort((a, b) => b.grossRevenue - a.grossRevenue || b.unitsSold - a.unitsSold);
  }, [filteredProducts, filteredSales]);

  // Product Profitability & Sales Audit List
  const productProfitList = useMemo(() => {
    const map: Record<string, { id: string; name: string; brand: string; category: string; stockQty: number; qty: number; rev: number; cost: number; profit: number }> = {};
    
    // First map all filtered products to show full stock overview
    filteredProducts.forEach((p) => {
      map[p.id] = {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        stockQty: p.stockQty,
        qty: 0,
        rev: 0,
        cost: 0,
        profit: 0
      };
    });

    // Accumulate sales
    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            id: item.productId,
            name: item.productName,
            brand: item.brand,
            category: item.category || 'General',
            stockQty: 0,
            qty: 0,
            rev: 0,
            cost: 0,
            profit: 0
          };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].rev += item.total;
        const c = item.costPrice * item.quantity;
        map[item.productId].cost += c;
        map[item.productId].profit += item.total - c;
      });
    });

    // Sales reporting lists sold products only — never pad it with zero-sales stock
    let list = Object.values(map).filter((p) => p.qty > 0);
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    return list.sort((a, b) => b.rev - a.rev || b.qty - a.qty);
  }, [filteredProducts, filteredSales, productSearch]);

  const handleExportExcel = () => {
    // 1. Sales Invoices
    const salesData = auditedSalesList.map((s) => ({
      InvoiceNo: s.id,
      Date: formatDate(s.createdAt),
      Business: s.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      Customer: s.customerName,
      Phone: s.customerPhone,
      Type: s.isInstallment ? 'Installment' : 'POS Direct',
      SubtotalBDT: s.subtotal,
      DiscountBDT: s.discountTotal,
      GrandTotalBDT: s.grandTotal,
      ReferralName: s.referralName || '',
      SpecialDiscountBDT: s.specialDiscount || 0,
      NetSalesAfterReferralBDT: s.grandTotal - (s.specialDiscount || 0),
      PaidAmountBDT: s.paidAmount,
      DueAmountBDT: s.dueAmount,
      TotalCostBDT: s.totalCost,
      GrossMarginBDT: s.grandTotal - s.totalCost,
      PaymentMode: s.paymentSplits && s.paymentSplits.length > 1 ? 'split' : s.paymentMode,
      PaymentBreakdown: s.paymentSplits && s.paymentSplits.length > 1 ? splitBreakdownText(s.paymentSplits) : '',
      PaymentStatus: s.paymentStatus,
      Staff: s.createdByStaffName
    }));

    // 2. Product Sales
    const productSalesData = productProfitList.map((p) => ({
      ProductName: p.name,
      Brand: p.brand,
      Category: p.category,
      CurrentStock: p.stockQty,
      UnitsSold: p.qty,
      GrossRevenueBDT: p.rev,
      CostOfGoodsSoldBDT: p.cost,
      NetProfitBDT: p.profit,
      ProfitMarginPct: p.rev ? `${((p.profit / p.rev) * 100).toFixed(1)}%` : '0%'
    }));

    // 3. Purchase Orders
    const purchaseData = auditedPurchaseOrdersList.map((po) => ({
      PurchaseOrderNo: po.id,
      Date: formatDate(po.createdAt),
      Business: po.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      Supplier: po.supplierName,
      ItemLines: po.items.length,
      ItemsCount: po.items.reduce((sum, i) => sum + i.quantity, 0),
      TotalCostBDT: po.totalCost,
      PaidAmountBDT: po.paidAmount,
      BalanceDueBDT: po.totalCost - po.paidAmount,
      PaymentStatus: po.paymentStatus
    }));

    // 4a. Every purchased product line, one row each
    const purchaseItemData = purchaseLineItems.map((l) => ({
      PurchaseOrderNo: l.poId,
      Date: formatDate(l.date),
      Business: l.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      Supplier: l.supplierName,
      ProductName: l.productName,
      SKU: l.sku,
      Brand: l.brand,
      Category: l.category,
      Quantity: l.quantity,
      Unit: l.unit,
      UnitCostBDT: l.costPrice,
      LineTotalBDT: l.totalCost,
      PaymentStatus: l.paymentStatus
    }));

    // 4. Expenses
    const expenseData = auditedExpensesList.map((e) => ({
      VoucherNo: e.voucherNo || e.id,
      Date: formatDate(e.date),
      Business: e.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      Category: e.category,
      Title: e.title,
      VendorName: e.vendorName || '-',
      PaymentMode: e.paymentMode || 'cash',
      RecordedBy: e.recordedBy,
      AmountBDT: e.amount
    }));

    // 5. Installment Collections
    const instData = filteredInstallmentCollections.map((c) => ({
      PaidDate: c.paidDate,
      Customer: c.customerName,
      Phone: c.customerPhone,
      InvoiceNo: c.invoiceId,
      PlanId: c.planId,
      InstallmentNo: `Installment #${c.installmentNo}`,
      DueDate: c.dueDate,
      AmountPaidBDT: c.amountPaid,
      PaymentMode: c.paymentMode,
      DepositedTo: c.accountName,
      Business: c.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'
    }));

    // 6. Category Wise Sales Report
    const categoryExportData = categorySalesDetailedList.map((c) => ({
      CategoryName: c.category,
      UnitsSold: c.unitsSold,
      InvoicesCount: c.invoiceCount,
      GrossRevenueBDT: c.grossRevenue,
      CostOfGoodsSoldBDT: c.cogs,
      NetProfitBDT: c.netProfit,
      ProfitMarginPct: `${c.profitMarginPct.toFixed(1)}%`,
      AvailableStockQty: c.availableStockQty,
      AvailableStockValueBDT: c.availableStockValue
    }));

    // 8. Actual sales (regular, no referral) vs sales carrying a referral payout
    const regularSalesData = regularSales.map((s) => ({
      InvoiceNo: s.id,
      Date: formatDate(s.createdAt),
      Business: s.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      Customer: s.customerName,
      Phone: s.customerPhone,
      ActualSalesBDT: s.grandTotal,
      PaidAmountBDT: s.paidAmount,
      DueAmountBDT: s.dueAmount,
      PaymentStatus: s.paymentStatus
    }));

    const referralSalesData = referralSales.map((s) => ({
      InvoiceNo: s.id,
      Date: formatDate(s.createdAt),
      Business: s.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      Customer: s.customerName,
      Phone: s.customerPhone,
      ReferralName: s.referralName || 'Unnamed',
      GrossSalesBDT: s.grandTotal,
      SpecialDiscountBDT: s.specialDiscount || 0,
      SpecialDiscountPct: s.specialDiscountMode === 'percent' ? `${s.specialDiscountRate}%` : '',
      NetSalesBDT: s.grandTotal - (s.specialDiscount || 0),
      PaymentStatus: s.paymentStatus
    }));

    // 7. Customer Returns
    const customerReturnsData = filteredCustomerReturns.map((r) => ({
      ReturnID: r.id,
      Date: formatDate(r.createdAt),
      InvoiceID: r.invoiceId,
      Business: r.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      CustomerName: r.customerName,
      CustomerPhone: r.customerPhone,
      ReturnedItems: r.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
      RefundAmountBDT: r.totalRefundAmount,
      RefundMode: r.refundMode,
      Reason: r.reason,
      Notes: r.notes || '-',
      RecordedBy: r.createdBy
    }));

    // 9. Wholesale sales (invoices + per-buyer rollup)
    const wholesaleInvoiceData = wholesaleSalesList.map((s) => ({
      InvoiceNo: s.id,
      Date: formatDate(s.createdAt),
      Business: s.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      Customer: s.customerName,
      Phone: s.customerPhone,
      ItemsQty: s.items.reduce((a, i) => a + i.quantity, 0),
      GrandTotalBDT: s.grandTotal,
      PaidAmountBDT: s.paidAmount,
      DueAmountBDT: s.dueAmount,
      PaymentStatus: s.paymentStatus,
      Staff: s.createdByStaffName
    }));
    const wholesaleBuyerData = wholesaleCustomerSummary.map((c) => ({
      Buyer: c.name,
      Phone: c.phone,
      Invoices: c.invoices,
      BilledBDT: c.billed,
      PaidBDT: c.paid,
      OutstandingBDT: c.due
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), 'Sales_Audit_Report');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wholesaleInvoiceData), 'Wholesale_Invoices');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wholesaleBuyerData), 'Wholesale_By_Buyer');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customerReturnsData), 'Customer_Returns_Log');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryExportData), 'Category_Wise_Sales');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productSalesData), 'Product_Wise_Sales');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseData), 'Purchase_Orders_Audit');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseItemData), 'Purchased_Products_Detail');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseData), 'Expenses_Audit');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instData), 'Installment_Collections');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regularSalesData), 'Actual_Sales_Regular');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(referralSalesData), 'Sales_With_Referral');

    XLSX.writeFile(wb, `Audit_Report_${dateMode}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getDateFilterLabel = () => {
    if (dateMode === 'today') return `Today (${todayStr})`;
    if (dateMode === 'this_month') return `This Month (${thisMonthPrefix})`;
    if (dateMode === 'this_year') return `This Year (${thisYearPrefix})`;
    if (dateMode === 'custom') return `Custom Range (${fromDate} to ${toDate})`;
    return 'All Time History';
  };

  const handleExportPDF = () => {
    const periodText = getDateFilterLabel();
    const scopeName =
      businessScope === 'all'
        ? 'All Businesses Combined'
        : businessScope === 'amanot_electronics'
        ? 'Amanot Electronics'
        : 'Amanot Enterprise';

    if (selectedReportType === 'profit_loss') {
      generateBrandedReportPDF({
        title: 'Formal Income Statement (Profit & Loss Audit)',
        subtitle: `Scope: ${scopeName}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        summaryMetrics: [
          { label: 'Net Revenue', value: `BDT ${netRevenue.toLocaleString()}` },
          { label: 'Gross Operating Profit', value: `BDT ${grossProfit.toLocaleString()}` },
          { label: 'Operating Expenses', value: `BDT ${totalOperatingExpenses.toLocaleString()}` },
          { label: 'Net Operating Profit', value: `BDT ${netOperatingProfit.toLocaleString()}` }
        ],
        tableHeaders: ['Accounting Line Item', 'Financial Particulars', 'Amount (BDT)'],
        tableData: [
          ['1. Gross Invoiced Sales', 'Total Invoices Issued', grossInvoicedRevenue.toLocaleString()],
          ['Discounts Allowed (-)', 'Customer Discounts', `-${totalDiscountsAllowed.toLocaleString()}`],
          ['Net Sales Revenue', 'Gross Revenue - Discounts - Returns', netRevenue.toLocaleString()],
          ['2. Cost of Goods Sold (COGS)', 'Purchase Cost of Inventory Sold', totalCOGS.toLocaleString()],
          ['Gross Operating Profit', 'Net Revenue - COGS', grossProfit.toLocaleString()],
          ['3. Operating Expenses (OPEX)', 'Shop Rent, Utility, Salaries, Freight', totalOperatingExpenses.toLocaleString()],
          ['Stock Variance & Damage Loss', 'Damaged items and stock audit decreases', `-${totalDamageLossAmount.toLocaleString()}`],
          ['Referral Payouts (SP Discount)', 'Special discounts absorbed as referral expense', `-${totalReferralExpense.toLocaleString()}`],
          ['NET OPERATING PROFIT', 'Final Bottom Line Profit', netOperatingProfit.toLocaleString()]
        ],
        fileName: `Amanot_Profit_Loss_${businessScope}_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'customer_returns') {
      generateBrandedReportPDF({
        title: 'Customer Sales Returns & Refunds Log Report',
        subtitle: `Total Returns: ${filteredCustomerReturns.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        summaryMetrics: [
          { label: 'Total Returns', value: `${filteredCustomerReturns.length} Entries` },
          { label: 'Total Refunds', value: `BDT ${totalCustomerReturnsAmount.toLocaleString()}` }
        ],
        tableHeaders: ['Return Ref & Date', 'Invoice #', 'Branch', 'Customer Name', 'Refund Mode', 'Refund Amount (BDT)', 'Reason'],
        tableData: filteredCustomerReturns.map((r) => [
          `${r.id} (${r.createdAt.substring(0, 10)})`,
          r.invoiceId,
          r.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise',
          `${r.customerName} (${r.customerPhone})`,
          r.refundMode.toUpperCase(),
          r.totalRefundAmount.toLocaleString(),
          r.reason
        ]),
        fileName: `Amanot_Customer_Returns_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'stock_adjustments') {
      generateBrandedReportPDF({
        title: 'Stock Adjustments & Damage Loss Audit Report',
        subtitle: `Adjustments: ${filteredStockAdjustments.length} | Damages: ${filteredDamageLogs.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        summaryMetrics: [
          { label: 'Stock Adjustments', value: `${filteredStockAdjustments.length} Records` },
          { label: 'Damage Loss Entries', value: `${filteredDamageLogs.length} Records` },
          { label: 'Total Damage Loss BDT', value: `BDT ${totalDamageLossAmount.toLocaleString()}` }
        ],
        tableHeaders: ['Ref & Date', 'Branch', 'Product SKU', 'Brand & Category', 'Type', 'Qty', 'Value (BDT)', 'Reason / Cause', 'By'],
        tableData: [
          ...filteredStockAdjustments.map((sa) => {
            const p = products.find((x) => x.id === sa.productId);
            const val = (p?.costPrice || 0) * sa.quantity;
            return [
              `${sa.id} (${sa.createdAt.substring(0, 10)})`,
              sa.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise',
              `${sa.productName} [${sa.sku}]`,
              `${sa.brand} - ${sa.category}`,
              `STOCK ${sa.adjustmentType.toUpperCase()}`,
              sa.quantity.toString(),
              val.toLocaleString(),
              sa.reason,
              sa.performedBy
            ];
          }),
          ...filteredDamageLogs.map((dl) => [
            `${dl.id} (${dl.createdAt.substring(0, 10)})`,
            dl.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise',
            `${dl.productName} [${dl.sku}]`,
            `${dl.brand} - ${dl.category}`,
            'DAMAGE LOSS',
            dl.quantity.toString(),
            dl.totalLoss.toLocaleString(),
            dl.cause,
            dl.reportedBy
          ])
        ],
        fileName: `Amanot_Stock_Adjustments_Damage_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'category_sales') {
      generateBrandedReportPDF({
        title: 'Product Category Wise Sales Performance Report',
        subtitle: `Active Categories: ${categorySalesDetailedList.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        tableHeaders: ['Category', 'Units Sold', 'Gross Sales (BDT)', 'COGS (BDT)', 'Net Profit (BDT)', 'Margin %', 'Stock Qty', 'Stock Val (BDT)'],
        tableData: categorySalesDetailedList.map((c) => [
          c.category,
          c.unitsSold.toString(),
          c.grossRevenue.toLocaleString(),
          c.cogs.toLocaleString(),
          c.netProfit.toLocaleString(),
          `${c.profitMarginPct.toFixed(1)}%`,
          c.availableStockQty.toString(),
          c.availableStockValue.toLocaleString()
        ]),
        fileName: `Amanot_Category_Sales_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'sales') {
      generateBrandedReportPDF({
        title: 'Detailed Sales & Invoicing Audit Report',
        subtitle: `Total Invoices: ${auditedSalesList.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        summaryMetrics: [
          { label: 'Total Invoices', value: `${auditedSalesList.length} Invoices` },
          { label: 'Gross Sales', value: `BDT ${auditedSalesList.reduce((acc, s) => acc + s.grandTotal, 0).toLocaleString()}` },
          { label: 'Total Collected', value: `BDT ${auditedSalesList.reduce((acc, s) => acc + s.paidAmount, 0).toLocaleString()}` },
          { label: 'Total Due', value: `BDT ${auditedSalesList.reduce((acc, s) => acc + s.dueAmount, 0).toLocaleString()}` }
        ],
        tableHeaders: ['Invoice #', 'Date', 'Branch', 'Customer', 'Items Qty', 'Payment Mode', 'Grand Total (BDT)', 'Paid (BDT)', 'Due (BDT)', 'Status'],
        tableData: auditedSalesList.map((s) => [
          s.id,
          s.createdAt.substring(0, 10),
          s.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise',
          `${s.customerName} (${s.customerPhone})`,
          s.items.reduce((a, i) => a + i.quantity, 0).toString(),
          s.paymentSplits && s.paymentSplits.length > 1
            ? splitBreakdownText(s.paymentSplits)
            : s.paymentMode.toUpperCase(),
          s.grandTotal.toLocaleString(),
          s.paidAmount.toLocaleString(),
          s.dueAmount.toLocaleString(),
          s.paymentStatus.toUpperCase()
        ]),
        fileName: `Amanot_Sales_Audit_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'wholesale_sales') {
      generateBrandedReportPDF({
        title: 'Wholesale Sales & Buyer Outstanding Report',
        subtitle: `Wholesale Invoices: ${wholesaleSalesList.length} | Buyers: ${wholesaleCustomerSummary.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        summaryMetrics: [
          { label: 'Wholesale Invoices', value: `${wholesaleSalesList.length} Invoices` },
          { label: 'Gross Wholesale Sales', value: `BDT ${wholesaleSalesList.reduce((a, s) => a + s.grandTotal, 0).toLocaleString()}` },
          { label: 'Collected', value: `BDT ${wholesaleSalesList.reduce((a, s) => a + s.paidAmount, 0).toLocaleString()}` },
          { label: 'Outstanding Due', value: `BDT ${wholesaleSalesList.reduce((a, s) => a + s.dueAmount, 0).toLocaleString()}` }
        ],
        tableHeaders: ['Wholesale Buyer', 'Phone', 'Invoices', 'Billed (BDT)', 'Paid (BDT)', 'Outstanding (BDT)'],
        tableData: wholesaleCustomerSummary.map((c) => [
          c.name,
          c.phone,
          c.invoices.toString(),
          c.billed.toLocaleString(),
          c.paid.toLocaleString(),
          c.due.toLocaleString()
        ]),
        fileName: `Amanot_Wholesale_Sales_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'product_profit') {
      generateBrandedReportPDF({
        title: 'Product-Wise Sales & Gross Profitability Audit',
        subtitle: `Audited Products: ${productProfitList.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        tableHeaders: ['Product Name', 'Brand', 'Category', 'Available Stock', 'Units Sold', 'Total Revenue (BDT)', 'Total Cost (BDT)', 'Gross Profit (BDT)', 'Margin %'],
        tableData: productProfitList.map((p) => [
          p.name,
          p.brand,
          p.category,
          p.stockQty.toString(),
          p.qty.toString(),
          p.rev.toLocaleString(),
          p.cost.toLocaleString(),
          p.profit.toLocaleString(),
          p.rev ? `${((p.profit / p.rev) * 100).toFixed(1)}%` : '0%'
        ]),
        fileName: `Amanot_Product_Profit_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'purchases') {
      generateBrandedReportPDF({
        title: 'Purchase Orders & Supplier Procurement Audit',
        subtitle: `Total Orders: ${auditedPurchaseOrdersList.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        // `sections` replaces tableHeaders/tableData, so the PO summary is a section too
        sections: [
          {
            heading: 'Purchase Orders Summary',
            tableHeaders: ['PO Number', 'Supplier Name', 'Date', 'Branch', 'Total Cost (BDT)', 'Paid Amount (BDT)', 'Due Amount (BDT)', 'Status'],
            tableData: auditedPurchaseOrdersList.map((po) => [
              po.id,
              po.supplierName,
              formatDate(po.createdAt),
              po.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise',
              po.totalCost.toLocaleString(),
              po.paidAmount.toLocaleString(),
              (po.totalCost - po.paidAmount).toLocaleString(),
              po.paymentStatus.toUpperCase()
            ])
          },
          {
            heading: 'Purchased Product Details (all POs)',
            tableHeaders: ['PO No', 'Date', 'Supplier', 'Product', 'Brand', 'Qty', 'Unit Cost', 'Line Total'],
            tableData: purchaseLineItems.map((l) => [
              l.poId,
              formatDate(l.date),
              l.supplierName,
              l.productName,
              l.brand || '-',
              String(l.quantity),
              l.costPrice.toLocaleString(),
              l.totalCost.toLocaleString()
            ])
          }
        ],
        fileName: `Amanot_Purchase_Orders_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'expenses') {
      generateBrandedReportPDF({
        title: 'Business Expense Voucher Audit Log',
        subtitle: `Total Expense Vouchers: ${auditedExpensesList.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        tableHeaders: ['Voucher No', 'Date', 'Branch', 'Category', 'Title / Particulars', 'Vendor', 'Amount (BDT)', 'Recorded By'],
        tableData: auditedExpensesList.map((e) => [
          e.voucherNo || e.id,
          e.date,
          e.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise',
          e.category,
          e.title,
          e.vendorName || 'N/A',
          e.amount.toLocaleString(),
          e.recordedBy
        ]),
        fileName: `Amanot_Expenses_Audit_${todayStr}.pdf`
      });
    } else if (selectedReportType === 'stocks') {
      generateBrandedReportPDF({
        title: 'Inventory Stock Valuation & Quantity Audit Report',
        subtitle: `Total Products in Stock: ${filteredProducts.length}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        summaryMetrics: [
          { label: 'Total Products', value: `${filteredProducts.length} Items` },
          { label: 'Total Stock Units', value: `${filteredProducts.reduce((acc, p) => acc + p.stockQty, 0)} Units` },
          { label: 'Stock Cost Valuation', value: `BDT ${filteredProducts.reduce((acc, p) => acc + p.stockQty * p.costPrice, 0).toLocaleString()}` },
          { label: 'Stock Retail Valuation', value: `BDT ${filteredProducts.reduce((acc, p) => acc + p.stockQty * p.retailPrice, 0).toLocaleString()}` }
        ],
        tableHeaders: ['Product Name', 'SKU', 'Brand', 'Category', 'Branch', 'Stock Qty', 'Cost Price (BDT)', 'Retail Price (BDT)', 'Total Cost Valuation (BDT)'],
        tableData: filteredProducts.map((p) => [
          p.name,
          p.sku,
          p.brand,
          p.category,
          p.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise',
          `${p.stockQty} ${p.unit}`,
          p.costPrice.toLocaleString(),
          p.retailPrice.toLocaleString(),
          (p.stockQty * p.costPrice).toLocaleString()
        ]),
        fileName: `Amanot_Stock_Valuation_${todayStr}.pdf`
      });
    } else {
      generateBrandedReportPDF({
        title: `${selectedReportType.replace('_', ' ').toUpperCase()} AUDIT REPORT`,
        subtitle: `Audit Scope: ${scopeName}`,
        businessScope,
        dateFilterText: periodText,
        generatedBy: currentUser.name,
        settings,
        tableHeaders: ['Report Module', 'Date Range', 'Branch', 'Generated On'],
        tableData: [[selectedReportType, periodText, scopeName, todayStr]],
        fileName: `Amanot_${selectedReportType}_${todayStr}.pdf`
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner — title + business scope selector (top right) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-900 border border-purple-300 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              Management & Audit Suite
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Accounting & Audit Reports Engine
          </h1>
        </div>

        {/* Business Scope Selector (top right) */}
        <div className="flex items-center bg-slate-900 text-white p-1 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setBusinessScope('all')}
            className={`px-3 py-1.5 rounded-lg transition ${businessScope === 'all' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Combined Global
          </button>
          <button
            onClick={() => setBusinessScope('amanot_electronics')}
            className={`px-3 py-1.5 rounded-lg transition ${businessScope === 'amanot_electronics' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Amanot Electronics
          </button>
          <button
            onClick={() => setBusinessScope('amanot_enterprise')}
            className={`px-3 py-1.5 rounded-lg transition ${businessScope === 'amanot_enterprise' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Amanot Enterprise
          </button>
        </div>
      </div>

      {/* Overview KPI Summary (above the date filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Sales Revenue</p>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">৳{netRevenue.toLocaleString()}</p>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mt-1">
            <span>Gross: ৳{grossSalesGrandTotal.toLocaleString()}</span>
            <span className="text-rose-600">Returns: -৳{totalCustomerReturnsAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Profit Margin</p>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">৳{grossProfit.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Gross Margin: {((grossProfit / (netRevenue || 1)) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operating Expenses</p>
          <p className="text-2xl font-black text-rose-600 font-mono mt-1">৳{totalOperatingExpenses.toLocaleString()}</p>
          <span className="text-[10px] text-rose-600 font-bold block mt-1">{filteredExpenses.length} Logged Expense Vouchers</span>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-lg border border-slate-800">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Net Operating Profit</p>
          <p className={`text-2xl font-black font-mono mt-1 ${netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ৳{netOperatingProfit.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Net Margin: {((netOperatingProfit / (netRevenue || 1)) * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Controls row: Audit period + Report selector dropdown + Export PDF */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: audit period */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-purple-600" /> Audit Period:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_month', label: 'This Month' },
            { id: 'this_year', label: 'This Fiscal Year' },
            { id: 'custom', label: 'Custom Date Range' },
            { id: 'all', label: 'All Time' }
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDateMode(d.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dateMode === d.id ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Right: report selector dropdown + export PDF (aligned in same row) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-white/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value as any)}
              className="appearance-none bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl pl-9 pr-9 py-2.5 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 transition min-w-[220px]"
            >
              {[
                { id: 'profit_loss', label: '1. Profit & Loss Statement' },
                { id: 'customer_returns', label: '2. Customer Sales Returns Log' },
                { id: 'stock_adjustments', label: '3. Stock Adjustments & Damage Audit' },
                { id: 'category_sales', label: '4. Product Category Wise Sales' },
                { id: 'sales', label: '5. Detailed Sales Audit' },
                { id: 'product_profit', label: '6. Product-Wise Sales' },
                { id: 'purchases', label: '7. Purchase & Procurement Audit' },
                { id: 'expenses', label: '8. Business Expense Audit' },
                { id: 'installment_ledger', label: '9. Installment & EMI Ledger' },
                { id: 'cash_flow', label: '10. Realized Cash Flow' },
                { id: 'receivables', label: '11. Receivables & Aging' },
                { id: 'stocks', label: '12. Inventory Stock Valuation' },
                { id: 'referral_sales', label: '13. Referral (SP Discount) Sales' },
                { id: 'wholesale_sales', label: '14. Wholesale Sales & Buyer Dues' },
                { id: 'statement', label: '15. Consolidated Statement (All-in-One)' }
              ].map((mod) => (
                <option key={mod.id} value={mod.id} className="bg-white text-slate-800 font-semibold">
                  {mod.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-white absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition shrink-0"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Custom date range (shown below the controls when active) */}
      {dateMode === 'custom' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-xl border border-purple-200 w-max">
            <div>
              <span className="text-[10px] font-bold text-purple-900 block">From Date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="p-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
              />
            </div>
            <span className="text-xs font-bold text-purple-600 self-end pb-1.5">to</span>
            <div>
              <span className="text-[10px] font-bold text-purple-900 block">To Date</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="p-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1. PROFIT & LOSS / INCOME STATEMENT */}
      {selectedReportType === 'profit_loss' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Formal Income Statement (Profit & Loss Audit)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Branch Scope: {businessScope === 'all' ? 'All Businesses Combined' : businessScope === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'} | Period: {dateMode.toUpperCase()}
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition"
            >
              <Printer className="w-4 h-4" /> Print Income Statement
            </button>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Revenue Section */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>1. GROSS INVOICED REVENUE</span>
                <span>৳{grossInvoicedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4 text-xs font-sans">
                <span>Less: Total Customer Discounts Allowed (-)</span>
                <span className="font-mono text-rose-600">-৳{totalDiscountsAllowed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-blue-900 pt-2 border-t text-sm">
                <span>NET SALES REVENUE</span>
                <span>৳{netRevenue.toLocaleString()}</span>
              </div>
            </div>

            {/* COGS Section */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>2. COST OF GOODS SOLD (COGS)</span>
                <span className="text-slate-800">৳{totalCOGS.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4 text-xs font-sans">
                <span>Direct Product Purchase & Wholesale Cost from Procurement</span>
                <span className="font-mono text-slate-700">-৳{totalCOGS.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-sm mt-1">
                <span>GROSS OPERATING PROFIT</span>
                <span>৳{grossProfit.toLocaleString()} ({((grossProfit / (netRevenue || 1)) * 100).toFixed(1)}%)</span>
              </div>
            </div>

            {/* Operating Expenses Section */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>3. OPERATING EXPENSES (OPEX)</span>
                <span className="text-rose-600">-৳{totalOperatingExpenses.toLocaleString()}</span>
              </div>
              <div className="pl-4 space-y-1.5 text-slate-600 text-xs font-sans">
                {filteredExpenses.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">No expenses logged for this audit period.</p>
                ) : (
                  filteredExpenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between items-center hover:bg-slate-100 p-1 rounded">
                      <span>{exp.title} <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-medium">({exp.category})</span></span>
                      <span className="font-mono text-rose-600 font-bold">-৳{exp.amount.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Net Operating Profit Summary */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-lg flex justify-between items-center text-base font-bold">
              <div>
                <span>NET OPERATING PROFIT (EBITDA)</span>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">Bottom-line operating cash return before corporate tax & reserves.</p>
              </div>
              <span className={`text-2xl font-black font-mono ${netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ৳{netOperatingProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER SALES RETURNS LOG REPORT */}
      {selectedReportType === 'customer_returns' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                Customer Sales Returns & Refunds Reporting Audit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of returned invoices, restocked inventory items, damaged losses, and refund logs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Total Returns: <strong>{filteredCustomerReturns.length}</strong>
              </span>
              <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                Total Refunds: ৳{totalCustomerReturnsAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Table of returns */}
          {filteredCustomerReturns.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <RotateCcw className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-bold text-sm">No Customer Returns Logged</p>
              <p className="text-slate-400 text-xs mt-1">
                There are no sales returns recorded for the selected audit period and business branch.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Return Ref & Date</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Business Branch</th>
                    <th className="p-3">Customer Info</th>
                    <th className="p-3">Returned Items & Condition</th>
                    <th className="p-3">Refund Amount</th>
                    <th className="p-3">Refund Method</th>
                    <th className="p-3">Reason / Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredCustomerReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3">
                        <span className="font-extrabold text-slate-900 block font-mono">{ret.id}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(ret.createdAt).toLocaleString('en-GB', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-blue-700 font-mono">{ret.invoiceId}</span>
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            ret.business === 'amanot_electronics'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {ret.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{ret.customerName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{ret.customerPhone}</span>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="space-y-1">
                          {ret.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                              <span className="font-semibold text-slate-900 truncate">
                                {it.productName} <strong className="text-blue-600">(x{it.quantity})</strong>
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  it.condition === 'good_restock'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {it.condition === 'good_restock' ? 'Restocked' : 'Damaged Loss'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-black text-rose-700 font-mono text-sm">
                          ৳{ret.totalRefundAmount.toLocaleString()}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[10px] uppercase border border-slate-200">
                          {ret.refundMode === 'cash'
                            ? 'Cash Refund'
                            : ret.refundMode === 'bkash_nagad'
                            ? 'bKash/Nagad'
                            : ret.refundMode === 'customer_credit'
                            ? 'Store Credit'
                            : 'Bank Transfer'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="text-slate-900 font-semibold block">{ret.reason}</span>
                        <span className="text-[10px] text-slate-500 block">By: {ret.createdBy}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. STOCK ADJUSTMENTS & DAMAGE LOSS AUDIT REPORT */}
      {selectedReportType === 'stock_adjustments' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                Stock Adjustments & Damage Loss Audit Report
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical inventory count variances, manual quantity corrections, and reported damaged write-offs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Stock Adjustments: <strong>{filteredStockAdjustments.length}</strong>
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                Damages Logged: <strong>{filteredDamageLogs.length}</strong>
              </span>
              <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                Total Damage Loss: ৳{totalDamageLossAmount.toLocaleString()}
              </span>
              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Export Branded PDF
              </button>
            </div>
          </div>

          {/* Combined Table of Stock Adjustments & Damage Logs */}
          {filteredStockAdjustments.length === 0 && filteredDamageLogs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-bold text-sm">No Stock Adjustments or Damage Losses Logged</p>
              <p className="text-slate-400 text-xs mt-1">
                There are no manual quantity adjustments or breakage losses recorded for the selected period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Ref & Date</th>
                    <th className="p-3">Business Branch</th>
                    <th className="p-3">Product Name & SKU</th>
                    <th className="p-3 text-center">Brand / Category</th>
                    <th className="p-3 text-center">Audit Type</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Value Impact (BDT)</th>
                    <th className="p-3">Reason / Cause & Reported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {/* Stock Adjustments Rows */}
                  {filteredStockAdjustments.map((sa) => {
                    const prod = products.find((x) => x.id === sa.productId);
                    const val = (prod?.costPrice || 0) * sa.quantity;

                    return (
                      <tr key={sa.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3">
                          <span className="font-extrabold text-slate-900 block font-mono">{sa.id}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {sa.createdAt.substring(0, 10)}
                          </span>
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              sa.business === 'amanot_electronics'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {sa.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{sa.productName}</span>
                          <span className="text-[10px] font-mono text-slate-500">SKU: {sa.sku}</span>
                        </td>

                        <td className="p-3 text-center">
                          <span className="text-slate-700 font-semibold">{sa.brand}</span>
                          <span className="text-[10px] text-slate-400 block">{sa.category}</span>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              sa.adjustmentType === 'increment'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {sa.adjustmentType === 'increment' ? '+ STOCK ADD' : '- STOCK DEDUCT'}
                          </span>
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {sa.quantity}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          ৳{val.toLocaleString()}
                        </td>

                        <td className="p-3">
                          <span className="text-slate-900 font-semibold block">{sa.reason}</span>
                          <span className="text-[10px] text-slate-500 block">By: {sa.performedBy}</span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Damage Logs Rows */}
                  {filteredDamageLogs.map((dl) => (
                    <tr key={dl.id} className="bg-rose-50/40 hover:bg-rose-50/80 transition">
                      <td className="p-3">
                        <span className="font-extrabold text-rose-900 block font-mono">{dl.id}</span>
                        <span className="text-[10px] text-rose-700 font-mono">
                          {dl.createdAt.substring(0, 10)}
                        </span>
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            dl.business === 'amanot_electronics'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {dl.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{dl.productName}</span>
                        <span className="text-[10px] font-mono text-slate-500">SKU: {dl.sku}</span>
                      </td>

                      <td className="p-3 text-center">
                        <span className="text-slate-700 font-semibold">{dl.brand}</span>
                        <span className="text-[10px] text-slate-400 block">{dl.category}</span>
                      </td>

                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-200 text-rose-900 border border-rose-300">
                          DAMAGE LOSS
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-rose-900">
                        {dl.quantity}
                      </td>

                      <td className="p-3 text-right font-mono font-black text-rose-700">
                        -৳{dl.totalLoss.toLocaleString()}
                      </td>

                      <td className="p-3">
                        <span className="text-rose-900 font-semibold block">{dl.cause}</span>
                        <span className="text-[10px] text-rose-700 block">Reported By: {dl.reportedBy}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. DETAILED SALES AUDIT REPORT */}
      {selectedReportType === 'sales' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
                Detailed Sales Audit Log & Invoices
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {auditedSalesList.length} of {filteredSales.length} sales invoices in selected period.
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Invoice #, Customer, Phone..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-60 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={salesStatusFilter}
                onChange={(e) => setSalesStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="all">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partially Paid</option>
                <option value="due">Unpaid / Full Due</option>
              </select>

              <select
                value={salesTypeFilter}
                onChange={(e) => setSalesTypeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="all">All Sale Types</option>
                <option value="pos">Direct POS Sales</option>
                <option value="installment">Installment Sales</option>
              </select>
            </div>
          </div>

          {/* Sales KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Total Audited Sales</span>
              <span className="font-bold text-slate-900 font-mono text-sm">৳{auditedSalesList.reduce((sum, s) => sum + s.grandTotal, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Direct Cash Collected</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">৳{auditedSalesList.reduce((sum, s) => sum + s.paidAmount, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Customer Due Balance</span>
              <span className="font-bold text-rose-600 font-mono text-sm">৳{auditedSalesList.reduce((sum, s) => sum + s.dueAmount, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total COGS Cost</span>
              <span className="font-bold text-purple-700 font-mono text-sm">৳{auditedSalesList.reduce((sum, s) => sum + s.totalCost, 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Table */}
          {auditedSalesList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl">
              No sales invoices match your search or filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Invoice # & Date</th>
                    <th className="p-3">Customer Profile</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3 text-center">Type</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-right">Discount</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-right">Paid Amount</th>
                    <th className="p-3 text-right">Due Amount</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditedSalesList.map((s) => {
                    const isExpanded = expandedSaleId === s.id;
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => setExpandedSaleId(isExpanded ? null : s.id)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="p-3 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="p-3">
                            <span className="font-bold font-mono text-purple-700 block">{s.id}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{formatDate(s.createdAt)}</span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{s.customerName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{s.customerPhone}</div>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {s.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isInstallment ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {s.isInstallment ? 'Installment' : 'Direct POS'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">৳{s.subtotal.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-rose-600">-৳{s.discountTotal.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">৳{s.grandTotal.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">৳{s.paidAmount.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-rose-600">৳{s.dueAmount.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              s.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : s.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {s.paymentStatus}
                            </span>
                          </td>
                        </tr>

                        {/* Expandable Line Item Inspector */}
                        {isExpanded && (
                          <tr className="bg-purple-50/50">
                            <td colSpan={11} className="p-4 border-t border-b border-purple-200">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" /> Line Items & Cost Margin Breakdown for {s.id}
                                  </h4>
                                  <span className="text-[11px] text-slate-500">
                                    Staff: <strong className="text-slate-800">{s.createdByStaffName || 'Admin'}</strong> | Payment:{' '}
                                    <strong className="text-slate-800">
                                      {s.paymentSplits && s.paymentSplits.length > 1
                                        ? splitBreakdownText(s.paymentSplits)
                                        : paymentModeLabel(s.paymentMode)}
                                    </strong>
                                  </span>
                                </div>

                                <table className="w-full text-left text-[11px] bg-white border border-slate-200 rounded-lg">
                                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                                    <tr>
                                      <th className="p-2">Item / Product Name</th>
                                      <th className="p-2">Brand</th>
                                      <th className="p-2 text-center">Qty</th>
                                      <th className="p-2 text-right">Unit Price</th>
                                      <th className="p-2 text-right">Line Total</th>
                                      <th className="p-2 text-right">Unit Cost</th>
                                      <th className="p-2 text-right">Estimated Gross Margin</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono">
                                    {s.items.map((item, idx) => {
                                      const lineCost = item.costPrice * item.quantity;
                                      const lineMargin = item.total - lineCost;
                                      return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                          <td className="p-2 font-sans font-bold text-slate-900">{item.productName}</td>
                                          <td className="p-2 font-sans text-slate-600">{item.brand}</td>
                                          <td className="p-2 text-center font-bold">{item.quantity}</td>
                                          <td className="p-2 text-right">৳{item.unitPrice.toLocaleString()}</td>
                                          <td className="p-2 text-right font-bold text-slate-900">৳{item.total.toLocaleString()}</td>
                                          <td className="p-2 text-right text-slate-500">৳{item.costPrice.toLocaleString()}</td>
                                          <td className="p-2 text-right font-bold text-emerald-700">৳{lineMargin.toLocaleString()}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WHOLESALE SALES & BUYER DUES */}
      {selectedReportType === 'wholesale_sales' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                Wholesale Sales &amp; Buyer Outstanding
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {wholesaleSalesList.length} wholesale invoice{wholesaleSalesList.length === 1 ? '' : 's'} across{' '}
                {wholesaleCustomerSummary.length} buyer{wholesaleCustomerSummary.length === 1 ? '' : 's'} in selected period.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Invoice #, Buyer, Phone..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-60 focus:bg-white focus:outline-none"
                />
              </div>
              <select
                value={salesStatusFilter}
                onChange={(e) => setSalesStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="all">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partially Paid</option>
                <option value="due">Unpaid / Full Due</option>
              </select>
            </div>
          </div>

          {/* KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Gross Wholesale Sales</span>
              <span className="font-bold text-slate-900 font-mono text-sm">৳{wholesaleSalesList.reduce((sum, s) => sum + s.grandTotal, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Collected</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">৳{wholesaleSalesList.reduce((sum, s) => sum + s.paidAmount, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Outstanding Due</span>
              <span className="font-bold text-rose-600 font-mono text-sm">৳{wholesaleSalesList.reduce((sum, s) => sum + s.dueAmount, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total COGS Cost</span>
              <span className="font-bold text-purple-700 font-mono text-sm">৳{wholesaleSalesList.reduce((sum, s) => sum + s.totalCost, 0).toLocaleString()}</span>
            </div>
          </div>

          {wholesaleSalesList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl">
              No wholesale invoices match your search or filter criteria for this period.
            </div>
          ) : (
            <>
              {/* Per-Buyer Rollup */}
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Wholesale Buyer Summary
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                      <tr>
                        <th className="p-3">Buyer</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-center">Invoices</th>
                        <th className="p-3 text-right">Billed</th>
                        <th className="p-3 text-right">Paid</th>
                        <th className="p-3 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {wholesaleCustomerSummary.map((c) => (
                        <tr key={c.customerId} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{c.name}</td>
                          <td className="p-3 font-mono text-slate-500">{c.phone}</td>
                          <td className="p-3 text-center font-bold">{c.invoices}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">৳{c.billed.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-emerald-700">৳{c.paid.toLocaleString()}</td>
                          <td className={`p-3 text-right font-mono font-bold ${c.due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>৳{c.due.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                      <tr>
                        <td className="p-3" colSpan={2}>Total</td>
                        <td className="p-3 text-center">{wholesaleCustomerSummary.reduce((a, c) => a + c.invoices, 0)}</td>
                        <td className="p-3 text-right font-mono text-slate-900">৳{wholesaleCustomerSummary.reduce((a, c) => a + c.billed, 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-emerald-700">৳{wholesaleCustomerSummary.reduce((a, c) => a + c.paid, 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-rose-600">৳{wholesaleCustomerSummary.reduce((a, c) => a + c.due, 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Wholesale Invoice Detail */}
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" /> Wholesale Invoice Log
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                      <tr>
                        <th className="p-3 w-8"></th>
                        <th className="p-3">Invoice # &amp; Date</th>
                        <th className="p-3">Buyer</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3 text-right">Grand Total</th>
                        <th className="p-3 text-right">Paid</th>
                        <th className="p-3 text-right">Due</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {wholesaleSalesList.map((s) => {
                        const isExpanded = expandedSaleId === s.id;
                        return (
                          <React.Fragment key={s.id}>
                            <tr
                              onClick={() => setExpandedSaleId(isExpanded ? null : s.id)}
                              className="hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <td className="p-3 text-slate-400">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4" />}
                              </td>
                              <td className="p-3">
                                <span className="font-bold font-mono text-indigo-700 block">{s.id}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{formatDate(s.createdAt)}</span>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{s.customerName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{s.customerPhone}</div>
                              </td>
                              <td className="p-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {s.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">৳{s.grandTotal.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-700">৳{s.paidAmount.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono font-bold text-rose-600">৳{s.dueAmount.toLocaleString()}</td>
                              <td className="p-3 text-center">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  s.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : s.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {s.paymentStatus}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-indigo-50/50">
                                <td colSpan={8} className="p-4 border-t border-b border-indigo-200">
                                  <table className="w-full text-left text-[11px] bg-white border border-slate-200 rounded-lg">
                                    <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                                      <tr>
                                        <th className="p-2">Item / Product Name</th>
                                        <th className="p-2">Brand</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2 text-right">Unit Price</th>
                                        <th className="p-2 text-right">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                      {s.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                          <td className="p-2 font-sans font-bold text-slate-900">{item.productName}</td>
                                          <td className="p-2 font-sans text-slate-600">{item.brand}</td>
                                          <td className="p-2 text-center font-bold">{item.quantity}</td>
                                          <td className="p-2 text-right">৳{item.unitPrice.toLocaleString()}</td>
                                          <td className="p-2 text-right font-bold text-slate-900">৳{item.total.toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. PRODUCT-WISE SALES AUDIT */}
      {selectedReportType === 'product_profit' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Product-Wise Sales & Profitability Audit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Item-level quantity sold, gross revenue, cost of sales, and product profit margin.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search product, brand, category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-64 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3 text-center">#</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Brand & Category</th>
                  <th className="p-3 text-center">Available Stock</th>
                  <th className="p-3 text-center">Units Sold</th>
                  <th className="p-3 text-right">Gross Revenue</th>
                  <th className="p-3 text-right">Total Cost (COGS)</th>
                  <th className="p-3 text-right">Net Product Profit</th>
                  <th className="p-3 text-right">Profit Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {productProfitList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 text-xs">
                      No products matched your search.
                    </td>
                  </tr>
                ) : (
                  productProfitList.map((p, idx) => {
                    const marginPct = p.rev > 0 ? ((p.profit / p.rev) * 100).toFixed(1) : '0';
                    return (
                      <tr key={p.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-sans font-bold text-slate-900">{p.name}</td>
                        <td className="p-3 font-sans">
                          <div>{p.brand}</div>
                          <div className="text-[10px] text-slate-400">{p.category}</div>
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${p.stockQty > 5 ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-900 font-black'}`}>
                            {p.stockQty} pcs
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-purple-700">{p.qty}</td>
                        <td className="p-3 text-right font-bold text-slate-900">৳{p.rev.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-600">৳{p.cost.toLocaleString()}</td>
                        <td className="p-3 text-right font-black text-emerald-600">৳{p.profit.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-purple-700">{marginPct}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PURCHASE & PROCUREMENT AUDIT */}
      {selectedReportType === 'purchases' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-600" />
                Purchase & Procurement Orders Audit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit supplier procurement bills, paid amounts, stock orders, and outstanding supplier payables.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search PO #, Supplier Name..."
                  value={purchasesSearch}
                  onChange={(e) => setPurchasesSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-60 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={purchasesStatusFilter}
                onChange={(e) => setPurchasesStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="all">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partially Paid</option>
                <option value="due">Unpaid / Full Due</option>
              </select>
            </div>
          </div>

          {/* Purchase KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Total Purchase Orders</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{auditedPurchaseOrdersList.length} Orders</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Procurement Value</span>
              <span className="font-bold text-slate-900 font-mono text-sm">৳{auditedPurchaseOrdersList.reduce((sum, po) => sum + po.totalCost, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Paid to Suppliers</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">৳{auditedPurchaseOrdersList.reduce((sum, po) => sum + po.paidAmount, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Supplier Balance Payable</span>
              <span className="font-bold text-rose-600 font-mono text-sm">৳{auditedPurchaseOrdersList.reduce((sum, po) => sum + (po.totalCost - po.paidAmount), 0).toLocaleString()}</span>
            </div>
          </div>

          {auditedPurchaseOrdersList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl">
              No purchase orders found matching the filter.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">PO # & Date</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Business Branch</th>
                    <th className="p-3 text-center">Items Count</th>
                    <th className="p-3 text-right">Total Order Cost</th>
                    <th className="p-3 text-right">Paid Amount</th>
                    <th className="p-3 text-right">Payable Balance</th>
                    <th className="p-3 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {auditedPurchaseOrdersList.map((po) => {
                    const isExpanded = expandedPoId === po.id;
                    const payableDue = po.totalCost - po.paidAmount;
                    return (
                      <React.Fragment key={po.id}>
                        <tr
                          onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="p-3 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-purple-700 block">{po.id}</span>
                            <span className="text-[10px] text-slate-400">{formatDate(po.createdAt)}</span>
                          </td>
                          <td className="p-3 font-sans font-bold text-slate-900">{po.supplierName}</td>
                          <td className="p-3 font-sans">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {po.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800">
                            {po.items.reduce((sum, i) => sum + i.quantity, 0)} pcs
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">৳{po.totalCost.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">৳{po.paidAmount.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-rose-600">৳{payableDue.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              po.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : po.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {po.paymentStatus}
                            </span>
                          </td>
                        </tr>

                        {/* Expandable PO Line Items */}
                        {isExpanded && (
                          <tr className="bg-purple-50/50">
                            <td colSpan={9} className="p-4 border-t border-b border-purple-200">
                              <div className="space-y-2">
                                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5" /> Items Ordered in Purchase Order {po.id}
                                </h4>
                                <table className="w-full text-left text-[11px] bg-white border border-slate-200 rounded-lg">
                                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                                    <tr>
                                      <th className="p-2">Product Name</th>
                                      <th className="p-2 text-center">Quantity</th>
                                      <th className="p-2 text-right">Wholesale Cost Price</th>
                                      <th className="p-2 text-right">Total Line Cost</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono">
                                    {po.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2 font-sans font-bold text-slate-900">{item.productName}</td>
                                        <td className="p-2 text-center font-bold">{item.quantity}</td>
                                        <td className="p-2 text-right">৳{item.costPrice.toLocaleString()}</td>
                                        <td className="p-2 text-right font-bold text-slate-900">৳{item.totalCost.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Full purchased-product breakdown across every PO in range */}
          <div className="space-y-2 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t pt-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                Purchased Product Details ({purchaseLineItems.length} lines · {purchasedUnitsTotal} pcs)
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                Every product on every PO in this period
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                  <tr>
                    <th className="p-3">PO #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Brand / Category</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseLineItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500 text-xs">
                        No purchased products in this date range.
                      </td>
                    </tr>
                  ) : (
                    purchaseLineItems.map((l) => (
                      <tr key={l.key} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-purple-700 whitespace-nowrap">{l.poId}</td>
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{formatDate(l.date)}</td>
                        <td className="p-3 font-bold text-slate-700">{l.supplierName}</td>
                        <td className="p-3 font-bold text-slate-900">
                          <div>{l.productName}</div>
                          {l.sku && <div className="text-[10px] font-mono text-slate-400">SKU: {l.sku}</div>}
                        </td>
                        <td className="p-3 text-slate-600">
                          {l.brand || '—'}
                          {l.category ? <span className="text-slate-400"> · {l.category}</span> : null}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {l.quantity} {l.unit}
                        </td>
                        <td className="p-3 text-right font-mono">৳{l.costPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">
                          ৳{l.totalCost.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t">
                  <tr>
                    <td colSpan={5} className="p-3 text-right">Total Purchased:</td>
                    <td className="p-3 text-center font-mono">{purchasedUnitsTotal} pcs</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right font-mono font-black">
                      ৳{purchaseLineItems.reduce((s, l) => s + l.totalCost, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. BUSINESS EXPENSE AUDIT REPORT */}
      {selectedReportType === 'expenses' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                Business Expense Audit & Voucher Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized operating expenses by category, vendor name, payment mode, and recorded staff.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Title, Vendor, Voucher #..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-60 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={expenseCatFilter}
                onChange={(e) => setExpenseCatFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="all">All Expense Categories</option>
                <option value="Shop Rent">Shop Rent</option>
                <option value="Electricity & Utility">Electricity & Utility</option>
                <option value="Staff Salary">Staff Salary</option>
                <option value="Transport & Freight">Transport & Freight</option>
                <option value="Entertainment & Tea">Entertainment & Tea</option>
                <option value="Marketing & Promo">Marketing & Promo</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Expense KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Total Audited Expenses</span>
              <span className="font-bold text-rose-600 font-mono text-sm">৳{auditedExpensesList.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Expense Vouchers Count</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{auditedExpensesList.length} Records</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Highest Expense Category</span>
              <span className="font-bold text-purple-700 text-sm">
                {(() => {
                  const catMap: Record<string, number> = {};
                  auditedExpensesList.forEach((e) => {
                    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
                  });
                  const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
                  return top ? `${top[0]} (৳${top[1].toLocaleString()})` : 'None';
                })()}
              </span>
            </div>
          </div>

          {/* Table */}
          {auditedExpensesList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl">
              No operating expenses match your search or filter.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Voucher #</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Expense Title / Vendor</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Recorded By</th>
                    <th className="p-3 text-right">Amount BDT</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditedExpensesList.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-600">{formatDate(exp.date)}</td>
                      <td className="p-3 font-bold text-purple-700">{exp.voucherNo || exp.id}</td>
                      <td className="p-3 font-sans">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-200">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 font-sans font-bold text-slate-900">
                        <div>{exp.title}</div>
                        {exp.vendorName && <div className="text-[10px] text-slate-400 font-normal">Vendor: {exp.vendorName}</div>}
                      </td>
                      <td className="p-3 font-sans">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {exp.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                        </span>
                      </td>
                      <td className="p-3 font-sans capitalize">{exp.paymentMode || 'cash'}</td>
                      <td className="p-3 font-sans text-slate-600">{exp.recordedBy || 'Admin'}</td>
                      <td className="p-3 text-right font-black text-rose-600 font-mono text-sm">৳{exp.amount.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedExpenseVoucher(exp)}
                          className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-bold border border-purple-200"
                        >
                          View Voucher
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EXPENSE VOUCHER AUDIT MODAL */}
      {selectedExpenseVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-purple-600" /> Business Expense Voucher Audit
              </h3>
              <button
                onClick={() => setSelectedExpenseVoucher(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Voucher No:</span>
                  <span className="font-bold text-purple-700">{selectedExpenseVoucher.voucherNo || selectedExpenseVoucher.id}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-bold text-slate-800">{formatDate(selectedExpenseVoucher.date)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Business Branch:</span>
                  <span className="font-bold text-slate-800">{selectedExpenseVoucher.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Category</span>
                <p className="font-bold text-slate-900 bg-purple-50 text-purple-900 p-2 rounded-lg border border-purple-200">
                  {selectedExpenseVoucher.category}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Expense Title & Vendor</span>
                <p className="font-bold text-slate-900 text-sm">{selectedExpenseVoucher.title}</p>
                {selectedExpenseVoucher.vendorName && <p className="text-slate-600 text-xs">Payee Vendor: {selectedExpenseVoucher.vendorName}</p>}
              </div>

              <div className="flex justify-between items-center bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-900 text-xs">Voucher Amount Paid:</span>
                <span className="font-mono font-black text-xl text-rose-600">৳{selectedExpenseVoucher.amount.toLocaleString()}</span>
              </div>

              {selectedExpenseVoucher.notes && (
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Audit Remarks / Notes</span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">{selectedExpenseVoucher.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>
              <button
                onClick={() => setSelectedExpenseVoucher(null)}
                className="px-3 py-1.5 bg-slate-200 text-slate-800 rounded-xl font-bold text-xs hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. INSTALLMENT COLLECTIONS & EMI LEDGER */}
      {selectedReportType === 'installment_ledger' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                Installment Collections & EMI Ledger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact cash received from customer EMI schedule payments in selected period ({dateMode.toUpperCase()})
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export EMI Excel
            </button>
          </div>

          {/* Collection KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Period EMI Recovered</p>
              <p className="text-2xl font-black text-emerald-900 font-mono mt-1">৳{periodEmiCollectionTotal.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                {filteredInstallmentCollections.length} Installments Paid
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Period Down Payments</p>
              <p className="text-2xl font-black text-blue-900 font-mono mt-1">৳{periodDownPaymentTotal.toLocaleString()}</p>
              <span className="text-[10px] text-blue-700 font-bold block mt-1">
                From sales created in period
              </span>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Active Financed Portfolio Balance</p>
              <p className="text-2xl font-black text-purple-900 font-mono mt-1">৳{totalFinancedEmiBalance.toLocaleString()}</p>
              <span className="text-[10px] text-purple-700 font-bold block mt-1">
                Outstanding Principal Dues
              </span>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Overdue Value at Risk</p>
              <p className="text-2xl font-black text-rose-700 font-mono mt-1">৳{totalOverdueEmiAmount.toLocaleString()}</p>
              <span className="text-[10px] text-rose-600 font-bold block mt-1">
                Delayed / Default Risk EMIs
              </span>
            </div>
          </div>

          {/* Collection Log Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>Itemized EMI Payment Collection Log</span>
              <span className="text-xs text-slate-500 font-normal">
                Total: ৳{periodEmiCollectionTotal.toLocaleString()}
              </span>
            </h3>

            {filteredInstallmentCollections.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No installment payments collected in this selected date range.</p>
                <p className="text-[11px] text-slate-400 mt-1">Try selecting a broader date range or "All Time".</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                    <tr>
                      <th className="p-3">Paid Date</th>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Invoice / Plan ID</th>
                      <th className="p-3">Installment #</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Payment Mode</th>
                      <th className="p-3">Deposited To</th>
                      <th className="p-3 text-right">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredInstallmentCollections.map((c, idx) => (
                      <tr key={`${c.planId}_${c.installmentNo}_${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-600 font-bold">{formatDate(c.paidDate)}</td>
                        <td className="p-3 font-medium text-slate-900">
                          <div>{c.customerName}</div>
                          <div className="text-[10px] text-slate-400">{c.customerPhone}</div>
                        </td>
                        <td className="p-3 font-mono text-xs text-purple-700 font-bold">
                          <div>{c.invoiceId}</div>
                          <div className="text-[10px] text-slate-400">Plan: {c.planId}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                            Installment #{c.installmentNo}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{c.dueDate}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase border border-emerald-200">
                            {c.paymentMode.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          {c.accountName === 'Unassigned' ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Unassigned
                            </span>
                          ) : (
                            <span className="text-[11px]">{c.accountName}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-sm font-black text-emerald-700">
                          ৳{c.amountPaid.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-900 border-t">
                    <tr>
                      <td colSpan={7} className="p-3 text-right font-bold">Total Installment Cash Collected:</td>
                      <td className="p-3 text-right font-mono text-sm text-emerald-700 font-black">
                        ৳{periodEmiCollectionTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 14. CONSOLIDATED BANK-STYLE STATEMENT */}
      {selectedReportType === 'statement' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <UnifiedStatementView
            sales={filteredSales}
            purchaseOrders={filteredPurchaseOrders}
            expenses={filteredExpenses}
            customerReturns={filteredCustomerReturns}
            damageLogs={filteredDamageLogs}
            periodLabel={dateMode.replace('_', ' ').toUpperCase()}
            accent="purple"
          />
        </div>
      )}

      {/* 13. REFERRAL (SP DISCOUNT) SALES */}
      {selectedReportType === 'referral_sales' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-violet-600" />
                Actual Sales vs Referral Sales
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customers paid the full invoice value. Special discounts are referral payouts we absorb ({dateMode.toUpperCase()}).
              </p>
            </div>
          </div>

          {/* Headline figures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Actual Sales (Regular)</p>
              <p className="text-2xl font-black text-blue-900 font-mono mt-1">৳{referralTotals.regularRevenue.toLocaleString()}</p>
              <span className="text-[10px] text-blue-700 font-bold block mt-1">
                {regularSales.length} invoices, no referral
              </span>
            </div>

            <div className="bg-violet-50 border border-violet-200 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-violet-800 uppercase tracking-wider">Sales With Referral</p>
              <p className="text-2xl font-black text-violet-900 font-mono mt-1">৳{referralTotals.referralGross.toLocaleString()}</p>
              <span className="text-[10px] text-violet-700 font-bold block mt-1">
                {referralSales.length} invoices
              </span>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Referral Expense (SP)</p>
              <p className="text-2xl font-black text-rose-700 font-mono mt-1">৳{referralTotals.referralExpense.toLocaleString()}</p>
              <span className="text-[10px] text-rose-600 font-bold block mt-1">
                Paid out to {referralByPerson.length} referral{referralByPerson.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl shadow">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Net Sales After Referral</p>
              <p className="text-2xl font-black font-mono mt-1">৳{referralTotals.netRevenue.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                Gross ৳{referralTotals.grossRevenue.toLocaleString()} − SP ৳{referralTotals.referralExpense.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Referral payouts by person */}
          {referralByPerson.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Referral Payout Summary</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                    <tr>
                      <th className="p-3">Referral Name</th>
                      <th className="p-3 text-center">Invoices</th>
                      <th className="p-3 text-right">Gross Sales</th>
                      <th className="p-3 text-right">Payout (SP)</th>
                      <th className="p-3 text-right">Net to Business</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {referralByPerson.map((r) => (
                      <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{r.name}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-600">{r.invoiceCount}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">৳{r.gross.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">৳{r.payout.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">
                          ৳{(r.gross - r.payout).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Itemized referral invoices */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>Referral Sales Detail</span>
              <span className="text-xs text-slate-500 font-normal">
                Net: ৳{referralTotals.referralNet.toLocaleString()}
              </span>
            </h3>

            {referralSales.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No referral sales in this date range.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  All ৳{referralTotals.regularRevenue.toLocaleString()} of sales in this period were regular.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Referral</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">SP Discount</th>
                      <th className="p-3 text-right">Net Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {referralSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-600 font-bold">{formatDate(s.createdAt)}</td>
                        <td className="p-3 font-mono text-xs text-purple-700 font-bold">{s.id}</td>
                        <td className="p-3 font-medium text-slate-900">
                          <div>{s.customerName}</div>
                          <div className="text-[10px] text-slate-400">{s.customerPhone}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 text-[10px] font-bold border border-violet-200">
                            {s.referralName?.trim() || 'Unnamed'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          ৳{s.grandTotal.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">
                          -৳{(s.specialDiscount || 0).toLocaleString()}
                          {s.specialDiscountMode === 'percent' && s.specialDiscountRate ? (
                            <span className="block text-[9px] font-bold text-rose-400">
                              {s.specialDiscountRate}%
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">
                          ৳{(s.grandTotal - (s.specialDiscount || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-900 border-t">
                    <tr>
                      <td colSpan={4} className="p-3 text-right font-bold">Totals:</td>
                      <td className="p-3 text-right font-mono text-slate-800 font-black">
                        ৳{referralTotals.referralGross.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-700 font-black">
                        -৳{referralTotals.referralExpense.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-black">
                        ৳{referralTotals.referralNet.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. REALIZED CASH FLOW STATEMENT */}
      {selectedReportType === 'cash_flow' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-lg font-black text-slate-900 border-b pb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            Realized Cash Flow Statement
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <p className="text-xs font-bold text-emerald-800 uppercase">Realized Cash Inflows (+)</p>
              <p className="text-2xl font-black text-emerald-900 font-mono mt-1">৳{totalCashInflow.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                POS Sales + Down Payments + EMI Collections
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
              <p className="text-xs font-bold text-rose-800 uppercase">Cash Outflows (-)</p>
              <p className="text-2xl font-black text-rose-900 font-mono mt-1">
                ৳{(totalStockProcurementOutflow + totalOperatingExpenses).toLocaleString()}
              </p>
              <p className="text-[10px] text-rose-700 mt-1 font-medium">Supplier PO Payments + Operating Expenses</p>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl shadow">
              <p className="text-xs font-bold text-slate-300 uppercase">Net Realized Cash Position</p>
              <p className={`text-2xl font-black font-mono mt-1 ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ৳{netCashFlow.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Actual net liquidity generated in period</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Itemized Cash Inflow Channels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Direct POS Sales Cash</span>
                <span className="font-bold font-mono text-sm text-slate-900">৳{periodPosCashTotal.toLocaleString()}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Installment Down Payments</span>
                <span className="font-bold font-mono text-sm text-slate-900">৳{periodDownPaymentTotal.toLocaleString()}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block">EMI Installments Collected</span>
                <span className="font-bold font-mono text-sm text-emerald-700">৳{periodEmiCollectionTotal.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">({filteredInstallmentCollections.length} EMIs)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. RECEIVABLES & DUES AGING */}
      {selectedReportType === 'receivables' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-black text-slate-900 border-b pb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Accounts Receivable & Customer Dues Aging Ledger
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
              <p className="text-xs font-bold text-rose-800 uppercase">Total Immediate Customer Dues</p>
              <p className="text-2xl font-black text-rose-700 font-mono mt-1">৳{totalOutstandingDues.toLocaleString()}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
              <p className="text-xs font-bold text-purple-800 uppercase">Remaining Installment Financed Balance</p>
              <p className="text-2xl font-black text-purple-900 font-mono mt-1">৳{totalFinancedEmiBalance.toLocaleString()}</p>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 font-bold border-b">
              <tr>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3 text-right">Total Purchases</th>
                <th className="p-3 text-right">Outstanding Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {customers
                .filter((c) => c.currentDue > 0)
                .map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-sans font-bold text-slate-900">{c.name}</td>
                    <td className="p-3 text-blue-700">{c.phone}</td>
                    <td className="p-3 text-right">৳{c.totalPurchases.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-rose-600">৳{c.currentDue.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 9. INVENTORY STOCK VALUATION */}
      {selectedReportType === 'stocks' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-black text-slate-900 border-b pb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Inventory Asset Stock Valuation Report
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 font-bold border-b">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">Brand</th>
                <th className="p-3 text-center">Stock Qty</th>
                <th className="p-3 text-right">Cost Price</th>
                <th className="p-3 text-right">Retail Price</th>
                <th className="p-3 text-right">Total Asset Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-3 font-sans font-bold text-slate-900">{p.name}</td>
                  <td className="p-3 font-sans">{p.brand}</td>
                  <td className="p-3 text-center font-bold">{p.stockQty}</td>
                  <td className="p-3 text-right">৳{p.costPrice.toLocaleString()}</td>
                  <td className="p-3 text-right">৳{p.retailPrice.toLocaleString()}</td>
                  <td className="p-3 text-right font-black text-purple-900">
                    ৳{(p.stockQty * p.costPrice).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 10. PRODUCT CATEGORY WISE SALES REPORT */}
      {selectedReportType === 'category_sales' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                Product Category Wise Sales & Stock Performance Report
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown showing units sold (how many TVs, ACs, Refrigerators, etc. sold), revenue, COGS, profit margins, and current stock availability.
              </p>
            </div>
            
            <div className="bg-purple-50 text-purple-900 px-3 py-1.5 rounded-xl border border-purple-200 text-xs font-bold font-mono">
              {categorySalesDetailedList.length} Active Categories
            </div>
          </div>

          {/* Category Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Units Sold</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                {categorySalesDetailedList.reduce((sum, c) => sum + c.unitsSold, 0)} Units
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross Category Revenue</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                ৳{categorySalesDetailedList.reduce((sum, c) => sum + c.grossRevenue, 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Category COGS</span>
              <span className="text-xl font-black text-slate-700 font-mono mt-1 block">
                ৳{categorySalesDetailedList.reduce((sum, c) => sum + c.cogs, 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Category Profit</span>
              <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
                ৳{categorySalesDetailedList.reduce((sum, c) => sum + c.netProfit, 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Category Sales Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3">Category Name</th>
                  <th className="p-3 text-center">Units Sold</th>
                  <th className="p-3 text-center">Sales Invoices</th>
                  <th className="p-3 text-right">Gross Revenue</th>
                  <th className="p-3 text-right">COGS</th>
                  <th className="p-3 text-right">Net Profit</th>
                  <th className="p-3 text-right">Profit Margin %</th>
                  <th className="p-3 text-center">Available Stock</th>
                  <th className="p-3 text-right">Stock Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {categorySalesDetailedList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 font-sans text-xs">
                      No category sales records found in selected audit period.
                    </td>
                  </tr>
                ) : (
                  categorySalesDetailedList.map((c) => {
                    return (
                      <tr key={c.category} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-sans font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                          {c.category}
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-purple-700">
                          <span className="px-2 py-0.5 bg-purple-50 rounded-md border border-purple-200">
                            {c.unitsSold} units
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-600">{c.invoiceCount} orders</td>
                        <td className="p-3 text-right font-bold text-slate-900">৳{c.grossRevenue.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-600">৳{c.cogs.toLocaleString()}</td>
                        <td className="p-3 text-right font-black text-emerald-600">৳{c.netProfit.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${c.profitMarginPct >= 15 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {c.profitMarginPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 text-[10px]">
                            {c.availableStockQty} pcs in stock
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-700">৳{c.availableStockValue.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
