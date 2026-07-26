import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Building2, Phone, MapPin, Download, ArrowLeft } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

export const OnlineReceiptView: React.FC<{ invoiceId: string; onBack?: () => void }> = ({ invoiceId, onBack }) => {
  const { sales, settings, setCurrentMode } = useApp();

  const invoice = sales.find((s) => s.id === invoiceId) || sales[0];

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold">Invoice Not Found</h2>
        <p className="text-slate-400 mt-2">The requested e-receipt link may be invalid or expired.</p>
        <button
          onClick={() => setCurrentMode('website')}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition"
        >
          Go to Storefront
        </button>
      </div>
    );
  }

  const isElectronics = invoice.business === 'amanot_electronics';
  const brandTitle = isElectronics ? 'AMANOT ELECTRONICS' : 'AMANOT ENTERPRISE';
  const brandSubtitle = isElectronics 
    ? 'Official Sales & Service Center (Konka, Gree & Haiko)' 
    : 'Official Outlet (Haier Home Appliances)';
  const brandAddress = isElectronics ? settings.amanotElectronicsAddress : settings.amanotEnterpriseAddress;
  const brandPhone = isElectronics ? settings.amanotElectronicsPhone : settings.amanotEnterprisePhone;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 flex justify-center">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Top Digital Header */}
        <div className={`p-8 text-white ${isElectronics ? 'bg-slate-900' : 'bg-teal-950'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold mb-3 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Verified Digital E-Receipt
            </div>
            <h1 className="text-2xl font-black">{brandTitle}</h1>
            <p className="text-xs text-slate-300 mt-1">{brandSubtitle}</p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">INVOICE NO</p>
            <p className="text-xl font-mono font-bold text-yellow-400">{invoice.id}</p>
            <p className="text-xs text-slate-300 mt-0.5">Date: {formatDate(invoice.createdAt)}</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Customer & Business details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CUSTOMER DETAILS</p>
              <p className="font-bold text-slate-900">{invoice.customerName}</p>
              <p className="text-slate-600 text-xs mt-0.5">Phone: {invoice.customerPhone}</p>
              <p className="text-slate-600 text-xs mt-0.5">{invoice.customerAddress || 'Dhaka'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">STORE OUTLET</p>
              <p className="font-bold text-slate-900">{brandTitle}</p>
              <p className="text-slate-600 text-xs mt-0.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {brandPhone}
              </p>
              <p className="text-slate-600 text-xs mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {brandAddress}
              </p>
            </div>
          </div>

          {/* Purchased Items */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Purchased Products</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium">{item.productName}</td>
                      <td className="p-3 font-semibold text-slate-600">{item.brand}</td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">৳{item.unitPrice.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">৳{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">PAYMENT METHOD</p>
              <p className="text-base font-bold text-slate-900 uppercase mt-0.5">{invoice.paymentMode.replace('_', ' ')}</p>
            </div>

            <div className="w-full sm:w-60 space-y-1 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Grand Total:</span>
                <span className="font-mono font-bold text-slate-900">৳{invoice.grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Paid Amount:</span>
                <span className="font-mono">৳{invoice.paidAmount.toLocaleString()}</span>
              </div>
              {invoice.dueAmount > 0 ? (
                <div className="flex justify-between text-rose-600 font-bold border-t pt-1">
                  <span>Due Amount:</span>
                  <span className="font-mono">৳{invoice.dueAmount.toLocaleString()}</span>
                </div>
              ) : (
                <p className="text-xs font-bold text-emerald-600 text-right mt-1">✓ FULLY PAID</p>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
            Thank you for choosing {brandTitle}. For customer service or warranty queries, call {brandPhone}.
          </div>

          {onBack && (
            <div className="pt-2">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Return to ERP Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
