import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sliders, Check, Truck, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StockAdjustmentModalProps {
  onClose: () => void;
  preSelectedProductId?: string;
  /** Switch to the supplier restock (stock receiving) flow for the given product. */
  onCreateRestock?: (productId: string) => void;
}

const REASONS = [
  'Physical Audit Count Variance',
  'Found Uncounted Stock in Warehouse',
  'Physical Damage / Loss Correction',
  'Barcode Re-tagging Reclassification',
  'Initial Opening Stock Correction'
];

interface AdjRow {
  id: string;
  productId: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string;
}

const rid = () => `row_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  onClose,
  preSelectedProductId,
  onCreateRestock
}) => {
  const { products, activeBusiness, addStockAdjustment, showToast } = useApp();

  const availableProducts = products.filter(
    (p) => activeBusiness === 'all' || p.business === activeBusiness
  );

  const [productSearch, setProductSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<AdjRow[]>([
    {
      id: rid(),
      productId: preSelectedProductId || availableProducts[0]?.id || '',
      adjustmentType: 'increase',
      quantity: 1,
      reason: REASONS[0]
    }
  ]);

  const matchesProduct = (p: (typeof availableProducts)[number]) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.model ? p.model.toLowerCase().includes(q) : false)
    );
  };

  const updateRow = (id: string, patch: Partial<AdjRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: rid(),
        productId: availableProducts[0]?.id || '',
        adjustmentType: 'increase',
        quantity: 1,
        reason: REASONS[0]
      }
    ]);

  const removeRow = (id: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const prodById = (id: string) => availableProducts.find((p) => p.id === id);

  const validRows = rows.filter((r) => r.productId && r.quantity > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validRows.length === 0) {
      showToast('Add at least one product with a quantity to adjust.');
      return;
    }
    validRows.forEach((r) => {
      const p = prodById(r.productId);
      if (!p) return;
      addStockAdjustment({
        business: p.business,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        brand: p.brand,
        category: p.category,
        adjustmentType: r.adjustmentType,
        quantity: r.quantity,
        reason: r.reason,
        notes: notes.trim() ? notes : undefined
      });
    });
    showToast(`Applied ${validRows.length} stock adjustment${validRows.length === 1 ? '' : 's'}.`);
    onClose();
  };

  const firstIncreaseProductId = rows.find((r) => r.adjustmentType === 'increase' && r.productId)?.productId || rows[0]?.productId || '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Bulk Stock Adjustment</h2>
              <p className="text-xs text-slate-300">Increase / decrease several products in one go (audit variance & corrections)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="p-5 space-y-3 overflow-y-auto text-xs font-medium text-slate-700">
            {/* Supplier restock hint */}
            {onCreateRestock && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-3">
                <Truck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-extrabold text-teal-900 text-[11px]">Receiving new stock from a supplier?</p>
                  <p className="text-[11px] text-teal-800 mt-0.5">
                    Record it as a <strong>Supplier Restock (Stock Receiving)</strong> so the supplier, cost price and
                    purchase order are captured. Use bulk adjustment only for audit surplus / count corrections.
                  </p>
                  <button
                    type="button"
                    onClick={() => onCreateRestock(firstIncreaseProductId)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-lg transition"
                  >
                    <Truck className="w-3.5 h-3.5" /> Create Supplier Restock &amp; Receive Stock
                  </button>
                </div>
              </div>
            )}

            {/* Shared product search */}
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products by name, SKU, brand or model to filter the row dropdowns…"
              className="w-full border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
            />

            {/* Rows */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="hidden md:grid grid-cols-[1.5rem_1fr_7rem_5rem_1fr_5.5rem_2rem] gap-2 bg-slate-100 px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                <span>#</span>
                <span>Product</span>
                <span>Direction</span>
                <span>Qty</span>
                <span>Reason</span>
                <span className="text-right">New Stock</span>
                <span></span>
              </div>
              <div className="divide-y divide-slate-100">
                {rows.map((r, idx) => {
                  const p = prodById(r.productId);
                  const options = availableProducts.filter((x) => x.id === r.productId || matchesProduct(x));
                  const newStock = p ? Math.max(0, p.stockQty + (r.adjustmentType === 'increase' ? r.quantity : -r.quantity)) : 0;
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-1 md:grid-cols-[1.5rem_1fr_7rem_5rem_1fr_5.5rem_2rem] gap-2 px-3 py-2 items-center"
                    >
                      <span className="hidden md:block font-mono font-bold text-slate-400">{idx + 1}</span>

                      <select
                        value={r.productId}
                        onChange={(e) => updateRow(r.id, { productId: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 min-w-0"
                      >
                        {options.length === 0 && <option value="">No matching products</option>}
                        {options.map((op) => (
                          <option key={op.id} value={op.id}>
                            [{op.brand}] {op.name} (Stock {op.stockQty})
                          </option>
                        ))}
                      </select>

                      <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateRow(r.id, { adjustmentType: 'increase' })}
                          className={`flex-1 py-1.5 flex items-center justify-center gap-1 font-bold transition ${
                            r.adjustmentType === 'increase' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                          title="Increase"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />+
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(r.id, { adjustmentType: 'decrease' })}
                          className={`flex-1 py-1.5 flex items-center justify-center gap-1 font-bold transition ${
                            r.adjustmentType === 'decrease' ? 'bg-rose-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                          title="Decrease"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" />−
                        </button>
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={r.quantity}
                        onChange={(e) => updateRow(r.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-800 text-center focus:ring-2 focus:ring-blue-500"
                      />

                      <select
                        value={r.reason}
                        onChange={(e) => updateRow(r.id, { reason: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold bg-white text-slate-700 min-w-0"
                      >
                        {REASONS.map((rs) => (
                          <option key={rs} value={rs}>
                            {rs}
                          </option>
                        ))}
                      </select>

                      <span className={`text-right font-mono font-black text-sm ${r.adjustmentType === 'increase' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {newStock}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        disabled={rows.length === 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed justify-self-end"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product Row
            </button>

            {/* Shared notes */}
            <div>
              <label className="text-slate-600 font-bold block mb-1">Notes / Internal Reference (applies to all rows)</label>
              <textarea
                rows={2}
                placeholder="Add audit ref number or inspector note…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-white">
            <span className="text-xs font-bold text-slate-500">
              {validRows.length} product{validRows.length === 1 ? '' : 's'} to adjust
            </span>
            <div className="flex items-center gap-2">
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
                Save All Adjustments
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
