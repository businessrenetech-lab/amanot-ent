import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, AlertTriangle, ShieldAlert, Check } from 'lucide-react';

interface DamageControlModalProps {
  onClose: () => void;
  preSelectedProductId?: string;
}

export const DamageControlModal: React.FC<DamageControlModalProps> = ({
  onClose,
  preSelectedProductId
}) => {
  const { products, activeBusiness, addDamageLog } = useApp();

  const availableProducts = products.filter(
    (p) => activeBusiness === 'all' || p.business === activeBusiness
  );

  const [productId, setProductId] = useState<string>(
    preSelectedProductId || (availableProducts[0]?.id ?? '')
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [cause, setCause] = useState<string>('Transport Transit Damage');
  const [customCause, setCustomCause] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<
    'written_off' | 'scrapped' | 'sent_for_repair' | 'returned_to_supplier'
  >('written_off');
  const [notes, setNotes] = useState<string>('');

  const selectedProduct = availableProducts.find((p) => p.id === productId);

  const unitCost = selectedProduct?.costPrice || 0;
  const totalLoss = unitCost * quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (quantity <= 0) return;

    const finalCause = cause === 'OTHER_CUSTOM' ? (customCause.trim() || 'Physical Damage') : cause;

    addDamageLog({
      business: selectedProduct.business,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku,
      brand: selectedProduct.brand,
      category: selectedProduct.category,
      quantity,
      unitCost,
      totalLoss,
      cause: finalCause,
      actionTaken,
      notes: notes.trim() ? notes : undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-900 to-amber-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Report Damaged Product / Loss</h2>
              <p className="text-xs text-amber-200">Log physical damage and write off stock</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-rose-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-medium text-slate-700">
          {/* Product Select */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Select Damaged Item *</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-rose-500"
            >
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.brand}] {p.name} (In Stock: {p.stockQty} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Loss Calculation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-bold block mb-1">Damaged Quantity *</label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.stockQty || 999}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">Financial Cost Loss</label>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-extrabold text-sm flex items-center justify-between">
                <span>Total Loss:</span>
                <span>৳{totalLoss.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Cause */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Damage Cause *</label>
            <select
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="Transport Transit Damage">Transport Transit Damage (Truck/Lorry)</option>
              <option value="Showroom Display Scratch">Showroom Display Scratch / Dented</option>
              <option value="Factory Defect on Arrival">Factory Component Defect on Arrival</option>
              <option value="Water Leakage / Short-circuit">Water Leakage / Short-circuit Moisture</option>
              <option value="Customer Handling Damage">Customer Handling Damage</option>
              <option value="OTHER_CUSTOM">+ Other Cause...</option>
            </select>
            {cause === 'OTHER_CUSTOM' && (
              <input
                type="text"
                placeholder="Enter custom damage cause..."
                value={customCause}
                onChange={(e) => setCustomCause(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 mt-2 text-xs font-medium"
              />
            )}
          </div>

          {/* Action Taken */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Action Taken *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionTaken('written_off')}
                className={`p-2 rounded-xl border text-xs font-bold transition ${
                  actionTaken === 'written_off'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Loss Written Off
              </button>
              <button
                type="button"
                onClick={() => setActionTaken('scrapped')}
                className={`p-2 rounded-xl border text-xs font-bold transition ${
                  actionTaken === 'scrapped'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Disposed / Scrapped
              </button>
              <button
                type="button"
                onClick={() => setActionTaken('sent_for_repair')}
                className={`p-2 rounded-xl border text-xs font-bold transition ${
                  actionTaken === 'sent_for_repair'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Sent for Local Repair
              </button>
              <button
                type="button"
                onClick={() => setActionTaken('returned_to_supplier')}
                className={`p-2 rounded-xl border text-xs font-bold transition ${
                  actionTaken === 'returned_to_supplier'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Returned to Supplier
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Notes / Inspection Comments</label>
            <textarea
              rows={2}
              placeholder="Detailed description of physical condition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2 text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Log Damage & Deduct Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
