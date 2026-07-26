import React from 'react';
import { useApp } from '../../context/AppContext';
import { InstallmentPlan } from '../../types';
import { Printer, Download, X, CheckCircle, ShieldCheck, Phone, MapPin, Building2, UserCheck, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { formatDate } from '../../utils/formatDate';

interface InstallmentReceiptModalProps {
  plan: InstallmentPlan;
  installmentNo: number;
  paidAmount: number;
  paymentMode?: string;
  paidDate?: string;
  onClose: () => void;
}

export const InstallmentReceiptModal: React.FC<InstallmentReceiptModalProps> = ({
  plan,
  installmentNo,
  paidAmount,
  paymentMode = 'Cash',
  paidDate = new Date().toISOString().split('T')[0],
  onClose
}) => {
  const { settings } = useApp();

  const isElectronics = plan.business === 'amanot_electronics';
  const brandTitle = isElectronics ? 'AMANOT ELECTRONICS' : 'AMANOT ENTERPRISE';
  const brandSubtitle = isElectronics
    ? 'Authorized Sales & Service Center for Konka, Gree & Haiko'
    : 'Authorized Outlet for Haier Home Appliances';
  const brandAddress = isElectronics ? settings.amanotElectronicsAddress : settings.amanotEnterpriseAddress;
  const brandPhone = isElectronics ? settings.amanotElectronicsPhone : settings.amanotEnterprisePhone;

  const receiptId = `REC-EMI-${plan.id.slice(-5)}-#${installmentNo}`;

  // Calculate cumulative remaining balance after this payment
  const totalPaidSoFar = plan.schedule
    .filter((s) => s.status === 'paid' || s.installmentNo <= installmentNo)
    .reduce((acc, s) => acc + (s.paidAmount || s.amount), 0);

  const remainingBalance = Math.max(0, plan.financedAmount - totalPaidSoFar);

  const downloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Top Brand Bar
    doc.setFillColor(isElectronics ? 30 : 16, isElectronics ? 58 : 85, isElectronics ? 138 : 72);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(brandTitle, 15, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(brandSubtitle, 15, 22);
    doc.text(`Receipt #: ${receiptId}`, 145, 15);
    doc.text(`Date: ${formatDate(paidDate)}`, 145, 22);

    // Business details
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8.5);
    doc.text(`Phone: ${brandPhone}  |  Address: ${brandAddress}`, 15, 38);

    // Title
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, 42, 180, 10, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(isElectronics ? 30 : 16, isElectronics ? 58 : 85, isElectronics ? 138 : 72);
    doc.text('OFFICIAL INSTALLMENT MONEY RECEIPT', 60, 48.5);

    // Customer & Guarantor Info Grid
    doc.setDrawColor(220, 225, 230);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(15, 56, 180, 34, 2, 2, 'FD');

    doc.setTextColor(20, 20, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', 20, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${plan.customerName}`, 20, 68);
    doc.text(`Phone: ${plan.customerPhone}`, 20, 74);
    doc.text(`Invoice Ref: ${plan.invoiceId}`, 20, 80);

    doc.setFont('helvetica', 'bold');
    doc.text('GUARANTOR / KYC DETAILS', 110, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`Guarantor: ${plan.guarantorName || 'N/A'}`, 110, 68);
    doc.text(`Phone: ${plan.guarantorPhone || 'N/A'}`, 110, 74);
    doc.text(`Relation: ${plan.guarantorRelation || 'N/A'}`, 110, 80);

    // Payment Breakdown Table
    let y = 96;
    doc.setFillColor(isElectronics ? 238 : 236, isElectronics ? 242 : 253, isElectronics ? 255 : 245);
    doc.rect(15, y, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 20, y + 5.5);
    doc.text('EMI #', 95, y + 5.5);
    doc.text('Mode', 125, y + 5.5);
    doc.text('Amount Paid (BDT)', 155, y + 5.5);

    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.text(`Monthly EMI Payment - Plan #${plan.id.slice(-6)}`, 20, y);
    doc.text(`#${installmentNo} of ${plan.totalInstallments}`, 95, y);
    doc.text(`${paymentMode.toUpperCase()}`, 125, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`BDT ${paidAmount.toLocaleString()}`, 155, y);

    y += 10;
    doc.line(15, y, 195, y);

    // Summary Box
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Financed Amount: BDT ${plan.financedAmount.toLocaleString()}`, 105, y);
    y += 6;
    doc.text(`Down Payment Received: BDT ${plan.downPayment.toLocaleString()}`, 105, y);
    y += 6;
    doc.text(`Total Paid To Date: BDT ${totalPaidSoFar.toLocaleString()}`, 105, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 30, 30);
    doc.text(`Remaining Balance: BDT ${remainingBalance.toLocaleString()}`, 105, y);

    // Signatures
    y += 35;
    doc.setDrawColor(180, 180, 180);
    doc.line(20, y, 65, y);
    doc.line(80, y, 125, y);
    doc.line(140, y, 185, y);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Customer Signature", 28, y + 4);
    doc.text("Guarantor Signature", 88, y + 4);
    doc.text("Authorized Seal & Sign", 145, y + 4);

    doc.save(`Installment_Receipt_${receiptId}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95">
        {/* Top Header Controls */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm tracking-wide">Branded Money Receipt</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadPDF}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 space-y-6 text-slate-800" id="installment-receipt-print">
          {/* Brand Letterhead Header */}
          <div className={`p-6 rounded-2xl text-white ${isElectronics ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-emerald-900 to-teal-900'} relative overflow-hidden shadow-md`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  OFFICIAL EMI RECEIPT
                </span>
                <h1 className="text-2xl font-black tracking-tight">{brandTitle}</h1>
                <p className="text-xs text-white/80 mt-0.5">{brandSubtitle}</p>
                <div className="mt-3 text-[11px] text-white/70 space-y-0.5">
                  <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-300" /> {brandAddress}</p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-300" /> Hotline: {brandPhone}</p>
                </div>
              </div>

              <div className="text-right bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
                <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Receipt ID</p>
                <p className="font-mono font-black text-sm text-white">{receiptId}</p>
                <p className="text-[10px] text-white/80 mt-1">Date: {formatDate(paidDate)}</p>
              </div>
            </div>
          </div>

          {/* Receipt Title Banner */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-center">
            <h2 className="font-black text-slate-900 text-sm tracking-wide uppercase flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              INSTALLMENT PAYMENT COLLECTION ACKNOWLEDGMENT
            </h2>
          </div>

          {/* Customer & Guarantor Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-xs">
              <p className="font-black text-slate-900 border-b border-slate-200 pb-1.5 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600" /> CUSTOMER DETAILS
              </p>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Customer Name:</span>
                <span className="font-bold text-slate-900">{plan.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Phone:</span>
                <span className="font-bold text-slate-900">{plan.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Invoice Ref:</span>
                <span className="font-mono font-bold text-purple-700">{plan.invoiceId}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-xs">
              <p className="font-black text-slate-900 border-b border-slate-200 pb-1.5 mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> GUARANTOR / KYC INFO
              </p>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Guarantor Name:</span>
                <span className="font-bold text-slate-900">{plan.guarantorName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Guarantor Phone:</span>
                <span className="font-bold text-slate-900">{plan.guarantorPhone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Relationship:</span>
                <span className="font-bold text-slate-900">{plan.guarantorRelation || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Particulars Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-black text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Payment Description</th>
                  <th className="py-2.5 px-4">Installment #</th>
                  <th className="py-2.5 px-4">Payment Mode</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    Monthly EMI Collection — Plan {plan.id.slice(-6)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      #{installmentNo} of {plan.totalInstallments}
                    </span>
                  </td>
                  <td className="py-3 px-4 capitalize font-semibold text-slate-700">
                    {paymentMode.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                    ৳{paidAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Account Summary & Remaining Balance Box */}
          <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 flex justify-between items-center text-xs">
            <div className="space-y-1">
              <p className="text-slate-600 font-semibold">Financed Balance Summary:</p>
              <p className="text-[11px] text-slate-500">
                Total Financed: <strong className="text-slate-800">৳{plan.financedAmount.toLocaleString()}</strong> |
                Down Payment: <strong className="text-slate-800">৳{plan.downPayment.toLocaleString()}</strong>
              </p>
            </div>
            <div className="text-right border-l border-purple-200 pl-4 space-y-0.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Remaining Due Balance</p>
              <p className="font-mono font-black text-lg text-rose-700">
                BDT ৳{remainingBalance.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Terms Note */}
          <div className="text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start gap-2">
            <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              This is a computer-generated money receipt for EMI installment payment. Received payments are non-refundable and subject to original financing hire-purchase agreement terms. Keep this receipt for official account reconciliation.
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-10 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-600">
            <div>
              <div className="border-t border-slate-300 pt-2">Customer Signature</div>
            </div>
            <div>
              <div className="border-t border-slate-300 pt-2">Guarantor Signature</div>
            </div>
            <div>
              <div className="border-t border-slate-300 pt-2 text-purple-900 font-extrabold">Authorized Seal & Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
