import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { InstallmentPlan } from '../../types';
import { getCompatiblePaymentAccounts } from '../../utils/paymentAccounts';
import { InstallmentReceiptModal } from '../receipt/InstallmentReceiptModal';
import { InstallmentAgreementModal } from '../receipt/InstallmentAgreementModal';
import {
  CalendarClock,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  DollarSign,
  Send,
  Calendar,
  Eye,
  SlidersHorizontal,
  Building2,
  User,
  Phone,
  FileText,
  X,
  Edit3,
  Save,
  Check,
  List,
  LayoutGrid,
  Clock,
  PieChart,
  BadgePercent,
  Printer,
  Upload,
  Image,
  UserCheck,
  ShieldCheck,
  FileCheck,
  Camera,
  MapPin,
  UserPlus
} from 'lucide-react';

export const InstallmentsView: React.FC = () => {
  const {
    installmentPlans,
    processInstallmentPayment,
    updateInstallmentPlan,
    sendSMS,
    accounts,
    activeBusiness,
    currentUser,
    showToast
  } = useApp();

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // "View / Control" Modal state
  const [controlPlan, setControlPlan] = useState<InstallmentPlan | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'schedule' | 'kyc'>('schedule');

  // Money Receipt Modal state
  const [viewingReceipt, setViewingReceipt] = useState<{
    plan: InstallmentPlan;
    installmentNo: number;
    paidAmount: number;
    paymentMode?: string;
    paidDate?: string;
  } | null>(null);

  // Hire-Purchase Agreement Modal State
  const [viewingAgreementModal, setViewingAgreementModal] = useState<InstallmentPlan | null>(null);

  // KYC & Guarantor Form Local State
  const [kycCustomerName, setKycCustomerName] = useState<string>('');
  const [kycCustomerPhone, setKycCustomerPhone] = useState<string>('');
  const [kycFatherName, setKycFatherName] = useState<string>('');
  const [kycMotherName, setKycMotherName] = useState<string>('');
  const [kycSpouseName, setKycSpouseName] = useState<string>('');
  const [kycIdType, setKycIdType] = useState<'nid' | 'passport' | 'driving_license' | 'other'>('nid');
  const [kycIdNumber, setKycIdNumber] = useState<string>('');
  const [kycDob, setKycDob] = useState<string>('');
  const [kycCustomerEmail, setKycCustomerEmail] = useState<string>('');
  const [kycProfession, setKycProfession] = useState<string>('');
  const [kycPresentAddress, setKycPresentAddress] = useState<string>('');
  const [kycPermanentAddress, setKycPermanentAddress] = useState<string>('');
  const [kycEmergencyContactName, setKycEmergencyContactName] = useState<string>('');
  const [kycEmergencyContactPhone, setKycEmergencyContactPhone] = useState<string>('');

  const [kycCustomerPhoto, setKycCustomerPhoto] = useState<string>('');
  const [kycCustomerNid, setKycCustomerNid] = useState<string>('');
  const [kycAddressProofUrl, setKycAddressProofUrl] = useState<string>('');
  const [kycOtherDocsUrl, setKycOtherDocsUrl] = useState<string>('');

  const [kycGuarantorName, setKycGuarantorName] = useState<string>('');
  const [kycGuarantorPhone, setKycGuarantorPhone] = useState<string>('');
  const [kycGuarantorRelation, setKycGuarantorRelation] = useState<string>('');
  const [kycGuarantorAddress, setKycGuarantorAddress] = useState<string>('');
  const [kycGuarantorNid, setKycGuarantorNid] = useState<string>('');
  const [kycGuarantorPhoto, setKycGuarantorPhoto] = useState<string>('');
  const [kycNotes, setKycNotes] = useState<string>('');

  // Quick Payment Modal State within Control Modal
  const [collectingItem, setCollectingItem] = useState<{
    planId: string;
    installmentNo: number;
    amount: number;
  } | null>(null);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [adjustmentStrategy, setAdjustmentStrategy] = useState<'next_installment' | 'partial_balance' | 'waive_shortfall'>('next_installment');
  const [payMethod, setPayMethod] = useState<'cash' | 'bkash_nagad' | 'card' | 'bank_transfer'>('cash');
  const [collectAccountId, setCollectAccountId] = useState<string>('');

  // Edit Due Date Modal or inline editing
  const [editingDueDateNo, setEditingDueDateNo] = useState<number | null>(null);
  const [tempDueDate, setTempDueDate] = useState<string>('');

  // Edit Plan Notes
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [planNotes, setPlanNotes] = useState<string>('');

  // SMS Modal
  const [customSmsNo, setCustomSmsNo] = useState<number | null>(null);
  const [customSmsMessage, setCustomSmsMessage] = useState<string>('');

  // Filtered Plans list
  const filteredPlans = useMemo(() => {
    return installmentPlans.filter((p) => {
      if (activeBusiness !== 'all' && p.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && p.business !== currentUser.assignedBusiness) return false;

      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.customerName.toLowerCase().includes(q) ||
          p.customerPhone.toLowerCase().includes(q) ||
          p.invoiceId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [installmentPlans, activeBusiness, currentUser, statusFilter, searchQuery]);

  // Accounts the collecting business may bank this EMI into (its own first, then shared)
  const collectionAccounts = useMemo(() => {
    if (!controlPlan) return [];
    return getCompatiblePaymentAccounts(accounts, payMethod, controlPlan.business);
  }, [accounts, payMethod, controlPlan]);

  // Keep the picker on a valid account when the payment mode or plan changes
  useEffect(() => {
    if (!collectionAccounts.some((a) => a.id === collectAccountId)) {
      setCollectAccountId(collectionAccounts[0]?.id || '');
    }
  }, [collectionAccounts, collectAccountId]);

  // Overall Statistics
  const stats = useMemo(() => {
    let activeCount = 0;
    let completedCount = 0;
    let totalFinanced = 0;
    let totalDownPayment = 0;
    let totalCollectedEmi = 0;
    let totalRemainingEmi = 0;

    installmentPlans.forEach((p) => {
      if (activeBusiness !== 'all' && p.business !== activeBusiness) return;
      if (currentUser.assignedBusiness !== 'all' && p.business !== currentUser.assignedBusiness) return;

      if (p.status === 'active') activeCount++;
      if (p.status === 'completed') completedCount++;

      totalFinanced += p.financedAmount;
      totalDownPayment += p.downPayment;

      p.schedule.forEach((s) => {
        if (s.status === 'paid') {
          totalCollectedEmi += s.amount;
        } else {
          totalRemainingEmi += s.amount;
        }
      });
    });

    return {
      activeCount,
      completedCount,
      totalFinanced,
      totalDownPayment,
      totalCollectedEmi,
      totalRemainingEmi
    };
  }, [installmentPlans, activeBusiness, currentUser]);

  // Handle Control View Open
  const handleOpenControl = (plan: InstallmentPlan) => {
    setControlPlan(plan);
    setActiveModalTab('schedule');
    setPlanNotes(plan.notes || '');
    setIsEditingNotes(false);
    setEditingDueDateNo(null);
    setCollectingItem(null);

    // Sync KYC Form states
    setKycCustomerName(plan.customerName || '');
    setKycCustomerPhone(plan.customerPhone || '');
    setKycFatherName(plan.fatherName || '');
    setKycMotherName(plan.motherName || '');
    setKycSpouseName(plan.spouseName || '');
    setKycIdType(plan.idType || 'nid');
    setKycIdNumber(plan.idNumber || '');
    setKycDob(plan.dob || '');
    setKycCustomerEmail(plan.customerEmail || '');
    setKycProfession(plan.profession || '');
    setKycPresentAddress(plan.presentAddress || '');
    setKycPermanentAddress(plan.permanentAddress || '');
    setKycEmergencyContactName(plan.emergencyContactName || '');
    setKycEmergencyContactPhone(plan.emergencyContactPhone || '');

    setKycCustomerPhoto(plan.customerPhotoUrl || '');
    setKycCustomerNid(plan.customerNidUrl || '');
    setKycAddressProofUrl(plan.addressProofUrl || '');
    setKycOtherDocsUrl(plan.otherDocsUrl || '');

    setKycGuarantorName(plan.guarantorName || '');
    setKycGuarantorPhone(plan.guarantorPhone || '');
    setKycGuarantorRelation(plan.guarantorRelation || '');
    setKycGuarantorAddress(plan.guarantorAddress || '');
    setKycGuarantorNid(plan.guarantorNid || '');
    setKycGuarantorPhoto(plan.guarantorPhotoUrl || '');
    setKycNotes(plan.notes || '');
  };

  // Save KYC Form details
  const handleSaveKyc = () => {
    if (!controlPlan) return;

    const kycData = {
      customerName: kycCustomerName || controlPlan.customerName,
      customerPhone: kycCustomerPhone || controlPlan.customerPhone,
      fatherName: kycFatherName,
      motherName: kycMotherName,
      spouseName: kycSpouseName,
      idType: kycIdType,
      idNumber: kycIdNumber,
      dob: kycDob,
      customerEmail: kycCustomerEmail,
      profession: kycProfession,
      presentAddress: kycPresentAddress,
      permanentAddress: kycPermanentAddress,
      emergencyContactName: kycEmergencyContactName,
      emergencyContactPhone: kycEmergencyContactPhone,
      customerPhotoUrl: kycCustomerPhoto,
      customerNidUrl: kycCustomerNid,
      addressProofUrl: kycAddressProofUrl,
      otherDocsUrl: kycOtherDocsUrl,
      guarantorName: kycGuarantorName,
      guarantorPhone: kycGuarantorPhone,
      guarantorRelation: kycGuarantorRelation,
      guarantorAddress: kycGuarantorAddress,
      guarantorNid: kycGuarantorNid,
      guarantorPhotoUrl: kycGuarantorPhoto,
      notes: kycNotes
    };

    updateInstallmentPlan(controlPlan.id, kycData);
    setControlPlan((prev) => (prev ? { ...prev, ...kycData } : null));
    showToast('Customer KYC & Guarantor Profile updated successfully!');
  };

  // File Upload Helper to convert files to Base64 preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
        showToast(`Document uploaded: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Collecting Single Installment Payment
  const handleConfirmCollect = () => {
    if (!collectingItem || !controlPlan || collectedAmount <= 0) return;

    if (!collectAccountId) {
      showToast(`Add an active ${payMethod.replace('_', ' ')} account for this business before collecting.`);
      return;
    }

    const fullExpectedAmount = collectingItem.amount;
    const isShortfall = collectedAmount < fullExpectedAmount;
    const shortfall = fullExpectedAmount - collectedAmount;

    let updatedSchedule = [...controlPlan.schedule];

    if (!isShortfall) {
      // Full payment or overpayment received
      updatedSchedule = updatedSchedule.map((s) =>
        s.installmentNo === collectingItem.installmentNo
          ? {
              ...s,
              status: 'paid' as const,
              amount: collectedAmount,
              paidAmount: collectedAmount,
              paymentMode: payMethod,
              paidDate: new Date().toISOString().split('T')[0]
            }
          : s
      );
    } else {
      // Customer paid less than expected
      if (adjustmentStrategy === 'next_installment') {
        // Carry forward shortfall to next due installment
        let foundNext = false;
        updatedSchedule = updatedSchedule.map((s) => {
          if (s.installmentNo === collectingItem.installmentNo) {
            return {
              ...s,
              status: 'paid' as const,
              amount: collectedAmount,
              paidAmount: collectedAmount,
              paymentMode: payMethod,
              paidDate: new Date().toISOString().split('T')[0]
            };
          }
          if (!foundNext && s.installmentNo > collectingItem.installmentNo && s.status !== 'paid') {
            foundNext = true;
            return {
              ...s,
              amount: s.amount + shortfall
            };
          }
          return s;
        });

        if (!foundNext) {
          showToast(`Shortfall of BDT ${shortfall.toLocaleString()} logged for final installment.`);
        } else {
          showToast(`Shortfall of BDT ${shortfall.toLocaleString()} carried forward to next installment.`);
        }
      } else if (adjustmentStrategy === 'partial_balance') {
        // Keep remaining shortfall due on current installment
        updatedSchedule = updatedSchedule.map((s) => {
          if (s.installmentNo === collectingItem.installmentNo) {
            return {
              ...s,
              status: 'partial' as const,
              amount: shortfall,
              paidAmount: (s.paidAmount || 0) + collectedAmount,
              paymentMode: payMethod,
              paidDate: new Date().toISOString().split('T')[0]
            };
          }
          return s;
        });
        showToast(`Partial payment of BDT ${collectedAmount.toLocaleString()} collected. Remaining due: BDT ${shortfall.toLocaleString()}`);
      } else if (adjustmentStrategy === 'waive_shortfall') {
        // Waive shortfall and mark paid
        updatedSchedule = updatedSchedule.map((s) => {
          if (s.installmentNo === collectingItem.installmentNo) {
            return {
              ...s,
              status: 'paid' as const,
              amount: collectedAmount,
              paidAmount: collectedAmount,
              paymentMode: payMethod,
              paidDate: new Date().toISOString().split('T')[0]
            };
          }
          return s;
        });
        showToast(`Collected BDT ${collectedAmount.toLocaleString()}. Shortfall of BDT ${shortfall.toLocaleString()} waived.`);
      }
    }

    processInstallmentPayment(
      collectingItem.planId,
      collectingItem.installmentNo,
      collectedAmount,
      updatedSchedule,
      { accountId: collectAccountId, paymentMode: payMethod }
    );

    const paidCount = updatedSchedule.filter((s) => s.status === 'paid').length;
    const isCompleted = paidCount === controlPlan.totalInstallments;

    const updatedPlanState = {
      ...controlPlan,
      paidInstallments: paidCount,
      status: isCompleted ? ('completed' as const) : ('active' as const),
      schedule: updatedSchedule
    };

    setControlPlan(updatedPlanState);

    // Auto trigger branded money receipt
    setViewingReceipt({
      plan: updatedPlanState,
      installmentNo: collectingItem.installmentNo,
      paidAmount: collectedAmount,
      paymentMode: payMethod,
      paidDate: new Date().toISOString().split('T')[0]
    });

    setCollectingItem(null);
  };

  // Save Modified Due Date
  const handleSaveDueDate = (installmentNo: number) => {
    if (!controlPlan || !tempDueDate) return;

    const updatedSchedule = controlPlan.schedule.map((s) =>
      s.installmentNo === installmentNo ? { ...s, dueDate: tempDueDate } : s
    );

    updateInstallmentPlan(controlPlan.id, { schedule: updatedSchedule });
    setControlPlan({ ...controlPlan, schedule: updatedSchedule });
    setEditingDueDateNo(null);
    showToast(`Installment #${installmentNo} due date extended to ${tempDueDate}`);
  };

  // Save Plan Notes
  const handleSaveNotes = () => {
    if (!controlPlan) return;
    updateInstallmentPlan(controlPlan.id, { notes: planNotes });
    setControlPlan({ ...controlPlan, notes: planNotes });
    setIsEditingNotes(false);
  };

  // Send SMS
  const handleSendSMS = (dueInstallmentNo: number, msgText?: string) => {
    if (!controlPlan) return;
    const bName = controlPlan.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise';
    const finalMsg =
      msgText ||
      `Dear ${controlPlan.customerName}, installment #${dueInstallmentNo} of BDT ${controlPlan.monthlyEmi.toLocaleString()} for Inv #${controlPlan.invoiceId} is due. Please visit ${bName} or pay via bKash. Thank you!`;

    sendSMS(controlPlan.customerPhone, controlPlan.customerName, finalMsg, 'installment_reminder', controlPlan.business);
    setCustomSmsNo(null);
  };

  return (
    <div className="space-y-6">
      
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-purple-600" />
            Monthly Installment & EMI Control Center
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage customer installment schedules, collect monthly EMIs, extend due dates, and issue automated SMS reminders.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
              viewMode === 'table' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
              viewMode === 'grid' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Card Grid</span>
          </button>
        </div>
      </div>

      {/* ================= SUMMARY STATS BAR ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active EMI Plans</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.activeCount}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{stats.completedCount} Completed Plans</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <CalendarClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Financed</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">৳{stats.totalFinanced.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Down Payments: ৳{stats.totalDownPayment.toLocaleString()}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total EMI Collected</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-0.5">৳{stats.totalCollectedEmi.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Received to Date</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Outstanding EMI Due</p>
            <p className="text-2xl font-black text-rose-600 font-mono mt-0.5">৳{stats.totalRemainingEmi.toLocaleString()}</p>
            <p className="text-[10px] text-rose-500 font-bold mt-0.5">Pending Customer Collections</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ================= TOOLBAR & SEARCH ================= */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Customer Name, Phone number or Invoice #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full md:w-auto justify-center">
          {(['all', 'active', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg transition capitalize ${
                statusFilter === st ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st} Plans
            </button>
          ))}
        </div>

      </div>

      {/* ================= TABLE DATA VIEW (DEFAULT / MAIN VIEW) ================= */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">Customer & Outlet</th>
                  <th className="p-4">Invoice Ref</th>
                  <th className="p-4">Financed & Down Payment</th>
                  <th className="p-4">Monthly EMI</th>
                  <th className="p-4">Installment Progress</th>
                  <th className="p-4">Remaining EMI Balance</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">View / Control</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-semibold">
                      No monthly installment plans found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const isElectronics = plan.business === 'amanot_electronics';
                    const remainingBalance = plan.monthlyEmi * (plan.totalInstallments - plan.paidInstallments);
                    const progressPercent = Math.round((plan.paidInstallments / plan.totalInstallments) * 100);

                    return (
                      <tr key={plan.id} className="hover:bg-purple-50/30 transition-colors">
                        
                        {/* Customer */}
                        <td className="p-4">
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {plan.customerName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {plan.customerPhone}
                            </div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                              isElectronics ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}
                            </span>
                          </div>
                        </td>

                        {/* Invoice */}
                        <td className="p-4 font-mono">
                          <span className="font-bold text-slate-800">#{plan.invoiceId}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Created: {plan.createdAt.split('T')[0]}
                          </span>
                        </td>

                        {/* Financed & Down Payment */}
                        <td className="p-4">
                          <div className="font-bold text-slate-900 font-mono">
                            ৳{plan.financedAmount.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold font-mono mt-0.5">
                            Down: ৳{plan.downPayment.toLocaleString()}
                          </div>
                        </td>

                        {/* Monthly EMI */}
                        <td className="p-4">
                          <span className="font-black text-purple-900 font-mono text-xs bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 inline-block">
                            ৳{plan.monthlyEmi.toLocaleString()} / mo
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="p-4 min-w-[140px]">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 mb-1">
                            <span>{plan.paidInstallments} of {plan.totalInstallments} Paid</span>
                            <span className="text-purple-700">{progressPercent}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </td>

                        {/* Remaining Balance */}
                        <td className="p-4 font-mono font-black text-rose-600">
                          ৳{remainingBalance.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                            plan.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}>
                            {plan.status}
                          </span>
                        </td>

                        {/* View / Control Button */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenControl(plan)}
                            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 inline-flex items-center gap-1.5"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>View / Control</span>
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
      ) : (
        /* ================= CARD GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPlans.map((plan) => {
            const isElectronics = plan.business === 'amanot_electronics';
            const progressPercent = Math.round((plan.paidInstallments / plan.totalInstallments) * 100);

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4 hover:border-purple-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border mb-1 ${
                        isElectronics ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}
                      </span>
                      <h3 className="text-base font-black text-slate-900">{plan.customerName}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Phone: {plan.customerPhone} | Inv #{plan.invoiceId}</p>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        plan.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {plan.status}
                      </span>
                      <p className="text-xs font-bold text-slate-600 font-mono mt-1">
                        EMI: ৳{plan.monthlyEmi.toLocaleString()}/mo
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-xs my-3">
                    <div>
                      <span className="text-slate-400 block font-bold text-[10px]">FINANCED</span>
                      <span className="font-bold text-slate-900 font-mono">৳{plan.financedAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold text-[10px]">DOWN PAY</span>
                      <span className="font-bold text-emerald-700 font-mono">৳{plan.downPayment.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold text-[10px]">PAID</span>
                      <span className="font-bold text-purple-700 font-mono">
                        {plan.paidInstallments} / {plan.totalInstallments} ({progressPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    Total Duration: {plan.totalInstallments} Months
                  </span>

                  <button
                    onClick={() => handleOpenControl(plan)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>View / Control</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ================= "OPERATE & CONTROL INSTALLMENTS" MODAL ================= */}
      {controlPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            
            {/* Control Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-black text-[10px] uppercase">
                    {controlPlan.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                    controlPlan.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {controlPlan.status}
                  </span>
                </div>

                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-400" />
                  {controlPlan.customerName}
                </h2>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-3">
                  <span>Phone: {controlPlan.customerPhone}</span>
                  <span>•</span>
                  <span>Invoice Ref: #{controlPlan.invoiceId}</span>
                </p>
              </div>

              <button
                onClick={() => setControlPlan(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Tabs inside Control Modal */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalTab('schedule')}
                className={`pb-3 px-4 font-black text-xs flex items-center gap-2 border-b-2 transition ${
                  activeModalTab === 'schedule'
                    ? 'border-purple-600 text-purple-900 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-600" />
                EMI Schedule & Collection
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('kyc')}
                className={`pb-3 px-4 font-black text-xs flex items-center gap-2 border-b-2 transition ${
                  activeModalTab === 'kyc'
                    ? 'border-purple-600 text-purple-900 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Customer KYC & Guarantor Form
                {(controlPlan.guarantorName || controlPlan.customerPhotoUrl) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {activeModalTab === 'schedule' ? (
                <>
                  {/* Financial Progress Banner */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">FINANCED AMOUNT</span>
                    <span className="font-black text-slate-900 font-mono text-sm">৳{controlPlan.financedAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">DOWN PAYMENT</span>
                    <span className="font-black text-emerald-700 font-mono text-sm">৳{controlPlan.downPayment.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">MONTHLY EMI</span>
                    <span className="font-black text-purple-900 font-mono text-sm">৳{controlPlan.monthlyEmi.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">REMAINING EMI</span>
                    <span className="font-black text-rose-600 font-mono text-sm">
                      ৳{(controlPlan.monthlyEmi * (controlPlan.totalInstallments - controlPlan.paidInstallments)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                    <span>Paid Installments: {controlPlan.paidInstallments} of {controlPlan.totalInstallments} Months</span>
                    <span className="text-purple-700">{Math.round((controlPlan.paidInstallments / controlPlan.totalInstallments) * 100)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-purple-200">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-emerald-500 transition-all duration-300"
                      style={{ width: `${(controlPlan.paidInstallments / controlPlan.totalInstallments) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Table / Collection Interface */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Monthly Installments Schedule & Collect
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Click "Collect Payment" or Edit Due Date for grace extension
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-500">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">EMI Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Operation / Collection Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {controlPlan.schedule.map((item) => {
                        const isPaid = item.status === 'paid';
                        const isEditingThisDate = editingDueDateNo === item.installmentNo;

                        return (
                          <tr key={item.installmentNo} className={isPaid ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}>
                            <td className="p-3 font-mono font-bold text-slate-500">
                              #{item.installmentNo}
                            </td>

                            {/* Due Date Column */}
                            <td className="p-3">
                              {isEditingThisDate ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={tempDueDate}
                                    onChange={(e) => setTempDueDate(e.target.value)}
                                    className="px-2 py-1 bg-white border border-purple-300 rounded text-xs font-mono font-bold"
                                  />
                                  <button
                                    onClick={() => handleSaveDueDate(item.installmentNo)}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                    title="Save Date"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingDueDateNo(null)}
                                    className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-800">{item.dueDate}</span>
                                  {!isPaid && (
                                    <button
                                      onClick={() => {
                                        setEditingDueDateNo(item.installmentNo);
                                        setTempDueDate(item.dueDate);
                                      }}
                                      className="p-1 text-slate-400 hover:text-purple-600 transition"
                                      title="Extend / Edit Due Date"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                              {item.paidDate && (
                                <span className="block text-[10px] text-emerald-700 font-mono mt-0.5">
                                  Paid on: {item.paidDate}
                                </span>
                              )}
                            </td>

                            {/* Amount */}
                            <td className="p-3 font-mono font-bold text-slate-900">
                              ৳{item.amount.toLocaleString()}
                            </td>

                            {/* Status */}
                            <td className="p-3">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                                </span>
                              ) : item.status === 'partial' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-800 bg-blue-100/80 px-2.5 py-0.5 rounded-full" title={`Paid BDT ${(item.paidAmount || 0).toLocaleString()} so far`}>
                                  <Clock className="w-3.5 h-3.5" /> PARTIAL (৳{(item.paidAmount || 0).toLocaleString()} paid)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                                  <Clock className="w-3.5 h-3.5" /> DUE
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-right">
                              {isPaid || (item.paidAmount && item.paidAmount > 0) ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingReceipt({
                                        plan: controlPlan,
                                        installmentNo: item.installmentNo,
                                        paidAmount: item.paidAmount || item.amount,
                                        paymentMode: item.paymentMode || 'cash',
                                        paidDate: item.paidDate || new Date().toISOString().split('T')[0]
                                      })
                                    }
                                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs rounded-lg transition flex items-center gap-1 shadow-xs"
                                    title="Print Branded Money Receipt"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-emerald-700" /> Receipt
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleSendSMS(item.installmentNo)}
                                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg transition flex items-center gap-1"
                                    title="Send SMS Reminder"
                                  >
                                    <Send className="w-3 h-3" /> SMS
                                  </button>

                                  <button
                                    onClick={() => {
                                      setCollectingItem({
                                        planId: controlPlan.id,
                                        installmentNo: item.installmentNo,
                                        amount: item.amount
                                      });
                                      setCollectedAmount(item.amount);
                                      setAdjustmentStrategy('next_installment');
                                    }}
                                    className="px-3.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-lg shadow-xs transition active:scale-95 flex items-center gap-1"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" /> Collect ৳{item.amount.toLocaleString()}
                                  </button>
                                </div>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Plan Notes & Customer Remarks */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Customer EMI Notes & Guarantee Remarks
                  </h4>
                  {!isEditingNotes && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Notes
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={planNotes}
                      onChange={(e) => setPlanNotes(e.target.value)}
                      placeholder="Add guarantor details, special payment agreements or notes..."
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsEditingNotes(false)}
                        className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-xs"
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {controlPlan.notes || 'No custom notes added for this installment plan.'}
                  </p>
                )}
              </div>
                </>
              ) : (
                /* KYC & GUARANTOR FORM TAB */
                <div className="space-y-6">
                  {/* Top Bar with Print & Save Actions */}
                  <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-emerald-950 text-sm flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        Hire-Purchase Customer KYC & Guarantor Verification
                      </h3>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Manage complete customer profiles, family background, addresses, identity proofs, and print agreements.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setViewingAgreementModal(controlPlan)}
                        className="px-3.5 py-2 bg-purple-900 hover:bg-purple-950 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <Printer className="w-4 h-4 text-purple-300" /> Print Agreement Contract
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveKyc}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" /> Save KYC Profile
                      </button>
                    </div>
                  </div>

                  {/* 1. CUSTOMER BASIC PROFILE */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-xs">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-600" /> 1. Customer General Information & Contact
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Customer Full Name *</label>
                        <input
                          type="text"
                          value={kycCustomerName}
                          onChange={(e) => setKycCustomerName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Primary Phone Number *</label>
                        <input
                          type="text"
                          value={kycCustomerPhone}
                          onChange={(e) => setKycCustomerPhone(e.target.value)}
                          placeholder="+880 1700-000000"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                        <input
                          type="email"
                          value={kycCustomerEmail}
                          onChange={(e) => setKycCustomerEmail(e.target.value)}
                          placeholder="customer@email.com"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Profession / Occupation</label>
                        <input
                          type="text"
                          value={kycProfession}
                          onChange={(e) => setKycProfession(e.target.value)}
                          placeholder="e.g. Govt Officer / Businessman / Teacher"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={kycDob}
                          onChange={(e) => setKycDob(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. FAMILY BACKGROUND */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-xs">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-600" /> 2. Family Background
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Father's Name</label>
                        <input
                          type="text"
                          value={kycFatherName}
                          onChange={(e) => setKycFatherName(e.target.value)}
                          placeholder="Father's Full Name"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Mother's Name</label>
                        <input
                          type="text"
                          value={kycMotherName}
                          onChange={(e) => setKycMotherName(e.target.value)}
                          placeholder="Mother's Full Name"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Spouse Name (If Married)</label>
                        <input
                          type="text"
                          value={kycSpouseName}
                          onChange={(e) => setKycSpouseName(e.target.value)}
                          placeholder="Husband / Wife Name"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. IDENTITY CREDENTIALS & DOCUMENTS */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-xs">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-purple-600" /> 3. Identity Document & Photo Proof
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Document Type</label>
                        <select
                          value={kycIdType}
                          onChange={(e) => setKycIdType(e.target.value as any)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="nid">National ID (NID / Smart Card)</option>
                          <option value="passport">Passport</option>
                          <option value="driving_license">Driving License</option>
                          <option value="other">Other Govt Photo ID</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">NID / Document Number</label>
                        <input
                          type="text"
                          value={kycIdNumber}
                          onChange={(e) => setKycIdNumber(e.target.value)}
                          placeholder="e.g. 19901234567890"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                      {/* Customer Photo */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">Customer Photograph</label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 relative">
                            {kycCustomerPhoto ? (
                              <img src={kycCustomerPhoto} alt="Customer" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-8 h-8 text-slate-400" />
                            )}
                          </div>
                          <div className="space-y-2 flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              id="customer-photo-input"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, setKycCustomerPhoto)}
                            />
                            <label
                              htmlFor="customer-photo-input"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition"
                            >
                              <Upload className="w-3.5 h-3.5 text-purple-600" /> Upload Customer Photo
                            </label>
                            {kycCustomerPhoto && (
                              <button
                                type="button"
                                onClick={() => setKycCustomerPhoto('')}
                                className="block text-[11px] font-bold text-rose-600 hover:underline"
                              >
                                Remove Photo
                              </button>
                            )}
                            <p className="text-[10px] text-slate-400">Passport size photo for agreement contract.</p>
                          </div>
                        </div>
                      </div>

                      {/* Customer NID Document Scan */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">NID Card / Passport Scan</label>
                        <div className="flex items-center gap-4">
                          <div className="w-28 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 relative">
                            {kycCustomerNid ? (
                              <img src={kycCustomerNid} alt="Customer NID" className="w-full h-full object-cover" />
                            ) : (
                              <FileCheck className="w-8 h-8 text-slate-400" />
                            )}
                          </div>
                          <div className="space-y-2 flex-1">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              id="customer-nid-input"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, setKycCustomerNid)}
                            />
                            <label
                              htmlFor="customer-nid-input"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition"
                            >
                              <Upload className="w-3.5 h-3.5 text-purple-600" /> Upload Document Scan
                            </label>
                            {kycCustomerNid && (
                              <button
                                type="button"
                                onClick={() => setKycCustomerNid('')}
                                className="block text-[11px] font-bold text-rose-600 hover:underline"
                              >
                                Remove Document
                              </button>
                            )}
                            <p className="text-[10px] text-slate-400">Scan copy of NID / Smart card / Passport.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. ADDRESS & PROOF DOCUMENTS */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-xs">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-600" /> 4. Address Details & Address Proof Uploads
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Present Address (Current Residence)</label>
                        <textarea
                          rows={2}
                          value={kycPresentAddress}
                          onChange={(e) => setKycPresentAddress(e.target.value)}
                          placeholder="House, Road, Area, Thana, District"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Permanent Address (Village / Hometown)</label>
                        <textarea
                          rows={2}
                          value={kycPermanentAddress}
                          onChange={(e) => setKycPermanentAddress(e.target.value)}
                          placeholder="Village/Road, Post, Thana, District"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                      {/* Address Proof Upload */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">Address Proof Document (Utility Bill / Trade License)</label>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-16 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                            {kycAddressProofUrl ? (
                              <img src={kycAddressProofUrl} alt="Address Proof" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              id="address-proof-input"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, setKycAddressProofUrl)}
                            />
                            <label
                              htmlFor="address-proof-input"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-purple-600" /> Upload Address Proof
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Emergency Contact */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">Emergency Contact Person & Phone</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={kycEmergencyContactName}
                            onChange={(e) => setKycEmergencyContactName(e.target.value)}
                            placeholder="Contact Name"
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          />
                          <input
                            type="text"
                            value={kycEmergencyContactPhone}
                            onChange={(e) => setKycEmergencyContactPhone(e.target.value)}
                            placeholder="Contact Phone"
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. GUARANTOR DETAILS */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-xs">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-600" /> 5. Guarantor & Security Witness Profile
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Guarantor Full Name</label>
                        <input
                          type="text"
                          value={kycGuarantorName}
                          onChange={(e) => setKycGuarantorName(e.target.value)}
                          placeholder="e.g. Md. Rafiqul Islam"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Guarantor Phone Number</label>
                        <input
                          type="text"
                          value={kycGuarantorPhone}
                          onChange={(e) => setKycGuarantorPhone(e.target.value)}
                          placeholder="e.g. +880 1700-000000"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Relationship with Customer</label>
                        <input
                          type="text"
                          value={kycGuarantorRelation}
                          onChange={(e) => setKycGuarantorRelation(e.target.value)}
                          placeholder="e.g. Brother / Father / Employer / Friend"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Guarantor NID Number</label>
                        <input
                          type="text"
                          value={kycGuarantorNid}
                          onChange={(e) => setKycGuarantorNid(e.target.value)}
                          placeholder="Guarantor NID Number"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Guarantor Permanent Address</label>
                        <input
                          type="text"
                          value={kycGuarantorAddress}
                          onChange={(e) => setKycGuarantorAddress(e.target.value)}
                          placeholder="e.g. House 45, Road 12, Uttara, Dhaka"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                      {/* Guarantor Photo */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">Guarantor Photograph</label>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                            {kycGuarantorPhoto ? (
                              <img src={kycGuarantorPhoto} alt="Guarantor" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              id="guarantor-photo-input"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, setKycGuarantorPhoto)}
                            />
                            <label
                              htmlFor="guarantor-photo-input"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-emerald-600" /> Upload Photo
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Guarantor NID Scan */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">Guarantor NID Scan</label>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-16 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                            {kycGuarantorNid ? (
                              <img src={kycGuarantorNid} alt="Guarantor NID" className="w-full h-full object-cover" />
                            ) : (
                              <FileCheck className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              id="guarantor-nid-input"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, setKycGuarantorNid)}
                            />
                            <label
                              htmlFor="guarantor-nid-input"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-emerald-600" /> Upload NID Card
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. SPECIAL CONDITIONS & NOTES */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-xs">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" /> Agreement Special Conditions & Staff Notes
                    </h4>

                    <textarea
                      value={kycNotes}
                      onChange={(e) => setKycNotes(e.target.value)}
                      rows={3}
                      placeholder="Enter special agreement notes, installment terms, guarantee conditions, or comments..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setViewingAgreementModal(controlPlan)}
                        className="px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <Printer className="w-4 h-4 text-purple-300" /> Print Contract / Application
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveKyc}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Save Complete KYC Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setControlPlan(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl transition shadow-xs"
              >
                Close Control View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= PAYMENT COLLECTION SUB-MODAL ================= */}
      {collectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Collect Monthly EMI Payment
              </h3>
              <button onClick={() => setCollectingItem(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 font-bold">
                <span>Installment #{collectingItem.installmentNo}</span>
                <span className="text-purple-700">Expected: ৳{collectingItem.amount.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Customer: <strong className="text-slate-800">{controlPlan?.customerName}</strong> ({controlPlan?.customerPhone})
              </p>
            </div>

            {/* Collected Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Amount Received (BDT)
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCollectedAmount(collectingItem.amount)}
                    className="text-[10px] font-bold text-purple-700 hover:underline"
                  >
                    Exact (৳{collectingItem.amount.toLocaleString()})
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setCollectedAmount(Math.round(collectingItem.amount / 2))}
                    className="text-[10px] font-bold text-slate-600 hover:underline"
                  >
                    50%
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  min={1}
                  value={collectedAmount || ''}
                  onChange={(e) => setCollectedAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>

            {/* Shortfall Adjustment Selector if customer pays LESS than EMI */}
            {collectedAmount > 0 && collectedAmount < collectingItem.amount && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-extrabold text-amber-900">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Payment Shortfall:
                  </span>
                  <span className="font-mono text-rose-700">৳{(collectingItem.amount - collectedAmount).toLocaleString()} LESS</span>
                </div>

                <p className="text-[11px] text-amber-800 font-medium">
                  Choose how to adjust the remaining ৳{(collectingItem.amount - collectedAmount).toLocaleString()} short balance:
                </p>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100/40">
                    <input
                      type="radio"
                      name="adjustment"
                      checked={adjustmentStrategy === 'next_installment'}
                      onChange={() => setAdjustmentStrategy('next_installment')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block text-[11px]">
                        Carry Forward to Next Month (EMI #{collectingItem.installmentNo + 1})
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Adds ৳{(collectingItem.amount - collectedAmount).toLocaleString()} to next month's EMI schedule automatically.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100/40">
                    <input
                      type="radio"
                      name="adjustment"
                      checked={adjustmentStrategy === 'partial_balance'}
                      onChange={() => setAdjustmentStrategy('partial_balance')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block text-[11px]">
                        Keep Partial Balance Due on Installment #{collectingItem.installmentNo}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Leaves Installment #{collectingItem.installmentNo} as PARTIAL with ৳{(collectingItem.amount - collectedAmount).toLocaleString()} due.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100/40">
                    <input
                      type="radio"
                      name="adjustment"
                      checked={adjustmentStrategy === 'waive_shortfall'}
                      onChange={() => setAdjustmentStrategy('waive_shortfall')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block text-[11px]">
                        Waive / Discount Shortfall (৳{(collectingItem.amount - collectedAmount).toLocaleString()})
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Marks Installment #{collectingItem.installmentNo} fully cleared without pushing to future EMIs.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Payment Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'bkash_nagad', label: 'bKash / Nagad' },
                  { id: 'card', label: 'Card' },
                  { id: 'bank_transfer', label: 'Bank' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      payMethod === m.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deposit Account — scoped to the business that owns this plan */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Deposit Into Account
              </label>
              <select
                value={collectAccountId}
                onChange={(e) => setCollectAccountId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-bold bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {collectionAccounts.length === 0 && (
                  <option value="">No {payMethod.replace('_', ' ')} account for this business</option>
                )}
                {collectionAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName}
                    {a.business === 'all' ? ' [Shared]' : ''} (Bal: ৳{a.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-bold text-slate-400 mt-1">
                Collection is credited to this account and appears in the EMI collection report.
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setCollectingItem(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCollect}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-extrabold text-xs shadow-md active:scale-95 transition-all"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MONEY RECEIPT MODAL ================= */}
      {viewingReceipt && (
        <InstallmentReceiptModal
          plan={viewingReceipt.plan}
          installmentNo={viewingReceipt.installmentNo}
          paidAmount={viewingReceipt.paidAmount}
          paymentMode={viewingReceipt.paymentMode}
          paidDate={viewingReceipt.paidDate}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* ================= HIRE-PURCHASE AGREEMENT CONTRACT MODAL ================= */}
      {viewingAgreementModal && (
        <InstallmentAgreementModal
          plan={viewingAgreementModal}
          onClose={() => setViewingAgreementModal(null)}
        />
      )}

    </div>
  );
};
