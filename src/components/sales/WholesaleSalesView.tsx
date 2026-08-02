import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, LedgerEntry, PaymentMode } from '../../types';
import {
  Search,
  Users,
  Wallet,
  TrendingUp,
  ArrowLeft,
  Printer,
  Plus,
  FileText,
  Receipt,
  X,
  CalendarClock
} from 'lucide-react';

/** A ledger row with the running balance computed. */
interface LedgerRow extends LedgerEntry {
  balance: number;
}

export const WholesaleSalesView: React.FC = () => {
  const {
    customers,
    sales,
    ledgerEntries,
    accounts,
    recordCustomerPayment,
    activeBusiness,
    currentUser,
    settings,
    setActiveTab,
    setActiveReceiptInvoice
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  // Payment modal fields
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<PaymentMode>('cash');
  const [payAccountId, setPayAccountId] = useState<string>(accounts[0]?.id || '');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  const inBusiness = (b: string) =>
    (activeBusiness === 'all' || b === activeBusiness) &&
    (currentUser.assignedBusiness === 'all' || b === currentUser.assignedBusiness);

  // Wholesale customers = flagged wholesale, in the Wholesale group, or having any
  // wholesale sale / ledger movement.
  const wholesaleCustomers = useMemo(() => {
    const withLedger = new Set(ledgerEntries.map((e) => e.customerId));
    const withWholesaleSale = new Set(
      sales.filter((s) => s.saleType === 'wholesale').map((s) => s.customerId)
    );
    return customers.filter(
      (c) =>
        c.customerType === 'wholesale' ||
        c.group === 'Wholesale Buyers' ||
        withLedger.has(c.id) ||
        withWholesaleSale.has(c.id)
    );
  }, [customers, ledgerEntries, sales]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wholesaleCustomers.filter((c) => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
    });
  }, [wholesaleCustomers, search]);

  // Ledger for one customer, chronological, with an opening (brought-forward) balance
  // that reconciles any legacy due not captured as explicit ledger entries.
  const buildLedger = (cust: Customer) => {
    const entries = ledgerEntries
      .filter((e) => e.customerId === cust.id)
      .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
    const ledgerNet = entries.reduce((acc, e) => acc + e.debit - e.credit, 0);
    // Opening balance brought forward = current outstanding minus what the ledger explains.
    const opening = Math.round((cust.currentDue || 0) - ledgerNet);
    let balance = opening;
    const rows: LedgerRow[] = entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
    const totalDebit = entries.reduce((a, e) => a + e.debit, 0);
    const totalCredit = entries.reduce((a, e) => a + e.credit, 0);
    return { opening, rows, closing: balance, totalDebit, totalCredit };
  };

  const outstandingOf = (c: Customer) => Math.max(0, Math.round(c.currentDue || 0));

  const totals = useMemo(() => {
    const scoped = wholesaleCustomers;
    const outstanding = scoped.reduce((a, c) => a + outstandingOf(c), 0);
    const wsSales = sales.filter((s) => s.saleType === 'wholesale' && inBusiness(s.business));
    const invoiced = wsSales.reduce((a, s) => a + s.grandTotal, 0);
    const collected = ledgerEntries
      .filter((e) => e.type === 'payment' && inBusiness(e.business))
      .reduce((a, e) => a + e.credit, 0);
    return { customers: scoped.length, outstanding, invoiced, collected };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wholesaleCustomers, sales, ledgerEntries, activeBusiness, currentUser]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  const openPayModal = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setPayAmount(outstandingOf(cust));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('cash');
    setPayAccountId(accounts[0]?.id || '');
    setPayRef('');
    setPayNotes('');
    setShowPayModal(true);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || payAmount <= 0) return;
    recordCustomerPayment({
      customerId: selectedCustomer.id,
      amount: payAmount,
      date: payDate,
      paymentMode: payMethod,
      accountId: payAccountId || undefined,
      referenceNo: payRef.trim() || undefined,
      notes: payNotes.trim() || undefined,
      business: selectedCustomer.customerType === 'wholesale' ? activeBusiness === 'amanot_enterprise' ? 'amanot_enterprise' : 'amanot_electronics' : 'amanot_electronics'
    });
    setShowPayModal(false);
  };

  const bdt = (n: number) => `৳${Math.round(n).toLocaleString()}`;

  // ---- Printable customer statement (compact, A4) ----
  const printStatement = (cust: Customer) => {
    const { opening, rows, closing, totalDebit, totalCredit } = buildLedger(cust);
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]));
    const bodyRows = rows
      .map(
        (r) => `
        <tr>
          <td>${esc(r.date)}</td>
          <td>${esc(r.referenceNo)}</td>
          <td>${esc(r.description || (r.type === 'invoice' ? 'Sales invoice' : r.type === 'payment' ? 'Payment received' : r.type))}</td>
          <td class="r">${r.debit ? bdt(r.debit) : ''}</td>
          <td class="r">${r.credit ? bdt(r.credit) : ''}</td>
          <td class="r b">${bdt(r.balance)}</td>
        </tr>`
      )
      .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Statement - ${esc(cust.name)}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:16mm 12mm;font-size:11px}
        h1{font-size:16px;margin:0}
        .muted{color:#475569;font-size:11px;margin:2px 0}
        .head{border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end}
        .box{display:flex;gap:8px;margin:10px 0}
        .kpi{flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px}
        .kpi span{display:block;font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700}
        .kpi b{font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:6px}
        th,td{border:1px solid #e2e8f0;padding:4px 6px;text-align:left}
        th{background:#0f172a;color:#fff;font-size:10px;text-transform:uppercase}
        td.r{text-align:right;font-family:monospace}
        td.b{font-weight:800}
        tr:nth-child(even) td{background:#f8fafc}
        .open,.close{font-weight:800;background:#f1f5f9}
        .sig{margin-top:28px;display:flex;justify-content:space-between}
        .sig div{width:45%;border-top:1px solid #94a3b8;padding-top:4px;text-align:center;font-size:10px}
        @media print{@page{size:A4;margin:12mm}}
      </style></head><body>
      <div class="head">
        <div>
          <h1>AMANOT GROUP — Customer Statement</h1>
          <p class="muted">Wholesale Account Ledger &nbsp;•&nbsp; ${esc(new Date().toLocaleDateString('en-GB'))}</p>
        </div>
        <div style="text-align:right">
          <p class="muted"><b>${esc(cust.name)}</b></p>
          <p class="muted">${esc(cust.phone)}</p>
          <p class="muted">${esc(cust.address || '')}</p>
        </div>
      </div>
      <div class="box">
        <div class="kpi"><span>Opening (B/F)</span><b>${bdt(opening)}</b></div>
        <div class="kpi"><span>Total Invoiced</span><b>${bdt(totalDebit)}</b></div>
        <div class="kpi"><span>Total Paid</span><b>${bdt(totalCredit)}</b></div>
        <div class="kpi"><span>Closing Balance</span><b>${bdt(closing)}</b></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Ref No.</th><th>Particulars</th><th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th></tr></thead>
        <tbody>
          <tr class="open"><td></td><td></td><td>Balance Brought Forward</td><td class="r"></td><td class="r"></td><td class="r b">${bdt(opening)}</td></tr>
          ${bodyRows}
          <tr class="close"><td colspan="3">Closing Balance (Total Due)</td><td class="r">${bdt(totalDebit)}</td><td class="r">${bdt(totalCredit)}</td><td class="r b">${bdt(closing)}</td></tr>
        </tbody>
      </table>
      <div class="sig"><div>Customer Signature</div><div>For AMANOT GROUP</div></div>
      </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow?.document;
    if (!idoc) return;
    idoc.open();
    idoc.write(html);
    idoc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.parentNode && document.body.removeChild(iframe), 1000);
    }, 300);
  };

  // ================= DETAIL (ledger) VIEW =================
  if (selectedCustomer) {
    const { opening, rows, closing, totalDebit, totalCredit } = buildLedger(selectedCustomer);
    const custInvoices = sales.filter(
      (s) => s.customerId === selectedCustomer.id && s.saleType === 'wholesale' && !s.isDraft
    );
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedCustomerId(null)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to wholesale customers
        </button>

        {/* Customer header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> {selectedCustomer.name}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {selectedCustomer.phone} · {selectedCustomer.address || 'Wholesale account'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openPayModal(selectedCustomer)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <Wallet className="w-4 h-4" /> Record Payment
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition"
              title="Create a new wholesale invoice in the POS (choose Wholesale price)"
            >
              <Plus className="w-4 h-4" /> New Wholesale Invoice
            </button>
            <button
              onClick={() => printStatement(selectedCustomer)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <Printer className="w-4 h-4" /> Print Statement
            </button>
          </div>
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening (Brought Fwd)</p>
            <p className="text-xl font-black text-slate-800 font-mono mt-1">{bdt(opening)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-xl font-black text-blue-700 font-mono mt-1">{bdt(totalDebit)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Received</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">{bdt(totalCredit)}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Closing Balance (Due)</p>
            <p className={`text-xl font-black font-mono mt-1 ${closing > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{bdt(closing)}</p>
          </div>
        </div>

        {/* Running ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900">Running Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Ref No.</th>
                  <th className="p-2.5">Particulars</th>
                  <th className="p-2.5 text-center">Type</th>
                  <th className="p-2.5 text-right">Debit</th>
                  <th className="p-2.5 text-right">Credit</th>
                  <th className="p-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2.5" colSpan={6}>Balance Brought Forward</td>
                  <td className="p-2.5 text-right font-mono">{bdt(opening)}</td>
                </tr>
                {rows.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-slate-400" colSpan={7}>
                      No ledger movements yet. Wholesale invoices and payments will appear here.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-slate-600">{r.date}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-700">{r.referenceNo}</td>
                      <td className="p-2.5 text-slate-700">{r.description}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            r.type === 'payment'
                              ? 'bg-emerald-100 text-emerald-700'
                              : r.type === 'invoice'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.type}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">{r.debit ? bdt(r.debit) : '—'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{r.credit ? bdt(r.credit) : '—'}</td>
                      <td className="p-2.5 text-right font-mono font-black text-slate-900">{bdt(r.balance)}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                  <td className="p-2.5" colSpan={4}>Closing Balance</td>
                  <td className="p-2.5 text-right font-mono">{bdt(totalDebit)}</td>
                  <td className="p-2.5 text-right font-mono">{bdt(totalCredit)}</td>
                  <td className="p-2.5 text-right font-mono text-indigo-900">{bdt(closing)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice history */}
        {custInvoices.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">Wholesale Invoice History ({custInvoices.length})</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {custInvoices.map((inv) => (
                <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div>
                    <span className="font-mono font-bold text-xs text-blue-700">{inv.id}</span>
                    <span className="text-[11px] text-slate-500 ml-2">{inv.createdAt} · {inv.items.length} items</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-700">Total {bdt(inv.grandTotal)}</span>
                    <span className="text-emerald-700">Paid {bdt(inv.paidAmount)}</span>
                    <button
                      onClick={() => setActiveReceiptInvoice(inv)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPayModal && selectedCustomer && (
          <PaymentModal
            customer={selectedCustomer}
            accounts={accounts}
            payAmount={payAmount}
            setPayAmount={setPayAmount}
            payDate={payDate}
            setPayDate={setPayDate}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            payAccountId={payAccountId}
            setPayAccountId={setPayAccountId}
            payRef={payRef}
            setPayRef={setPayRef}
            payNotes={payNotes}
            setPayNotes={setPayNotes}
            outstanding={outstandingOf(selectedCustomer)}
            onClose={() => setShowPayModal(false)}
            onSubmit={submitPayment}
            bdt={bdt}
          />
        )}
      </div>
    );
  }

  // ================= LIST VIEW =================
  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wholesale Customers</p>
          <p className="text-xl font-black text-slate-900 font-mono mt-1">{totals.customers}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding (AR)</p>
          <p className="text-xl font-black text-amber-600 font-mono mt-1">{bdt(totals.outstanding)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wholesale Invoiced</p>
          <p className="text-xl font-black text-blue-700 font-mono mt-1">{bdt(totals.invoiced)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payments Collected</p>
          <p className="text-xl font-black text-emerald-600 font-mono mt-1">{bdt(totals.collected)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wholesale customer by name or phone…"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customers table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Phone</th>
                <th className="p-3 text-right">Outstanding Balance</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-slate-400" colSpan={4}>
                    No wholesale customers yet. Tag a customer as "Wholesale" or record a wholesale sale.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const due = outstandingOf(c);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3 font-mono text-slate-600">{c.phone}</td>
                      <td className="p-3 text-right">
                        <span className={`font-mono font-black ${due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {bdt(due)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg"
                          >
                            View Ledger
                          </button>
                          <button
                            onClick={() => openPayModal(c)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1"
                          >
                            <Wallet className="w-3 h-3" /> Pay
                          </button>
                          <button
                            onClick={() => printStatement(c)}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" /> Statement
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPayModal && selectedCustomer && (
        <PaymentModal
          customer={selectedCustomer}
          accounts={accounts}
          payAmount={payAmount}
          setPayAmount={setPayAmount}
          payDate={payDate}
          setPayDate={setPayDate}
          payMethod={payMethod}
          setPayMethod={setPayMethod}
          payAccountId={payAccountId}
          setPayAccountId={setPayAccountId}
          payRef={payRef}
          setPayRef={setPayRef}
          payNotes={payNotes}
          setPayNotes={setPayNotes}
          outstanding={outstandingOf(selectedCustomer)}
          onClose={() => setShowPayModal(false)}
          onSubmit={submitPayment}
          bdt={bdt}
        />
      )}
    </div>
  );
};

// ---- Standalone payment modal (partial payment, no invoice) ----
interface PaymentModalProps {
  customer: Customer;
  accounts: ReturnType<typeof useApp>['accounts'];
  payAmount: number;
  setPayAmount: (n: number) => void;
  payDate: string;
  setPayDate: (s: string) => void;
  payMethod: PaymentMode;
  setPayMethod: (m: PaymentMode) => void;
  payAccountId: string;
  setPayAccountId: (s: string) => void;
  payRef: string;
  setPayRef: (s: string) => void;
  payNotes: string;
  setPayNotes: (s: string) => void;
  outstanding: number;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  bdt: (n: number) => string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  customer,
  accounts,
  payAmount,
  setPayAmount,
  payDate,
  setPayDate,
  payMethod,
  setPayMethod,
  payAccountId,
  setPayAccountId,
  payRef,
  setPayRef,
  payNotes,
  setPayNotes,
  outstanding,
  onClose,
  onSubmit,
  bdt
}) => {
  const newBalance = Math.max(0, outstanding - (payAmount || 0));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
          <h3 className="font-black text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" /> Receive Payment — {customer.name}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-3 text-xs font-medium">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="block text-[9px] font-bold text-amber-700 uppercase">Previous Due</span>
              <span className="font-mono font-black text-amber-700">{bdt(outstanding)}</span>
            </div>
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="block text-[9px] font-bold text-emerald-700 uppercase">Paying Now</span>
              <span className="font-mono font-black text-emerald-700">{bdt(payAmount || 0)}</span>
            </div>
            <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl">
              <span className="block text-[9px] font-bold text-slate-600 uppercase">New Balance</span>
              <span className="font-mono font-black text-slate-900">{bdt(newBalance)}</span>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Payment Amount (৳) *</label>
            <input
              type="number"
              min="1"
              required
              value={payAmount || ''}
              onChange={(e) => setPayAmount(Math.max(0, Number(e.target.value)))}
              className="w-full p-2.5 border rounded-xl font-mono font-extrabold text-emerald-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Date *</label>
              <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full p-2.5 border rounded-xl font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMode)} className="w-full p-2.5 border rounded-xl font-bold bg-slate-50">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash_nagad">bKash / Nagad</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Deposit To Account</label>
            <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} className="w-full p-2.5 border rounded-xl font-bold bg-white">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} [{a.type.toUpperCase()}] (Bal: {bdt(a.currentBalance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Reference No.</label>
              <input type="text" placeholder="auto if blank" value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full p-2.5 border rounded-xl font-mono" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Notes</label>
              <input type="text" placeholder="optional" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" /> This is a standalone payment against the running balance — no sales invoice is created.
          </p>

          <div className="pt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow">
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
