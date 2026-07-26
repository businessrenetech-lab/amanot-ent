import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, SaleInvoice, InstallmentPlan, SMSLog, Quotation, CustomerReturn } from '../../types';
import { getCompatiblePaymentAccounts } from '../../utils/paymentAccounts';
import {
  Users,
  Search,
  FileSpreadsheet,
  Send,
  Edit3,
  Phone,
  MapPin,
  Tag,
  Globe,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  DollarSign,
  X,
  MessageSquare,
  Layers,
  ArrowLeft,
  Printer,
  FileText,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Download,
  Mail,
  UserCheck,
  Receipt,
  Plus,
  RefreshCw,
  PieChart
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateBrandedReportPDF } from '../../utils/reportPdfGenerator';
import { BrandedReceiptModal } from '../receipt/BrandedReceiptModal';

interface Props {
  customer: Customer;
  onClose: () => void;
  onEditCustomer?: (customer: Customer) => void;
}

export const CustomerDetailDashboard: React.FC<Props> = ({ customer, onClose, onEditCustomer }) => {
  const {
    sales,
    installmentPlans,
    smsLogs,
    quotations,
    customerReturns,
    sendSMS,
    payInvoiceDue,
    processInstallmentPayment,
    accounts,
    settings,
    activeBusiness
  } = useApp();

  // Active Main Tab inside Customer Dashboard
  const [activeTab, setActiveTab] = useState<
    'journey' | 'purchases' | 'installments' | 'marketing' | 'ledger' | 'reports'
  >('journey');

  // Modal States
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<SaleInvoice | null>(null);
  const [payDueModalInvoice, setPayDueModalInvoice] = useState<SaleInvoice | null>(null);
  const [payDueAmount, setPayDueAmount] = useState<number>(0);
  const [payDueMethod, setPayDueMethod] = useState<'cash' | 'bkash' | 'nagad' | 'card' | 'bank_transfer'>('cash');
  const [payDueAccountId, setPayDueAccountId] = useState<string>('');

  // Installment Payment Modal State
  const [payEmiModalPlan, setPayEmiModalPlan] = useState<{ plan: InstallmentPlan; itemNo: number; dueAmount: number } | null>(null);
  const [payEmiAmount, setPayEmiAmount] = useState<number>(0);
  const [payEmiMethod, setPayEmiMethod] = useState<'cash' | 'bkash_nagad' | 'card' | 'bank_transfer'>('cash');
  const [payEmiAccountId, setPayEmiAccountId] = useState<string>('');

  // Accounts the invoice's business may bank this due into (its own first, then shared)
  const dueCollectionAccounts = useMemo(() => {
    if (!payDueModalInvoice) return [];
    return getCompatiblePaymentAccounts(accounts, payDueMethod, payDueModalInvoice.business);
  }, [accounts, payDueMethod, payDueModalInvoice]);

  useEffect(() => {
    if (!dueCollectionAccounts.some((a) => a.id === payDueAccountId)) {
      setPayDueAccountId(dueCollectionAccounts[0]?.id || '');
    }
  }, [dueCollectionAccounts, payDueAccountId]);

  // Accounts the plan's business may bank this EMI into (its own first, then shared)
  const emiCollectionAccounts = useMemo(() => {
    if (!payEmiModalPlan) return [];
    return getCompatiblePaymentAccounts(accounts, payEmiMethod, payEmiModalPlan.plan.business);
  }, [accounts, payEmiMethod, payEmiModalPlan]);

  useEffect(() => {
    if (!emiCollectionAccounts.some((a) => a.id === payEmiAccountId)) {
      setPayEmiAccountId(emiCollectionAccounts[0]?.id || '');
    }
  }, [emiCollectionAccounts, payEmiAccountId]);

  // Quick SMS State
  const [quickSmsMessage, setQuickSmsMessage] = useState('');
  const [quickSmsCategory, setQuickSmsCategory] = useState<SMSLog['type']>('marketing_campaign');

  // Report Generator Options State
  const [reportType, setReportType] = useState<
    'comprehensive' | 'ledger' | 'purchases' | 'installments' | 'marketing'
  >('comprehensive');
  const [reportDateScope, setReportDateScope] = useState<'all' | '30days' | '90days' | 'year'>('all');

  // Expanded Invoice Cards state
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Filters
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'invoices' | 'installments' | 'marketing' | 'payments'>('all');

  // --------------------------------------------------------------------------
  // DERIVED DATA FOR THIS SPECIFIC CUSTOMER
  // --------------------------------------------------------------------------
  const customerPhone = useMemo(() => customer.phone.replace(/[^0-9]/g, ''), [customer.phone]);

  const customerInvoices = useMemo(() => {
    return sales.filter(
      (s) =>
        s.customerId === customer.id ||
        (s.customerPhone && s.customerPhone.replace(/[^0-9]/g, '') === customerPhone)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, customer.id, customerPhone]);

  const customerInstallments = useMemo(() => {
    return installmentPlans.filter(
      (p) =>
        p.customerId === customer.id ||
        (p.customerPhone && p.customerPhone.replace(/[^0-9]/g, '') === customerPhone)
    );
  }, [installmentPlans, customer.id, customerPhone]);

  const customerSmsLogs = useMemo(() => {
    return smsLogs.filter(
      (l) => l.recipientPhone.replace(/[^0-9]/g, '') === customerPhone
    ).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [smsLogs, customerPhone]);

  const customerQuotations = useMemo(() => {
    return quotations.filter(
      (q) => q.customerPhone.replace(/[^0-9]/g, '') === customerPhone
    );
  }, [quotations, customerPhone]);

  const customerReturnsList = useMemo(() => {
    return customerReturns.filter(
      (r) => r.customerId === customer.id || r.customerPhone.replace(/[^0-9]/g, '') === customerPhone
    );
  }, [customerReturns, customer.id, customerPhone]);

  // Financial Aggregates
  const totalSpent = useMemo(() => {
    return customerInvoices.reduce((sum, inv) => sum + (inv.isDraft ? 0 : inv.grandTotal), 0);
  }, [customerInvoices]);

  const totalPaidInvoices = useMemo(() => {
    return customerInvoices.reduce((sum, inv) => sum + (inv.isDraft ? 0 : inv.paidAmount), 0);
  }, [customerInvoices]);

  const totalDuesInvoices = useMemo(() => {
    return customerInvoices.reduce((sum, inv) => sum + (inv.isDraft ? 0 : inv.dueAmount), 0);
  }, [customerInvoices]);

  // Total Installment Financed & Paid
  const installmentMetrics = useMemo(() => {
    let totalFinanced = 0;
    let totalEmiPaid = 0;
    let totalEmiDue = 0;
    let activePlansCount = 0;
    let nextDueDate: string | null = null;

    customerInstallments.forEach((plan) => {
      if (plan.status === 'active') activePlansCount++;
      totalFinanced += plan.financedAmount;

      plan.schedule.forEach((sch) => {
        if (sch.status === 'paid') {
          totalEmiPaid += sch.paidAmount || sch.amount;
        } else {
          totalEmiDue += sch.amount - (sch.paidAmount || 0);
          if (!nextDueDate && sch.dueDate) {
            nextDueDate = sch.dueDate;
          }
        }
      });
    });

    return { totalFinanced, totalEmiPaid, totalEmiDue, activePlansCount, nextDueDate };
  }, [customerInstallments]);

  // Itemized Purchased Products Summary
  const purchasedProducts = useMemo(() => {
    const map = new Map<
      string,
      { productId: string; name: string; brand: string; category: string; quantity: number; totalSpent: number; lastDate: string }
    >();

    customerInvoices.forEach((inv) => {
      if (inv.isDraft) return;
      inv.items.forEach((item) => {
        const key = item.productId || item.productName;
        const existing = map.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalSpent += item.total;
          if (new Date(inv.createdAt) > new Date(existing.lastDate)) {
            existing.lastDate = inv.createdAt;
          }
        } else {
          map.set(key, {
            productId: item.productId,
            name: item.productName,
            brand: item.brand || 'Generic',
            category: item.category || 'General',
            quantity: item.quantity,
            totalSpent: item.total,
            lastDate: inv.createdAt
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customerInvoices]);

  // --------------------------------------------------------------------------
  // COMBINED CHRONOLOGICAL CUSTOMER JOURNEY TIMELINE EVENTS
  // --------------------------------------------------------------------------
  interface JourneyEvent {
    id: string;
    date: string;
    type: 'onboarding' | 'quotation' | 'invoice' | 'emi_plan' | 'emi_payment' | 'sms' | 'due_payment' | 'return';
    title: string;
    subtitle: string;
    amount?: number;
    badgeText: string;
    badgeColor: string;
    details?: any;
    icon: any;
  }

  const journeyTimeline = useMemo(() => {
    const events: JourneyEvent[] = [];

    // 1. Onboarding Event
    events.push({
      id: `onboarding-${customer.id}`,
      date: customer.createdAt || 'Initial Onboarding',
      type: 'onboarding',
      title: 'Customer Joined / Profile Created',
      subtitle: `Registered under ${customer.group || 'General'} Group (${customer.customerType.toUpperCase()})`,
      badgeText: 'PROFILE CREATED',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Users
    });

    // 2. Quotations
    customerQuotations.forEach((q) => {
      events.push({
        id: `qte-${q.id}`,
        date: q.createdAt,
        type: 'quotation',
        title: `Quotation Issued #${q.id}`,
        subtitle: `Items: ${q.items.map((i) => i.productName).join(', ')}`,
        amount: q.totalAmount,
        badgeText: `QUOTE ${q.status.toUpperCase()}`,
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        details: q,
        icon: FileText
      });
    });

    // 3. Invoices
    customerInvoices.forEach((inv) => {
      events.push({
        id: `inv-${inv.id}`,
        date: inv.createdAt,
        type: 'invoice',
        title: `Sales Invoice Created #${inv.id}`,
        subtitle: `${inv.items.length} Product(s): ${inv.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}`,
        amount: inv.grandTotal,
        badgeText: inv.isDraft ? 'DRAFT SALE' : inv.paymentStatus.toUpperCase(),
        badgeColor:
          inv.paymentStatus === 'paid'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : inv.paymentStatus === 'partial'
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : 'bg-rose-100 text-rose-800 border-rose-200',
        details: inv,
        icon: ShoppingBag
      });
    });

    // 4. Installment Plans & Payments
    customerInstallments.forEach((plan) => {
      events.push({
        id: `plan-${plan.id}`,
        date: plan.createdAt,
        type: 'emi_plan',
        title: `Installment EMI Plan Agreement Signed #${plan.id}`,
        subtitle: `Financed Amount: ৳${plan.financedAmount.toLocaleString()} (${plan.totalInstallments} Monthly EMIs @ ৳${plan.monthlyEmi.toLocaleString()}/mo)`,
        amount: plan.financedAmount,
        badgeText: `EMI ${plan.status.toUpperCase()}`,
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        details: plan,
        icon: CreditCard
      });

      plan.schedule.forEach((sch) => {
        if (sch.status === 'paid' && sch.paidDate) {
          events.push({
            id: `sch-${plan.id}-${sch.installmentNo}`,
            date: sch.paidDate,
            type: 'emi_payment',
            title: `EMI Payment Received (Month #${sch.installmentNo})`,
            subtitle: `Paid via ${(sch.paymentMode || 'cash').toUpperCase()} • Plan #${plan.id}`,
            amount: sch.paidAmount || sch.amount,
            badgeText: 'EMI PAID',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            details: sch,
            icon: CheckCircle2
          });
        }
      });
    });

    // 5. SMS Communications
    customerSmsLogs.forEach((sms) => {
      events.push({
        id: `sms-${sms.id}`,
        date: sms.sentAt,
        type: 'sms',
        title: `SMS Gateway Dispatched (${sms.type.replace('_', ' ').toUpperCase()})`,
        subtitle: sms.message,
        badgeText: 'SMS SENT',
        badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
        details: sms,
        icon: MessageSquare
      });
    });

    // 6. Returns
    customerReturnsList.forEach((ret) => {
      events.push({
        id: `ret-${ret.id}`,
        date: ret.createdAt,
        type: 'return',
        title: `Product Return Processed #${ret.id}`,
        subtitle: `Reason: ${ret.reason} • Refund: ৳${ret.totalRefundAmount.toLocaleString()}`,
        amount: ret.totalRefundAmount,
        badgeText: 'RETURN REFUND',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
        details: ret,
        icon: RefreshCw
      });
    });

    // Sort chronologically (newest first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    customer,
    customerQuotations,
    customerInvoices,
    customerInstallments,
    customerSmsLogs,
    customerReturnsList
  ]);

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'all') return journeyTimeline;
    if (timelineFilter === 'invoices') return journeyTimeline.filter((e) => e.type === 'invoice');
    if (timelineFilter === 'installments') return journeyTimeline.filter((e) => e.type === 'emi_plan' || e.type === 'emi_payment');
    if (timelineFilter === 'marketing') return journeyTimeline.filter((e) => e.type === 'sms');
    if (timelineFilter === 'payments') return journeyTimeline.filter((e) => e.type === 'emi_payment' || e.type === 'due_payment');
    return journeyTimeline;
  }, [journeyTimeline, timelineFilter]);

  // --------------------------------------------------------------------------
  // ACTIONS & HANDLERS
  // --------------------------------------------------------------------------
  const handleQuickSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSmsMessage.trim()) return;

    sendSMS(customer.phone, customer.name, quickSmsMessage.trim(), quickSmsCategory, activeBusiness === 'all' ? 'amanot_electronics' : activeBusiness);
    alert(`SMS successfully dispatched to ${customer.name} (${customer.phone})!`);
    setQuickSmsMessage('');
  };

  const handleOpenPayDueModal = (inv: SaleInvoice) => {
    setPayDueModalInvoice(inv);
    setPayDueAmount(inv.dueAmount);
    setPayDueMethod('cash');
  };

  const handleConfirmPayDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDueModalInvoice || payDueAmount <= 0) return;

    payInvoiceDue(payDueModalInvoice.id, payDueAmount, payDueMethod, payDueAccountId);
    setPayDueModalInvoice(null);
  };

  const handleConfirmPayEmi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmiModalPlan || payEmiAmount <= 0) return;

    const { plan, itemNo } = payEmiModalPlan;

    // Construct updated schedule
    const updatedSchedule = plan.schedule.map((sch) => {
      if (sch.installmentNo === itemNo) {
        const newPaid = (sch.paidAmount || 0) + payEmiAmount;
        const isFullyPaid = newPaid >= sch.amount;
        return {
          ...sch,
          status: isFullyPaid ? ('paid' as const) : ('partial' as const),
          paidAmount: newPaid,
          paidDate: new Date().toISOString().slice(0, 10),
          paymentMode: payEmiMethod
        };
      }
      return sch;
    });

    processInstallmentPayment(plan.id, itemNo, payEmiAmount, updatedSchedule, {
      accountId: payEmiAccountId,
      paymentMode: payEmiMethod
    });
    setPayEmiModalPlan(null);
  };

  // Export Customer Report to PDF / Excel / Print
  const handleGenerateReportPDF = () => {
    const summaryMetrics = [
      { label: 'Total Purchases', value: `BDT ${totalSpent.toLocaleString()}` },
      { label: 'Total Invoices', value: `${customerInvoices.length} Orders` },
      { label: 'Current Outstanding Due', value: `BDT ${customer.currentDue.toLocaleString()}` },
      { label: 'Installments Financed', value: `BDT ${installmentMetrics.totalFinanced.toLocaleString()}` }
    ];

    if (reportType === 'ledger' || reportType === 'comprehensive') {
      const ledgerHeaders = ['Date', 'Type & Ref ID', 'Description / Items', 'Debit (Billed)', 'Credit (Paid)', 'Balance Due'];
      let runningDue = 0;

      const ledgerRows = customerInvoices.map((inv) => {
        runningDue += inv.dueAmount;
        return [
          inv.createdAt.slice(0, 10),
          `Sale Inv #${inv.id}`,
          inv.items.map((i) => i.productName).join(', '),
          `BDT ${inv.grandTotal.toLocaleString()}`,
          `BDT ${inv.paidAmount.toLocaleString()}`,
          `BDT ${inv.dueAmount.toLocaleString()}`
        ];
      });

      generateBrandedReportPDF({
        title: `CUSTOMER FINANCIAL STATEMENT & LEDGER - ${customer.name}`,
        subtitle: `Phone: ${customer.phone} | Group: ${customer.group || 'General'}`,
        businessScope: activeBusiness,
        dateFilterText: 'All Lifetime Records',
        generatedBy: 'CRM Customer Dashboard',
        settings,
        summaryMetrics,
        sections: [
          {
            heading: 'Account Ledger Statement',
            tableHeaders: ledgerHeaders,
            tableData: ledgerRows
          }
        ],
        fileName: `Customer_Statement_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      });
    } else if (reportType === 'purchases') {
      const headers = ['Invoice ID', 'Date', 'Business', 'Items Purchased', 'Grand Total', 'Paid', 'Due Status'];
      const rows = customerInvoices.map((inv) => [
        inv.id,
        inv.createdAt.slice(0, 10),
        inv.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise',
        inv.items.map((i) => `${i.quantity}x ${i.productName} (${i.brand})`).join('\n'),
        `BDT ${inv.grandTotal.toLocaleString()}`,
        `BDT ${inv.paidAmount.toLocaleString()}`,
        inv.paymentStatus.toUpperCase()
      ]);

      generateBrandedReportPDF({
        title: `CUSTOMER PURCHASE HISTORY REPORT - ${customer.name}`,
        subtitle: `Phone: ${customer.phone}`,
        businessScope: activeBusiness,
        dateFilterText: 'All Purchased Invoices',
        generatedBy: 'CRM Customer Dashboard',
        settings,
        summaryMetrics,
        tableHeaders: headers,
        tableData: rows,
        fileName: `Purchase_Report_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      });
    } else if (reportType === 'installments') {
      const headers = ['Plan ID', 'Installment #', 'Due Date', 'Amount', 'Status', 'Paid Date', 'Payment Method'];
      const rows: (string | number)[][] = [];

      customerInstallments.forEach((plan) => {
        plan.schedule.forEach((sch) => {
          rows.push([
            plan.id,
            `Month #${sch.installmentNo}`,
            sch.dueDate,
            `BDT ${sch.amount.toLocaleString()}`,
            sch.status.toUpperCase(),
            sch.paidDate || '-',
            (sch.paymentMode || '-').toUpperCase()
          ]);
        });
      });

      generateBrandedReportPDF({
        title: `INSTALLMENT EMI SCHEDULE REPORT - ${customer.name}`,
        subtitle: `Phone: ${customer.phone}`,
        businessScope: activeBusiness,
        dateFilterText: 'All EMI Plans & Schedules',
        generatedBy: 'CRM Customer Dashboard',
        settings,
        summaryMetrics,
        tableHeaders: headers,
        tableData: rows,
        fileName: `EMI_Schedule_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      });
    } else if (reportType === 'marketing') {
      const headers = ['Dispatched Date', 'Phone', 'SMS Category', 'Message Content', 'Status'];
      const rows = customerSmsLogs.map((sms) => [
        sms.sentAt,
        sms.recipientPhone,
        sms.type,
        sms.message,
        sms.status.toUpperCase()
      ]);

      generateBrandedReportPDF({
        title: `CUSTOMER MARKETING & COMMUNICATIONS REPORT - ${customer.name}`,
        subtitle: `Phone: ${customer.phone}`,
        businessScope: activeBusiness,
        dateFilterText: 'All Dispatched SMS Messages',
        generatedBy: 'CRM Customer Dashboard',
        settings,
        summaryMetrics,
        tableHeaders: headers,
        tableData: rows,
        fileName: `Marketing_Report_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      });
    }
  };

  const handleExportExcel = () => {
    const data = customerInvoices.map((inv) => ({
      'Invoice ID': inv.id,
      'Date': inv.createdAt,
      'Business': inv.business,
      'Customer Name': inv.customerName,
      'Customer Phone': inv.customerPhone,
      'Subtotal': inv.subtotal,
      'Discount': inv.discountTotal,
      'Grand Total': inv.grandTotal,
      'Paid Amount': inv.paidAmount,
      'Due Amount': inv.dueAmount,
      'Payment Status': inv.paymentStatus,
      'Items Summary': inv.items.map((i) => `${i.quantity}x ${i.productName}`).join('; ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Transactions');
    XLSX.writeFile(wb, `Customer_Report_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  const handleWindowPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* -------------------------------------------------------------------- */}
      {/* TOP DASHBOARD NAVIGATION & HEADER BAR */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-2xl transition active:scale-95 flex items-center justify-center"
              title="Back to Contacts Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-white">{customer.name}</h1>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
                    customer.group === 'VIP Club'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : customer.group === 'Wholesale Buyers'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : customer.group === 'Installment EMI Clients'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {customer.group || 'General'}
                </span>
                <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border border-slate-700">
                  {customer.customerType}
                </span>
              </div>

              <div className="flex items-center gap-4 text-slate-400 text-xs mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-mono text-amber-400 font-bold">
                  <Phone className="w-3.5 h-3.5 text-amber-400" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {customer.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {customer.address || 'Dhaka'}
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" /> Joined: {customer.createdAt ? customer.createdAt.slice(0, 10) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onEditCustomer && (
              <button
                onClick={() => onEditCustomer(customer)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit Profile
              </button>
            )}

            <button
              onClick={() => setActiveTab('marketing')}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
            >
              <Send className="w-3.5 h-3.5" /> Send SMS
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" /> Statement / Report
            </button>

            <button
              onClick={handleWindowPrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Print Page"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* KPI DASHBOARD CARDS OVERVIEW */}
        {/* -------------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Lifetime Purchases */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Lifetime Purchases</span>
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-lg font-black text-white font-mono">৳{totalSpent.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-medium">{customerInvoices.length} Sale Invoices</p>
          </div>

          {/* 2. Outstanding Dues */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Current Outstanding Due</span>
              <AlertCircle className={`w-4 h-4 ${customer.currentDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
            </div>
            <p className={`text-lg font-black font-mono ${customer.currentDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ৳{customer.currentDue.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {customer.currentDue > 0 ? 'Action Required' : 'Account Clear'}
            </p>
          </div>

          {/* 3. Invoices Status */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Total Paid Amount</span>
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-lg font-black text-sky-300 font-mono">৳{totalPaidInvoices.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-medium">Clear Receipts Collected</p>
          </div>

          {/* 4. Installments Journey */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>EMI Financed Value</span>
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-lg font-black text-purple-300 font-mono">
              ৳{installmentMetrics.totalFinanced.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {installmentMetrics.activePlansCount} Active EMI Plans
            </p>
          </div>

          {/* 5. Marketing Touches */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Marketing SMS Sent</span>
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-lg font-black text-amber-300 font-mono">{customerSmsLogs.length}</p>
            <p className="text-[10px] text-slate-400 font-medium">Dispatches Tracked</p>
          </div>

          {/* 6. Products Purchased */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Unique Items Bought</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-lg font-black text-indigo-300 font-mono">{purchasedProducts.length}</p>
            <p className="text-[10px] text-slate-400 font-medium">SKU Units Catalogued</p>
          </div>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* DASHBOARD TAB NAVIGATION BAR */}
        {/* -------------------------------------------------------------------- */}
        <div className="flex items-center gap-2 border-t border-slate-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('journey')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'journey'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" /> 1. Customer Journey Timeline ({journeyTimeline.length})
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'purchases'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> 2. Purchases & Invoices ({customerInvoices.length})
          </button>

          <button
            onClick={() => setActiveTab('installments')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'installments'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" /> 3. Installment EMI Journey ({customerInstallments.length})
          </button>

          <button
            onClick={() => setActiveTab('marketing')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'marketing'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> 4. Marketing & SMS Logs ({customerSmsLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" /> 5. Dues & Ledger Statement
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" /> 6. Customer Reports & Export
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1: CUSTOMER JOURNEY TIMELINE */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'journey' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Complete Chronological Customer Journey
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every touchpoint, invoice, EMI payment, marketing campaign, and inquiry logged in sequence.
              </p>
            </div>

            {/* Timeline Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setTimelineFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timelineFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Events ({journeyTimeline.length})
              </button>

              <button
                onClick={() => setTimelineFilter('invoices')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timelineFilter === 'invoices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Invoices ({customerInvoices.length})
              </button>

              <button
                onClick={() => setTimelineFilter('installments')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timelineFilter === 'installments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EMI Events
              </button>

              <button
                onClick={() => setTimelineFilter('marketing')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timelineFilter === 'marketing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SMS Marketing
              </button>
            </div>
          </div>

          {/* Timeline Vertical Stack */}
          {filteredTimeline.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p>No activity timeline records match the selected filter.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {filteredTimeline.map((ev) => {
                const IconComponent = ev.icon;
                return (
                  <div key={ev.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-400 group-hover:border-amber-500 group-hover:bg-amber-50 flex items-center justify-center transition shadow-xs">
                      <IconComponent className="w-3 h-3 text-slate-700 group-hover:text-amber-600" />
                    </div>

                    {/* Timeline Item Box */}
                    <div className="bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-extrabold text-slate-500">{ev.date}</span>

                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${ev.badgeColor}`}>
                          {ev.badgeText}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                          <span>{ev.title}</span>
                          {ev.amount !== undefined && (
                            <span className="font-mono font-black text-slate-900">
                              ৳{ev.amount.toLocaleString()}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{ev.subtitle}</p>
                      </div>

                      {/* Detail specific view button */}
                      {ev.type === 'invoice' && (
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() => setSelectedReceiptInvoice(ev.details)}
                            className="px-3 py-1 bg-slate-900 text-white font-bold rounded-lg text-[11px] flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3" /> View Branded Receipt
                          </button>
                          {ev.details.dueAmount > 0 && (
                            <button
                              onClick={() => handleOpenPayDueModal(ev.details)}
                              className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-[11px] flex items-center gap-1"
                            >
                              <DollarSign className="w-3 h-3" /> Pay Due (৳{ev.details.dueAmount.toLocaleString()})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 2: PURCHASES & INVOICES */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          {/* Purchased Items Catalog Grid */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b pb-3">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Purchased Appliance Summary ({purchasedProducts.length} Product SKUs)
            </h2>

            {purchasedProducts.length === 0 ? (
              <p className="text-xs text-slate-400">No products purchased by this customer yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {purchasedProducts.map((p, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{p.brand} • {p.category}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Last Bought: {p.lastDate.slice(0, 10)}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-100 text-emerald-900 font-black px-2 py-1 rounded-lg text-xs block mb-1">
                        {p.quantity} Units
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        ৳{p.totalSpent.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Customer Invoices Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                All Customer Sales Invoices ({customerInvoices.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice ID</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Outlet Branch</th>
                    <th className="p-3.5">Purchased Items</th>
                    <th className="p-3.5 text-right">Grand Total</th>
                    <th className="p-3.5 text-right">Paid</th>
                    <th className="p-3.5 text-right">Due</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                        No sales invoices recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerInvoices.map((inv) => (
                      <React.Fragment key={inv.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="p-3.5 font-mono font-bold text-blue-700">{inv.id}</td>
                          <td className="p-3.5 font-mono text-slate-600">{inv.createdAt.slice(0, 10)}</td>
                          <td className="p-3.5">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold text-[10px]">
                              {inv.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                            </span>
                          </td>
                          <td className="p-3.5 max-w-xs font-medium text-slate-800 truncate">
                            {inv.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                            ৳{inv.grandTotal.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                            ৳{inv.paidAmount.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                            ৳{inv.dueAmount.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                inv.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.paymentStatus === 'partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {inv.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedReceiptInvoice(inv)}
                                className="px-2.5 py-1 bg-slate-900 text-white font-bold text-[11px] rounded-lg shadow-xs hover:bg-slate-800"
                              >
                                Receipt
                              </button>
                              {inv.dueAmount > 0 && (
                                <button
                                  onClick={() => handleOpenPayDueModal(inv)}
                                  className="px-2.5 py-1 bg-rose-600 text-white font-bold text-[11px] rounded-lg shadow-xs hover:bg-rose-500"
                                >
                                  Pay Due
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id)
                                }
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                                title="Expand Details"
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform ${
                                    expandedInvoiceId === inv.id ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Invoice Details Row */}
                        {expandedInvoiceId === inv.id && (
                          <tr className="bg-slate-50/80 border-b">
                            <td colSpan={9} className="p-4 space-y-3">
                              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                <h4 className="font-extrabold text-xs text-slate-900">
                                  Itemized Line Items Breakup - Invoice #{inv.id}
                                </h4>
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-slate-100 font-bold text-slate-600 border-b">
                                    <tr>
                                      <th className="p-2">Product Name</th>
                                      <th className="p-2">Brand / Model</th>
                                      <th className="p-2 text-center">Qty</th>
                                      <th className="p-2 text-right">Unit Price</th>
                                      <th className="p-2 text-right">Discount</th>
                                      <th className="p-2 text-right">Line Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {inv.items.map((item, iIdx) => (
                                      <tr key={iIdx}>
                                        <td className="p-2 font-bold text-slate-900">{item.productName}</td>
                                        <td className="p-2 text-slate-500">
                                          {item.brand} {item.model ? `(${item.model})` : ''}
                                        </td>
                                        <td className="p-2 text-center font-bold">{item.quantity}</td>
                                        <td className="p-2 text-right font-mono">৳{item.unitPrice.toLocaleString()}</td>
                                        <td className="p-2 text-right font-mono text-rose-600">৳{item.discount.toLocaleString()}</td>
                                        <td className="p-2 text-right font-mono font-bold">৳{item.total.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 3: INSTALLMENT EMI JOURNEY */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'installments' && (
        <div className="space-y-6">
          {customerInstallments.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="font-extrabold text-base text-slate-800">No Installment EMI Plans Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This customer does not have any recorded installment EMI contracts with Amanot Group.
              </p>
            </div>
          ) : (
            customerInstallments.map((plan) => {
              const paidCount = plan.schedule.filter((s) => s.status === 'paid').length;
              const progressPct = Math.round((paidCount / plan.totalInstallments) * 100);

              return (
                <div key={plan.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                  {/* EMI Plan Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-black text-slate-900">EMI Plan #{plan.id}</h2>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                            plan.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {plan.status}
                        </span>
                        <span className="text-xs font-mono text-slate-400">Invoice: #{plan.invoiceId}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Financed Amount: <strong className="text-slate-900 font-mono">৳{plan.financedAmount.toLocaleString()}</strong> • Monthly EMI: <strong className="text-blue-700 font-mono">৳{plan.monthlyEmi.toLocaleString()}</strong>
                      </p>
                    </div>

                    {/* EMI Progress Bar */}
                    <div className="w-full md:w-64 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>EMI Progress ({paidCount}/{plan.totalInstallments} Paid)</span>
                        <span className="font-mono">{progressPct}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* KYC & Guarantor Profile Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" /> Customer KYC Record
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                        <p>Father: <strong className="text-slate-900">{plan.fatherName || 'N/A'}</strong></p>
                        <p>NID/Pass: <strong className="text-slate-900 font-mono">{plan.idNumber || 'N/A'}</strong></p>
                        <p>Profession: <strong className="text-slate-900">{plan.profession || 'N/A'}</strong></p>
                        <p>Emergency: <strong className="text-blue-700 font-mono">{plan.emergencyContactPhone || 'N/A'}</strong></p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-amber-600" /> Guarantor Reference Profile
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                        <p>Guarantor: <strong className="text-slate-900">{plan.guarantorName || 'N/A'}</strong></p>
                        <p>Phone: <strong className="text-blue-700 font-mono">{plan.guarantorPhone || 'N/A'}</strong></p>
                        <p>Relation: <strong className="text-slate-900">{plan.guarantorRelation || 'N/A'}</strong></p>
                        <p>NID: <strong className="text-slate-900 font-mono">{plan.guarantorNid || 'N/A'}</strong></p>
                      </div>
                    </div>
                  </div>

                  {/* Installment Schedule Table */}
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      Monthly Installment Payment Schedule
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                          <tr>
                            <th className="p-3">Month #</th>
                            <th className="p-3">Due Date</th>
                            <th className="p-3 text-right">EMI Amount</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3">Paid Date</th>
                            <th className="p-3 text-right">Paid Amount</th>
                            <th className="p-3">Payment Method</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {plan.schedule.map((sch) => (
                            <tr key={sch.installmentNo} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-slate-900">Month #{sch.installmentNo}</td>
                              <td className="p-3 font-mono text-slate-600">{sch.dueDate}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                ৳{sch.amount.toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    sch.status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : sch.status === 'overdue'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {sch.status}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-600">{sch.paidDate || '-'}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600">
                                {sch.paidAmount ? `৳${sch.paidAmount.toLocaleString()}` : '-'}
                              </td>
                              <td className="p-3 font-bold uppercase text-slate-600">{sch.paymentMode || '-'}</td>
                              <td className="p-3 text-center">
                                {sch.status !== 'paid' ? (
                                  <button
                                    onClick={() => {
                                      setPayEmiModalPlan({
                                        plan,
                                        itemNo: sch.installmentNo,
                                        dueAmount: sch.amount - (sch.paidAmount || 0)
                                      });
                                      setPayEmiAmount(sch.amount - (sch.paidAmount || 0));
                                    }}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg shadow-xs transition"
                                  >
                                    Pay EMI
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 4: MARKETING & SMS LOGS */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'marketing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick SMS Dispatch Form */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b pb-3">
              <Send className="w-5 h-5 text-amber-500" /> Dispatch Quick Alpha SMS
            </h2>

            <form onSubmit={handleQuickSendSms} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Recipient</label>
                <input
                  type="text"
                  disabled
                  value={`${customer.name} (${customer.phone})`}
                  className="w-full p-2.5 bg-slate-100 border rounded-xl font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">SMS Category</label>
                <select
                  value={quickSmsCategory}
                  onChange={(e) => setQuickSmsCategory(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                >
                  <option value="marketing_campaign">Marketing Campaign</option>
                  <option value="due_reminder">Payment Due Reminder</option>
                  <option value="installment_reminder">EMI Installment Reminder</option>
                  <option value="sale_receipt">Sale Receipt Notice</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">SMS Message Content *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Type customer message..."
                  value={quickSmsMessage}
                  onChange={(e) => setQuickSmsMessage(e.target.value)}
                  className="w-full p-3 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Chars: {quickSmsMessage.length} (Est. 1 SMS parts)
                </p>
              </div>

              {/* Pre-built Templates */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 block">Quick Template Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setQuickSmsMessage(
                        `Dear ${customer.name}, Thank you for purchasing from Amanot Group! For support call: ${settings.amanotElectronicsPhone || '01700000000'}.`
                      )
                    }
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold"
                  >
                    Thank You Notice
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickSmsMessage(
                        `Dear ${customer.name}, friendly reminder regarding outstanding due ৳${customer.currentDue.toLocaleString()}. Please clear at your nearest showroom.`
                      )
                    }
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold"
                  >
                    Due Reminder
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition active:scale-98 text-xs flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Alpha SMS Now
              </button>
            </form>
          </div>

          {/* Customer SMS Logs Table */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b pb-3">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Dispatched SMS History ({customerSmsLogs.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold border-b">
                  <tr>
                    <th className="p-3">Dispatched Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Message Snippet</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerSmsLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                        No SMS marketing messages logged for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerSmsLogs.map((sms) => (
                      <tr key={sms.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{sms.sentAt}</td>
                        <td className="p-3 font-bold text-slate-800">{sms.type}</td>
                        <td className="p-3 text-slate-700 max-w-xs font-medium">{sms.message}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                            {sms.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 5: DUES & LEDGER STATEMENT */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'ledger' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Customer Account Financial Ledger Statement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized debit/credit statement showing lifetime invoices, payments, and outstanding balances.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Net Account Due</span>
                <span className={`font-mono text-xl font-black ${customer.currentDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ৳{customer.currentDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold border-b">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Reference ID</th>
                  <th className="p-3.5">Transaction Particulars</th>
                  <th className="p-3.5 text-right">Debit (Billed Total)</th>
                  <th className="p-3.5 text-right">Credit (Paid)</th>
                  <th className="p-3.5 text-right">Balance Outstanding Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      No financial transactions recorded for this account.
                    </td>
                  </tr>
                ) : (
                  customerInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono text-slate-600">{inv.createdAt.slice(0, 10)}</td>
                      <td className="p-3.5 font-mono font-bold text-blue-700">Sale #{inv.id}</td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {inv.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        ৳{inv.grandTotal.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                        ৳{inv.paidAmount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-rose-600">
                        ৳{inv.dueAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 6: CUSTOMER REPORTS & EXPORT */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Customer Audit Report & Export Generator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select report parameters to export official PDF statements, Excel sheets, or print directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Options Form */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Report Category</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white"
                >
                  <option value="comprehensive">Comprehensive Customer Journey & Statement Report</option>
                  <option value="ledger">Account Statement & Dues Ledger Report</option>
                  <option value="purchases">Itemized Purchase & Invoices Report</option>
                  <option value="installments">Installment EMI Schedule & Progress Report</option>
                  <option value="marketing">Marketing Communications Audit Log</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Time Horizon Scope</label>
                <select
                  value={reportDateScope}
                  onChange={(e) => setReportDateScope(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white"
                >
                  <option value="all">All Lifetime History</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="year">Current Financial Year</option>
                </select>
              </div>

              <div className="pt-3 space-y-2 border-t">
                <button
                  onClick={handleGenerateReportPDF}
                  className="w-full py-3 bg-indigo-700 hover:bg-indigo-600 text-white font-black rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Official PDF Report
                </button>

                <button
                  onClick={handleExportExcel}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Transactions to Excel (.xlsx)
                </button>

                <button
                  onClick={handleWindowPrint}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Document View
                </button>
              </div>
            </div>

            {/* Live Report Preview Box */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="font-bold text-xs text-amber-400 uppercase tracking-wider">Report Preview Metrics</h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Customer Name:</span>
                  <span className="font-bold">{customer.name}</span>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Phone Number:</span>
                  <span className="font-mono text-amber-400">{customer.phone}</span>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total Billed Lifetime:</span>
                  <span className="font-mono font-bold">৳{totalSpent.toLocaleString()}</span>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total Dues Outstanding:</span>
                  <span className="font-mono font-bold text-rose-400">৳{customer.currentDue.toLocaleString()}</span>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total Invoices Included:</span>
                  <span className="font-mono font-bold">{customerInvoices.length}</span>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total EMI Contracts:</span>
                  <span className="font-mono font-bold">{customerInstallments.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: PAY INVOICE DUE */}
      {/* -------------------------------------------------------------------- */}
      {payDueModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-900">
                Collect Invoice Due Payment (#{payDueModalInvoice.id})
              </h3>
              <button onClick={() => setPayDueModalInvoice(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayDue} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Invoice Pending Due</label>
                <input
                  type="text"
                  disabled
                  value={`৳${payDueModalInvoice.dueAmount.toLocaleString()}`}
                  className="w-full p-2.5 bg-rose-50 border border-rose-200 rounded-xl font-mono font-bold text-rose-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Collecting Now (BDT) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={payDueModalInvoice.dueAmount}
                  value={payDueAmount}
                  onChange={(e) => setPayDueAmount(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={payDueMethod}
                  onChange={(e) => setPayDueMethod(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                >
                  <option value="cash">Cash Payment</option>
                  <option value="bkash">bKash Mobile Money</option>
                  <option value="nagad">Nagad Mobile Money</option>
                  <option value="card">POS Card Machine</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deposit Into Account</label>
                <select
                  value={payDueAccountId}
                  onChange={(e) => setPayDueAccountId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                >
                  {dueCollectionAccounts.length === 0 && (
                    <option value="">No {payDueMethod.replace('_', ' ')} account for this business</option>
                  )}
                  {dueCollectionAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName}
                      {a.business === 'all' ? ' [Shared]' : ''} (Bal: ৳{a.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setPayDueModalInvoice(null)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-xl shadow-md"
                >
                  Record Payment Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: PAY EMI INSTALLMENT */}
      {/* -------------------------------------------------------------------- */}
      {payEmiModalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-900">
                Collect EMI Installment Payment (Month #{payEmiModalPlan.itemNo})
              </h3>
              <button onClick={() => setPayEmiModalPlan(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayEmi} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Installment Due Amount</label>
                <input
                  type="text"
                  disabled
                  value={`৳${payEmiModalPlan.dueAmount.toLocaleString()}`}
                  className="w-full p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl font-mono font-bold text-indigo-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Amount (BDT) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={payEmiModalPlan.dueAmount}
                  value={payEmiAmount}
                  onChange={(e) => setPayEmiAmount(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={payEmiMethod}
                  onChange={(e) => setPayEmiMethod(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                >
                  <option value="cash">Cash Payment</option>
                  <option value="bkash_nagad">bKash / Nagad</option>
                  <option value="card">POS Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deposit Into Account</label>
                <select
                  value={payEmiAccountId}
                  onChange={(e) => setPayEmiAccountId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                >
                  {emiCollectionAccounts.length === 0 && (
                    <option value="">No {payEmiMethod.replace('_', ' ')} account for this business</option>
                  )}
                  {emiCollectionAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName}
                      {a.business === 'all' ? ' [Shared]' : ''} (Bal: ৳{a.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setPayEmiModalPlan(null)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-black rounded-xl shadow-md"
                >
                  Record EMI Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* BRANDED RECEIPT MODAL */}
      {/* -------------------------------------------------------------------- */}
      {selectedReceiptInvoice && (
        <BrandedReceiptModal
          invoice={selectedReceiptInvoice}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
    </div>
  );
};
