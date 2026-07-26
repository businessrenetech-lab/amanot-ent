import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InstallmentPlan } from '../../types';
import { Printer, Download, X, ShieldCheck, User, Phone, MapPin, Building2, UserCheck, FileText, Calendar, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import { safeHtml2Canvas } from '../../utils/html2canvasFix';

interface InstallmentAgreementModalProps {
  plan: InstallmentPlan;
  onClose: () => void;
}

export const InstallmentAgreementModal: React.FC<InstallmentAgreementModalProps> = ({ plan, onClose }) => {
  const { settings } = useApp();
  const [isManualBlankMode, setIsManualBlankMode] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const isElectronics = plan.business === 'amanot_electronics';
  const brandTitle = isElectronics ? 'AMANOT ELECTRONICS' : 'AMANOT ENTERPRISE';
  const brandSubtitle = isElectronics
    ? 'Authorized Sales & Service Center for Konka, Gree & Haiko'
    : 'Authorized Outlet for Haier Home Appliances';
  const brandAddress = isElectronics ? settings.amanotElectronicsAddress : settings.amanotEnterpriseAddress;
  const brandPhone = isElectronics ? settings.amanotElectronicsPhone : settings.amanotEnterprisePhone;

  const agreementId = `HPA-${plan.id.slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const downloadPDF = async () => {
    const element = document.getElementById('printable-agreement');
    if (!element) return;

    try {
      setIsGeneratingPdf(true);

      const canvas = await safeHtml2Canvas(element, {
        scale: 2, // High DPI resolution for print quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${agreementId}_${plan.customerName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Could not generate PDF. Please try printing directly using the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 print:shadow-none print:max-h-none print:w-full print:border-none print:rounded-none">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide flex items-center gap-2">
                HIRE-PURCHASE AGREEMENT CONTRACT
                <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full font-mono border border-purple-400/30">
                  Ref: {agreementId}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Official Branded Hire-Purchase Document & Application
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Mode */}
            <button
              type="button"
              onClick={() => setIsManualBlankMode(!isManualBlankMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                isManualBlankMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              {isManualBlankMode ? 'Switch to Populated Contract' : 'Print Blank Manual Form'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Document
            </button>

            <button
              type="button"
              onClick={downloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className={`w-4 h-4 text-emerald-400 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
              {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE AGREEMENT BODY */}
        <div
          className="p-8 space-y-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible font-sans"
          id="printable-agreement"
          style={{ backgroundColor: '#ffffff', color: '#000000' }}
        >
          
          {/* Header Branding */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-700" />
                {brandTitle}
              </h1>
              <p className="text-xs font-bold text-slate-600">{brandSubtitle}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {brandAddress}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {brandPhone}</span>
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-purple-900 text-white font-black text-xs uppercase tracking-widest rounded-md mb-1">
                {isManualBlankMode ? 'APPLICATION FORM' : 'HIRE-PURCHASE CONTRACT'}
              </span>
              <p className="text-xs font-mono font-bold text-slate-700">Contract Ref: {agreementId}</p>
              <p className="text-xs text-slate-500">Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {isManualBlankMode ? (
            /* ================= MANUAL BLANK WRITING FORM ================= */
            <div className="space-y-6">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold print:hidden">
                ℹ️ Blank Manual Application Form Mode: Print this form for physical pen completion and customer signatures during shop visit.
              </div>

              {/* Photos placeholders */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center h-32 flex flex-col items-center justify-center text-slate-400">
                  <User className="w-8 h-8 mb-1 text-slate-300" />
                  <span className="text-[11px] font-bold">Attach Customer Photo</span>
                  <span className="text-[9px] text-slate-400">(Passport Size)</span>
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center h-32 flex flex-col items-center justify-center text-slate-400">
                  <UserCheck className="w-8 h-8 mb-1 text-slate-300" />
                  <span className="text-[11px] font-bold">Attach Guarantor Photo</span>
                  <span className="text-[9px] text-slate-400">(Passport Size)</span>
                </div>
              </div>

              {/* Section 1: Customer Info Fields */}
              <div className="space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  1. CUSTOMER PERSONAL & IDENTITY DETAILS
                </h3>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border-b border-slate-300 pb-1">Customer Full Name: <span className="font-bold">{plan.customerName}</span></div>
                  <div className="border-b border-slate-300 pb-1">Contact Phone: <span className="font-bold">{plan.customerPhone}</span></div>
                  <div className="border-b border-slate-300 pb-1">Father's Name: _____________________________________</div>
                  <div className="border-b border-slate-300 pb-1">Mother's Name: _____________________________________</div>
                  <div className="border-b border-slate-300 pb-1">Spouse Name: ______________________________________</div>
                  <div className="border-b border-slate-300 pb-1">Date of Birth: _____/_____/_________</div>
                  <div className="border-b border-slate-300 pb-1">Identity Doc Type: [ ] NID  [ ] Passport  [ ] Driving License</div>
                  <div className="border-b border-slate-300 pb-1">ID / Passport Number: _____________________________</div>
                  <div className="border-b border-slate-300 pb-1">Email: _____________________________________________</div>
                  <div className="border-b border-slate-300 pb-1">Profession / Business: _____________________________</div>
                </div>

                <div className="text-xs space-y-2 pt-1">
                  <div className="border-b border-slate-300 pb-1">Present Address: __________________________________________________________________________________________</div>
                  <div className="border-b border-slate-300 pb-1">Permanent Address: ________________________________________________________________________________________</div>
                </div>
              </div>

              {/* Section 2: Product & EMI Details */}
              <div className="space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  2. PRODUCT FINANCING BREAKDOWN
                </h3>

                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>Invoice Ref: <span className="font-bold">{plan.invoiceId}</span></div>
                  <div>Total Product Value: <span className="font-black text-slate-900">৳{plan.totalAmount.toLocaleString()}</span></div>
                  <div>Down Payment Paid: <span className="font-bold text-emerald-800">৳{plan.downPayment.toLocaleString()}</span></div>
                  <div>Financed Principal: <span className="font-bold text-purple-800">৳{plan.financedAmount.toLocaleString()}</span></div>
                  <div>Monthly EMI: <span className="font-black text-purple-900">৳{plan.monthlyEmi.toLocaleString()}</span></div>
                  <div>Tenure Duration: <span className="font-bold">{plan.totalInstallments} Months</span></div>
                </div>
              </div>

              {/* Section 3: Guarantor Info */}
              <div className="space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  3. GUARANTOR & EMERGENCY CONTACT
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border-b border-slate-300 pb-1">Guarantor Name: ____________________________________</div>
                  <div className="border-b border-slate-300 pb-1">Guarantor Phone: ___________________________________</div>
                  <div className="border-b border-slate-300 pb-1">Relationship to Customer: ___________________________</div>
                  <div className="border-b border-slate-300 pb-1">Guarantor NID No: __________________________________</div>
                  <div className="col-span-2 border-b border-slate-300 pb-1">Guarantor Address: ____________________________________________________________________________________</div>
                  <div className="border-b border-slate-300 pb-1">Emergency Contact Person: ___________________________</div>
                  <div className="border-b border-slate-300 pb-1">Emergency Contact Phone: ___________________________</div>
                </div>
              </div>

              {/* Section 4: Declaration & Signatures */}
              <div className="pt-6 space-y-12 border-t border-slate-300">
                <p className="text-[11px] text-slate-600 italic">
                  Declaration: I hereby declare that the information provided above is true and correct. I agree to abide by the hire-purchase agreement rules and ensure monthly EMI payments on time.
                </p>

                <div className="grid grid-cols-3 gap-6 text-center text-xs pt-8">
                  <div>
                    <div className="border-t border-slate-900 pt-2 font-bold text-slate-900">Customer Signature</div>
                    <p className="text-[10px] text-slate-500">Date: ____/____/_______</p>
                  </div>
                  <div>
                    <div className="border-t border-slate-900 pt-2 font-bold text-slate-900">Guarantor Signature</div>
                    <p className="text-[10px] text-slate-500">Date: ____/____/_______</p>
                  </div>
                  <div>
                    <div className="border-t border-slate-900 pt-2 font-bold text-slate-900">Authorized Manager Signature</div>
                    <p className="text-[10px] text-slate-500">Official Seal & Date</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= POPULATED CONTRACT ================= */
            <div className="space-y-6">
              
              {/* Customer & Photo Grid */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-black text-xs uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-purple-700" /> 1. CUSTOMER IDENTITY & KYC DETAILS
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-700 pt-2">
                      <div><span className="text-slate-400">Customer Name:</span> <strong className="text-slate-900 font-extrabold">{plan.customerName}</strong></div>
                      <div><span className="text-slate-400">Phone Number:</span> <strong className="text-slate-900 font-mono">{plan.customerPhone}</strong></div>
                      <div><span className="text-slate-400">Father's Name:</span> <strong className="text-slate-800">{plan.fatherName || '—'}</strong></div>
                      <div><span className="text-slate-400">Mother's Name:</span> <strong className="text-slate-800">{plan.motherName || '—'}</strong></div>
                      <div><span className="text-slate-400">Spouse Name:</span> <strong className="text-slate-800">{plan.spouseName || '—'}</strong></div>
                      <div><span className="text-slate-400">Date of Birth:</span> <strong className="text-slate-800">{plan.dob || '—'}</strong></div>
                      <div><span className="text-slate-400">ID Document Type:</span> <strong className="text-purple-800 uppercase font-bold">{plan.idType || 'NID'}</strong></div>
                      <div><span className="text-slate-400">ID Number:</span> <strong className="text-slate-800 font-mono">{plan.idNumber || '—'}</strong></div>
                      <div><span className="text-slate-400">Email:</span> <strong className="text-slate-800">{plan.customerEmail || '—'}</strong></div>
                      <div><span className="text-slate-400">Profession:</span> <strong className="text-slate-800">{plan.profession || '—'}</strong></div>
                      <div className="col-span-2"><span className="text-slate-400">Present Address:</span> <strong className="text-slate-800">{plan.presentAddress || '—'}</strong></div>
                      <div className="col-span-2"><span className="text-slate-400">Permanent Address:</span> <strong className="text-slate-800">{plan.permanentAddress || '—'}</strong></div>
                      {plan.emergencyContactName && (
                        <div className="col-span-2 bg-purple-100/60 p-1.5 rounded-lg text-purple-950 font-medium">
                          Emergency Contact: <strong>{plan.emergencyContactName}</strong> ({plan.emergencyContactPhone || 'N/A'})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Photo Badge */}
                  <div className="w-24 h-28 rounded-xl border border-slate-300 bg-white overflow-hidden shrink-0 text-center flex flex-col items-center justify-center p-1 shadow-xs">
                    {plan.customerPhotoUrl ? (
                      <img src={plan.customerPhotoUrl} alt="Customer" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="p-2 text-slate-400 flex flex-col items-center">
                        <User className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="text-[9px] font-bold">No Photo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Financing Overview */}
              <div className="border border-purple-200 rounded-2xl p-4 bg-purple-50/40 space-y-2">
                <h3 className="font-black text-xs uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-700" /> 2. FINANCING BREAKDOWN & EMI TERMS
                </h3>

                <div className="grid grid-cols-4 gap-3 text-xs pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-slate-500 font-bold block">Invoice Reference</span>
                    <strong className="text-slate-900 font-mono font-black">{plan.invoiceId}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-slate-500 font-bold block">Total Price</span>
                    <strong className="text-slate-900 font-black">৳{plan.totalAmount.toLocaleString()}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-emerald-700 font-bold block">Down Payment</span>
                    <strong className="text-emerald-800 font-black">৳{plan.downPayment.toLocaleString()}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-purple-700 font-bold block">Financed Credit Balance</span>
                    <strong className="text-purple-900 font-black">৳{plan.financedAmount.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-purple-900 text-white p-3 rounded-xl text-xs mt-2">
                  <span>Monthly Installment (EMI): <strong className="text-amber-300 font-black text-sm">৳{plan.monthlyEmi.toLocaleString()} / Month</strong></span>
                  <span>Total Tenure: <strong className="text-white font-black">{plan.totalInstallments} Installment Months</strong></span>
                </div>
              </div>

              {/* Guarantor Details */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-black text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-700" /> 3. GUARANTOR & SECURITY WITNESS PROFILE
                    </h3>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-700 pt-2">
                      <div><span className="text-slate-400">Guarantor Name:</span> <strong className="text-slate-900 font-extrabold">{plan.guarantorName || '—'}</strong></div>
                      <div><span className="text-slate-400">Phone:</span> <strong className="text-slate-900 font-mono">{plan.guarantorPhone || '—'}</strong></div>
                      <div><span className="text-slate-400">Relationship:</span> <strong className="text-slate-800">{plan.guarantorRelation || '—'}</strong></div>
                      <div><span className="text-slate-400">Guarantor NID:</span> <strong className="text-slate-800 font-mono">{plan.guarantorNid || '—'}</strong></div>
                      <div className="col-span-2"><span className="text-slate-400">Address:</span> <strong className="text-slate-800">{plan.guarantorAddress || '—'}</strong></div>
                    </div>
                  </div>

                  {/* Guarantor Photo Badge */}
                  <div className="w-20 h-24 rounded-xl border border-slate-300 bg-white overflow-hidden shrink-0 text-center flex flex-col items-center justify-center p-1 shadow-xs">
                    {plan.guarantorPhotoUrl ? (
                      <img src={plan.guarantorPhotoUrl} alt="Guarantor" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="p-2 text-slate-400 flex flex-col items-center">
                        <UserCheck className="w-6 h-6 text-slate-300 mb-1" />
                        <span className="text-[9px] font-bold">No Photo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Installment Repayment Schedule Overview */}
              <div className="space-y-2">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-700" /> 4. REPAYMENT SCHEDULE SUMMARY
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2 pl-3">#</th>
                        <th className="p-2">Due Date</th>
                        <th className="p-2">Installment Amount</th>
                        <th className="p-2">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plan.schedule.map((s) => (
                        <tr key={s.installmentNo} className={s.status === 'paid' ? 'bg-emerald-50/40' : ''}>
                          <td className="p-2 pl-3 font-mono font-bold text-slate-600">EMI #{s.installmentNo}</td>
                          <td className="p-2 font-mono">{s.dueDate}</td>
                          <td className="p-2 font-bold text-slate-900">৳{s.amount.toLocaleString()}</td>
                          <td className="p-2">
                            {s.status === 'paid' ? (
                              <span className="text-emerald-700 font-extrabold uppercase text-[10px]">Paid on {s.paidDate || 'Record'}</span>
                            ) : (
                              <span className="text-amber-800 font-bold uppercase text-[10px]">Pending Due</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Contract Terms */}
              <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-600 space-y-1">
                <h4 className="font-black text-xs text-slate-900 uppercase">Hire-Purchase Terms & Conditions</h4>
                <p>1. The hirer (customer) agrees to pay the installments strictly on or before the due date specified above.</p>
                <p>2. The hired goods remain the exclusive property of {brandTitle} until all installments are paid in full.</p>
                <p>3. In the event of default for 2 consecutive monthly installments, the owner reserves full right to repossess the product without prior court order.</p>
                {plan.notes && (
                  <p className="bg-amber-50 p-2 rounded-lg text-amber-900 font-medium border border-amber-200 mt-2">
                    <strong>Special Conditions:</strong> {plan.notes}
                  </p>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="border-t-2 border-slate-900 pt-2 font-bold text-slate-900">{plan.customerName}</div>
                  <p className="text-[10px] text-slate-500">Customer Signature & Thumb Print</p>
                </div>
                <div>
                  <div className="border-t-2 border-slate-900 pt-2 font-bold text-slate-900">{plan.guarantorName || 'Guarantor'}</div>
                  <p className="text-[10px] text-slate-500">Guarantor Signature</p>
                </div>
                <div>
                  <div className="border-t-2 border-slate-900 pt-2 font-bold text-slate-900">{brandTitle}</div>
                  <p className="text-[10px] text-slate-500">Authorized Manager & Seal</p>
                </div>
              </div>

            </div>
          )}

          {/* Footer note */}
          <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400 print:text-slate-500">
            This is an official hire-purchase contract issued by {brandTitle}. Generated on {new Date().toLocaleString()}.
          </div>

        </div>

      </div>
    </div>
  );
};
