import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SaleInvoice, BusinessType } from '../../types';
import { exportCustomerInvoicePDF } from '../../utils/invoicePdfExport';
import { getCompatiblePaymentAccounts } from '../../utils/paymentAccounts';
import { formatDate } from '../../utils/formatDate';
import {
  FileText,
  Search,
  Printer,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign,
  Eye,
  Send,
  X,
  CreditCard,
  RotateCcw,
  Undo2,
  Edit3,
  Trash2
} from 'lucide-react';
import { CustomerReturnModal } from './CustomerReturnModal';

export const InvoicesView: React.FC = () => {
  const { sales, customerReturns, setActiveReceiptInvoice, sendSMS, payInvoiceDue, deleteSale, accounts, activeBusiness, currentUser, settings, loadSaleIntoPOS } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'paid' | 'partial'>('all');
  const [businessFilter, setBusinessFilter] = useState<'all' | BusinessType>('all');
  const [activeTab, setActiveTab] = useState<'invoices' | 'drafts' | 'customer_returns'>('invoices');
  const [draftSearch, setDraftSearch] = useState('');
  const [draftPendingDelete, setDraftPendingDelete] = useState<SaleInvoice | null>(null);

  // Customer Return Modal State
  const [isCustomerReturnOpen, setIsCustomerReturnOpen] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<string | undefined>(undefined);

  // Complete Due Modal State
  const [payDueModalInvoice, setPayDueModalInvoice] = useState<SaleInvoice | null>(null);
  const [payDueAmount, setPayDueAmount] = useState<number>(0);
  const [payDueMode, setPayDueMode] = useState<'cash' | 'card' | 'bkash_nagad' | 'bank_transfer'>('cash');
  const [payDueAccountId, setPayDueAccountId] = useState<string>('');

  // Accounts the invoice's business may bank this due into (its own first, then shared)
  const dueCollectionAccounts = useMemo(() => {
    if (!payDueModalInvoice) return [];
    return getCompatiblePaymentAccounts(accounts, payDueMode, payDueModalInvoice.business);
  }, [accounts, payDueMode, payDueModalInvoice]);

  useEffect(() => {
    if (!dueCollectionAccounts.some((a) => a.id === payDueAccountId)) {
      setPayDueAccountId(dueCollectionAccounts[0]?.id || '');
    }
  }, [dueCollectionAccounts, payDueAccountId]);

  const openPayDueModal = (inv: SaleInvoice) => {
    setPayDueModalInvoice(inv);
    setPayDueAmount(inv.dueAmount);
    setPayDueMode('cash');
  };

  const handleCompleteDueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDueModalInvoice || payDueAmount <= 0) return;

    payInvoiceDue(payDueModalInvoice.id, payDueAmount, payDueMode, payDueAccountId);
    setPayDueModalInvoice(null);
  };

  /** Business/role scope shared by both the posted-invoice and draft lists. */
  const inScope = useMemo(() => {
    return sales.filter((s) => {
      if (activeBusiness !== 'all' && s.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && s.business !== currentUser.assignedBusiness) return false;
      return true;
    });
  }, [sales, activeBusiness, currentUser]);

  const matchesSearch = (s: SaleInvoice, q: string) =>
    s.id.toLowerCase().includes(q) ||
    s.customerName.toLowerCase().includes(q) ||
    s.customerPhone.toLowerCase().includes(q);

  // Posted invoices only. Drafts are unposted — no stock moved, no money taken —
  // so they never belong in the sales list or any sales total.
  const filteredSales = useMemo(() => {
    return inScope.filter((s) => {
      if (s.isDraft) return false;

      if (businessFilter !== 'all' && s.business !== businessFilter) return false;
      if (statusFilter !== 'all' && s.paymentStatus !== statusFilter) return false;

      if (searchQuery.trim()) return matchesSearch(s, searchQuery.toLowerCase());
      return true;
    });
  }, [inScope, businessFilter, statusFilter, searchQuery]);

  const draftSales = useMemo(() => {
    return inScope.filter((s) => {
      if (!s.isDraft) return false;
      if (businessFilter !== 'all' && s.business !== businessFilter) return false;
      if (draftSearch.trim()) return matchesSearch(s, draftSearch.toLowerCase());
      return true;
    });
  }, [inScope, businessFilter, draftSearch]);

  const draftValueTotal = useMemo(
    () => draftSales.reduce((acc, s) => acc + s.grandTotal, 0),
    [draftSales]
  );

  const filteredInvoiceIds = useMemo(() => new Set(filteredSales.map((s) => s.id)), [filteredSales]);
  const filteredReturns = useMemo(() => {
    return customerReturns.filter(
      (r) => (activeBusiness === 'all' ? true : r.business === activeBusiness) && filteredInvoiceIds.has(r.invoiceId)
    );
  }, [customerReturns, activeBusiness, filteredInvoiceIds]);

  const totalInvoiced = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalReturnsAmount = filteredReturns.reduce((acc, r) => acc + r.totalRefundAmount, 0);
  const netInvoiced = totalInvoiced - totalReturnsAmount;
  const totalCollected = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalOutstandingDue = filteredSales.reduce((acc, s) => acc + s.dueAmount, 0);

  const handleSendDueReminder = (invoice: SaleInvoice) => {
    const bName = invoice.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise';
    const msg = `Dear ${invoice.customerName}, payment reminder for Invoice #${invoice.id} from ${bName}. Outstanding Due: BDT ${invoice.dueAmount.toLocaleString()}. Please pay at your earliest convenience.`;
    sendSMS(invoice.customerPhone, invoice.customerName, msg, 'due_reminder', invoice.business);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Invoices & Sales Records
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Track customer invoices, due balances, process sales returns, send SMS reminders, and re-print branded receipts.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedInvoiceForReturn(undefined);
            setIsCustomerReturnOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-98"
        >
          <RotateCcw className="w-4 h-4" />
          Process Customer Sales Return
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Sales Invoiced</p>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">৳{totalInvoiced.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sales Returns & Refunds</p>
          <p className="text-2xl font-black text-rose-600 font-mono mt-1">৳{totalReturnsAmount.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{filteredReturns.length} Return Entries</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Sales Revenue</p>
          <p className="text-2xl font-black text-blue-700 font-mono mt-1">৳{netInvoiced.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cash Collected</p>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">৳{totalCollected.toLocaleString()}</p>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'invoices'
              ? 'bg-slate-900 text-white shadow-sm font-extrabold'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          Sales Invoices ({filteredSales.length})
        </button>

        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'drafts'
              ? 'bg-slate-900 text-white shadow-sm font-extrabold'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4 text-amber-500" />
          Draft Sales ({draftSales.length})
        </button>

        <button
          onClick={() => setActiveTab('customer_returns')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
            activeTab === 'customer_returns'
              ? 'bg-slate-900 text-white shadow-sm font-extrabold'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-indigo-400" />
          Customer Returns Log ({customerReturns.length})
        </button>
      </div>

      {/* ================= DRAFT SALES ================= */}
      {activeTab === 'drafts' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-900">
                  {draftSales.length} unposted draft{draftSales.length === 1 ? '' : 's'} · ৳{draftValueTotal.toLocaleString()}
                </p>
                <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                  Drafts hold no stock and no payment. They are excluded from every sales figure and report
                  until posted from the POS.
                </p>
              </div>
            </div>

            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search drafts…"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                className="w-full sm:w-60 pl-9 pr-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b">
                <tr>
                  <th className="px-3 py-3">Draft #</th>
                  <th className="px-3 py-3">Business</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3 text-center">Items</th>
                  <th className="px-3 py-3 text-right">Draft Value</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draftSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center">
                      <Edit3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No draft sales.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Drafts saved from the POS appear here until they are posted.
                      </p>
                    </td>
                  </tr>
                ) : (
                  draftSales.map((s) => (
                    <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-3 py-3">
                        <p className="font-mono font-bold text-amber-700 text-xs whitespace-nowrap">{s.id}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(s.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block px-1.5 py-1 rounded text-[9px] font-extrabold border bg-slate-50 text-slate-700 border-slate-200">
                          {s.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-slate-900 text-xs truncate" title={s.customerName}>{s.customerName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{s.customerPhone}</p>
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-slate-600">
                        {s.items.reduce((sum, i) => sum + i.quantity, 0)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-slate-800">
                        ৳{s.grandTotal.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => loadSaleIntoPOS(s)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Open draft in POS to complete the sale"
                            aria-label="Edit draft sale"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDraftPendingDelete(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete this draft"
                            aria-label="Delete draft sale"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {draftSales.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-900">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-right uppercase text-[11px]">
                      Total Draft Value (not counted as sales)
                    </td>
                    <td className="px-3 py-3 text-right font-mono">৳{draftValueTotal.toLocaleString()}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Delete draft confirmation */}
      {draftPendingDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete this draft?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Draft <span className="font-mono font-bold text-slate-700">{draftPendingDelete.id}</span> for{' '}
                  <span className="font-bold text-slate-700">{draftPendingDelete.customerName}</span> (৳
                  {draftPendingDelete.grandTotal.toLocaleString()}) will be permanently removed.
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  No stock or payment is affected — a draft was never posted.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDraftPendingDelete(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteSale(draftPendingDelete.id);
                  setDraftPendingDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-md transition"
              >
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <>
          {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer Name or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['all', 'due', 'partial', 'paid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition capitalize ${
                  statusFilter === st ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                {st === 'all' ? 'All Invoices' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-[11px] xl:text-xs border-collapse">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[13%]" />
              <col className="w-[21%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-3 leading-tight">Invoice # & Date</th>
                <th className="px-2.5 py-3 leading-tight">Business Entity</th>
                <th className="px-2.5 py-3 leading-tight">Customer Name & Phone</th>
                <th className="px-2.5 py-3 leading-tight">Purchased Items</th>
                <th className="px-2.5 py-3 text-right leading-tight">Grand Total</th>
                <th className="px-2.5 py-3 text-right">Paid</th>
                <th className="px-2.5 py-3 text-right leading-tight">Due Balance</th>
                <th className="px-2.5 py-3 text-center">Status</th>
                <th className="px-2.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredSales.map((s) => {
                const isElectronics = s.business === 'amanot_electronics';

                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2.5 py-3 font-mono align-middle">
                      <p className="font-bold text-blue-700 text-xs whitespace-nowrap">{s.id}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(s.createdAt)}</p>
                      {(s.specialDiscount || 0) > 0 && (
                        <span
                          className="inline-block mt-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200 text-[9px] font-extrabold"
                          title={`Internal referral payout — not shown on the customer invoice`}
                        >
                          SP -৳{(s.specialDiscount || 0).toLocaleString()}
                          {s.referralName ? ` · ${s.referralName}` : ''}
                        </span>
                      )}
                    </td>

                    <td className="px-2.5 py-3 align-middle">
                      <span className={`inline-block w-full px-1.5 py-1 rounded text-[9px] xl:text-[10px] leading-tight text-center font-extrabold border ${
                        isElectronics ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}
                      </span>
                    </td>

                    <td className="px-2.5 py-3 align-middle min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate" title={s.customerName}>{s.customerName}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{s.customerPhone}</p>
                    </td>

                    <td className="px-2.5 py-3 align-middle min-w-0">
                      <p className="font-semibold text-slate-800">{s.items.length} Product(s)</p>
                      <p
                        className="text-[10px] text-slate-400 truncate"
                        title={s.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                      >
                        {s.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                      </p>
                    </td>

                    <td className="px-2.5 py-3 text-right font-mono align-middle">
                      <p className="font-black text-slate-900 text-xs whitespace-nowrap">৳{s.grandTotal.toLocaleString()}</p>
                      {s.returnedAmount && s.returnedAmount > 0 ? (
                        <span className="inline-block max-w-full truncate text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1" title={`Returned: -৳${s.returnedAmount.toLocaleString()}`}>
                          Returned: -৳{s.returnedAmount.toLocaleString()}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2.5 py-3 text-right font-mono font-bold text-emerald-700 align-middle min-w-0">
                      <p className="whitespace-nowrap">৳{s.paidAmount.toLocaleString()}</p>
                      {s.accountName && (
                        <p className="text-[9px] text-slate-500 font-sans font-semibold truncate" title={s.accountName}>
                          {s.accountName}
                        </p>
                      )}
                      {s.customerPaymentNumber && (
                        <p className="text-[9px] text-slate-500 font-mono font-semibold whitespace-nowrap">
                          {s.customerPaymentNumber}
                        </p>
                      )}
                    </td>

                    <td className="px-2.5 py-3 text-right font-mono font-extrabold whitespace-nowrap align-middle">
                      {s.dueAmount > 0 ? (
                        <span className="text-rose-600">৳{s.dueAmount.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">৳0</span>
                      )}
                    </td>

                    <td className="px-2.5 py-3 text-center align-middle">
                      <span className={`inline-block px-2 py-1 rounded-full text-[9px] xl:text-[10px] font-extrabold uppercase ${
                        s.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {s.paymentStatus}
                      </span>
                    </td>

                    <td className="px-2.5 py-3 text-right align-middle">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => loadSaleIntoPOS(s)}
                          className="w-8 h-8 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg inline-flex items-center justify-center"
                          title={s.isDraft ? "Edit Draft Sale" : currentUser.role === 'super_admin' ? "Edit Posted Sale (Super Admin)" : "Posted sales require Super Admin to edit"}
                          aria-label={s.isDraft ? "Edit draft sale" : "Edit posted sale"}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => exportCustomerInvoicePDF(s, settings, 'bw')}
                          className="w-8 h-8 bg-slate-800 hover:bg-slate-900 text-white rounded-lg inline-flex items-center justify-center shadow-xs"
                          title="Print black and white invoice"
                          aria-label="Print black and white invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveReceiptInvoice(s)}
                          className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg inline-flex items-center justify-center"
                          title="View receipt and print options"
                          aria-label="View receipt and print options"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {s.dueAmount > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => openPayDueModal(s)}
                              className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center justify-center shadow-sm active:scale-95 transition-all"
                              title="Pay due balance"
                              aria-label="Pay due balance"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendDueReminder(s)}
                              className="w-8 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg inline-flex items-center justify-center shadow-sm"
                              title="Send SMS due reminder"
                              aria-label="Send SMS due reminder"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Customer Returns Log Tab */}
      {activeTab === 'customer_returns' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-400" />
                Customer Sales Returns & Refund Log
              </h2>
              <p className="text-[11px] text-slate-300">
                Track customer model exchanges, damaged returns, and store credit refunds
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedInvoiceForReturn(undefined);
                setIsCustomerReturnOpen(true);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
            >
              + Process Sales Return
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Return Ref / Date</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Returned Products</th>
                  <th className="p-3 text-right">Total Refunded</th>
                  <th className="p-3 text-center">Restocked</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {customerReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {ret.id}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {formatDate(ret.createdAt)}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-700">{ret.invoiceId}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {ret.customerName}
                      <span className="block text-[10px] text-slate-500 font-normal">{ret.customerPhone}</span>
                    </td>
                    <td className="p-3">
                      {ret.items.map((i, idx) => (
                        <div key={idx} className="font-medium text-slate-800">
                          {i.quantity}x {i.productName} ({i.condition === 'good_restock' ? 'Good' : 'Damaged'})
                        </div>
                      ))}
                    </td>
                    <td className="p-3 text-right font-extrabold text-blue-900 font-mono text-sm">
                      ৳{ret.totalRefundAmount.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          ret.restockItems ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ret.restockItems ? 'Yes (Restocked)' : 'No (Written Off)'}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{ret.reason}</td>
                    <td className="p-3 font-bold text-slate-600">{ret.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Return Modal */}
      {isCustomerReturnOpen && (
        <CustomerReturnModal
          preSelectedInvoiceId={selectedInvoiceForReturn}
          onClose={() => setIsCustomerReturnOpen(false)}
        />
      )}

      {/* Complete Due Modal */}
      {payDueModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-200" />
                <h3 className="font-extrabold text-base">Complete / Pay Due Amount</h3>
              </div>
              <button
                onClick={() => setPayDueModalInvoice(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteDueSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Invoice #:</span>
                  <span className="font-mono font-bold text-blue-700">{payDueModalInvoice.id}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-800">{payDueModalInvoice.customerName} ({payDueModalInvoice.customerPhone})</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Business:</span>
                  <span className="font-semibold text-slate-700">
                    {payDueModalInvoice.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm">
                  <span>Current Outstanding Due:</span>
                  <span className="font-mono text-rose-600">৳{payDueModalInvoice.dueAmount.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cash', label: 'Cash' },
                    { id: 'bkash_nagad', label: 'bKash / Nagad' },
                    { id: 'card', label: 'Card' },
                    { id: 'bank_transfer', label: 'Bank Transfer' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayDueMode(m.id as any)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                        payDueMode === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deposit Account — scoped to the invoice's business */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Deposit Into Account
                </label>
                <select
                  value={payDueAccountId}
                  onChange={(e) => setPayDueAccountId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold bg-white text-xs text-slate-900"
                >
                  {dueCollectionAccounts.length === 0 && (
                    <option value="">No {payDueMode.replace('_', ' ')} account for this business</option>
                  )}
                  {dueCollectionAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName}
                      {a.business === 'all' ? ' [Shared]' : ''} (Bal: ৳{a.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Amount Received (BDT)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayDueAmount(payDueModalInvoice.dueAmount)}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Pay Full Due (৳{payDueModalInvoice.dueAmount.toLocaleString()})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    max={payDueModalInvoice.dueAmount}
                    min={1}
                    required
                    value={payDueAmount || ''}
                    onChange={(e) => setPayDueAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Remaining Due After Payment: <span className="font-mono font-bold text-slate-700">৳{Math.max(0, payDueModalInvoice.dueAmount - payDueAmount).toLocaleString()}</span>
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayDueModalInvoice(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md"
                >
                  Confirm & Receive Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
