import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BusinessType, Expense } from '../../types';
import { getCompatiblePaymentAccounts, resolvePaymentAccount } from '../../utils/paymentAccounts';
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  Tag,
  User,
  Building2,
  TrendingDown,
  Filter,
  FileSpreadsheet,
  Trash2,
  Edit3,
  CheckCircle2,
  X,
  CreditCard,
  Receipt,
  Repeat,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterListsManagerModal } from '../common/MasterListsManagerModal';

export const ExpensesView: React.FC = () => {
  const { expenses, expenseCategories, addExpense, updateExpense, deleteExpense, accounts, activeBusiness, currentUser, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMasterListsModalOpen, setIsMasterListsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Date Filter Modes
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'this_month' | 'last_month' | 'custom' | 'all'>('this_month');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Secondary Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');

  // Form State
  const [business, setBusiness] = useState<BusinessType>('amanot_electronics');
  const [category, setCategory] = useState<Expense['category']>('Shop Rent');
  const [amount, setAmount] = useState<number>(5000);
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'bank_transfer' | 'bkash_nagad' | 'card'>('cash');
  const [accountId, setAccountId] = useState<string>('');
  const [voucherNo, setVoucherNo] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Accounts this business may pay from — its own first, then shared/combined ones
  const payableAccounts = useMemo(
    () => getCompatiblePaymentAccounts(accounts, paymentMode, business),
    [accounts, paymentMode, business]
  );

  // Keep the picker on a valid account when the business or payment mode changes
  useEffect(() => {
    if (!payableAccounts.some((a) => a.id === accountId)) {
      setAccountId(payableAccounts[0]?.id || '');
    }
  }, [payableAccounts, accountId]);

  // Helper date calculators
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const thisMonthPrefix = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const lastMonthPrefix = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Business filter
      if (activeBusiness !== 'all' && e.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && e.business !== currentUser.assignedBusiness) return false;

      // Category filter
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;

      // Payment Mode filter
      if (selectedPaymentMode !== 'all' && e.paymentMode !== selectedPaymentMode) return false;

      // Date Filter
      if (dateFilterMode === 'today' && e.date !== todayStr) return false;
      if (dateFilterMode === 'yesterday' && e.date !== yesterdayStr) return false;
      if (dateFilterMode === 'this_month' && !e.date.startsWith(thisMonthPrefix)) return false;
      if (dateFilterMode === 'last_month' && !e.date.startsWith(lastMonthPrefix)) return false;
      if (dateFilterMode === 'custom') {
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.vendorName && e.vendorName.toLowerCase().includes(q)) ||
          (e.voucherNo && e.voucherNo.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [
    expenses,
    activeBusiness,
    currentUser,
    selectedCategory,
    selectedPaymentMode,
    dateFilterMode,
    todayStr,
    yesterdayStr,
    thisMonthPrefix,
    lastMonthPrefix,
    fromDate,
    toDate,
    searchQuery
  ]);

  // Key KPI metrics
  const totalOutflow = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const topCategory = categoryBreakdown[0] ? categoryBreakdown[0][0] : 'N/A';

  const resetForm = () => {
    setTitle('');
    setAmount(5000);
    setVendorName('');
    setVoucherNo('');
    setReceiptUrl('');
    setIsRecurring(false);
    setNotes('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setEditingExpense(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setBusiness(exp.business);
    setCategory(exp.category);
    setTitle(exp.title);
    setAmount(exp.amount);
    setVendorName(exp.vendorName || '');
    setPaymentMode(exp.paymentMode || 'cash');
    setVoucherNo(exp.voucherNo || '');
    setReceiptUrl(exp.receiptUrl || '');
    setIsRecurring(exp.isRecurring || false);
    setExpenseDate(exp.date);
    setNotes(exp.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    const acc = resolvePaymentAccount(accounts, paymentMode, business, accountId);
    if (!acc) {
      showToast(`Add an active ${paymentMode.replace('_', ' ')} account for this business before recording the expense.`);
      return;
    }
    const selectedAccId = acc.id;
    const selectedAccName = acc.accountName;

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        business,
        category,
        amount,
        title,
        vendorName,
        paymentMode,
        voucherNo,
        receiptUrl,
        isRecurring,
        date: expenseDate,
        notes,
        accountId: selectedAccId,
        accountName: selectedAccName
      });
    } else {
      addExpense({
        business,
        category,
        amount,
        title,
        vendorName,
        paymentMode,
        voucherNo,
        receiptUrl,
        isRecurring,
        date: expenseDate,
        notes,
        accountId: selectedAccId,
        accountName: selectedAccName
      });
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete expense "${title}"?`)) {
      deleteExpense(id);
    }
  };

  const handleExportExcel = () => {
    const data = filteredExpenses.map((exp) => ({
      Date: exp.date,
      Business: exp.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise',
      Category: exp.category,
      Title: exp.title,
      Vendor: exp.vendorName || '-',
      PaymentMode: exp.paymentMode || 'cash',
      AmountBDT: exp.amount,
      VoucherNo: exp.voucherNo || '-',
      IsRecurring: exp.isRecurring ? 'Yes' : 'No',
      RecordedBy: exp.recordedBy,
      Notes: exp.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `Expenses_Report_${dateFilterMode}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner — title + actions (top right) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-rose-600" />
          Professional Business Expense Manager
        </h1>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsMasterListsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition active:scale-98"
          >
            <Tag className="w-4 h-4" />
            Manage Expense Categories
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Report (Excel)
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            Record New Expense
          </button>
        </div>
      </div>

      {/* Overview KPI Cards (above the date filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Selected Outflow</p>
            <p className="text-2xl font-black text-rose-600 font-mono mt-0.5">৳{totalOutflow.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">{filteredExpenses.length} transaction entries</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Expense Category</p>
            <p className="text-lg font-black text-slate-900 truncate max-w-[150px] mt-0.5">{topCategory}</p>
            <p className="text-[10px] text-slate-500 font-mono font-bold mt-1">
              ৳{(categoryBreakdown[0] ? categoryBreakdown[0][1] : 0).toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
            <Tag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Per Entry</p>
            <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
              ৳{(filteredExpenses.length ? Math.round(totalOutflow / filteredExpenses.length) : 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Cost efficiency metric</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recurring Monthly Bills</p>
            <p className="text-xl font-black text-indigo-700 font-mono mt-0.5">
              {filteredExpenses.filter((e) => e.isRecurring).length} Items
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Rent, Wifi, Staff salaries</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
            <Repeat className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Date Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-rose-600" /> Period:
          </span>

          <button
            onClick={() => setDateFilterMode('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'today' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Today (Daily)
          </button>

          <button
            onClick={() => setDateFilterMode('yesterday')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'yesterday' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Yesterday
          </button>

          <button
            onClick={() => setDateFilterMode('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'this_month' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            This Month
          </button>

          <button
            onClick={() => setDateFilterMode('last_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'last_month' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last Month
          </button>

          <button
            onClick={() => setDateFilterMode('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'custom' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Custom Range (From - To)
          </button>

          <button
            onClick={() => setDateFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'all' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Custom Date Pickers */}
        {dateFilterMode === 'custom' && (
          <div className="flex items-center gap-2 bg-rose-50/80 p-2 rounded-xl border border-rose-200 shrink-0">
            <div>
              <span className="text-[10px] font-bold text-rose-800 block">From Date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="p-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
              />
            </div>
            <span className="text-xs font-bold text-rose-600 self-end pb-1.5">to</span>
            <div>
              <span className="text-[10px] font-bold text-rose-800 block">To Date</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="p-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown Progress Bar Bar */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-rose-600" /> Category Distribution Breakdown
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {categoryBreakdown.map(([catName, sum]) => {
              const pct = totalOutflow ? Math.round((sum / totalOutflow) * 100) : 0;
              return (
                <div key={catName} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="truncate">{catName}</span>
                    <span className="font-mono text-rose-600">৳{sum.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by expense title, category, vendor payee, voucher #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Categories</option>
            <option value="Shop Rent">Shop Rent</option>
            <option value="Electricity & Utility">Electricity & Utility</option>
            <option value="Staff Salary">Staff Salary</option>
            <option value="Transport & Freight">Transport & Freight</option>
            <option value="Entertainment & Tea">Entertainment & Tea</option>
            <option value="Marketing & Promo">Marketing & Promo</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash Payment</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="bkash_nagad">bKash / Nagad</option>
            <option value="card">Card Payment</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Date & Voucher #</th>
                <th className="p-4">Business Entity</th>
                <th className="p-4">Category</th>
                <th className="p-4">Expense Title & Vendor</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4 text-right">Amount (BDT)</th>
                <th className="p-4 text-right">Recorded By</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No expense records found matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const isElectronics = exp.business === 'amanot_electronics';

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-medium text-slate-600">
                        <p className="font-bold text-slate-900">{exp.date}</p>
                        {exp.voucherNo && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Voucher: {exp.voucherNo}</p>
                        )}
                        {exp.isRecurring && (
                          <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5 border border-indigo-200">
                            Recurring
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${
                          isElectronics ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-xs">
                          {exp.category}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-900 text-sm">{exp.title}</p>
                        {exp.vendorName && (
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Payee: <span className="font-bold">{exp.vendorName}</span></p>
                        )}
                        {exp.notes && (
                          <p className="text-[10px] text-slate-400 italic truncate max-w-xs">{exp.notes}</p>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="capitalize font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {exp.paymentMode ? exp.paymentMode.replace('_', ' ') : 'Cash'}
                        </span>
                      </td>

                      <td className="p-4 text-right font-mono font-black text-rose-600 text-sm">
                        ৳{exp.amount.toLocaleString()}
                      </td>

                      <td className="p-4 text-right text-slate-500 font-medium">{exp.recordedBy}</td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="Edit Expense"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(exp.id, exp.title)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Record / Edit Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 my-auto animate-in zoom-in-95 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-rose-600" />
                {editingExpense ? 'Edit Business Expense' : 'Record New Business Expense'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-3.5 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Business Entity</label>
                  <select
                    value={business}
                    onChange={(e) => setBusiness(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                  >
                    <option value="amanot_electronics">Amanot Electronics</option>
                    <option value="amanot_enterprise">Amanot Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. July Shop Rent / DESCO Bill / Staff Salary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount (BDT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono font-black text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payee / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Landlord / DESCO / Driver"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="bkash_nagad">bKash / Nagad</option>
                    <option value="card">Card Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paid From Account *</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-900"
                >
                  {payableAccounts.length === 0 && (
                    <option value="">No {paymentMode.replace('_', ' ')} account for this business</option>
                  )}
                  {payableAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName}
                      {a.business === 'all' ? ' [Shared]' : ''} (Current Bal: ৳{a.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  Only {business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'} and shared accounts are listed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Voucher / Bill No.</label>
                  <input
                    type="text"
                    placeholder="e.g. VCH-9812"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    <span className="font-bold text-xs text-slate-700">Recurring Monthly Expense</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Additional Details</label>
                <textarea
                  rows={2}
                  placeholder="Optional explanatory notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl shadow-md transition active:scale-98"
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Lists Modal for Expense Categories */}
      {isMasterListsModalOpen && (
        <MasterListsManagerModal
          defaultTab="expenses"
          onClose={() => setIsMasterListsModalOpen(false)}
        />
      )}

    </div>
  );
};
