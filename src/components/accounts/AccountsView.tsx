import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Account, AccountType, AccountTransfer, SupplierPayment, BusinessType } from '../../types';
import { BUSINESS_LABELS, getBusinessAccounts } from '../../utils/paymentAccounts';
import {
  Landmark,
  Plus,
  ArrowRightLeft,
  DollarSign,
  Building2,
  Smartphone,
  Wallet,
  FileCheck,
  Search,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  UserCheck
} from 'lucide-react';

export const AccountsView: React.FC = () => {
  const {
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
    suppliers,
    purchaseOrders,
    activeBusiness,
    currentUser,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'transfers' | 'supplier_payments'>('accounts');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Supplier Payment Date Filters
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | 'yesterday' | 'month' | 'year' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('07'); // Default July
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');

  // Modal States
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<AccountTransfer | null>(null);

  const [isSupplierPayModalOpen, setIsSupplierPayModalOpen] = useState(false);
  const [editingSupplierPayment, setEditingSupplierPayment] = useState<SupplierPayment | null>(null);

  // Form States: Account
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accBusiness, setAccBusiness] = useState<'all' | BusinessType>('all');
  const [accNumber, setAccNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [mfsProvider, setMfsProvider] = useState<'bkash' | 'nagad' | 'rocket' | 'upay' | 'other'>('bkash');
  const [openingBal, setOpeningBal] = useState<number>(0);
  const [accNotes, setAccNotes] = useState('');
  const [accStatus, setAccStatus] = useState<'active' | 'inactive'>('active');

  // Form States: Transfer
  const [fromAccId, setFromAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [trAmount, setTrAmount] = useState<number>(0);
  const [trFee, setTrFee] = useState<number>(0);
  const [trDate, setTrDate] = useState(new Date().toISOString().split('T')[0]);
  const [trRef, setTrRef] = useState('');
  const [trNotes, setTrNotes] = useState('');

  // Form States: Supplier Payment
  const [paySupplierId, setPaySupplierId] = useState('');
  const [payPOId, setPayPOId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank' | 'mfs' | 'cheque'>('cash');
  const [payAccountId, setPayAccountId] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeStatus, setChequeStatus] = useState<'pending' | 'cleared' | 'bounced'>('pending');
  const [voucherNo, setVoucherNo] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Filtering Accounts by Active Business
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (activeBusiness !== 'all' && a.business !== 'all' && a.business !== activeBusiness) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          a.accountName.toLowerCase().includes(term) ||
          (a.accountNumber && a.accountNumber.includes(term)) ||
          (a.bankName && a.bankName.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [accounts, activeBusiness, typeFilter, searchTerm]);

  // Accounts the paying business may draw from (its own first, then shared/combined)
  const payableAccounts = useMemo(
    () => getBusinessAccounts(accounts, activeBusiness),
    [accounts, activeBusiness]
  );

  // Net Balances Summary
  const totals = useMemo(() => {
    let cash = 0;
    let bank = 0;
    let mfs = 0;
    let cheque = 0;
    filteredAccounts.forEach((a) => {
      if (a.type === 'cash') cash += a.currentBalance;
      if (a.type === 'bank') bank += a.currentBalance;
      if (a.type === 'mfs') mfs += a.currentBalance;
      if (a.type === 'cheque') cheque += a.currentBalance;
    });
    return { cash, bank, mfs, cheque, grand: cash + bank + mfs };
  }, [filteredAccounts]);

  // Filtering Transfers
  const filteredTransfers = useMemo(() => {
    return accountTransfers.filter((t) => {
      if (activeBusiness !== 'all' && t.business !== 'all' && t.business !== activeBusiness) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          t.fromAccountName.toLowerCase().includes(term) ||
          t.toAccountName.toLowerCase().includes(term) ||
          (t.referenceNo && t.referenceNo.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [accountTransfers, activeBusiness, searchTerm]);

  // Filtering Supplier Payments with Date Range
  const filteredSupplierPayments = useMemo(() => {
    return supplierPayments.filter((p) => {
      if (activeBusiness !== 'all' && p.business !== activeBusiness) return false;
      if (selectedSupplierFilter !== 'all' && p.supplierId !== selectedSupplierFilter) return false;
      if (selectedMethodFilter !== 'all' && p.paymentMethod !== selectedMethodFilter) return false;

      // Date Filtering Logic
      const pDate = p.paymentDate; // 'YYYY-MM-DD'
      const todayStr = new Date().toISOString().split('T')[0];

      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

      if (dateFilterPreset === 'today' && pDate !== todayStr) return false;
      if (dateFilterPreset === 'yesterday' && pDate !== yesterdayStr) return false;

      if (dateFilterPreset === 'month') {
        // e.g. 2026-07-15 -> YYYY-MM
        const [pYear, pMonth] = pDate.split('-');
        if (pYear !== selectedYear || pMonth !== selectedMonth) return false;
      }

      if (dateFilterPreset === 'year') {
        const [pYear] = pDate.split('-');
        if (pYear !== selectedYear) return false;
      }

      if (dateFilterPreset === 'custom') {
        if (fromDate && pDate < fromDate) return false;
        if (toDate && pDate > toDate) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          p.supplierName.toLowerCase().includes(term) ||
          p.accountName.toLowerCase().includes(term) ||
          (p.voucherNo && p.voucherNo.toLowerCase().includes(term)) ||
          (p.chequeNo && p.chequeNo.toLowerCase().includes(term))
        );
      }

      return true;
    });
  }, [
    supplierPayments,
    activeBusiness,
    selectedSupplierFilter,
    selectedMethodFilter,
    dateFilterPreset,
    selectedMonth,
    selectedYear,
    fromDate,
    toDate,
    searchTerm
  ]);

  const supplierPaymentsTotal = useMemo(() => {
    return filteredSupplierPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredSupplierPayments]);

  // Account Modal Handlers
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('bank');
    setAccBusiness(activeBusiness === 'all' ? 'all' : activeBusiness);
    setAccNumber('');
    setBankName('');
    setBranch('');
    setMfsProvider('bkash');
    setOpeningBal(0);
    setAccNotes('');
    setAccStatus('active');
    setIsAddAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.accountName);
    setAccType(acc.type);
    setAccBusiness(acc.business);
    setAccNumber(acc.accountNumber || '');
    setBankName(acc.bankName || '');
    setBranch(acc.branch || '');
    setMfsProvider(acc.mfsProvider || 'bkash');
    setOpeningBal(acc.openingBalance);
    setAccNotes(acc.notes || '');
    setAccStatus(acc.status);
    setIsAddAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName) {
      showToast('Account name is required');
      return;
    }

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        accountName: accName,
        type: accType,
        business: accBusiness,
        accountNumber: accNumber,
        bankName,
        branch,
        mfsProvider,
        openingBalance: Number(openingBal),
        notes: accNotes,
        status: accStatus
      });
    } else {
      addAccount({
        accountName: accName,
        type: accType,
        business: accBusiness,
        accountNumber: accNumber,
        bankName,
        branch,
        mfsProvider,
        openingBalance: Number(openingBal),
        status: accStatus,
        notes: accNotes
      });
    }

    setIsAddAccountModalOpen(false);
  };

  // Transfer Modal Handlers
  const handleOpenAddTransfer = () => {
    setEditingTransfer(null);
    setFromAccId(accounts[0]?.id || '');
    setToAccId(accounts[1]?.id || '');
    setTrAmount(0);
    setTrFee(0);
    setTrDate(new Date().toISOString().split('T')[0]);
    setTrRef(`TR-${Date.now().toString().slice(-6)}`);
    setTrNotes('');
    setIsTransferModalOpen(true);
  };

  const handleOpenEditTransfer = (tr: AccountTransfer) => {
    setEditingTransfer(tr);
    setFromAccId(tr.fromAccountId);
    setToAccId(tr.toAccountId);
    setTrAmount(tr.amount);
    setTrFee(tr.transferFee || 0);
    setTrDate(tr.date);
    setTrRef(tr.referenceNo || '');
    setTrNotes(tr.notes || '');
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccId || !toAccId || fromAccId === toAccId || trAmount <= 0) {
      showToast('Please select valid distinct accounts and enter an amount > 0');
      return;
    }

    if (editingTransfer) {
      updateAccountTransfer(editingTransfer.id, {
        fromAccountId: fromAccId,
        toAccountId: toAccId,
        amount: Number(trAmount),
        transferFee: Number(trFee),
        date: trDate,
        referenceNo: trRef,
        notes: trNotes
      });
    } else {
      addAccountTransfer({
        business: activeBusiness === 'all' ? 'amanot_electronics' : activeBusiness,
        fromAccountId: fromAccId,
        fromAccountName: '',
        toAccountId: toAccId,
        toAccountName: '',
        amount: Number(trAmount),
        transferFee: Number(trFee),
        date: trDate,
        referenceNo: trRef,
        notes: trNotes
      });
    }

    setIsTransferModalOpen(false);
  };

  // Supplier Payment Handlers
  const handleOpenAddSupplierPayment = (presetSupplierId?: string, presetPOId?: string, defaultAmt?: number) => {
    setEditingSupplierPayment(null);
    setPaySupplierId(presetSupplierId || suppliers[0]?.id || '');
    setPayPOId(presetPOId || '');
    setPayAmount(defaultAmt || 0);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('cash');
    setPayAccountId(payableAccounts[0]?.id || '');
    setChequeNo('');
    setChequeDate('');
    setChequeStatus('pending');
    setVoucherNo(`VCH-${Date.now().toString().slice(-6)}`);
    setPayNotes('');
    setIsSupplierPayModalOpen(true);
  };

  const handleOpenEditSupplierPayment = (sp: SupplierPayment) => {
    setEditingSupplierPayment(sp);
    setPaySupplierId(sp.supplierId);
    setPayPOId(sp.purchaseOrderId || '');
    setPayAmount(sp.amount);
    setPayDate(sp.paymentDate);
    setPayMethod(sp.paymentMethod);
    setPayAccountId(sp.accountId);
    setChequeNo(sp.chequeNo || '');
    setChequeDate(sp.chequeDate || '');
    setChequeStatus(sp.chequeStatus || 'pending');
    setVoucherNo(sp.voucherNo || '');
    setPayNotes(sp.notes || '');
    setIsSupplierPayModalOpen(true);
  };

  const handleSaveSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplierId || !payAccountId || payAmount <= 0) {
      showToast('Please select a supplier, payment account, and valid amount');
      return;
    }

    if (editingSupplierPayment) {
      updateSupplierPayment(editingSupplierPayment.id, {
        supplierId: paySupplierId,
        purchaseOrderId: payPOId || undefined,
        amount: Number(payAmount),
        paymentDate: payDate,
        paymentMethod: payMethod,
        accountId: payAccountId,
        chequeNo,
        chequeDate,
        chequeStatus: payMethod === 'cheque' ? chequeStatus : undefined,
        voucherNo,
        notes: payNotes
      });
    } else {
      addSupplierPayment({
        supplierId: paySupplierId,
        supplierName: '',
        business: activeBusiness === 'all' ? 'amanot_electronics' : activeBusiness,
        purchaseOrderId: payPOId || undefined,
        amount: Number(payAmount),
        paymentDate: payDate,
        paymentMethod: payMethod,
        accountId: payAccountId,
        accountName: '',
        chequeNo,
        chequeDate,
        chequeStatus: payMethod === 'cheque' ? chequeStatus : undefined,
        voucherNo,
        notes: payNotes
      });
    }

    setIsSupplierPayModalOpen(false);
  };

  const handleToggleChequeStatus = (sp: SupplierPayment, newStatus: 'cleared' | 'bounced') => {
    updateSupplierPayment(sp.id, { chequeStatus: newStatus });
    showToast(`Cheque ${sp.chequeNo} marked as ${newStatus.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-blue-600" />
            Accounts & Financial Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage Bank, MFS (bKash/Nagad), Cash drawers, execute internal account transfers, and track supplier due payments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddAccount}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>

          <button
            onClick={handleOpenAddTransfer}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Internal Transfer
          </button>

          <button
            onClick={() => handleOpenAddSupplierPayment()}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            <DollarSign className="w-4 h-4" />
            Pay Supplier Due
          </button>
        </div>
      </div>

      {/* Net Liquidity Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-100">Main Cash Balances</span>
            <Wallet className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-black font-mono mt-2">৳{totals.cash.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-100 mt-1">Ready cash across active drawers</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm border border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100">Bank Accounts</span>
            <Building2 className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-black font-mono mt-2">৳{totals.bank.toLocaleString()}</p>
          <p className="text-[10px] text-blue-100 mt-1">Commercial bank liquid deposits</p>
        </div>

        <div className="bg-gradient-to-br from-pink-600 to-rose-700 text-white p-5 rounded-2xl shadow-sm border border-pink-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-100">MFS Wallets (bKash/Nagad)</span>
            <Smartphone className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-black font-mono mt-2">৳{totals.mfs.toLocaleString()}</p>
          <p className="text-[10px] text-pink-100 mt-1">Merchant QR & counter digital cash</p>
        </div>

        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Net Liquidity</span>
            <Landmark className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-400 mt-2">৳{totals.grand.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1">Combined total store accounts</p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`pb-3 px-2 font-black text-xs border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'accounts'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Accounts Directory ({filteredAccounts.length})
        </button>

        <button
          onClick={() => setActiveSubTab('transfers')}
          className={`pb-3 px-2 font-black text-xs border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'transfers'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Internal Transfers ({filteredTransfers.length})
        </button>

        <button
          onClick={() => setActiveSubTab('supplier_payments')}
          className={`pb-3 px-2 font-black text-xs border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'supplier_payments'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Supplier Payments & Date Tracking ({filteredSupplierPayments.length})
        </button>
      </div>

      {/* SUB-TAB 1: ACCOUNTS DIRECTORY */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search account name, number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Filter Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-xl text-xs font-bold bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="cash">Cash Accounts</option>
                <option value="bank">Bank Accounts</option>
                <option value="mfs">MFS (bKash/Nagad/Rocket)</option>
                <option value="cheque">Cheque Register</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map((acc) => {
              const isBank = acc.type === 'bank';
              const isMFS = acc.type === 'mfs';
              const isCash = acc.type === 'cash';

              return (
                <div
                  key={acc.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b pb-3">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border mb-1 ${
                            isBank
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : isMFS
                              ? 'bg-pink-50 text-pink-800 border-pink-200'
                              : isCash
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {acc.type === 'bank'
                            ? 'Bank Account'
                            : acc.type === 'mfs'
                            ? `MFS (${acc.mfsProvider?.toUpperCase()})`
                            : acc.type === 'cash'
                            ? 'Cash Drawer'
                            : 'Cheque Register'}
                        </span>
                        <span
                          className={`inline-block ml-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border mb-1 ${
                            acc.business === 'all'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {BUSINESS_LABELS[acc.business]}
                        </span>
                        <h3 className="text-base font-black text-slate-900 leading-snug">{acc.accountName}</h3>
                        {acc.bankName && (
                          <p className="text-xs text-slate-500 font-bold">{acc.bankName} • {acc.branch || 'Main Branch'}</p>
                        )}
                        {acc.accountNumber && (
                          <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">A/C: {acc.accountNumber}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenEditAccount(acc)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Opening Balance</span>
                        <span className="font-mono font-extrabold text-slate-700">৳{acc.openingBalance.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Balance</span>
                        <span className="font-mono font-black text-emerald-600 text-sm">৳{acc.currentBalance.toLocaleString()}</span>
                      </div>
                    </div>

                    {acc.notes && <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">{acc.notes}</p>}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t text-slate-400 font-medium">
                    <span className="text-[10px]">Added: {acc.createdAt}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {acc.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INTERNAL TRANSFERS */}
      {activeSubTab === 'transfers' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                Internal Account Transfer Records
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Double-entry logs of transfers between Cash, Bank, and MFS accounts with instant balance reconciliation.
              </p>
            </div>

            <button
              onClick={handleOpenAddTransfer}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Transfer
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Ref No</th>
                  <th className="p-3">From Account</th>
                  <th className="p-3">To Account</th>
                  <th className="p-3 text-right">Transfer Amount</th>
                  <th className="p-3 text-right">Fee</th>
                  <th className="p-3">Created By</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No internal transfer records found.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono">{tr.date}</td>
                      <td className="p-3 font-mono text-blue-600">{tr.referenceNo || 'N/A'}</td>
                      <td className="p-3 text-rose-700 font-bold flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" /> {tr.fromAccountName}
                      </td>
                      <td className="p-3 text-emerald-700 font-bold">
                        <div className="flex items-center gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> {tr.toAccountName}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                        ৳{tr.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {tr.transferFee ? `৳${tr.transferFee}` : '৳0'}
                      </td>
                      <td className="p-3 text-slate-500">{tr.createdBy}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditTransfer(tr)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteAccountTransfer(tr.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SUPPLIER PAYMENTS & DATE TRACKING */}
      {activeSubTab === 'supplier_payments' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-purple-600" />
                  Supplier Payments Comprehensive Date Filters
                </h2>
                <p className="text-xs text-slate-500">Filter payments by day, yesterday, month-by-month, year, or custom date range.</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <span>Total Filtered Payments:</span>
                <span className="font-mono text-base font-black text-purple-700">৳{supplierPaymentsTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Presets */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl font-bold">
                <button
                  onClick={() => setDateFilterPreset('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilterPreset === 'all' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setDateFilterPreset('today')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilterPreset === 'today' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilterPreset('yesterday')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilterPreset === 'yesterday' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => setDateFilterPreset('month')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilterPreset === 'month' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
                >
                  By Month
                </button>
                <button
                  onClick={() => setDateFilterPreset('year')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilterPreset === 'year' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
                >
                  By Year
                </button>
                <button
                  onClick={() => setDateFilterPreset('custom')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilterPreset === 'custom' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
                >
                  Custom Range
                </button>
              </div>

              {/* Month Dropdown */}
              {dateFilterPreset === 'month' && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="p-2 border rounded-xl font-bold bg-white text-slate-800"
                  >
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="p-2 border rounded-xl font-bold bg-white text-slate-800"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              )}

              {/* Year Dropdown */}
              {dateFilterPreset === 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="p-2 border rounded-xl font-bold bg-white text-slate-800"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              )}

              {/* Custom Date Range */}
              {dateFilterPreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="p-1.5 border rounded-xl text-xs font-bold"
                  />
                  <span className="text-slate-400 font-bold">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="p-1.5 border rounded-xl text-xs font-bold"
                  />
                </div>
              )}

              {/* Supplier Dropdown Filter */}
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={selectedSupplierFilter}
                  onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                  className="p-2 border rounded-xl font-bold text-xs bg-white text-slate-800"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName || s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs font-medium text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Voucher No</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Paid From Account</th>
                    <th className="p-3">Method / Cheque Info</th>
                    <th className="p-3 text-right">Amount Paid</th>
                    <th className="p-3">Recorded By</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold">
                  {filteredSupplierPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No supplier payment records match the selected date filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSupplierPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono">{p.paymentDate}</td>
                        <td className="p-3 font-mono text-purple-600">{p.voucherNo || 'N/A'}</td>
                        <td className="p-3 font-black text-slate-900">{p.supplierName}</td>
                        <td className="p-3 text-slate-700 font-bold">{p.accountName}</td>
                        <td className="p-3">
                          <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border">
                            {p.paymentMethod}
                          </span>
                          {p.paymentMethod === 'cheque' && (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-[11px] font-mono text-slate-600">No: {p.chequeNo} (Date: {p.chequeDate})</p>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                                    p.chequeStatus === 'cleared'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : p.chequeStatus === 'bounced'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {p.chequeStatus || 'pending'}
                                </span>

                                {p.chequeStatus === 'pending' && (
                                  <button
                                    onClick={() => handleToggleChequeStatus(p, 'cleared')}
                                    className="text-[9px] font-bold text-emerald-600 underline hover:text-emerald-800"
                                  >
                                    Mark Cleared
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-purple-700 text-sm">
                          ৳{p.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-500">{p.recordedBy}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditSupplierPayment(p)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteSupplierPayment(p.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* MODAL 1: ADD / EDIT ACCOUNT */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-600" />
                {editingAccount ? 'Edit Account' : 'Add New Financial Account'}
              </h3>
              <button onClick={() => setIsAddAccountModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dutch Bangla Bank Current A/C, bKash Merchant, Counter Cash"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Account Type *</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white text-xs"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="mfs">MFS Mobile Wallet</option>
                    <option value="cash">Cash Account / Drawer</option>
                    <option value="cheque">Cheque Clearance Register</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Business</label>
                  <select
                    value={accBusiness}
                    onChange={(e) => setAccBusiness(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white text-xs"
                  >
                    <option value="all">All Outlets (Shared)</option>
                    <option value="amanot_electronics">Amanot Electronics</option>
                    <option value="amanot_enterprise">Amanot Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Fields: Bank */}
              {accType === 'bank' && (
                <div className="space-y-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <p className="font-extrabold text-blue-900 text-xs">Bank Details</p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dutch Bangla Bank, City Bank, Islami Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Account Number</label>
                      <input
                        type="text"
                        placeholder="110-120-xxx"
                        value={accNumber}
                        onChange={(e) => setAccNumber(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Branch Name</label>
                      <input
                        type="text"
                        placeholder="Elephant Road Branch"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Fields: MFS */}
              {accType === 'mfs' && (
                <div className="space-y-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                  <p className="font-extrabold text-pink-900 text-xs">Mobile Financial Service Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">MFS Provider</label>
                      <select
                        value={mfsProvider}
                        onChange={(e) => setMfsProvider(e.target.value as any)}
                        className="w-full p-2 border rounded-lg bg-white font-bold"
                      >
                        <option value="bkash">bKash Merchant</option>
                        <option value="nagad">Nagad Merchant</option>
                        <option value="rocket">Rocket</option>
                        <option value="upay">Upay</option>
                        <option value="other">Other MFS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Mobile Wallet Number</label>
                      <input
                        type="text"
                        placeholder="017xxxxxxxx"
                        value={accNumber}
                        onChange={(e) => setAccNumber(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Opening Balance (BDT ৳) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={openingBal}
                  onChange={(e) => setOpeningBal(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-xl font-mono font-black text-sm text-emerald-700"
                />
                <p className="text-[10px] text-slate-400 mt-1">Starting balance when configuring this account into system ledger.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={accNotes}
                  onChange={(e) => setAccNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                  placeholder="Optional details..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow"
                >
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERNAL ACCOUNT TRANSFER */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                {editingTransfer ? 'Edit Internal Transfer' : 'Execute Internal Account Transfer'}
              </h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">From Account (Source - Debited) *</label>
                <select
                  value={fromAccId}
                  onChange={(e) => setFromAccId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-rose-700"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{BUSINESS_LABELS[a.business]}] {a.accountName} (Bal: ৳{a.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">To Account (Destination - Credited) *</label>
                <select
                  value={toAccId}
                  onChange={(e) => setToAccId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-emerald-700"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{BUSINESS_LABELS[a.business]}] {a.accountName} (Bal: ৳{a.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  Transfers may cross businesses — use this to settle counter cash into a shared bank account.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Transfer Amount (BDT) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={trAmount}
                    onChange={(e) => setTrAmount(Number(e.target.value))}
                    className="w-full p-2.5 border rounded-xl font-mono font-black text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Transfer Fee (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={trFee}
                    onChange={(e) => setTrFee(Number(e.target.value))}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Transfer Date</label>
                  <input
                    type="date"
                    value={trDate}
                    onChange={(e) => setTrDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reference No / Slip #</label>
                  <input
                    type="text"
                    value={trRef}
                    onChange={(e) => setTrRef(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Transfer Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. End of day counter cash deposit to bank"
                  value={trNotes}
                  onChange={(e) => setTrNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  {editingTransfer ? 'Update Transfer' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PAY SUPPLIER DUE */}
      {isSupplierPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                {editingSupplierPayment ? 'Edit Supplier Payment Record' : 'Record Supplier Payment'}
              </h3>
              <button onClick={() => setIsSupplierPayModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierPayment} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Supplier *</label>
                <select
                  value={paySupplierId}
                  onChange={(e) => setPaySupplierId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-900"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName || s.name} (Owed Due: ৳{s.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Linked Purchase Order (Optional)</label>
                <select
                  value={payPOId}
                  onChange={(e) => setPayPOId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-700"
                >
                  <option value="">General Supplier Balance Payment</option>
                  {purchaseOrders
                    .filter((po) => po.supplierId === paySupplierId && po.paymentStatus !== 'paid')
                    .map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.id} - Total ৳{po.totalCost.toLocaleString()} (Paid: ৳{po.paidAmount.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Amount (BDT) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full p-2.5 border rounded-xl font-mono font-black text-sm text-purple-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-800"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mfs">MFS Mobile Wallet</option>
                    <option value="cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Paid From Account *</label>
                  <select
                    value={payAccountId}
                    onChange={(e) => setPayAccountId(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-800"
                  >
                    {payableAccounts.length === 0 && <option value="">No account for this business</option>}
                    {payableAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName}
                        {a.business === 'all' ? ' [Shared]' : ''} (Bal: ৳{a.currentBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Cheque Fields */}
              {payMethod === 'cheque' && (
                <div className="space-y-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="font-extrabold text-purple-900 text-xs">Bank Cheque Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Cheque Number</label>
                      <input
                        type="text"
                        placeholder="CQ-998877"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Cheque Date / Post-Date</label>
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Initial Cheque Status</label>
                    <select
                      value={chequeStatus}
                      onChange={(e) => setChequeStatus(e.target.value as any)}
                      className="w-full p-2 border rounded-lg bg-white font-bold"
                    >
                      <option value="pending font-bold text-amber-700">Pending Clearance</option>
                      <option value="cleared font-bold text-emerald-700">Cleared</option>
                      <option value="bounced font-bold text-rose-700">Bounced</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Voucher No</label>
                  <input
                    type="text"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="Payment details..."
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsSupplierPayModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow"
                >
                  {editingSupplierPayment ? 'Update Payment Record' : 'Record Supplier Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
