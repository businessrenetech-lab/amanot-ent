import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SlidersHorizontal, ShieldAlert, Check, X, Filter, ShoppingBag, Package, Truck, DollarSign } from 'lucide-react';

interface AuditConfigModalProps {
  onClose: () => void;
}

export const AuditConfigModal: React.FC<AuditConfigModalProps> = ({ onClose }) => {
  const { auditConfig, updateAuditConfig, brands, categories } = useApp();

  const [salesPct, setSalesPct] = useState(auditConfig.salesPercentageToInclude ?? 50);
  const [maxSalesCount, setMaxSalesCount] = useState(auditConfig.maxSalesCountToInclude ?? 20);
  const [allowedCats, setAllowedCats] = useState<string[]>(auditConfig.allowedCategories ?? categories);
  const [allowedBrands, setAllowedBrands] = useState<string[]>(auditConfig.allowedBrands ?? brands);
  const [maxProductCount, setMaxProductCount] = useState(auditConfig.maxProductCountToInclude ?? 20);
  const [purchasePct, setPurchasePct] = useState(auditConfig.purchasePercentageToInclude ?? 50);
  const [maxPurchaseCount, setMaxPurchaseCount] = useState(auditConfig.maxPurchaseCountToInclude ?? 10);
  const [profitMultiplier, setProfitMultiplier] = useState(auditConfig.profitMarginMultiplier ?? 0.8);
  const [maxExpenseCap, setMaxExpenseCap] = useState(auditConfig.maxMonthlyExpenseCap ?? 100000);
  const [includeInstallment, setIncludeInstallment] = useState(auditConfig.includeInstallmentSales ?? true);

  const toggleCategory = (cat: string) => {
    if (allowedCats.includes(cat)) {
      if (allowedCats.length === 1) return; // keep at least 1
      setAllowedCats(allowedCats.filter((c) => c !== cat));
    } else {
      setAllowedCats([...allowedCats, cat]);
    }
  };

  const toggleBrand = (brand: string) => {
    if (allowedBrands.includes(brand)) {
      if (allowedBrands.length === 1) return;
      setAllowedBrands(allowedBrands.filter((b) => b !== brand));
    } else {
      setAllowedBrands([...allowedBrands, brand]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateAuditConfig({
      salesPercentageToInclude: salesPct,
      maxSalesCountToInclude: maxSalesCount,
      allowedCategories: allowedCats,
      allowedBrands: allowedBrands,
      maxProductCountToInclude: maxProductCount,
      purchasePercentageToInclude: purchasePct,
      maxPurchaseCountToInclude: maxPurchaseCount,
      profitMarginMultiplier: profitMultiplier,
      maxMonthlyExpenseCap: maxExpenseCap,
      includeInstallmentSales: includeInstallment
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white z-10">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            Super Admin Tax Audit Report Configurator
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 text-xs font-medium">
          
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> Tax Filing Control & Rules Engine
            </p>
            <p className="text-[11px] leading-relaxed">
              Super Admin can precisely specify how many sales lists, products, purchases, and expenses are included, as well as which product categories (e.g. TV, AC, Refrigerator) appear in the Tax Audit view.
            </p>
          </div>

          {/* 1. Sales List Controls */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px]">
              <ShoppingBag className="w-4 h-4 text-indigo-600" /> 1. Sales Reporting Rules
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Sales Reporting Ratio: <span className="text-indigo-600 font-mono font-bold">{salesPct}%</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={salesPct}
                  onChange={(e) => setSalesPct(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Controls what % of real sales volume is shown.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Max Sales Invoices to Show</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxSalesCount}
                  onChange={(e) => setMaxSalesCount(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Limit maximum sales invoice records listed.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="includeInst"
                checked={includeInstallment}
                onChange={(e) => setIncludeInstallment(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="includeInst" className="font-bold text-slate-700 cursor-pointer">
                Include Installment Credit Sales in Tax Audit Reports
              </label>
            </div>
          </div>

          {/* 2. Product Category & Brand Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px]">
              <Package className="w-4 h-4 text-purple-600" /> 2. Allowed Product Categories & Items
            </h4>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Select Product Categories to Include in Audit:</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isChecked = allowedCats.includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                        isChecked
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Select Brands to Include in Audit:</label>
              <div className="flex flex-wrap gap-2">
                {brands.map((brand) => {
                  const isChecked = allowedBrands.includes(brand);
                  return (
                    <button
                      type="button"
                      key={brand}
                      onClick={() => toggleBrand(brand)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Max Product Items to List in Reports</label>
              <input
                type="number"
                min={1}
                max={200}
                value={maxProductCount}
                onChange={(e) => setMaxProductCount(Number(e.target.value))}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          {/* 3. Purchase / Supplier Procurement Rules */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px]">
              <Truck className="w-4 h-4 text-emerald-600" /> 3. Purchase & Supplier Procurement Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Purchase Orders Ratio: <span className="text-emerald-700 font-mono font-bold">{purchasePct}%</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={purchasePct}
                  onChange={(e) => setPurchasePct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Max Purchase Orders to Show</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={maxPurchaseCount}
                  onChange={(e) => setMaxPurchaseCount(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 4. Expenses & Profit Margins */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px]">
              <DollarSign className="w-4 h-4 text-rose-600" /> 4. Expense Cap & Profit Margin Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tax Profit Scaling Factor: <span className="text-indigo-600 font-mono font-bold">{(profitMultiplier * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min={0.3}
                  max={1.0}
                  step={0.05}
                  value={profitMultiplier}
                  onChange={(e) => setProfitMultiplier(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Max Monthly Reported Expense Cap (BDT)</label>
                <input
                  type="number"
                  value={maxExpenseCap}
                  onChange={(e) => setMaxExpenseCap(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t sticky bottom-0 bg-white py-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition">
              Save Tax Audit Settings
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
