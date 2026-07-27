import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, ArrowUpRight, ArrowDownRight, Sliders, ShieldAlert, Check } from 'lucide-react';

interface StockAdjustmentModalProps {
  onClose: () => void;
  preSelectedProductId?: string;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  onClose,
  preSelectedProductId
}) => {
  const { products, activeBusiness, addStockAdjustment } = useApp();

  const availableProducts = products.filter(
    (p) => activeBusiness === 'all' || p.business === activeBusiness
  );

  const [productId, setProductId] = useState<string>(
    preSelectedProductId || (availableProducts[0]?.id ?? '')
  );
  const [productSearch, setProductSearch] = useState('');
  const pickList = availableProducts.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.model ? p.model.toLowerCase().includes(q) : false)
    );
  });
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Physical Audit Count Variance');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const selectedProduct = availableProducts.find((p) => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (quantity <= 0) return;

    const finalReason = reason === 'OTHER_CUSTOM' ? (customReason.trim() || 'Manual Adjustment') : reason;

    addStockAdjustment({
      business: selectedProduct.business,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku,
      brand: selectedProduct.brand,
      category: selectedProduct.category,
      adjustmentType,
      quantity,
      reason: finalReason,
      notes: notes.trim() ? notes : undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Adjust Stock Quantity</h2>
              <p className="text-xs text-slate-300">Audit variance or manual inventory correction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-medium text-slate-700">
          {/* Product Select */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Select Product *</label>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search product by name, SKU, brand or model…"
              className="w-full mb-1.5 border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              size={productSearch.trim() ? Math.min(6, pickList.length || 1) : undefined}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {pickList.length === 0 && <option value="">No matching products</option>}
              {pickList.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.brand}] {p.name} (Stock: {p.stockQty} {p.unit})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-600">
                <span>SKU: <strong className="text-slate-900 font-mono">{selectedProduct.sku}</strong></span>
                <span>Current Stock: <strong className="text-blue-700 text-sm font-extrabold">{selectedProduct.stockQty} {selectedProduct.unit}</strong></span>
              </div>
            )}
          </div>

          {/* Direction Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdjustmentType('increase')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                adjustmentType === 'increase'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/30'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              Increase Stock (+)
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('decrease')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                adjustmentType === 'decrease'
                  ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/30'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
              Decrease Stock (-)
            </button>
          </div>

          {/* Quantity & Expected New Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 font-bold block mb-1">Quantity to Adjust *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">New Total Stock</label>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-extrabold text-sm flex items-center justify-between">
                <span>Updated:</span>
                <span>
                  {selectedProduct
                    ? Math.max(
                        0,
                        selectedProduct.stockQty +
                          (adjustmentType === 'increase' ? quantity : -quantity)
                      )
                    : 0}{' '}
                  {selectedProduct?.unit || 'Pcs'}
                </span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Adjustment Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="Physical Audit Count Variance">Physical Audit Count Variance</option>
              <option value="Found Uncounted Stock in Warehouse">Found Uncounted Stock in Warehouse</option>
              <option value="Physical Damage / Loss Correction">Physical Damage / Loss Correction</option>
              <option value="Barcode Re-tagging Reclassification">Barcode Re-tagging Reclassification</option>
              <option value="Initial Opening Stock Correction">Initial Opening Stock Correction</option>
              <option value="OTHER_CUSTOM">+ Other Reason...</option>
            </select>
            {reason === 'OTHER_CUSTOM' && (
              <input
                type="text"
                placeholder="Enter custom reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 mt-2 text-xs font-medium"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Notes / Internal Reference</label>
            <textarea
              rows={2}
              placeholder="Add audit ref number or inspector note..."
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Stock Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
