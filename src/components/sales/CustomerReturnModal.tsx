import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, RotateCcw, Check, Search, Plus, Trash2 } from 'lucide-react';

interface CustomerReturnModalProps {
  onClose: () => void;
  preSelectedInvoiceId?: string;
}

export const CustomerReturnModal: React.FC<CustomerReturnModalProps> = ({
  onClose,
  preSelectedInvoiceId
}) => {
  const { sales, products, activeBusiness, addCustomerReturn } = useApp();

  const availableSales = sales.filter(
    (s) => activeBusiness === 'all' || s.business === activeBusiness
  );

  const [invoiceId, setInvoiceId] = useState<string>(
    preSelectedInvoiceId || availableSales[0]?.id || ''
  );
  const [refundMode, setRefundMode] = useState<'cash' | 'customer_credit' | 'bkash_nagad' | 'bank_transfer'>(
    'cash'
  );
  const [restockItems, setRestockItems] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('Customer requested model exchange / upgrade');
  const [notes, setNotes] = useState<string>('');

  const selectedSale = availableSales.find((s) => s.id === invoiceId);

  // Initialize return items based on selected sale
  const [returnItems, setReturnItems] = useState<
    Array<{
      productId: string;
      productName: string;
      brand: string;
      category: string;
      quantity: number;
      unitPrice: number;
      condition: 'good_restock' | 'damaged';
    }>
  >(() => {
    if (!selectedSale) return [];
    return selectedSale.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      brand: item.brand,
      category: item.category,
      quantity: 1,
      unitPrice: item.unitPrice,
      condition: 'good_restock'
    }));
  });

  const [customRefundAmount, setCustomRefundAmount] = useState<number>(() => {
    if (!selectedSale) return 0;
    return selectedSale.items.reduce((acc, i) => acc + 1 * i.unitPrice, 0);
  });
  const [isCustomAmountModified, setIsCustomAmountModified] = useState<boolean>(false);

  const handleInvoiceChange = (newInvId: string) => {
    setInvoiceId(newInvId);
    const sale = availableSales.find((s) => s.id === newInvId);
    if (sale) {
      const items = sale.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        brand: item.brand,
        category: item.category,
        quantity: 1,
        unitPrice: item.unitPrice,
        condition: 'good_restock' as const
      }));
      setReturnItems(items);
      const calcTotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
      setCustomRefundAmount(calcTotal);
      setIsCustomAmountModified(false);
    }
  };

  const calculatedTotal = returnItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );

  const handleQtyChange = (idx: number, qty: number) => {
    const newQty = Math.max(1, qty);
    const updated = returnItems.map((item, i) => (i === idx ? { ...item, quantity: newQty } : item));
    setReturnItems(updated);
    if (!isCustomAmountModified) {
      setCustomRefundAmount(updated.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0));
    }
  };

  const handleUnitPriceChange = (idx: number, price: number) => {
    const newPrice = Math.max(0, price);
    const updated = returnItems.map((item, i) => (i === idx ? { ...item, unitPrice: newPrice } : item));
    setReturnItems(updated);
    if (!isCustomAmountModified) {
      setCustomRefundAmount(updated.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0));
    }
  };

  const handleConditionChange = (idx: number, condition: 'good_restock' | 'damaged') => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, condition } : item))
    );
  };

  const removeItem = (idx: number) => {
    const updated = returnItems.filter((_, i) => i !== idx);
    setReturnItems(updated);
    if (!isCustomAmountModified) {
      setCustomRefundAmount(updated.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0));
    }
  };

  const resetToCalculatedTotal = () => {
    setCustomRefundAmount(calculatedTotal);
    setIsCustomAmountModified(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || returnItems.length === 0) return;

    const finalRefundAmount = isCustomAmountModified ? customRefundAmount : calculatedTotal;

    addCustomerReturn({
      invoiceId: selectedSale.id,
      business: selectedSale.business,
      customerId: selectedSale.customerId,
      customerName: selectedSale.customerName,
      customerPhone: selectedSale.customerPhone,
      items: returnItems.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        brand: i.brand,
        category: i.category,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalAmount: i.quantity * i.unitPrice,
        condition: i.condition
      })),
      totalRefundAmount: finalRefundAmount,
      refundMode,
      restockItems,
      reason,
      notes: notes.trim() ? notes : undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Process Customer Sales Return</h2>
              <p className="text-xs text-blue-200">Return sold items, restock inventory & issue refund</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-medium text-slate-700">
          {/* Select Invoice */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Select Sale Invoice ID *</label>
            <select
              value={invoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {availableSales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.customerName} ({s.customerPhone}) • Grand Total: ৳{s.grandTotal.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Sale details summary card */}
          {selectedSale && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-600 text-xs">
              <div>
                <span>Customer: <strong className="text-slate-900 font-bold">{selectedSale.customerName}</strong></span> • 
                <span> Phone: <strong className="text-slate-900 font-bold">{selectedSale.customerPhone}</strong></span>
              </div>
              <div>
                <span>Paid Amount: <strong className="text-emerald-700 font-extrabold">৳{selectedSale.paidAmount.toLocaleString()}</strong></span>
              </div>
            </div>
          )}

          {/* Items to return */}
          <div className="space-y-2">
            <label className="text-slate-700 font-bold block">Returned Items & Condition *</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {returnItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center text-xs"
                >
                  <div className="col-span-4">
                    <span className="font-extrabold text-slate-900 block truncate">{item.productName}</span>
                    <span className="text-[10px] text-slate-500">{item.brand} | {item.category}</span>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block font-bold">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 rounded-lg p-1 text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block font-bold">Unit Price (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleUnitPriceChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-300 rounded-lg p-1 text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 block font-bold">Condition</label>
                    <select
                      value={item.condition}
                      onChange={(e) =>
                        handleConditionChange(idx, e.target.value as 'good_restock' | 'damaged')
                      }
                      className="w-full border border-slate-300 rounded-lg p-1 text-[11px] font-bold bg-white"
                    >
                      <option value="good_restock">Good (Restock)</option>
                      <option value="damaged">Damaged (Loss)</option>
                    </select>
                  </div>

                  <div className="col-span-1 flex items-center justify-end">
                    {returnItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Remove item from return"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Refund Amount Override Input Field */}
          <div className="bg-blue-50/70 p-3.5 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-black text-blue-950 block">
                Total Refund Amount (Editable Input) *
              </label>
              <p className="text-[10px] text-blue-700 font-medium">
                Calculated item total: <strong>৳{calculatedTotal.toLocaleString()}</strong>. You can manually enter a custom/partial refund amount.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">৳</span>
                <input
                  type="number"
                  min="0"
                  value={customRefundAmount}
                  onChange={(e) => {
                    setCustomRefundAmount(parseFloat(e.target.value) || 0);
                    setIsCustomAmountModified(true);
                  }}
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-blue-300 rounded-xl text-sm font-black text-blue-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {isCustomAmountModified && (
                <button
                  type="button"
                  onClick={resetToCalculatedTotal}
                  className="px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold rounded-xl transition shrink-0"
                  title="Reset to calculated total"
                >
                  Reset Total
                </button>
              )}
            </div>
          </div>

          {/* Refund Method & Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-bold block mb-1">Refund Method *</label>
              <select
                value={refundMode}
                onChange={(e) =>
                  setRefundMode(e.target.value as 'cash' | 'customer_credit' | 'bkash_nagad' | 'bank_transfer')
                }
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="cash">Direct Cash Refund</option>
                <option value="bkash_nagad">bKash / Nagad Mobile Cashout</option>
                <option value="customer_credit">Store Credit Balance</option>
                <option value="bank_transfer">Bank Wire Refund</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1">Return Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="Customer requested model exchange / upgrade">Customer requested model exchange / upgrade</option>
                <option value="Minor Scratch / Cosmetic Dislike">Minor Scratch / Cosmetic Dislike</option>
                <option value="Product Defect / Faulty Unit">Product Defect / Faulty Unit</option>
                <option value="Purchased Wrong Capacity Size">Purchased Wrong Capacity Size</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Notes / Return Receipt Note</label>
            <textarea
              rows={2}
              placeholder="Return voucher details or cashier signature..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2 text-xs"
            />
          </div>

          {/* Footer Total & Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-bold block">Total Refund Payable:</span>
              <strong className="text-blue-800 text-lg font-extrabold">
                ৳{(isCustomAmountModified ? customRefundAmount : calculatedTotal).toLocaleString()}
              </strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Process Customer Return
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
