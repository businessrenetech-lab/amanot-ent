import React, { useState } from 'react';
import { Product, BusinessType } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Edit3,
  DollarSign,
  Tag,
  Building2,
  PackageCheck,
  ShieldCheck,
  Wrench,
  Globe,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface BulkEditProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: string[];
  onClearSelection: () => void;
}

export const BulkEditProductsModal: React.FC<BulkEditProductsModalProps> = ({
  isOpen,
  onClose,
  selectedProductIds,
  onClearSelection
}) => {
  const { products, bulkUpdateProducts, bulkDeleteProducts, brands, categories } = useApp();

  // Selected products
  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

  // Edit fields toggles & state
  const [updateCostPriceMode, setUpdateCostPriceMode] = useState<'none' | 'percent_mrp' | 'fixed_value' | 'adjust_percent'>('none');
  const [costPriceValue, setCostPriceValue] = useState<number>(10); // default 10% less than MRP

  const [updateRetailPriceMode, setUpdateRetailPriceMode] = useState<'none' | 'fixed_value' | 'adjust_percent'>('none');
  const [retailPriceValue, setRetailPriceValue] = useState<number>(0);

  const [updateWholesalePriceMode, setUpdateWholesalePriceMode] = useState<'none' | 'percent_mrp' | 'fixed_value' | 'adjust_percent'>('none');
  const [wholesalePriceValue, setWholesalePriceValue] = useState<number>(2); // default 2% less than MRP

  const [updateBrand, setUpdateBrand] = useState<string>('keep');
  const [updateCategory, setUpdateCategory] = useState<string>('keep');
  const [updateBusiness, setUpdateBusiness] = useState<string>('keep');

  const [updateStockMode, setUpdateStockMode] = useState<'none' | 'set_exact' | 'add_stock' | 'subtract_stock'>('none');
  const [stockValue, setStockValue] = useState<number>(0);

  const [updateWarranty, setUpdateWarranty] = useState<string>('');
  const [shouldUpdateWarranty, setShouldUpdateWarranty] = useState<boolean>(false);

  const [updateInstallCharge, setUpdateInstallCharge] = useState<number | ''>('');
  const [shouldUpdateInstallCharge, setShouldUpdateInstallCharge] = useState<boolean>(false);

  const [updateExtraPipingFee, setUpdateExtraPipingFee] = useState<number | ''>('');
  const [shouldUpdateExtraPipingFee, setShouldUpdateExtraPipingFee] = useState<boolean>(false);

  const [updateFeaturedMode, setUpdateFeaturedMode] = useState<'keep' | 'enable' | 'disable'>('keep');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleApplyBulkEdits = (e: React.FormEvent) => {
    e.preventDefault();

    bulkUpdateProducts(selectedProductIds, (product) => {
      const patch: Partial<Product> = {};

      // 1. Retail Price update
      let newRetail = product.retailPrice;
      if (updateRetailPriceMode === 'fixed_value' && retailPriceValue > 0) {
        newRetail = retailPriceValue;
        patch.retailPrice = newRetail;
      } else if (updateRetailPriceMode === 'adjust_percent' && retailPriceValue !== 0) {
        newRetail = Math.round(product.retailPrice * (1 + retailPriceValue / 100));
        patch.retailPrice = newRetail;
      }

      // 2. Cost Price update
      if (updateCostPriceMode === 'percent_mrp') {
        // e.g. Cost = MRP - X%
        patch.costPrice = Math.round(newRetail * (1 - costPriceValue / 100));
      } else if (updateCostPriceMode === 'fixed_value' && costPriceValue > 0) {
        patch.costPrice = costPriceValue;
      } else if (updateCostPriceMode === 'adjust_percent' && costPriceValue !== 0) {
        patch.costPrice = Math.round(product.costPrice * (1 + costPriceValue / 100));
      }

      // 3. Wholesale Price update
      if (updateWholesalePriceMode === 'percent_mrp') {
        // e.g. Wholesale = MRP - X%
        patch.wholesalePrice = Math.round(newRetail * (1 - wholesalePriceValue / 100));
      } else if (updateWholesalePriceMode === 'fixed_value' && wholesalePriceValue > 0) {
        patch.wholesalePrice = wholesalePriceValue;
      } else if (updateWholesalePriceMode === 'adjust_percent' && wholesalePriceValue !== 0) {
        patch.wholesalePrice = Math.round(product.wholesalePrice * (1 + wholesalePriceValue / 100));
      }

      // 4. Brand, Category, Business Scope
      if (updateBrand !== 'keep') {
        patch.brand = updateBrand;
      }
      if (updateCategory !== 'keep') {
        patch.category = updateCategory;
      }
      if (updateBusiness !== 'keep') {
        patch.business = updateBusiness as BusinessType;
      }

      // 5. Stock Level
      if (updateStockMode === 'set_exact') {
        patch.stockQty = Math.max(0, stockValue);
      } else if (updateStockMode === 'add_stock') {
        patch.stockQty = Math.max(0, product.stockQty + stockValue);
      } else if (updateStockMode === 'subtract_stock') {
        patch.stockQty = Math.max(0, product.stockQty - stockValue);
      }

      // 6. Warranty
      if (shouldUpdateWarranty && updateWarranty.trim()) {
        patch.warranty = updateWarranty.trim();
      }

      // 7. Installation Fees
      if (shouldUpdateInstallCharge && updateInstallCharge !== '') {
        patch.installationCharge = Number(updateInstallCharge);
      }
      if (shouldUpdateExtraPipingFee && updateExtraPipingFee !== '') {
        patch.extraPipingFeePerFt = Number(updateExtraPipingFee);
      }

      // 8. Website Visibility
      if (updateFeaturedMode === 'enable') {
        patch.isFeaturedOnWebsite = true;
      } else if (updateFeaturedMode === 'disable') {
        patch.isFeaturedOnWebsite = false;
      }

      return patch;
    });

    onClose();
    onClearSelection();
  };

  const handleConfirmBulkDelete = () => {
    bulkDeleteProducts(selectedProductIds);
    setShowDeleteConfirm(false);
    onClose();
    onClearSelection();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Bulk Edit Products</h2>
              <p className="text-xs text-slate-300 font-medium">
                Modifying <span className="text-amber-400 font-bold">{selectedProducts.length}</span> selected items simultaneously across all routes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Products Preview Bar */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between text-xs font-bold text-amber-900">
          <div className="flex items-center gap-2 overflow-hidden">
            <PackageCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="truncate">
              Selected: {selectedProducts.map((p) => p.sku || p.name).slice(0, 3).join(', ')}
              {selectedProducts.length > 3 && ` + ${selectedProducts.length - 3} more`}
            </span>
          </div>
          <button
            onClick={onClearSelection}
            className="text-[11px] underline text-amber-800 hover:text-amber-950 shrink-0"
          >
            Deselect All
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApplyBulkEdits} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* SECTION 1: PRICE CALCULATIONS */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Bulk Pricing Adjustments (Cost, Retail, Wholesale)
            </h3>

            {/* Cost Price Rule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Cost Purchase Price Adjustment
                </label>
                <select
                  value={updateCostPriceMode}
                  onChange={(e) => setUpdateCostPriceMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="none">Do Not Change Cost Price</option>
                  <option value="percent_mrp">Set Cost = Retail MRP minus X% (e.g., -10%)</option>
                  <option value="fixed_value">Set Fixed Cost Price BDT</option>
                  <option value="adjust_percent">Increase/Decrease Cost Price by X%</option>
                </select>
              </div>

              {updateCostPriceMode !== 'none' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {updateCostPriceMode === 'percent_mrp' ? 'Discount % from Retail MRP' : updateCostPriceMode === 'fixed_value' ? 'Fixed Cost Price (BDT)' : 'Percentage Change (%)'}
                  </label>
                  <input
                    type="number"
                    value={costPriceValue}
                    onChange={(e) => setCostPriceValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., 10"
                  />
                  {updateCostPriceMode === 'percent_mrp' && (
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      Applies purchase cost = MRP - {costPriceValue}% on selected items.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Wholesale Price Rule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Wholesale Price Adjustment
                </label>
                <select
                  value={updateWholesalePriceMode}
                  onChange={(e) => setUpdateWholesalePriceMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="none">Do Not Change Wholesale Price</option>
                  <option value="percent_mrp">Set Wholesale = Retail MRP minus X% (e.g., -2%)</option>
                  <option value="fixed_value">Set Fixed Wholesale Price BDT</option>
                  <option value="adjust_percent">Increase/Decrease Wholesale Price by X%</option>
                </select>
              </div>

              {updateWholesalePriceMode !== 'none' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {updateWholesalePriceMode === 'percent_mrp' ? 'Discount % from Retail MRP' : updateWholesalePriceMode === 'fixed_value' ? 'Fixed Wholesale Price (BDT)' : 'Percentage Change (%)'}
                  </label>
                  <input
                    type="number"
                    value={wholesalePriceValue}
                    onChange={(e) => setWholesalePriceValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 2"
                  />
                  {updateWholesalePriceMode === 'percent_mrp' && (
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      Applies wholesale price = MRP - {wholesalePriceValue}% on selected items.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Retail Price Rule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Retail Price (MRP) Adjustment
                </label>
                <select
                  value={updateRetailPriceMode}
                  onChange={(e) => setUpdateRetailPriceMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="none">Do Not Change Retail Price</option>
                  <option value="fixed_value">Set Fixed Retail Price BDT</option>
                  <option value="adjust_percent">Increase/Decrease Retail Price by X%</option>
                </select>
              </div>

              {updateRetailPriceMode !== 'none' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {updateRetailPriceMode === 'fixed_value' ? 'Fixed Retail MRP (BDT)' : 'Percentage Change (%)'}
                  </label>
                  <input
                    type="number"
                    value={retailPriceValue}
                    onChange={(e) => setRetailPriceValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 50000"
                  />
                </div>
              )}
            </div>

          </div>

          {/* SECTION 2: CATEGORY, BRAND, BUSINESS */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              Brand, Category & Business Scope
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Business Unit</label>
                <select
                  value={updateBusiness}
                  onChange={(e) => setUpdateBusiness(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="keep">Keep Existing Business</option>
                  <option value="amanot_electronics">Amanot Electronics</option>
                  <option value="amanot_enterprise">Amanot Enterprise</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Brand Name</label>
                <select
                  value={updateBrand}
                  onChange={(e) => setUpdateBrand(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="keep">Keep Existing Brand</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={updateCategory}
                  onChange={(e) => setUpdateCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="keep">Keep Existing Category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: STOCK & SERVICE FEES */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-indigo-600" />
              Stock & AC Installation Charges
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Stock adjustment */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">Stock Quantity Action</label>
                <select
                  value={updateStockMode}
                  onChange={(e) => setUpdateStockMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="none">Do Not Change Stock Qty</option>
                  <option value="set_exact">Set Exact Stock Quantity</option>
                  <option value="add_stock">Add Stock (+)</option>
                  <option value="subtract_stock">Deduct Stock (-)</option>
                </select>

                {updateStockMode !== 'none' && (
                  <input
                    type="number"
                    value={stockValue}
                    onChange={(e) => setStockValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900"
                    placeholder="Quantity"
                  />
                )}
              </div>

              {/* Installation Charges */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">Installation Fee (BDT)</label>
                  <input
                    type="checkbox"
                    checked={shouldUpdateInstallCharge}
                    onChange={(e) => setShouldUpdateInstallCharge(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded-xs"
                  />
                </div>
                {shouldUpdateInstallCharge && (
                  <input
                    type="number"
                    value={updateInstallCharge}
                    onChange={(e) => setUpdateInstallCharge(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 3000, 3500, 4500"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900"
                  />
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="text-[11px] font-bold text-slate-700">Extra Piping / Ft Fee (BDT)</label>
                  <input
                    type="checkbox"
                    checked={shouldUpdateExtraPipingFee}
                    onChange={(e) => setShouldUpdateExtraPipingFee(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded-xs"
                  />
                </div>
                {shouldUpdateExtraPipingFee && (
                  <input
                    type="number"
                    value={updateExtraPipingFee}
                    onChange={(e) => setUpdateExtraPipingFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 550, 630, 675"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900"
                  />
                )}
              </div>
            </div>

            {/* Warranty & Storefront visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">Warranty Term</label>
                  <input
                    type="checkbox"
                    checked={shouldUpdateWarranty}
                    onChange={(e) => setShouldUpdateWarranty(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded-xs"
                  />
                </div>
                {shouldUpdateWarranty && (
                  <input
                    type="text"
                    value={updateWarranty}
                    onChange={(e) => setUpdateWarranty(e.target.value)}
                    placeholder="e.g., 10 Years Compressor, 1 Year Spare Parts"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                  />
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Website Storefront Visibility</label>
                <select
                  value={updateFeaturedMode}
                  onChange={(e) => setUpdateFeaturedMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="keep">Keep Current Website Status</option>
                  <option value="enable">Show & Feature on Storefront Website</option>
                  <option value="disable">Hide from Storefront Website</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              Bulk Delete ({selectedProductIds.length})
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Apply Changes to {selectedProductIds.length} Products
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* Bulk Delete Confirm Sub-modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Confirm Bulk Delete?</h3>
              <p className="text-xs text-slate-600 mt-1">
                You are about to permanently remove <span className="font-extrabold text-rose-600">{selectedProductIds.length}</span> selected products from inventory. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
