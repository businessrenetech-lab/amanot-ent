import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditConfigModal } from './AuditConfigModal';
import { BusinessType, Expense, PurchaseOrder, SaleInvoice } from '../../types';
import {
  FileText,
  Building2,
  PieChart,
  SlidersHorizontal,
  CheckCircle2,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Package,
  Truck,
  DollarSign,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  Download,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateBrandedReportPDF, ReportSection } from '../../utils/reportPdfGenerator';
import { formatDate } from '../../utils/formatDate';
import { UnifiedStatementView } from './UnifiedStatementView';

export const AuditReportsView: React.FC = () => {
  const { sales, products, expenses, purchaseOrders, customerReturns, activeBusiness, currentUser, auditConfig, settings } = useApp();

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [auditTab, setAuditTab] = useState<'profit_loss' | 'sales' | 'product_sales' | 'purchases' | 'expenses' | 'statement'>('profit_loss');

  // Business Scope Filter (Combined or Separate Branches)
  const [businessScope, setBusinessScope] = useState<'all' | BusinessType>(activeBusiness);

  // Date Filter Range
  const [dateMode, setDateMode] = useState<'today' | 'this_month' | 'this_year' | 'custom' | 'all'>('this_month');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thisMonthPrefix = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const thisYearPrefix = useMemo(() => new Date().toISOString().substring(0, 4), []);

  // Search states inside audit views
  const [salesSearch, setSalesSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');

  // Expandable inspectors
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // 1. Audited Sales Pool (Filtered according to Super Admin Tax Config, Business Scope & Date Range)
  const auditedSalesList = useMemo(() => {
    let pool = sales.filter((s) => {
      if (businessScope !== 'all' && s.business !== businessScope) return false;

      const dateStr = s.createdAt.substring(0, 10);
      if (dateMode === 'today' && dateStr !== todayStr) return false;
      if (dateMode === 'this_month' && !dateStr.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !dateStr.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && dateStr < fromDate) return false;
        if (toDate && dateStr > toDate) return false;
      }
      return true;
    });

    // Installment filter
    if (!auditConfig.includeInstallmentSales) {
      pool = pool.filter((s) => !s.isInstallment);
    }

    // Category & Brand filter
    if (auditConfig.allowedCategories && auditConfig.allowedCategories.length > 0) {
      pool = pool.filter((s) =>
        s.items.some((i) => auditConfig.allowedCategories.includes(i.category || 'General'))
      );
    }

    if (auditConfig.allowedBrands && auditConfig.allowedBrands.length > 0) {
      pool = pool.filter((s) =>
        s.items.some((i) => auditConfig.allowedBrands.includes(i.brand))
      );
    }

    // Apply Sales Volume Percentage ratio
    const pct = auditConfig.salesPercentageToInclude ?? 50;
    const targetCount = Math.max(1, Math.ceil((pool.length * pct) / 100));
    let sliced = pool.slice(0, targetCount);

    // Apply Sales Count Cap
    const maxCount = auditConfig.maxSalesCountToInclude ?? 20;
    if (maxCount > 0 && sliced.length > maxCount) {
      sliced = sliced.slice(0, maxCount);
    }

    // Search filter
    if (salesSearch.trim()) {
      const q = salesSearch.toLowerCase();
      sliced = sliced.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.customerPhone.includes(q) ||
          s.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    }

    return sliced;
  }, [sales, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate, auditConfig, salesSearch]);

  // 2. Product-Wise Tax Sales List
  const auditedProductSalesList = useMemo(() => {
    const map: Record<string, {
      id: string;
      name: string;
      brand: string;
      category: string;
      stockQty: number;
      qtySold: number;
      revenue: number;
      cogs: number;
      netProfit: number;
    }> = {};

    // Build from what actually sold, using the invoice line snapshots. Driving this
    // from the sales (rather than from a slice of the catalogue) means every audited
    // sale is counted, including products since deleted or renamed.
    auditedSalesList.forEach((s) => {
      s.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);

        if (!map[item.productId]) {
          map[item.productId] = {
            id: item.productId,
            name: item.productName || product?.name || 'Unknown Product',
            brand: item.brand || product?.brand || 'Generic',
            category: item.category || product?.category || 'General',
            stockQty: product?.stockQty ?? 0,
            qtySold: 0,
            revenue: 0,
            cogs: 0,
            netProfit: 0
          };
        }

        map[item.productId].qtySold += item.quantity;
        map[item.productId].revenue += item.total;
        const c = item.costPrice * item.quantity;
        map[item.productId].cogs += c;
        map[item.productId].netProfit += item.total - c;
      });
    });

    // Sales-only report: a product that did not sell has no place in it
    let list = Object.values(map).filter((p) => p.qtySold > 0);

    // Audit scoping by category / brand
    if (auditConfig.allowedCategories && auditConfig.allowedCategories.length > 0) {
      list = list.filter((p) => auditConfig.allowedCategories.includes(p.category || 'General'));
    }

    if (auditConfig.allowedBrands && auditConfig.allowedBrands.length > 0) {
      list = list.filter((p) => auditConfig.allowedBrands.includes(p.brand));
    }

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => b.revenue - a.revenue || b.qtySold - a.qtySold);

    // Cap LAST, so it keeps the top sellers by revenue instead of an arbitrary
    // slice of the catalogue in storage order.
    const maxProds = auditConfig.maxProductCountToInclude ?? 20;
    if (maxProds > 0 && list.length > maxProds) {
      list = list.slice(0, maxProds);
    }

    return list;
  }, [products, auditedSalesList, businessScope, auditConfig, productSearch]);

  // 3. Audited Purchases List
  const auditedPurchaseOrdersList = useMemo(() => {
    let pool = purchaseOrders.filter((po) => {
      if (businessScope !== 'all' && po.business !== businessScope) return false;

      const dateStr = po.createdAt.substring(0, 10);
      if (dateMode === 'today' && dateStr !== todayStr) return false;
      if (dateMode === 'this_month' && !dateStr.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !dateStr.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && dateStr < fromDate) return false;
        if (toDate && dateStr > toDate) return false;
      }
      return true;
    });

    const pct = auditConfig.purchasePercentageToInclude ?? 50;
    const targetCount = Math.max(1, Math.ceil((pool.length * pct) / 100));
    let sliced = pool.slice(0, targetCount);

    const maxCount = auditConfig.maxPurchaseCountToInclude ?? 10;
    if (maxCount > 0 && sliced.length > maxCount) {
      sliced = sliced.slice(0, maxCount);
    }

    if (purchaseSearch.trim()) {
      const q = purchaseSearch.toLowerCase();
      sliced = sliced.filter(
        (po) =>
          po.id.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    }

    return sliced;
  }, [purchaseOrders, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate, auditConfig, purchaseSearch]);

  /**
   * Every purchased product line across the audited POs, flattened so the report
   * shows what was actually bought rather than a per-PO item count.
   */
  const auditedPurchaseLineItems = useMemo(() => {
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

  const auditedPurchaseUnits = useMemo(
    () => auditedPurchaseLineItems.reduce((sum, l) => sum + l.quantity, 0),
    [auditedPurchaseLineItems]
  );

  // 4. Audited Expenses List
  const auditedExpensesList = useMemo(() => {
    let pool = expenses.filter((e) => {
      if (businessScope !== 'all' && e.business !== businessScope) return false;

      const dateStr = e.date.substring(0, 10);
      if (dateMode === 'today' && dateStr !== todayStr) return false;
      if (dateMode === 'this_month' && !dateStr.startsWith(thisMonthPrefix)) return false;
      if (dateMode === 'this_year' && !dateStr.startsWith(thisYearPrefix)) return false;
      if (dateMode === 'custom') {
        if (fromDate && dateStr < fromDate) return false;
        if (toDate && dateStr > toDate) return false;
      }
      return true;
    });

    let totalRaw = pool.reduce((acc, e) => acc + e.amount, 0);
    const maxCap = auditConfig.maxMonthlyExpenseCap ?? 100000;

    let processed = pool;
    if (totalRaw > maxCap && totalRaw > 0) {
      const scale = maxCap / totalRaw;
      processed = pool.map((e) => ({ ...e, amount: Math.round(e.amount * scale) }));
    }

    if (expenseSearch.trim()) {
      const q = expenseSearch.toLowerCase();
      processed = processed.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.vendorName || '').toLowerCase().includes(q)
      );
    }

    return processed;
  }, [expenses, businessScope, dateMode, todayStr, thisMonthPrefix, thisYearPrefix, fromDate, toDate, auditConfig, expenseSearch]);

  // Financial aggregates for Tax Purpose
  const auditedInvoiceIds = useMemo(() => new Set(auditedSalesList.map((s) => s.id)), [auditedSalesList]);
  const auditedReturnsList = useMemo(() => {
    return customerReturns.filter(
      (r) => (businessScope === 'all' ? true : r.business === businessScope) && auditedInvoiceIds.has(r.invoiceId)
    );
  }, [customerReturns, businessScope, auditedInvoiceIds]);

  const auditGrossSales = auditedSalesList.reduce((acc, s) => acc + s.grandTotal, 0);
  const auditReturnsTotal = auditedReturnsList.reduce((acc, r) => acc + r.totalRefundAmount, 0);
  const auditRevenue = auditGrossSales - auditReturnsTotal;
  const auditCOGS = auditedSalesList.reduce((acc, s) => acc + s.totalCost, 0);
  const profitMultiplier = auditConfig.profitMarginMultiplier ?? 0.8;
  const auditGrossProfit = (auditRevenue - auditCOGS) * profitMultiplier;
  const auditExpensesTotal = auditedExpensesList.reduce((acc, e) => acc + e.amount, 0);
  const auditNetProfit = auditGrossProfit - auditExpensesTotal;
  const auditPurchasesTotal = auditedPurchaseOrdersList.reduce((acc, po) => acc + po.totalCost, 0);

  const getDateFilterLabel = () => {
    if (dateMode === 'today') return `Today (${todayStr})`;
    if (dateMode === 'this_month') return `This Month (${thisMonthPrefix})`;
    if (dateMode === 'this_year') return `This Fiscal Year (${thisYearPrefix})`;
    if (dateMode === 'custom') return `Custom Range (${fromDate} to ${toDate})`;
    return 'All Time History';
  };

  const handleExportTaxExcel = () => {
    const salesData = auditedSalesList.map((s) => ({
      TaxInvoiceNo: s.id,
      Date: s.createdAt,
      CustomerName: s.customerName,
      Branch: s.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      ReportedTotalBDT: s.grandTotal,
      ReportedPaidBDT: s.paidAmount,
      ReportedCostBDT: s.totalCost,
      PaymentStatus: s.paymentStatus
    }));

    const productData = auditedProductSalesList.map((p) => ({
      ProductName: p.name,
      Brand: p.brand,
      Category: p.category,
      AvailableStock: p.stockQty,
      ReportedUnitsSold: p.qtySold,
      ReportedRevenueBDT: p.revenue,
      ReportedCostBDT: p.cogs,
      ReportedProfitBDT: p.netProfit
    }));

    const purchaseData = auditedPurchaseOrdersList.map((po) => ({
      PurchaseOrderNo: po.id,
      Date: formatDate(po.createdAt),
      Supplier: po.supplierName,
      Branch: po.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      ItemLines: po.items.length,
      UnitsPurchased: po.items.reduce((sum, i) => sum + i.quantity, 0),
      ReportedTotalCostBDT: po.totalCost,
      ReportedPaidBDT: po.paidAmount,
      Status: po.paymentStatus
    }));

    // Every purchased product line, one row each
    const purchaseItemData = auditedPurchaseLineItems.map((l) => ({
      PurchaseOrderNo: l.poId,
      Date: formatDate(l.date),
      Supplier: l.supplierName,
      Branch: l.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
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

    const expenseData = auditedExpensesList.map((e) => ({
      ExpenseTitle: e.title,
      Category: e.category,
      Date: e.date,
      Branch: e.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      ReportedAmountBDT: e.amount
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), 'Tax_Sales_Audit');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productData), 'Tax_Product_Wise_Sales');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseData), 'Tax_Purchases_Audit');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseItemData), 'Tax_Purchased_Products');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseData), 'Tax_Expenses_Audit');

    XLSX.writeFile(wb, `Tax_Filing_Audit_Report_${businessScope}_${todayStr}.xlsx`);
  };

  const scopeName =
    businessScope === 'all'
      ? 'All Group Branches Combined'
      : businessScope === 'amanot_electronics'
      ? 'Amanot Electronics'
      : 'Amanot Enterprise';

  const branchLabel = (b: BusinessType) =>
    b === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise';

  // Every audit filter's content assembled as titled sections (used by both PDF & Print).
  const buildAuditSections = (): ReportSection[] => [
    {
      heading: '1. Tax Profit & Loss Statement',
      tableHeaders: ['Tax Audit Particulars', 'Audit Basis', 'Amount (BDT)'],
      tableData: [
        ['Audited Gross Sales Volume', `Filtered at ${auditConfig.salesPercentageToInclude}% Volume`, auditGrossSales.toLocaleString()],
        ['Audited Customer Returns (-)', 'Returned Items on Audited Invoices', `-${auditReturnsTotal.toLocaleString()}`],
        ['Audited Net Revenue', 'Audited Gross - Audited Returns', auditRevenue.toLocaleString()],
        ['Audited Cost of Goods Sold', 'Direct Product Cost of Audited Sales', auditCOGS.toLocaleString()],
        ['Audited Gross Profit', `Adjusted with ${auditConfig.profitMarginMultiplier}x Multiplier`, auditGrossProfit.toLocaleString()],
        ['Audited Operating Expenses', 'Audited Expense Vouchers', auditExpensesTotal.toLocaleString()],
        ['AUDITED NET OPERATING PROFIT', 'Taxable Operating Income', Math.round(auditNetProfit).toLocaleString()]
      ]
    },
    {
      heading: '2. Tax Sales Invoices Audit',
      tableHeaders: ['Invoice No', 'Date', 'Customer', 'Branch', 'Total (BDT)', 'Paid (BDT)', 'Status'],
      tableData: auditedSalesList.map((s) => [
        s.id, s.createdAt, s.customerName, branchLabel(s.business),
        s.grandTotal.toLocaleString(), s.paidAmount.toLocaleString(), s.paymentStatus.toUpperCase()
      ])
    },
    {
      heading: '3. Product-Wise Tax Sales',
      tableHeaders: ['Product', 'Brand', 'Category', 'Units Sold', 'Revenue (BDT)', 'Cost (BDT)', 'Profit (BDT)'],
      tableData: auditedProductSalesList.map((p) => [
        p.name, p.brand, p.category, p.qtySold,
        p.revenue.toLocaleString(), p.cogs.toLocaleString(), p.netProfit.toLocaleString()
      ])
    },
    {
      heading: '4. Tax Purchase & Procurement',
      tableHeaders: ['PO No', 'Date', 'Supplier', 'Branch', 'Total Cost (BDT)', 'Paid (BDT)', 'Status'],
      tableData: auditedPurchaseOrdersList.map((po) => [
        po.id, formatDate(po.createdAt), po.supplierName, branchLabel(po.business),
        po.totalCost.toLocaleString(), po.paidAmount.toLocaleString(), po.paymentStatus.toUpperCase()
      ])
    },
    {
      heading: '4a. Purchased Product Details (all POs)',
      tableHeaders: ['PO No', 'Date', 'Supplier', 'Product', 'Brand', 'Qty', 'Unit Cost', 'Line Total'],
      tableData: auditedPurchaseLineItems.map((l) => [
        l.poId, formatDate(l.date), l.supplierName, l.productName, l.brand || '-',
        String(l.quantity), l.costPrice.toLocaleString(), l.totalCost.toLocaleString()
      ])
    },
    {
      heading: '5. Tax Business Expenses',
      tableHeaders: ['Title', 'Category', 'Date', 'Branch', 'Amount (BDT)'],
      tableData: auditedExpensesList.map((e) => [
        e.title, e.category, e.date, branchLabel(e.business), e.amount.toLocaleString()
      ])
    }
  ];

  const handleExportTaxPDF = () => {
    generateBrandedReportPDF({
      title: 'Tax Filing & Compliance Audit Report',
      subtitle: `Scope: ${scopeName}`,
      businessScope,
      dateFilterText: getDateFilterLabel(),
      generatedBy: currentUser.name,
      settings,
      summaryMetrics: [
        { label: 'Audited Revenue', value: `BDT ${auditRevenue.toLocaleString()}` },
        { label: 'Audited COGS', value: `BDT ${auditCOGS.toLocaleString()}` },
        { label: 'Audited Gross Profit', value: `BDT ${auditGrossProfit.toLocaleString()}` },
        { label: 'Taxable Net Income', value: `BDT ${Math.round(auditNetProfit).toLocaleString()}` }
      ],
      sections: buildAuditSections(),
      fileName: `Amanot_Tax_Compliance_${businessScope}_${todayStr}.pdf`
    });
  };

  // Print ALL five audit filters (not just the active tab) via a hidden iframe.
  const handlePrintAll = () => {
    const esc = (v: unknown) =>
      String(v ?? '').replace(/[&<>]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c]));
    const sections = buildAuditSections();
    const sectionsHtml = sections
      .map(
        (sec) => `
        <h2>${esc(sec.heading)}</h2>
        <table>
          <thead><tr>${sec.tableHeaders.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${
            sec.tableData.length
              ? sec.tableData.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
              : `<tr><td class="empty" colspan="${sec.tableHeaders.length}">No records in the selected audit period / scope.</td></tr>`
          }</tbody>
        </table>`
      )
      .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tax Filing & Compliance Audit Report</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:24px}
        .head{border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:14px}
        .head h1{margin:0;font-size:17px}
        .head p{margin:2px 0;font-size:11px;color:#475569}
        h2{font-size:12px;background:#1e293b;color:#fff;padding:6px 8px;border-radius:4px;margin:18px 0 6px;page-break-after:avoid}
        table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10px}
        th,td{border:1px solid #e2e8f0;padding:4px 6px;text-align:left}
        th{background:#f1f5f9;font-weight:bold}
        tr:nth-child(even) td{background:#f8fafc}
        td.empty{color:#94a3b8;font-style:italic;text-align:center}
        tr{page-break-inside:avoid}
        @media print{@page{margin:12mm}}
      </style></head>
      <body>
        <div class="head">
          <h1>AMANOT GROUP — Tax Filing & Compliance Audit Report</h1>
          <p>Scope: ${esc(scopeName)} &nbsp;|&nbsp; Period: ${esc(getDateFilterLabel())}</p>
          <p>Generated by: ${esc(currentUser.name)} &nbsp;|&nbsp; ${esc(new Date().toLocaleString('en-GB'))}</p>
        </div>
        ${sectionsHtml}
      </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow?.document;
    if (!idoc) {
      document.body.removeChild(iframe);
      return;
    }
    idoc.open();
    idoc.write(html);
    idoc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1000);
      }
    }, 300);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner — title + business scope selector (top right) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
              Tax Purpose Audit Engine
            </span>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              Configured by Super Admin
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-indigo-600" />
            Tax Filing & Compliance Audit Reports
          </h1>
        </div>

        {/* Super Admin Settings + Business Scope Selector (top right) */}
        <div className="flex items-center gap-2 shrink-0">
          {isSuperAdmin && (
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Super Admin Settings
            </button>
          )}
          <div className="flex items-center bg-slate-900 text-white p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setBusinessScope('all')}
              className={`px-3 py-1.5 rounded-lg transition ${businessScope === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
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
      </div>

      {/* Overview KPI Cards (above the date filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Tax Sales</p>
          <p className="text-xl font-black text-slate-900 font-mono mt-1">৳{auditRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">{auditedSalesList.length} Invoices</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Cost of Sales</p>
          <p className="text-xl font-black text-slate-700 font-mono mt-1">৳{auditCOGS.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Purchases</p>
          <p className="text-xl font-black text-emerald-700 font-mono mt-1">৳{auditPurchasesTotal.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">{auditedPurchaseOrdersList.length} POs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Expenses</p>
          <p className="text-xl font-black text-rose-600 font-mono mt-1">৳{auditExpensesTotal.toLocaleString()}</p>
        </div>

        <div className="bg-indigo-950 text-white p-4 rounded-2xl shadow-md border border-indigo-900">
          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Taxable Net Profit</p>
          <p className="text-xl font-black text-emerald-400 font-mono mt-1">৳{Math.round(auditNetProfit).toLocaleString()}</p>
        </div>
      </div>

      {/* Controls row: Audit period + Report selector dropdown + Export/Print (same row) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: audit period */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Audit Period:
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
                dateMode === d.id ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Right: report selector dropdown + export PDF + print (aligned in same row) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-white/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={auditTab}
              onChange={(e) => setAuditTab(e.target.value as any)}
              className="appearance-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl pl-9 pr-9 py-2.5 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 transition min-w-[220px]"
            >
              {[
                { id: 'profit_loss', label: '1. Tax Profit & Loss Statement' },
                { id: 'sales', label: '2. Tax Sales Invoices Audit' },
                { id: 'product_sales', label: '3. Product-Wise Tax Sales' },
                { id: 'purchases', label: '4. Tax Purchase & Procurement' },
                { id: 'expenses', label: '5. Tax Business Expenses' },
                { id: 'statement', label: '6. Consolidated Statement (All-in-One)' }
              ].map((tab) => (
                <option key={tab.id} value={tab.id} className="bg-white text-slate-800 font-semibold">
                  {tab.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-white absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleExportTaxPDF}
            className="px-3.5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition shrink-0"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>

          <button
            onClick={handlePrintAll}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition shrink-0"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Custom date range (shown below the controls when active) */}
      {dateMode === 'custom' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-xl border border-indigo-200 w-max">
            <div>
              <span className="text-[10px] font-bold text-indigo-900 block">From Date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="p-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
              />
            </div>
            <span className="text-xs font-bold text-indigo-600 self-end pb-1.5">to</span>
            <div>
              <span className="text-[10px] font-bold text-indigo-900 block">To Date</span>
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

      {/* Active Audit Rules (context for the numbers below) */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-slate-200">Active Audit Rules:</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <div>
            Sales Ratio: <strong className="text-indigo-300">{auditConfig.salesPercentageToInclude ?? 50}%</strong> (Max {auditConfig.maxSalesCountToInclude ?? 20} sales)
          </div>
          <div>
            Categories: <strong className="text-purple-300">{auditConfig.allowedCategories?.join(', ') || 'All'}</strong>
          </div>
          <div>
            Purchase Ratio: <strong className="text-emerald-300">{auditConfig.purchasePercentageToInclude ?? 50}%</strong>
          </div>
          <div>
            Expense Cap: <strong className="text-rose-300">৳{(auditConfig.maxMonthlyExpenseCap ?? 100000).toLocaleString()}</strong>
          </div>
          <div>
            Profit Multiplier: <strong className="text-amber-300">{((auditConfig.profitMarginMultiplier ?? 0.8) * 100).toFixed(0)}%</strong>
          </div>
        </div>
      </div>

      {/* 1. TAX PROFIT & LOSS STATEMENT */}
      {auditTab === 'profit_loss' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Income Statement for Tax Compliance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official statement compiled under Super Admin audit rules for tax filing.
              </p>
            </div>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>1. REPORTED GROSS SALES REVENUE</span>
                <span>৳{auditRevenue.toLocaleString()}</span>
              </div>
              <p className="text-[11px] font-sans text-slate-500 pl-4">
                Derived from {auditedSalesList.length} reported sale invoices across selected allowed categories ({auditConfig.allowedCategories?.join(', ') || 'All'}).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>2. REPORTED COST OF GOODS SOLD (COGS)</span>
                <span>-৳{auditCOGS.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black text-indigo-900 bg-indigo-50 p-3 rounded-lg border border-indigo-200 text-sm mt-1">
                <span>REPORTED GROSS PROFIT (WITH MULTIPLIER)</span>
                <span>৳{Math.round(auditGrossProfit).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>3. REPORTED OPERATING EXPENSES</span>
                <span className="text-rose-600">-৳{auditExpensesTotal.toLocaleString()}</span>
              </div>
              <p className="text-[11px] font-sans text-slate-500 pl-4">
                Capped at maximum monthly allowance of ৳{(auditConfig.maxMonthlyExpenseCap ?? 100000).toLocaleString()}.
              </p>
            </div>

            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-lg flex justify-between items-center text-base font-bold">
              <div>
                <span>REPORTED TAXABLE NET OPERATING PROFIT</span>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">Final taxable net profit figure for tax report generation.</p>
              </div>
              <span className="text-2xl font-black font-mono text-emerald-400">
                ৳{Math.round(auditNetProfit).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAX SALES INVOICES AUDIT */}
      {auditTab === 'sales' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                Reported Sales Invoices List ({auditedSalesList.length} Invoices)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sales invoices selected under tax reporting rules.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tax invoice #, customer..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-64 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Invoice # & Date</th>
                  <th className="p-3">Customer Profile</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3 text-right">Reported Total</th>
                  <th className="p-3 text-right">Reported Paid</th>
                  <th className="p-3 text-right">Reported Cost</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {auditedSalesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 font-sans text-xs">
                      No sales invoices matched tax audit rules.
                    </td>
                  </tr>
                ) : (
                  auditedSalesList.map((s) => {
                    const isExpanded = expandedSaleId === s.id;
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => setExpandedSaleId(isExpanded ? null : s.id)}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="p-3 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="p-3 font-sans">
                            <span className="font-bold font-mono text-indigo-700 block">{s.id}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{s.createdAt}</span>
                          </td>
                          <td className="p-3 font-sans">
                            <div className="font-bold text-slate-900">{s.customerName}</div>
                            <div className="text-[10px] text-slate-500">{s.customerPhone}</div>
                          </td>
                          <td className="p-3 font-sans">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {s.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">৳{s.grandTotal.toLocaleString()}</td>
                          <td className="p-3 text-right text-emerald-700 font-bold">৳{s.paidAmount.toLocaleString()}</td>
                          <td className="p-3 text-right text-slate-600">৳{s.totalCost.toLocaleString()}</td>
                          <td className="p-3 text-center font-sans">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                              {s.paymentStatus}
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-indigo-50/50 font-sans">
                            <td colSpan={8} className="p-4 border-t border-b border-indigo-200">
                              <div className="space-y-2">
                                <h4 className="text-xs font-bold text-indigo-900 uppercase">
                                  Items Included in Invoice {s.id}:
                                </h4>
                                <table className="w-full text-left text-[11px] bg-white border border-slate-200 rounded-lg">
                                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                                    <tr>
                                      <th className="p-2">Item Name</th>
                                      <th className="p-2">Brand</th>
                                      <th className="p-2">Category</th>
                                      <th className="p-2 text-center">Qty</th>
                                      <th className="p-2 text-right">Unit Price</th>
                                      <th className="p-2 text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y font-mono">
                                    {s.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td className="p-2 font-sans font-bold text-slate-900">{item.productName}</td>
                                        <td className="p-2 font-sans text-slate-600">{item.brand}</td>
                                        <td className="p-2 font-sans text-slate-500">{item.category || 'General'}</td>
                                        <td className="p-2 text-center font-bold">{item.quantity}</td>
                                        <td className="p-2 text-right">৳{item.unitPrice.toLocaleString()}</td>
                                        <td className="p-2 text-right font-bold text-slate-900">৳{item.total.toLocaleString()}</td>
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PRODUCT-WISE TAX SALES & PROFIT AUDIT */}
      {auditTab === 'product_sales' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Product-Wise Tax Sales & Profit Showing
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shows product category-wise items (e.g., TVs, ACs, Refrigerators) included for tax filing.
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
                  <th className="p-3 text-center">Reported Units Sold</th>
                  <th className="p-3 text-right">Reported Revenue</th>
                  <th className="p-3 text-right">Reported COGS</th>
                  <th className="p-3 text-right">Reported Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditedProductSalesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 font-sans text-xs">
                      No products matched selected categories.
                    </td>
                  </tr>
                ) : (
                  auditedProductSalesList.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-sans font-bold text-slate-900">{p.name}</td>
                      <td className="p-3 font-sans">
                        <div>{p.brand}</div>
                        <div className="text-[10px] text-slate-400">{p.category}</div>
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px]">
                          {p.stockQty} pcs
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-indigo-700">{p.qtySold}</td>
                      <td className="p-3 text-right font-bold text-slate-900">৳{p.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-600">৳{p.cogs.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-emerald-600">৳{p.netProfit.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAX PURCHASE & PROCUREMENT SHOWINGS */}
      {auditTab === 'purchases' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Reported Purchase Orders Audit ({auditedPurchaseOrdersList.length} POs)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Procurement purchase orders reported under tax ratio rules.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search PO #, supplier..."
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-64 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3">PO # & Date</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3 text-center">Items Count</th>
                  <th className="p-3 text-right">Reported Total Cost</th>
                  <th className="p-3 text-right">Reported Paid Amount</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditedPurchaseOrdersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500 font-sans text-xs">
                      No purchase orders matched tax ratio rules.
                    </td>
                  </tr>
                ) : (
                  auditedPurchaseOrdersList.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-sans">
                        <span className="font-bold font-mono text-indigo-700 block">{po.id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{po.createdAt}</span>
                      </td>
                      <td className="p-3 font-sans font-bold text-slate-900">{po.supplierName}</td>
                      <td className="p-3 text-center font-bold">
                        {po.items.reduce((sum, i) => sum + i.quantity, 0)} pcs
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">৳{po.totalCost.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">৳{po.paidAmount.toLocaleString()}</td>
                      <td className="p-3 text-center font-sans">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                          {po.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Full purchased-product breakdown across every audited PO */}
          <div className="space-y-2 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t pt-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                Purchased Product Details ({auditedPurchaseLineItems.length} lines · {auditedPurchaseUnits} pcs)
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                Every product on every reported PO
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
                  {auditedPurchaseLineItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500 text-xs">
                        No purchased products matched the audit filters.
                      </td>
                    </tr>
                  ) : (
                    auditedPurchaseLineItems.map((l) => (
                      <tr key={l.key} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-indigo-700 whitespace-nowrap">{l.poId}</td>
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
                    <td className="p-3 text-center font-mono">{auditedPurchaseUnits} pcs</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right font-mono font-black">
                      ৳{auditedPurchaseLineItems.reduce((s, l) => s + l.totalCost, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONSOLIDATED BANK-STYLE STATEMENT (audited figures) */}
      {auditTab === 'statement' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <UnifiedStatementView
            sales={auditedSalesList}
            purchaseOrders={auditedPurchaseOrdersList}
            expenses={auditedExpensesList}
            customerReturns={auditedReturnsList}
            profitMarginMultiplier={auditConfig.profitMarginMultiplier ?? 0.8}
            periodLabel={getDateFilterLabel()}
            adjustedNote={`Reported figures only — gross profit scaled by ${auditConfig.profitMarginMultiplier ?? 0.8}x per audit config.`}
            accent="indigo"
          />
        </div>
      )}

      {/* 5. TAX BUSINESS EXPENSE AUDIT */}
      {auditTab === 'expenses' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                Reported Business Expense Vouchers ({auditedExpensesList.length} Vouchers)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Capped at max monthly cap of ৳{(auditConfig.maxMonthlyExpenseCap ?? 100000).toLocaleString()}.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search expense title, category..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-64 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3">Voucher # & Date</th>
                  <th className="p-3">Expense Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3 text-right">Reported Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditedExpensesList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500 font-sans text-xs">
                      No expense vouchers present.
                    </td>
                  </tr>
                ) : (
                  auditedExpensesList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-sans">
                        <span className="font-bold font-mono text-indigo-700 block">{e.voucherNo || e.id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{e.date}</span>
                      </td>
                      <td className="p-3 font-sans font-bold text-slate-900">{e.title}</td>
                      <td className="p-3 font-sans">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                          {e.category}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-slate-600">{e.vendorName || '-'}</td>
                      <td className="p-3 text-right font-black text-rose-600">৳{e.amount.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {isConfigModalOpen && (
        <AuditConfigModal onClose={() => setIsConfigModalOpen(false)} />
      )}

    </div>
  );
};
