import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Undo2, Check, Plus, Trash2 } from 'lucide-react';

interface SupplierReturnModalProps {
  onClose: () => void;
}

export const SupplierReturnModal: React.FC<SupplierReturnModalProps> = ({ onClose }) => {
  const { suppliers, products, activeBusiness, addSupplierReturn } = useApp();

  const availableSuppliers = suppliers.filter(
    (s) => activeBusiness === 'all' || s.business === activeBusiness
  );

  const availableProducts = products.filter(
    (p) => activeBusiness === 'all' || p.business === activeBusiness
  );

  const [supplierId, setSupplierId] = useState<string>(availableSuppliers[0]?.id || '');
  const [returnItems, setReturnItems] = useState<
    Array<{
      productId: string;
      productName: string;
      sku: string;
      brand: string;
      category: string;
      quantity: number;
      unitCost: number;
    }>
  >([
    {
      productId: availableProducts[0]?.id || '',
      productName: availableProducts[0]?.name || '',
      sku: availableProducts[0]?.sku || '',
      brand: availableProducts[0]?.brand || 'Generic',
      category: availableProducts[0]?.category || 'General',
      quantity: 1,
      unitCost: availableProducts[0]?.costPrice || 0
    }
  ]);

  const [refundMode, setRefundMode] = useState<'cash' | 'supplier_credit' | 'bank_transfer' | 'bkash_nagad'>(
    'supplier_credit'
  );
  const [reason, setReason] = useState<string>('Factory PCB Defect on Arrival');
  const [notes, setNotes] = useState<string>('');

  const selectedSupplier = availableSuppliers.find((s) => s.id === supplierId);

  const handleProductChange = (index: number, prodId: string) => {
    const prod = availableProducts.find((p) => p.id === prodId);
    if (!prod) return;
    setReturnItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              brand: prod.brand,
              category: prod.category,
              unitCost: prod.costPrice
            }
          : item
      )
    );
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const handleCostChange = (index: number, cost: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unitCost: Math.max(0, cost) } : item))
    );
  };

  const addReturnRow = () => {
    const firstP = availableProducts[0];
    if (!firstP) return;
    setReturnItems((prev) => [
      ...prev,
      {
        productId: firstP.id,
        productName: firstP.name,
        sku: firstP.sku,
        brand: firstP.brand,
        category: firstP.category,
        quantity: 1,
        unitCost: firstP.costPrice
      }
    ]);
  };

  const removeReturnRow = (index: number) => {
    if (returnItems.length <= 1) return;
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalRefundAmount = returnItems.reduce((acc, item) => acc + item.quantity * item.unitCost, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (returnItems.length === 0) return;

    addSupplierReturn({
      business: selectedSupplier.business,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.companyName || selectedSupplier.name,
      items: returnItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        brand: item.brand,
        category: item.category,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost
      })),
      totalRefundAmount,
      refundMode,
      reason,
      notes: notes.trim() ? notes : undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold">
              <Undo2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Process Return to Supplier</h2>
              <p className="text-xs text-slate-300">Return damaged/overstock items & claim credit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-medium text-slate-700">
          {/* Supplier Selector */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Target Supplier *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {availableSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName} ({s.name}) - Current Owed Balance: ৳{s.balance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold">Return Items & Quantities *</label>
              <button
                type="button"
                onClick={addReturnRow}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Item
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {returnItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-500 block mb-0.5 font-bold">Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-bold bg-white"
                    >
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.brand}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-0.5 font-bold">Return Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 block mb-0.5 font-bold">Unit Cost (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => handleCostChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="col-span-2 flex items-center justify-between pl-1">
                    <span className="font-extrabold text-slate-900 text-xs">
                      ৳{(item.quantity * item.unitCost).toLocaleString()}
                    </span>
                    {returnItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeReturnRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Mode & Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-bold block mb-1">Refund Settlement / Credit *</label>
              <select
                value={refundMode}
                onChange={(e) =>
                  setRefundMode(e.target.value as 'cash' | 'supplier_credit' | 'bank_transfer' | 'bkash_nagad')
                }
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="supplier_credit">Credit to Supplier Balance / Next Purchase Due Adjustment</option>
                <option value="cash">Direct Cash Refund from Supplier</option>
                <option value="bank_transfer">Bank Wire Transfer Refund</option>
                <option value="bkash_nagad">bKash / Nagad Mobile Refund</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1">Return Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="Factory PCB Defect on Arrival">Factory PCB Defect on Arrival</option>
                <option value="Wrong Specification Shipped">Wrong Specification Shipped</option>
                <option value="Overstock Return Agreement">Overstock Return Agreement</option>
                <option value="Transport Scratch Damage">Transport Scratch Damage</option>
              </select>
            </div>
          </div>

          {refundMode === 'supplier_credit' && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs">
              <p className="font-extrabold flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                Automatic Due & Purchase Credit Adjustment:
              </p>
              <p className="text-[11px] text-indigo-800 leading-relaxed font-normal">
                This return will create a <strong>৳{totalRefundAmount.toLocaleString()}</strong> credit against {selectedSupplier?.companyName || 'the supplier'}. 
                It automatically reduces existing unpaid purchase balances or creates a receivable credit that will adjust against your next purchase order.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Return Notes / Claim Ref</label>
            <textarea
              rows={2}
              placeholder="Credit memo ref or driver delivery note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2 text-xs"
            />
          </div>

          {/* Total & Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-bold block">Total Refund Value:</span>
              <strong className="text-indigo-800 text-lg font-extrabold">
                ৳{totalRefundAmount.toLocaleString()}
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Submit Supplier Return
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
