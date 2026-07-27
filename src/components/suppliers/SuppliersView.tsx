import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { BusinessType, SupplierRequisition, PurchaseOrder, SupplierPayment } from '../../types';
import { exportSupplierRequisitionPDF, exportSupplierPaymentVoucherPDF } from '../../utils/supplierPdfExport';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  PackagePlus,
  X,
  FileText,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  DollarSign,
  Landmark,
  Package,
  Calendar,
  Filter,
  FileCheck,
  CreditCard,
  Check,
  AlertCircle,
  Printer,
  Upload
} from 'lucide-react';
import { SupplierRequisitionModal } from './SupplierRequisitionModal';
import { BulkProductEntryModal } from './BulkProductEntryModal';

export const SuppliersView: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    products,
    supplierRequisitions,
    deleteSupplierRequisition,
    purchaseOrders,
    deletePurchaseOrder,
    updatePurchaseOrder,
    supplierPayments,
    addSupplierPayment,
    updateSupplierPayment,
    deleteSupplierPayment,
    accounts,
    activeBusiness,
    currentUser,
    settings,
    setActiveTab
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'suppliers' | 'requisitions' | 'purchase_orders' | 'supplier_payments'>('suppliers');

  // Modals state
  const [isAddSupplierModal, setIsAddSupplierModal] = useState(false);
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<SupplierRequisition | null>(null);

  const [isBulkEntryModalOpen, setIsBulkEntryModalOpen] = useState(false);
  const [prefillReqForBulk, setPrefillReqForBulk] = useState<SupplierRequisition | null>(null);

  // Pay Purchase Order Due Modal State
  const [selectedPODue, setSelectedPODue] = useState<PurchaseOrder | null>(null);
  const [poPayAmount, setPoPayAmount] = useState<number>(0);
  const [poPayDate, setPoPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [poPayAccountId, setPoPayAccountId] = useState<string>(accounts[0]?.id || '');
  const [poPayPaymentMethod, setPoPayPaymentMethod] = useState<'cash' | 'bank' | 'mfs' | 'cheque'>('cash');
  const [poPayChequeNo, setPoPayChequeNo] = useState<string>('');
  const [poPayChequeDate, setPoPayChequeDate] = useState<string>('');
  const [poPayVoucherNo, setPoPayVoucherNo] = useState<string>('');
  const [poPayNotes, setPoPayNotes] = useState<string>('');

  // Standalone Supplier Payment Modal State
  const [isPaySupplierModalOpen, setIsPaySupplierModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [spSupplierId, setSpSupplierId] = useState<string>('');
  const [spBusiness, setSpBusiness] = useState<BusinessType>('amanot_electronics');
  const [spAmount, setSpAmount] = useState<number>(10000);
  const [spPaymentDate, setSpPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [spPaymentMethod, setSpPaymentMethod] = useState<'cash' | 'bank' | 'mfs' | 'cheque'>('cash');
  const [spAccountId, setSpAccountId] = useState<string>(accounts[0]?.id || '');
  const [spChequeNo, setSpChequeNo] = useState<string>('');
  const [spChequeDate, setSpChequeDate] = useState<string>('');
  const [spChequeStatus, setSpChequeStatus] = useState<'pending' | 'cleared' | 'bounced'>('pending');
  const [spVoucherNo, setSpVoucherNo] = useState<string>('');
  const [spBankSlip, setSpBankSlip] = useState<string>('');
  const [spNotes, setSpNotes] = useState<string>('');

  // Date Filtering State for Supplier Payments
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'yesterday' | 'month' | 'year' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Secondary Filters for Supplier Payments
  const [spSupplierFilter, setSpSupplierFilter] = useState<string>('all');
  const [spMethodFilter, setSpMethodFilter] = useState<string>('all');

  // New Supplier Form
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [business, setBusiness] = useState<BusinessType>('amanot_electronics');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Helper date constants
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !companyName) return;

    addSupplier({
      name,
      companyName,
      business,
      phone,
      address,
      brandsSupplied: business === 'amanot_electronics' ? ['Gree', 'Konka', 'Haiko'] : ['Haier']
    });

    setIsAddSupplierModal(false);
    setName('');
    setCompanyName('');
    setPhone('');
    setAddress('');
  };

  const handleOpenCreateRequisition = () => {
    setEditingRequisition(null);
    setIsRequisitionModalOpen(true);
  };

  const handleOpenBulkEntry = (req?: SupplierRequisition) => {
    setPrefillReqForBulk(req || null);
    setIsBulkEntryModalOpen(true);
  };

  // Open PO Pay Due Modal
  const handleOpenPayPODueModal = (po: PurchaseOrder) => {
    const remainingDue = Math.max(0, po.totalCost - po.paidAmount);
    setSelectedPODue(po);
    setPoPayAmount(remainingDue);
    setPoPayDate(new Date().toISOString().split('T')[0]);
    setPoPayAccountId(accounts[0]?.id || '');
    setPoPayPaymentMethod('cash');
    setPoPayChequeNo('');
    setPoPayChequeDate('');
    setPoPayVoucherNo(`VCH-PO-${po.id}`);
    setPoPayNotes(`Payment for Purchase Order #${po.id}`);
  };

  const handlePayPODueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPODue || poPayAmount <= 0) return;

    const targetAccId = poPayAccountId || accounts[0]?.id || 'cash-default';
    const acc = accounts.find((a) => a.id === targetAccId);
    const targetAccName = acc ? acc.accountName : (accounts[0]?.accountName || 'Bank / Cash Drawer');

    addSupplierPayment({
      supplierId: selectedPODue.supplierId,
      supplierName: selectedPODue.supplierName,
      business: selectedPODue.business,
      purchaseOrderId: selectedPODue.id,
      amount: poPayAmount,
      paymentDate: poPayDate,
      paymentMethod: poPayPaymentMethod,
      accountId: targetAccId,
      accountName: targetAccName,
      chequeNo: poPayChequeNo || undefined,
      chequeDate: poPayChequeDate || undefined,
      chequeStatus: poPayPaymentMethod === 'cheque' ? 'pending' : undefined,
      voucherNo: poPayVoucherNo || undefined,
      notes: poPayNotes || undefined,
      recordedBy: currentUser?.name || 'Admin'
    });

    setSelectedPODue(null);
  };

  // Standalone Supplier Payment Openers
  const handleOpenAddSupplierPayment = (supId?: string) => {
    setEditingPayment(null);
    setSpSupplierId(supId || (suppliers[0]?.id || ''));
    setSpBusiness('amanot_electronics');
    setSpAmount(10000);
    setSpPaymentDate(new Date().toISOString().split('T')[0]);
    setSpPaymentMethod('cash');
    setSpAccountId(accounts[0]?.id || '');
    setSpChequeNo('');
    setSpChequeDate('');
    setSpChequeStatus('pending');
    setSpVoucherNo(`VCH-${Math.floor(1000 + Math.random() * 9000)}`);
    setSpBankSlip('');
    setSpNotes('Supplier payment for inventory settlement');
    setIsPaySupplierModalOpen(true);
  };

  const handleOpenEditSupplierPayment = (sp: SupplierPayment) => {
    setEditingPayment(sp);
    setSpSupplierId(sp.supplierId);
    setSpBusiness(sp.business);
    setSpAmount(sp.amount);
    setSpPaymentDate(sp.paymentDate);
    setSpPaymentMethod(sp.paymentMethod);
    setSpAccountId(sp.accountId);
    setSpChequeNo(sp.chequeNo || '');
    setSpChequeDate(sp.chequeDate || '');
    setSpChequeStatus(sp.chequeStatus || 'pending');
    setSpVoucherNo(sp.voucherNo || '');
    setSpBankSlip(sp.bankSlipUrl || '');
    setSpNotes(sp.notes || '');
    setIsPaySupplierModalOpen(true);
  };

  const handleBankSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) setSpBankSlip(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSupplierPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spSupplierId || spAmount <= 0) return;

    const supp = suppliers.find((s) => s.id === spSupplierId);
    const acc = accounts.find((a) => a.id === spAccountId);
    const targetAccId = spAccountId || accounts[0]?.id || 'cash-default';
    const targetAccName = acc ? acc.accountName : (accounts[0]?.accountName || 'Cash Account');

    if (editingPayment) {
      updateSupplierPayment(editingPayment.id, {
        supplierId: spSupplierId,
        supplierName: supp ? supp.companyName : editingPayment.supplierName,
        business: spBusiness,
        amount: spAmount,
        paymentDate: spPaymentDate,
        paymentMethod: spPaymentMethod,
        accountId: targetAccId,
        accountName: targetAccName,
        chequeNo: spChequeNo || undefined,
        chequeDate: spChequeDate || undefined,
        chequeStatus: spPaymentMethod === 'cheque' ? spChequeStatus : undefined,
        voucherNo: spVoucherNo || undefined,
        bankSlipUrl: spPaymentMethod === 'bank' || spPaymentMethod === 'mfs' ? spBankSlip || undefined : undefined,
        notes: spNotes || undefined
      });
    } else {
      addSupplierPayment({
        supplierId: spSupplierId,
        supplierName: supp ? supp.companyName : 'Supplier',
        business: spBusiness,
        amount: spAmount,
        paymentDate: spPaymentDate,
        paymentMethod: spPaymentMethod,
        accountId: targetAccId,
        accountName: targetAccName,
        chequeNo: spChequeNo || undefined,
        chequeDate: spChequeDate || undefined,
        chequeStatus: spPaymentMethod === 'cheque' ? 'pending' : undefined,
        voucherNo: spVoucherNo || undefined,
        bankSlipUrl: spPaymentMethod === 'bank' || spPaymentMethod === 'mfs' ? spBankSlip || undefined : undefined,
        notes: spNotes || undefined,
        recordedBy: currentUser?.name || 'Admin'
      });
    }

    setIsPaySupplierModalOpen(false);
  };

  const handleToggleChequeStatus = (sp: SupplierPayment, newStatus: 'cleared' | 'bounced') => {
    updateSupplierPayment(sp.id, { chequeStatus: newStatus });
  };

  // Filtered collections
  const filteredRequisitions = useMemo(() => {
    return supplierRequisitions.filter((r) => {
      if (activeBusiness !== 'all' && r.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && r.business !== currentUser.assignedBusiness) return false;
      return true;
    });
  }, [supplierRequisitions, activeBusiness, currentUser]);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (activeBusiness !== 'all' && po.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && po.business !== currentUser.assignedBusiness) return false;
      return true;
    });
  }, [purchaseOrders, activeBusiness, currentUser]);

  const filteredSupplierPayments = useMemo(() => {
    return supplierPayments.filter((sp) => {
      if (activeBusiness !== 'all' && sp.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && sp.business !== currentUser.assignedBusiness) return false;
      if (spSupplierFilter !== 'all' && sp.supplierId !== spSupplierFilter) return false;
      if (spMethodFilter !== 'all' && sp.paymentMethod !== spMethodFilter) return false;

      if (dateFilterMode === 'today' && sp.paymentDate !== todayStr) return false;
      if (dateFilterMode === 'yesterday' && sp.paymentDate !== yesterdayStr) return false;
      if (dateFilterMode === 'month' && !sp.paymentDate.startsWith(selectedMonth)) return false;
      if (dateFilterMode === 'year' && !sp.paymentDate.startsWith(selectedYear)) return false;
      if (dateFilterMode === 'custom') {
        if (fromDate && sp.paymentDate < fromDate) return false;
        if (toDate && sp.paymentDate > toDate) return false;
      }
      return true;
    });
  }, [
    supplierPayments,
    activeBusiness,
    currentUser,
    spSupplierFilter,
    spMethodFilter,
    dateFilterMode,
    todayStr,
    yesterdayStr,
    selectedMonth,
    selectedYear,
    fromDate,
    toDate
  ]);

  // Payment totals metrics
  const paymentMetrics = useMemo(() => {
    let total = 0;
    let cash = 0;
    let bankMfs = 0;
    let pendingChequeVal = 0;
    let pendingChequeCount = 0;

    filteredSupplierPayments.forEach((sp) => {
      total += sp.amount;
      if (sp.paymentMethod === 'cash') cash += sp.amount;
      if (sp.paymentMethod === 'bank' || sp.paymentMethod === 'mfs') bankMfs += sp.amount;
      if (sp.paymentMethod === 'cheque' && sp.chequeStatus === 'pending') {
        pendingChequeVal += sp.amount;
        pendingChequeCount += 1;
      }
    });

    return { total, cash, bankMfs, pendingChequeVal, pendingChequeCount };
  }, [filteredSupplierPayments]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-teal-600" />
            Suppliers & Restock Management
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Distributor partners, stock requisitions, bulk product entries, and supplier payments ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAddSupplierPayment()}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            <DollarSign className="w-4 h-4" />
            Pay Supplier Due
          </button>

          <button
            onClick={() => handleOpenBulkEntry()}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            <PackagePlus className="w-4 h-4" />
            Bulk Product Entry
          </button>

          <button
            onClick={() => setIsAddSupplierModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('suppliers')}
          className={`pb-3 px-2 font-black text-xs border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeSubTab === 'suppliers'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Suppliers Directory ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveSubTab('requisitions')}
          className={`pb-3 px-2 font-black text-xs border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeSubTab === 'requisitions'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Supplier Requisitions ({filteredRequisitions.length})
        </button>

        <button
          onClick={() => setActiveSubTab('purchase_orders')}
          className={`pb-3 px-2 font-black text-xs border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeSubTab === 'purchase_orders'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Bulk Stock & PO Audit ({filteredPOs.length})
        </button>

        <button
          onClick={() => setActiveSubTab('supplier_payments')}
          className={`pb-3 px-2 font-black text-xs border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeSubTab === 'supplier_payments'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Supplier Payments & Date Tracking ({filteredSupplierPayments.length})
        </button>
      </div>

      {/* SUB-TAB 1: SUPPLIERS DIRECTORY */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suppliers.map((sup) => {
            const isElectronics = sup.business === 'amanot_electronics';

            return (
              <div key={sup.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 hover:shadow-md transition">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border mb-1 ${
                      isElectronics ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {isElectronics ? 'Amanot Electronics Partner' : 'Amanot Enterprise Partner'}
                    </span>
                    <h3 className="text-base font-black text-slate-900">{sup.companyName}</h3>
                    <p className="text-xs text-slate-500 font-medium">Contact Person: {sup.name}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-bold">Owed Balance</span>
                    <span className="text-lg font-black font-mono text-rose-600">৳{sup.balance.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {sup.phone}</p>
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {sup.address}</p>
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Brands Supplied:</span>
                    <span className="font-semibold text-teal-700">{sup.brandsSupplied.join(', ')}</span>
                  </p>
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    onClick={() => handleOpenAddSupplierPayment(sup.id)}
                    className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Pay Supplier Due Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-TAB 2: SUPPLIER REQUISITIONS */}
      {activeSubTab === 'requisitions' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Active Supplier Requisitions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage demands sent to distributors before stock arrival.
              </p>
            </div>

            <button
              onClick={handleOpenCreateRequisition}
              className="px-3.5 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Requisition
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3">Req ID</th>
                  <th className="p-3">Distributor</th>
                  <th className="p-3">Req Date</th>
                  <th className="p-3 text-center">Items</th>
                  <th className="p-3 text-right">Est. Cost</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 font-sans text-xs">
                      No supplier requisitions found. Click "New Requisition" above to issue one.
                    </td>
                  </tr>
                ) : (
                  filteredRequisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-sans font-black text-slate-900">#{req.id}</td>
                      <td className="p-3 font-sans font-bold text-slate-800">{req.supplierName}</td>
                      <td className="p-3 text-slate-600">{req.requisitionDate}</td>
                      <td className="p-3 text-center font-sans font-bold">{req.items.length} Product(s)</td>
                      <td className="p-3 text-right font-black text-slate-900">৳{req.totalEstimatedCost.toLocaleString()}</td>
                      <td className="p-3 text-center font-sans font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          req.status === 'fulfilled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => exportSupplierRequisitionPDF(req, settings)}
                            className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-black border border-purple-200 transition flex items-center gap-1 shadow-2xs"
                            title="Export Branded Requisition PDF in new tab"
                          >
                            <Printer className="w-3.5 h-3.5 text-purple-600" /> Export PDF
                          </button>
                          {req.status !== 'fulfilled' && (
                            <button
                              onClick={() => handleOpenBulkEntry(req)}
                              className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded text-[10px] font-extrabold transition"
                              title="Receive Stock from Supplier"
                            >
                              Receive Stock
                            </button>
                          )}
                          <button
                            onClick={() => deleteSupplierRequisition(req.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Requisition"
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

      {/* SUB-TAB 3: BULK ENTRIES & PURCHASE ORDERS */}
      {activeSubTab === 'purchase_orders' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Bulk Product Entry & Purchase Orders Audit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit history of all bulk product stock entries received from suppliers.
              </p>
            </div>

            <button
              onClick={() => handleOpenBulkEntry()}
              className="px-3.5 py-1.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition flex items-center gap-1.5"
            >
              <PackagePlus className="w-4 h-4" /> Bulk Entry
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3">PO Number</th>
                  <th className="p-3">Distributor Supplier</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Received Items</th>
                  <th className="p-3 text-right">Total Cost</th>
                  <th className="p-3 text-right">Paid Amount</th>
                  <th className="p-3 text-center">Payment Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 font-sans text-xs">
                      No bulk product entries recorded yet. Click "Bulk Entry" above to add products.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => {
                    const due = Math.max(0, po.totalCost - po.paidAmount);

                    return (
                      <tr key={po.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-sans">
                          <span className="font-black text-slate-900 block font-mono">#{po.id}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">
                            {po.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-bold text-slate-800">{po.supplierName}</td>
                        <td className="p-3 text-slate-600">{po.createdAt}</td>
                        <td className="p-3 text-center font-sans font-bold">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                            {po.items.length} Product(s)
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">৳{po.totalCost.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">৳{po.paidAmount.toLocaleString()}</td>
                        <td className="p-3 text-center font-sans font-bold">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              po.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : po.paymentStatus === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {po.paymentStatus.toUpperCase()} {due > 0 && `(Due: ৳${due.toLocaleString()})`}
                            </span>

                            {due > 0 && (
                              <button
                                onClick={() => handleOpenPayPODueModal(po)}
                                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition"
                                title="Pay remaining PO due balance from bank account"
                              >
                                <DollarSign className="w-3 h-3" /> Pay Due
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-sans">
                          <button
                            onClick={() => deletePurchaseOrder(po.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Purchase Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SUPPLIER PAYMENTS & DATE TRACKING */}
      {activeSubTab === 'supplier_payments' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-5 rounded-2xl shadow-sm">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-100 block">Total Supplier Payments</span>
              <p className="text-2xl font-black font-mono mt-2">৳{paymentMetrics.total.toLocaleString()}</p>
              <p className="text-[10px] text-indigo-100 mt-1">Filtered supplier disbursements</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-100 block">Paid via Cash</span>
              <p className="text-2xl font-black font-mono mt-2">৳{paymentMetrics.cash.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-100 mt-1">Disbursed from shop cash drawers</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100 block">Paid via Bank / MFS</span>
              <p className="text-2xl font-black font-mono mt-2">৳{paymentMetrics.bankMfs.toLocaleString()}</p>
              <p className="text-[10px] text-blue-100 mt-1">Digital transfers & bank accounts</p>
            </div>

            <div className="bg-amber-500 text-slate-950 p-5 rounded-2xl shadow-sm border border-amber-400">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950 block">Pending Cheques</span>
              <p className="text-2xl font-black font-mono mt-2">৳{paymentMetrics.pendingChequeVal.toLocaleString()}</p>
              <p className="text-[10px] text-amber-950 font-bold mt-1">{paymentMetrics.pendingChequeCount} cheque(s) awaiting clearance</p>
            </div>
          </div>

          {/* Comprehensive Date & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Mode Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'month', label: 'Month' },
                  { id: 'year', label: 'Year' },
                  { id: 'custom', label: 'Custom Range' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setDateFilterMode(btn.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                      dateFilterMode === btn.id
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleOpenAddSupplierPayment()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Record Supplier Payment
              </button>
            </div>

            {/* Dynamic Controls based on selected Date Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              {dateFilterMode === 'month' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Select Month</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-2 border rounded-xl text-xs font-bold bg-white"
                  />
                </div>
              )}

              {dateFilterMode === 'year' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full p-2 border rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              )}

              {dateFilterMode === 'custom' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full p-2 border rounded-xl text-xs font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full p-2 border rounded-xl text-xs font-bold bg-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Filter Supplier</label>
                <select
                  value={spSupplierFilter}
                  onChange={(e) => setSpSupplierFilter(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs font-bold bg-white"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Payment Method</label>
                <select
                  value={spMethodFilter}
                  onChange={(e) => setSpMethodFilter(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs font-bold bg-white"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="mfs">MFS (bKash/Nagad)</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>
            </div>
          </div>

          {/* Supplier Payments Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                  <tr>
                    <th className="p-3.5">Payment Date</th>
                    <th className="p-3.5">Supplier Name</th>
                    <th className="p-3.5">Business</th>
                    <th className="p-3.5">PO Ref #</th>
                    <th className="p-3.5">Payment Method & Account</th>
                    <th className="p-3.5">Voucher / Cheque Info</th>
                    <th className="p-3.5 text-right">Amount (BDT)</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredSupplierPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-sans text-xs">
                        No supplier payment records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSupplierPayments.map((sp) => {
                      const isCheque = sp.paymentMethod === 'cheque';
                      const isPending = sp.chequeStatus === 'pending';
                      const isCleared = sp.chequeStatus === 'cleared';

                      return (
                        <tr key={sp.id} className="hover:bg-slate-50 transition">
                          <td className="p-3.5 font-bold text-slate-800">{sp.paymentDate}</td>
                          <td className="p-3.5 font-sans font-black text-slate-900">{sp.supplierName}</td>
                          <td className="p-3.5 font-sans">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                              sp.business === 'amanot_electronics'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {sp.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 font-bold">
                            {sp.purchaseOrderId ? `#${sp.purchaseOrderId}` : 'Direct Pay'}
                          </td>
                          <td className="p-3.5 font-sans">
                            <p className="font-bold text-slate-900 capitalize">{sp.paymentMethod.replace('_', ' ')}</p>
                            <p className="text-[10px] text-indigo-600 font-bold">{sp.accountName}</p>
                          </td>
                          <td className="p-3.5 font-sans">
                            {sp.voucherNo && <p className="text-[11px] font-mono font-bold text-slate-700">Vch: {sp.voucherNo}</p>}
                            {isCheque && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  isCleared ? 'bg-emerald-100 text-emerald-800' : isPending ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  Cheque #{sp.chequeNo || 'N/A'} ({sp.chequeStatus || 'pending'})
                                </span>
                                {isPending && (
                                  <button
                                    onClick={() => handleToggleChequeStatus(sp, 'cleared')}
                                    className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold hover:bg-emerald-700"
                                    title="Mark Cheque Cleared"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-black text-rose-600 text-sm">
                            ৳{sp.amount.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center font-sans">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => exportSupplierPaymentVoucherPDF(sp, settings)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 transition flex items-center gap-1 text-[10px] font-black shadow-2xs"
                                title="Export / Print Supplier Payment Voucher PDF in new tab"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" /> Voucher PDF
                              </button>
                              <button
                                onClick={() => handleOpenEditSupplierPayment(sp)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                title="Edit Payment Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete payment record of ৳${sp.amount.toLocaleString()} to ${sp.supplierName}?`)) {
                                    deleteSupplierPayment(sp.id);
                                  }
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                                title="Delete Payment Record"
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
        </div>
      )}

      {/* Modal 1: Add New Supplier */}
      {isAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">Add New Distributor Supplier</h3>
              <button onClick={() => setIsAddSupplierModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Business Partner Assignment</label>
                <select
                  value={business}
                  onChange={(e) => setBusiness(e.target.value as any)}
                  className="w-full p-2 border rounded-lg font-bold"
                >
                  <option value="amanot_electronics">Amanot Electronics (Konka, Gree, Haiko)</option>
                  <option value="amanot_enterprise">Amanot Enterprise (Haier)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Company / Distributor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electro Mart Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Person Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Manager Manager Rahim"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="02-..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Office Location</label>
                  <input
                    type="text"
                    placeholder="Dhaka"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddSupplierModal(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Pay Purchase Order Due */}
      {selectedPODue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 my-auto animate-in zoom-in-95 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                Pay PO Due Balance (#{selectedPODue.id})
              </h3>
              <button onClick={() => setSelectedPODue(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">Distributor: {selectedPODue.supplierName}</p>
              <div className="flex justify-between text-slate-600 font-mono">
                <span>Total PO Cost: ৳{selectedPODue.totalCost.toLocaleString()}</span>
                <span>Already Paid: ৳{selectedPODue.paidAmount.toLocaleString()}</span>
              </div>
              <p className="font-black font-mono text-rose-600 pt-1 border-t">
                Remaining Due: ৳{(selectedPODue.totalCost - selectedPODue.paidAmount).toLocaleString()}
              </p>
            </div>

            <form onSubmit={handlePayPODueSubmit} className="space-y-3 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Amount (BDT) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedPODue.totalCost - selectedPODue.paidAmount}
                  value={poPayAmount}
                  onChange={(e) => setPoPayAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pay From Bank / Cash Account *</label>
                <select
                  value={poPayAccountId}
                  onChange={(e) => setPoPayAccountId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-900"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} (Current Bal: ৳{a.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={poPayPaymentMethod}
                    onChange={(e) => setPoPayPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mfs">MFS (bKash/Nagad)</option>
                    <option value="cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={poPayDate}
                    onChange={(e) => setPoPayDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {poPayPaymentMethod === 'cheque' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Cheque Number</label>
                    <input
                      type="text"
                      placeholder="e.g. CHQ-98124"
                      value={poPayChequeNo}
                      onChange={(e) => setPoPayChequeNo(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Cheque Date</label>
                    <input
                      type="date"
                      value={poPayChequeDate}
                      onChange={(e) => setPoPayChequeDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Voucher / Reference No.</label>
                <input
                  type="text"
                  placeholder="e.g. VCH-PO-9812"
                  value={poPayVoucherNo}
                  onChange={(e) => setPoPayVoucherNo(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedPODue(null)} className="px-4 py-2 border rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow">
                  Record PO Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Standalone Record / Edit Supplier Payment */}
      {isPaySupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 my-auto animate-in zoom-in-95 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                {editingPayment ? 'Edit Supplier Payment Record' : 'Record Supplier Due Payment'}
              </h3>
              <button onClick={() => setIsPaySupplierModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSupplierPaymentSubmit} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Supplier *</label>
                <select
                  value={spSupplierId}
                  onChange={(e) => setSpSupplierId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-900"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} (Owed Due: ৳{s.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Amount (BDT) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={spAmount}
                  onChange={(e) => setSpAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-black text-rose-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Disbursed From Bank / Cash Account *</label>
                <select
                  value={spAccountId}
                  onChange={(e) => setSpAccountId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-900"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} (Current Bal: ৳{a.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={spPaymentMethod}
                    onChange={(e) => setSpPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mfs">MFS (bKash / Nagad)</option>
                    <option value="cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={spPaymentDate}
                    onChange={(e) => setSpPaymentDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {spPaymentMethod === 'cheque' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Cheque No.</label>
                    <input
                      type="text"
                      placeholder="e.g. CHQ-99182"
                      value={spChequeNo}
                      onChange={(e) => setSpChequeNo(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Cheque Status</label>
                    <select
                      value={spChequeStatus}
                      onChange={(e) => setSpChequeStatus(e.target.value as any)}
                      className="w-full p-2 border rounded-lg bg-white font-bold"
                    >
                      <option value="pending font-bold">Pending Clearance</option>
                      <option value="cleared">Cleared</option>
                      <option value="bounced">Bounced</option>
                    </select>
                  </div>
                </div>
              )}

              {(spPaymentMethod === 'bank' || spPaymentMethod === 'mfs') && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                  <label className="font-bold text-blue-900 block">
                    Bank / Mobile Banking Transfer Slip
                  </label>
                  {spBankSlip ? (
                    <div className="flex items-center gap-3">
                      {spBankSlip.startsWith('data:image') || /\.(png|jpe?g|webp|gif)$/i.test(spBankSlip) ? (
                        <img src={spBankSlip} alt="Bank slip" className="h-16 w-auto rounded-lg border border-blue-200 object-contain bg-white" />
                      ) : (
                        <span className="text-xs font-bold text-blue-800">Slip attached (PDF/file)</span>
                      )}
                      <a href={spBankSlip} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-blue-700 underline">
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => setSpBankSlip('')}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <label className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-300 cursor-pointer transition w-max">
                    <Upload className="w-4 h-4" />
                    {spBankSlip ? 'Replace Slip' : 'Upload Slip (Image/PDF)'}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleBankSlipUpload} />
                  </label>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Voucher / Money Receipt No.</label>
                <input
                  type="text"
                  placeholder="e.g. VCH-8812"
                  value={spVoucherNo}
                  onChange={(e) => setSpVoucherNo(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsPaySupplierModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow">
                  {editingPayment ? 'Update Payment' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Requisition Modal */}
      {isRequisitionModalOpen && (
        <SupplierRequisitionModal
          isOpen={isRequisitionModalOpen}
          onClose={() => setIsRequisitionModalOpen(false)}
          requisitionToEdit={editingRequisition}
        />
      )}

      {/* Bulk Product Entry Modal */}
      {isBulkEntryModalOpen && (
        <BulkProductEntryModal
          isOpen={isBulkEntryModalOpen}
          onClose={() => setIsBulkEntryModalOpen(false)}
          prefillRequisition={prefillReqForBulk}
        />
      )}

    </div>
  );
};
