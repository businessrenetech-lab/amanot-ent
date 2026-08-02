import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SaleInvoice } from '../../types';
import {
  Printer,
  Download,
  X,
  CheckCircle,
  ShieldCheck,
  Phone,
  MapPin,
  Building2,
  Smartphone,
  Sparkles,
  FileText,
  Eye,
  ExternalLink,
  CalendarClock
} from 'lucide-react';
import jsPDF from 'jspdf';
import { safeHtml2Canvas } from '../../utils/html2canvasFix';
import { numberToWordsBDT } from '../../utils/numberToWords';
import { exportCustomerInvoicePDF } from '../../utils/invoicePdfExport';
import { AMANOT_ELECTRONICS_ADDRESS } from '../../constants/business';
import { formatDate } from '../../utils/formatDate';
import {
  KonkaLogo,
  GreeLogo,
  HaikoLogo,
  HaierLogo,
  ElectroMartEmblem
} from './BrandLogos';

interface BrandedReceiptModalProps {
  invoice?: SaleInvoice;
  onClose?: () => void;
}

export const BrandedReceiptModal: React.FC<BrandedReceiptModalProps> = ({
  invoice: propInvoice,
  onClose: propOnClose
}) => {
  const { settings, activeReceiptInvoice, setActiveReceiptInvoice, installmentPlans, customers } = useApp();

  const invoice = propInvoice || activeReceiptInvoice;
  const onClose = propOnClose || (() => setActiveReceiptInvoice(null));

  // Toggle between B&W Official Pad and Color Branded mode
  const [viewMode, setViewMode] = useState<'bw' | 'color'>('bw');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  if (!invoice) return null;

  const isElectronics = invoice.business === 'amanot_electronics';

  // Installment / EMI plan for this invoice (if any)
  const installmentPlan =
    invoice.isInstallment
      ? installmentPlans.find(
          (p) => p.id === invoice.installmentPlanId || p.invoiceId === invoice.id
        )
      : undefined;

  // Wholesale "Balance Brought Forward" summary (previous due → this invoice → closing)
  const isWholesale = invoice.saleType === 'wholesale';
  const wholesaleCustomer = isWholesale ? customers.find((c) => c.id === invoice.customerId) : undefined;
  const closingBalance = wholesaleCustomer ? Math.max(0, Math.round(wholesaleCustomer.currentDue || 0)) : invoice.dueAmount;
  const previousBalance = Math.max(0, Math.round(closingBalance - (invoice.dueAmount || 0)));

  const renderWholesaleSummary = (variant: 'bw' | 'color') => {
    if (!isWholesale) return null;
    const bw = variant === 'bw';
    const b = bw ? '#000000' : '#e2e8f0';
    const rows = [
      { k: 'Previous Balance (B/F)', v: previousBalance },
      { k: 'This Invoice Total', v: invoice.grandTotal },
      { k: 'Payment Received', v: invoice.paidAmount },
      { k: 'Closing Balance (Total Due)', v: closingBalance, strong: true }
    ];
    return (
      <div className="mb-6" style={{ pageBreakInside: 'avoid' }}>
        <div className="rounded overflow-hidden" style={{ border: `2px solid ${b}` }}>
          <div
            className="px-3 py-1.5 font-black text-xs uppercase tracking-wide"
            style={{ backgroundColor: bw ? '#e2e8f0' : '#0f172a', color: bw ? '#000000' : '#ffffff' }}
          >
            Wholesale Account — Balance Brought Forward
          </div>
          <table className="w-full text-xs" style={{ color: '#000000' }}>
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} style={{ borderTop: `1px solid ${b}` }}>
                  <td className={`px-3 py-1 ${r.strong ? 'font-black' : 'font-semibold'}`}>{r.k}</td>
                  <td
                    className={`px-3 py-1 text-right font-mono ${r.strong ? 'font-black text-sm' : 'font-bold'}`}
                    style={{ borderLeft: `1px solid ${b}` }}
                  >
                    ৳{r.v.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Renders the EMI schedule (list of installments + due dates) for both receipt styles.
  const renderInstallmentSchedule = (variant: 'bw' | 'color') => {
    if (!installmentPlan || !installmentPlan.schedule?.length) return null;
    const bw = variant === 'bw';
    const b = bw ? '#000000' : '#e2e8f0';
    const headBg = bw ? '#e2e8f0' : '#0f172a';
    const headFg = bw ? '#000000' : '#ffffff';
    const statusOf = (s: string) => {
      if (s === 'paid') return { color: bw ? '#000000' : '#047857', label: 'PAID' };
      if (s === 'overdue') return { color: bw ? '#000000' : '#b91c1c', label: 'OVERDUE' };
      if (s === 'partial') return { color: bw ? '#000000' : '#b45309', label: 'PARTIAL' };
      return { color: bw ? '#000000' : '#b45309', label: 'DUE' };
    };
    const summary = [
      { k: 'Total Payable', v: installmentPlan.totalAmount },
      { k: 'Down Payment', v: installmentPlan.downPayment },
      { k: 'Financed Amount', v: installmentPlan.financedAmount },
      { k: `Monthly EMI × ${installmentPlan.totalInstallments}`, v: installmentPlan.monthlyEmi }
    ];

    return (
      <div className="mb-6" style={{ pageBreakInside: 'avoid' }}>
        <div className="rounded overflow-hidden" style={{ border: `2px solid ${b}` }}>
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{ backgroundColor: headBg, color: headFg }}
          >
            <span className="font-black text-xs uppercase tracking-wide flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" /> Installment / EMI Payment Schedule
            </span>
            <span className="font-mono text-[11px] font-bold">
              {installmentPlan.paidInstallments} of {installmentPlan.totalInstallments} paid
            </span>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 text-xs" style={{ borderBottom: `1px solid ${b}` }}>
            {summary.map((s, i) => (
              <div
                key={s.k}
                className="p-2"
                style={{ borderRight: i < 3 ? `1px solid ${b}` : 'none' }}
              >
                <span className="block text-[9px] uppercase font-bold text-slate-500">{s.k}</span>
                <span className="font-mono font-black text-black">৳{s.v.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Schedule table */}
          <table className="w-full text-left text-xs border-collapse" style={{ color: '#000000' }}>
            <thead>
              <tr style={{ backgroundColor: bw ? '#f8fafc' : '#f1f5f9' }}>
                <th className="p-2" style={{ borderRight: `1px solid ${b}` }}>#</th>
                <th className="p-2" style={{ borderRight: `1px solid ${b}` }}>Due Date</th>
                <th className="p-2 text-right" style={{ borderRight: `1px solid ${b}` }}>Installment Amount</th>
                <th className="p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {installmentPlan.schedule.map((s) => {
                const st = statusOf(s.status);
                return (
                  <tr key={s.installmentNo} style={{ borderTop: `1px solid ${b}` }}>
                    <td className="p-2 font-mono font-bold" style={{ borderRight: `1px solid ${b}` }}>{s.installmentNo}</td>
                    <td className="p-2 font-mono" style={{ borderRight: `1px solid ${b}` }}>{formatDate(s.dueDate)}</td>
                    <td className="p-2 text-right font-mono font-bold" style={{ borderRight: `1px solid ${b}` }}>
                      ৳{s.amount.toLocaleString()}
                    </td>
                    <td className="p-2 text-center font-black text-[11px] uppercase" style={{ color: st.color }}>
                      {st.label}
                      {s.status === 'paid' && s.paidDate ? ` (${formatDate(s.paidDate)})` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-slate-500 mt-1 italic">
          EMI schedule is part of this invoice. Payments are due on or before each date above.
        </p>
      </div>
    );
  };

  const brandTitle = isElectronics ? 'AMANAT ELECTRONICS' : 'AMANAT ENTERPRISE';
  const partnerTitle = isElectronics ? 'Channel partner of ELECTRO MART LIMITED' : 'Authorized Haier & Electronics Outlet';
  const binNumber = settings.binNumber || 'BIN: 006091988-0602';
  const brandAddress = isElectronics
    ? settings.amanotElectronicsAddress || AMANOT_ELECTRONICS_ADDRESS
    : settings.amanotEnterpriseAddress || 'SSK Road, Feni Sadar, Feni.';
  const brandPhone = isElectronics
    ? settings.amanotElectronicsPhone || '01711-360121, 01712-727548'
    : settings.amanotEnterprisePhone || '01711-360121';

  // Extract all models & serial numbers for summary section
  const itemModels = invoice.items.map((it) => it.model).filter(Boolean).join(', ');
  const itemSerials = invoice.items.map((it) => (it as any).serialNo || (it as any).chassisNo).filter(Boolean).join(', ');

  // Download PDF helper (uses html2canvas for 1:1 visual fidelity)
  const downloadPDFMode = async (targetMode: 'bw' | 'color') => {
    setIsGeneratingPdf(true);
    const elementId = targetMode === 'bw' ? 'printable-receipt-bw' : 'printable-receipt-color';
    
    // Briefly switch viewMode if needed so DOM element is visible
    const previousMode = viewMode;
    if (viewMode !== targetMode) {
      setViewMode(targetMode);
      await new Promise((res) => setTimeout(res, 200));
    }

    const element = document.getElementById(elementId);
    if (!element) {
      setIsGeneratingPdf(false);
      return;
    }

    try {
      const canvas = await safeHtml2Canvas(element, {
        scale: 2.5, // Ultra sharp print rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Paginate: place the full image on each page shifted up, so a tall
      // invoice (e.g. with an EMI schedule) flows onto a 2nd/3rd page instead
      // of being clipped to one page.
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${invoice.id}_${isElectronics ? 'Amanat_Electronics' : 'Amanat_Enterprise'}_${targetMode.toUpperCase()}_Invoice.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
      setViewMode(previousMode);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto print:max-h-none print:shadow-none print:border-none print:rounded-none">

        {/* Top Control Header Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">Customer Invoice #{invoice.id}</h2>
                <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono border border-slate-700">
                  {isElectronics ? 'Amanat Electronics' : 'Amanat Enterprise'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official pad invoice layout with multi-format PDF export options
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 flex items-center gap-1">
            <button
              onClick={() => setViewMode('bw')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'bw'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Black & White Pad
            </button>
            <button
              onClick={() => setViewMode('color')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'color'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Color Branded
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
              title="Print Active Invoice View"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              Print
            </button>

            <button
              onClick={() =>
                exportCustomerInvoicePDF(
                  invoice,
                  settings,
                  viewMode,
                  installmentPlan,
                  isWholesale ? { previousBalance, closingBalance } : undefined
                )
              }
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
              title="Export Vector PDF in New Tab"
            >
              <ExternalLink className="w-4 h-4 text-emerald-200" />
              Vector PDF (New Tab)
            </button>

            <button
              disabled={isGeneratingPdf}
              onClick={() => downloadPDFMode('bw')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-white text-slate-900 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
              title="Download Black & White Pad PDF"
            >
              <Download className="w-4 h-4 text-slate-700" />
              B&W Image PDF
            </button>

            <button
              disabled={isGeneratingPdf}
              onClick={() => downloadPDFMode('color')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
              title="Download Premium Color PDF"
            >
              <Download className="w-4 h-4 text-indigo-200" />
              Color PDF
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 overflow-y-auto bg-slate-100/70 space-y-8 flex-1 print:p-0 print:bg-white print:overflow-visible">

          {/* ==================================================================== */}
          {/* OPTION 1: BLACK & WHITE OFFICIAL SHOWROOM PAD INVOICE (1:1 MATCH)    */}
          {/* ==================================================================== */}
          <div
            id="printable-receipt-bw"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
            className={`p-8 rounded-2xl shadow-sm border border-slate-300 relative font-sans print:p-6 print:border-none print:shadow-none ${
              viewMode === 'bw' ? 'block print:block' : 'hidden print:hidden'
            }`}
          >
            {/* Watermark Logo in Center Background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
              <ElectroMartEmblem isMonochrome className="w-96 h-96" />
            </div>

            {/* Top Religious Header */}
            <div className="text-center mb-1">
              <p className="text-xs font-bold text-slate-900 font-serif tracking-wide">
                বিসমিল্লাহির রাহমানির রাহিম
              </p>
            </div>

            {/* Main Showroom Header */}
            <div className="text-center relative border-b-2 border-black pb-4 mb-4">
              <div className="flex items-center justify-center gap-3">
                <ElectroMartEmblem isMonochrome className="w-10 h-10 shrink-0" />
                <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                  {brandTitle}
                </h1>
              </div>

              <p className="text-xs font-bold tracking-wide uppercase text-slate-900 mt-0.5">
                {partnerTitle}
              </p>

              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 text-[11px] font-bold text-slate-900">
                <span>{binNumber}</span>
                <span>•</span>
                <span>{brandAddress}</span>
              </div>

              <div className="mt-0.5 text-[11px] font-bold text-slate-900">
                Mobile: {brandPhone}
              </div>

              {/* Sl No & Date Box */}
              <div className="mt-3 pt-2 border-t border-dashed border-slate-400 flex justify-between items-center text-xs font-bold font-mono">
                <div>
                  SL No : <span className="text-sm px-2 py-0.5 border border-black font-extrabold" style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}>{invoice.id}</span>
                </div>
                <div>
                  Date : <span className="underline decoration-dotted">{formatDate(invoice.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Customer Details Block */}
            <div className="border border-black p-3 mb-4 text-xs font-bold space-y-1.5" style={{ backgroundColor: '#f8fafc', color: '#000000', borderColor: '#000000' }}>
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <div className="flex-1">
                  Name : <span className="font-semibold text-slate-900 border-b border-black border-dotted px-1 min-w-[200px] inline-block">{invoice.customerName}</span>
                </div>
                <div>
                  Phone : <span className="font-semibold text-slate-900 border-b border-black border-dotted px-1 min-w-[140px] inline-block">{invoice.customerPhone}</span>
                </div>
              </div>
              <div>
                Address : <span className="font-semibold text-slate-900 border-b border-black border-dotted px-1 w-full inline-block">{invoice.customerAddress || 'Showroom Counter Purchase'}</span>
              </div>
            </div>

            {/* Main Products Grid Table */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left text-xs border-collapse border-2 border-black" style={{ backgroundColor: '#ffffff' }}>
                <thead>
                  <tr className="text-black font-extrabold uppercase border-b-2 border-black text-center" style={{ backgroundColor: '#e2e8f0', color: '#000000' }}>
                    <th className="p-2 border-r border-black w-12">SL. No.</th>
                    <th className="p-2 border-r border-black text-left">Description</th>
                    <th className="p-2 border-r border-black w-14 text-center">Qty</th>
                    <th className="p-2 border-r border-black w-24 text-right">Unit Price</th>
                    <th className="p-2 w-28 text-right">Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-black font-medium">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-black min-h-[36px]" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                      <td className="p-2 border-r border-black text-center font-bold font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-black">
                        <div className="font-extrabold text-sm text-black uppercase">
                          {item.productName}
                          {item.capacity ? ` — ${item.capacity}` : ''}
                        </div>
                        {item.includeInstallationFee && (item.installationFee || item.extraPipingFee) ? (
                          <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                            + Installation Fee: ৳{(item.installationFee || 0).toLocaleString()}
                            {item.extraPipingFt ? ` (${item.extraPipingFt}ft extra piping @ ৳${item.extraPipingFee})` : ''}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-2 border-r border-black text-center font-mono font-bold">
                        {item.quantity}
                      </td>
                      <td className="p-2 border-r border-black text-right font-mono font-bold">
                        ৳{item.unitPrice.toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-mono font-extrabold text-black">
                        ৳{item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Rows Inside Table (matching attached invoice pad structure) */}
                  <tr className="border-t-2 border-black" style={{ backgroundColor: '#f8fafc', color: '#000000' }}>
                    <td colSpan={3} className="p-2 border-r border-black font-bold">
                      Model: <span className="font-normal font-mono">{itemModels || 'Standard Showroom Spec'}</span>
                    </td>
                    <td className="p-2 border-r border-black font-bold text-right">Subtotal:</td>
                    <td className="p-2 text-right font-mono font-bold">৳{invoice.subtotal.toLocaleString()}</td>
                  </tr>

                  {invoice.discountTotal > 0 && (
                    <tr style={{ backgroundColor: '#f8fafc', color: '#000000' }}>
                      <td colSpan={3} className="p-2 border-r border-black font-bold text-xs">
                        Sl. No: <span className="font-normal font-mono">{itemSerials || 'Verified at Delivery'}</span>
                      </td>
                      <td className="p-2 border-r border-black font-bold text-right">Less Discount:</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-800">-৳{invoice.discountTotal.toLocaleString()}</td>
                    </tr>
                  )}

                  <tr className="border-t-2 border-black text-black font-extrabold text-sm" style={{ backgroundColor: '#f1f5f9', color: '#000000' }}>
                    <td colSpan={3} className="p-2 border-r border-black text-[11px] font-bold">
                      N.B. Goods Once Sold Are Not Refundable
                    </td>
                    <td className="p-2 border-r border-black text-right font-bold uppercase text-xs">Total Tk.</td>
                    <td className="p-2 text-right font-mono text-base font-black">
                      ৳{invoice.grandTotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Balance Summary & Taka in Words */}
            <div className="space-y-3 border-b-2 border-black pb-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 text-xs font-bold">
                <div className="flex-1 p-2.5 border border-black rounded-xs" style={{ backgroundColor: '#f8fafc', color: '#000000', borderColor: '#000000' }}>
                  <span className="uppercase text-slate-700 block text-[10px] tracking-wider font-extrabold">
                    Taka (in words) :
                  </span>
                  <span className="text-sm font-extrabold font-serif italic text-black">
                    {numberToWordsBDT(invoice.grandTotal)}
                  </span>
                </div>

                <div className="w-full sm:w-64 border border-black p-2 space-y-1 font-mono text-xs" style={{ backgroundColor: '#f8fafc', color: '#000000', borderColor: '#000000' }}>
                  <div className="flex justify-between">
                    <span>Paid Amount:</span>
                    <span>৳{invoice.paidAmount.toLocaleString()}</span>
                  </div>
                  {invoice.dueAmount > 0 ? (
                    <div className="flex justify-between text-black font-black border-t border-black pt-1">
                      <span>Due Balance:</span>
                      <span>৳{invoice.dueAmount.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="text-right text-[11px] font-black uppercase text-black border-t border-black pt-1">
                      *** PAID IN FULL ***
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Installment / EMI Schedule (only for EMI sales) */}
            {renderWholesaleSummary('bw')}

            {renderInstallmentSchedule('bw')}

            {/* Authorised & Customer Signatures */}
            <div className="pt-10 flex justify-between items-end text-xs font-bold text-black mb-8">
              <div className="text-center">
                <div className="border-b-2 border-black w-44 mb-1"></div>
                <p className="uppercase">Customer's Signature</p>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-slate-700 font-mono mb-1">
                  Served by: {invoice.createdByStaffName || 'Authorized Staff'}
                </p>
                <div className="border-b-2 border-black w-48 mb-1"></div>
                <p className="uppercase font-black">Authorised Signature</p>
                <p className="text-[10px] text-slate-700">{brandTitle}</p>
              </div>
            </div>

            {/* Footer Logos Bar (KONKA, GREE, HAIKO) */}
            <div className="border-t-2 border-black pt-3 mt-4">
              <div className={`grid ${isElectronics ? 'grid-cols-3' : 'grid-cols-4'} gap-2 items-center text-center`}>
                <KonkaLogo isMonochrome />
                <GreeLogo isMonochrome />
                <HaikoLogo isMonochrome />
                {!isElectronics && <HaierLogo isMonochrome />}
              </div>
            </div>

          </div>

          {/* ==================================================================== */}
          {/* OPTION 2: COLOR BRANDED INVOICE VIEW                                 */}
          {/* ==================================================================== */}
          <div
            id="printable-receipt-color"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            className={`p-8 rounded-2xl shadow-sm border border-slate-200 relative font-sans print:p-6 print:border-none print:shadow-none ${
              viewMode === 'color' ? 'block print:block' : 'hidden print:hidden'
            }`}
          >
            {/* Header Banner */}
            <div
              className="p-6 rounded-2xl text-white mb-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              style={{
                background: isElectronics
                  ? 'linear-gradient(to right, #0f172a, #1e3a8a, #312e81)'
                  : 'linear-gradient(to right, #022c22, #134e4a, #064e3b)',
                color: '#ffffff'
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <ElectroMartEmblem className="w-8 h-8 shrink-0 text-white" />
                  <h1 className="text-2xl font-black tracking-tight uppercase text-white">{brandTitle}</h1>
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
                    PREMIUM COLOR COPY
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-1 font-semibold">{partnerTitle}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-amber-400" /> {brandPhone}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-400" /> {brandAddress}</span>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-white/20 sm:pl-6">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">INVOICE NUMBER</p>
                <p className="text-xl font-mono font-black text-amber-300">{invoice.id}</p>
                <p className="text-xs text-slate-300 mt-1">DATE: {formatDate(invoice.createdAt)}</p>
              </div>
            </div>

            {/* Customer & Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 text-sm mb-6" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  CUSTOMER DETAILS
                </p>
                <p className="font-extrabold text-slate-900">{invoice.customerName}</p>
                <p className="text-slate-700 flex items-center gap-1 text-xs mt-0.5 font-bold">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" /> {invoice.customerPhone}
                </p>
                <p className="text-slate-600 text-xs mt-0.5">{invoice.customerAddress || 'Showroom Counter Purchase'}</p>
              </div>

              <div className="md:text-right border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-4">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  BILLING & PAYMENT STATUS
                </p>
                <p className="text-xs text-slate-700 font-bold">
                  Payment Mode: <span className="font-extrabold text-indigo-900 uppercase">{invoice.paymentMode.replace(/_/g, ' ')}</span>
                </p>
                {invoice.customerPaymentNumber && (
                  <p className="text-xs text-slate-700 font-bold mt-1">
                    Customer Wallet: <span className="font-mono font-extrabold text-slate-900">{invoice.customerPaymentNumber}</span>
                  </p>
                )}
                <p className="text-xs text-slate-700 font-bold mt-1">
                  Status:{' '}
                  <span className={`font-extrabold px-2.5 py-0.5 rounded text-[11px] uppercase ${
                    invoice.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {invoice.paymentStatus}
                  </span>
                </p>
                {invoice.isInstallment && (
                  <p className="text-xs text-indigo-700 font-bold mt-1.5 flex items-center md:justify-end gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Authorized Easy Monthly EMI
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm border-collapse rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                <thead>
                  <tr className="text-white font-bold text-xs uppercase" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th className="p-3">#</th>
                    <th className="p-3">Product Description</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border border-slate-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                      <td className="p-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-900">
                        <span className="text-sm font-bold">
                          {item.productName}
                          {item.capacity ? ` — ${item.capacity}` : ''}
                        </span>
                        {item.includeInstallationFee && (item.installationFee || item.extraPipingFee) ? (
                          <div className="text-[11px] text-blue-700 font-bold mt-0.5">
                            + Installation Fee: ৳{(item.installationFee || 0).toLocaleString()}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{item.brand}</td>
                      <td className="p-3 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="p-3 text-right font-mono text-slate-700">৳{item.unitPrice.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">৳{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-4">
              <div className="text-xs text-slate-600 max-w-md space-y-1 p-3 rounded-xl border border-slate-200 w-full" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
                <p className="font-extrabold text-slate-900 uppercase text-[11px]">Taka (in words):</p>
                <p className="font-serif italic font-extrabold text-indigo-950 text-xs">
                  {numberToWordsBDT(invoice.grandTotal)}
                </p>
                <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                  N.B. Goods Once Sold Are Not Refundable. Please retain this original invoice for warranty claim.
                </p>
              </div>

              <div className="w-full sm:w-64 space-y-2 text-sm p-4 rounded-xl border border-slate-200" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">৳{invoice.subtotal.toLocaleString()}</span>
                </div>

                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount:</span>
                    <span className="font-mono">-৳{invoice.discountTotal.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-900 font-black border-t border-slate-300 pt-2 text-base">
                  <span>Grand Total:</span>
                  <span className="font-mono text-indigo-900">৳{invoice.grandTotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Paid Amount:</span>
                  <span className="font-mono">৳{invoice.paidAmount.toLocaleString()}</span>
                </div>

                {invoice.dueAmount > 0 ? (
                  <div className="flex justify-between text-rose-700 font-black border-t border-dashed border-rose-300 pt-1">
                    <span>Due Balance:</span>
                    <span className="font-mono">৳{invoice.dueAmount.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="text-right text-xs font-black text-emerald-600 flex items-center justify-end gap-1 mt-1">
                    <CheckCircle className="w-3.5 h-3.5" /> FULLY PAID
                  </div>
                )}
              </div>
            </div>

            {/* Installment / EMI Schedule (only for EMI sales) */}
            <div className="mt-6">{renderWholesaleSummary('color')}</div>
            <div className="mt-6">{renderInstallmentSchedule('color')}</div>

            {/* Signatures */}
            <div className="mt-10 flex justify-between items-end text-xs text-slate-600 pt-6 border-t border-slate-200 mb-6">
              <div className="text-center">
                <div className="border-b border-slate-400 w-40 mb-1"></div>
                <p className="font-bold uppercase">Customer's Signature</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700 mb-1">Served by: {invoice.createdByStaffName}</p>
                <div className="border-b border-slate-400 w-44 mb-1"></div>
                <p className="font-extrabold text-slate-900">{brandTitle}</p>
                <p className="text-[10px] text-slate-500">Authorized Signature & Seal</p>
              </div>
            </div>

            {/* Color Footer Logos Bar */}
            <div className="border-t border-slate-200 pt-4">
              <div className={`grid ${isElectronics ? 'grid-cols-3' : 'grid-cols-4'} gap-2 items-center text-center`}>
                <KonkaLogo />
                <GreeLogo />
                <HaikoLogo />
                {!isElectronics && <HaierLogo />}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
