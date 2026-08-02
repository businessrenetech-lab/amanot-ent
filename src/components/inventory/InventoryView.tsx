import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, BusinessType } from '../../types';
import {
  Package,
  Plus,
  Search,
  Building2,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Tag,
  ShieldCheck,
  TrendingUp,
  Layers,
  PackagePlus,
  Sliders,
  Undo2,
  ListPlus,
  Clock,
  RotateCcw,
  Image as ImageIcon,
  Globe,
  ChevronDown,
  Filter
} from 'lucide-react';
import { BulkProductEntryModal } from '../suppliers/BulkProductEntryModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { DamageControlModal } from './DamageControlModal';
import { SupplierReturnModal } from '../suppliers/SupplierReturnModal';
import { MasterListsManagerModal } from '../common/MasterListsManagerModal';
import { EditProductModal } from './EditProductModal';
import { BulkEditProductsModal } from './BulkEditProductsModal';

export const InventoryView: React.FC = () => {
  const {
    products,
    suppliers,
    brands,
    addBrand,
    categories,
    addCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    activeBusiness,
    currentUser,
    stockAdjustments,
    damageLogs,
    supplierReturns
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [businessFilter, setBusinessFilter] = useState<'all' | BusinessType>('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Inventory Sub-Tab
  const [inventoryTab, setInventoryTab] = useState<
    'active_inventory' | 'stock_adjustments' | 'damage_logs' | 'supplier_returns'
  >('active_inventory');

  // Modals state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);
  const [restockPrefillProductId, setRestockPrefillProductId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isSupplierReturnModalOpen, setIsSupplierReturnModalOpen] = useState(false);
  const [isMasterListsModalOpen, setIsMasterListsModalOpen] = useState(false);
  const [newProd, setNewProd] = useState({
    sku: '',
    name: '',
    business: 'amanot_electronics' as BusinessType,
    brand: 'Gree',
    category: 'Inverter AC',
    costPrice: 50000,
    retailPrice: 62000,
    wholesalePrice: 57000,
    stockQty: 10,
    minStockAlert: 3,
    unit: 'Pcs',
    warranty: '10 Years Compressor, 1 Year Spare Parts',
    description: '',
    isFeaturedOnWebsite: true,
    supplierId: 'supp_electro_mart',
    supplierName: 'Electro Mart Bangladesh Ltd'
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Business scope
      if (activeBusiness !== 'all' && p.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && p.business !== currentUser.assignedBusiness) return false;

      if (businessFilter !== 'all' && p.business !== businessFilter) return false;
      if (selectedBrand !== 'all' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;

      if (stockFilter === 'low' && !(p.stockQty > 0 && p.stockQty <= p.minStockAlert)) return false;
      if (stockFilter === 'out' && p.stockQty > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, activeBusiness, currentUser, businessFilter, selectedBrand, stockFilter, searchQuery]);

  // Bulk Selection Helpers
  const isAllFilteredSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedProductIds.includes(p.id));
  }, [filteredProducts, selectedProductIds]);

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  /**
   * Selection survives filter changes, so a bulk edit can reach products that
   * are no longer on screen. Surface that rather than letting it happen quietly.
   */
  const hiddenSelectedCount = useMemo(() => {
    const visible = new Set(filteredProducts.map((p) => p.id));
    return selectedProductIds.filter((id) => !visible.has(id)).length;
  }, [filteredProducts, selectedProductIds]);

  // Inventory Metrics
  const totalItemsCount = filteredProducts.reduce((acc, p) => acc + p.stockQty, 0);
  const totalInventoryValue = filteredProducts.reduce((acc, p) => acc + p.stockQty * p.costPrice, 0);
  const lowStockCount = filteredProducts.filter((p) => p.stockQty <= p.minStockAlert).length;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.sku) return;

    addProduct({
      ...newProd,
      sku: newProd.sku.toUpperCase()
    });

    setIsAddModalOpen(false);
    setNewProd({
      sku: '',
      name: '',
      business: 'amanot_electronics',
      brand: 'Gree',
      category: 'Inverter AC',
      costPrice: 50000,
      retailPrice: 62000,
      wholesalePrice: 57000,
      stockQty: 10,
      minStockAlert: 3,
      unit: 'Pcs',
      warranty: '10 Years Compressor, 1 Year Spare Parts',
      description: '',
      isFeaturedOnWebsite: true,
      supplierId: 'supp_electro_mart',
      supplierName: 'Electro Mart Bangladesh Ltd'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner — title + view dropdown & actions (top right) */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 shrink-0">
          <Package className="w-6 h-6 text-blue-600" />
          Inventory & Stock Control
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* View selector dropdown */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-white/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={inventoryTab}
              onChange={(e) => setInventoryTab(e.target.value as any)}
              className="appearance-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl pl-9 pr-9 py-2 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition min-w-[210px]"
            >
              <option value="active_inventory">Active Catalog ({filteredProducts.length})</option>
              <option value="stock_adjustments">Stock Adjustments ({stockAdjustments.length})</option>
              <option value="damage_logs">Damage Control Logs ({damageLogs.length})</option>
              <option value="supplier_returns">Supplier Returns ({supplierReturns.length})</option>
            </select>
            <ChevronDown className="w-4 h-4 text-white absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsMasterListsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl shadow-xs transition active:scale-98"
          >
            <ListPlus className="w-4 h-4 text-amber-400" />
            Master Lists
          </button>

          <button
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition active:scale-98"
          >
            <Sliders className="w-4 h-4 text-blue-600" />
            Adjust Stock
          </button>

          <button
            onClick={() => setIsDamageModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl transition active:scale-98"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Damage
          </button>

          <button
            onClick={() => setIsSupplierReturnModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs rounded-xl transition active:scale-98"
          >
            <Undo2 className="w-4 h-4 text-indigo-600" />
            Supplier Return
          </button>

          <button
            onClick={() => setIsBulkEntryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98"
          >
            <PackagePlus className="w-4 h-4" />
            Bulk Entry
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stock Units</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalItemsCount.toLocaleString()} Pcs</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Valuation (Cost)</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">৳{totalInventoryValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-2xl font-black text-rose-600 font-mono mt-0.5">{lowStockCount} Items</p>
          </div>
        </div>
      </div>

      {inventoryTab === 'active_inventory' && (
        <>
          {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product name, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Brand Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Stock level filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {([
              { id: 'all', label: 'All Stock' },
              { id: 'low', label: 'Low Stock' },
              { id: 'out', label: 'Out of Stock' }
            ] as const).map((s) => (
              <button
                key={s.id}
                onClick={() => setStockFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  stockFilter === s.id
                    ? s.id === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Business filter */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setBusinessFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                businessFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              All Businesses
            </button>
            <button
              onClick={() => setBusinessFilter('amanot_electronics')}
              className={`px-3 py-1.5 rounded-lg transition ${
                businessFilter === 'amanot_electronics' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Amanot Electronics
            </button>
            <button
              onClick={() => setBusinessFilter('amanot_enterprise')}
              className={`px-3 py-1.5 rounded-lg transition ${
                businessFilter === 'amanot_enterprise' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Amanot Enterprise
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedProductIds.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-4 rounded-2xl shadow-lg border border-amber-400/30 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Edit2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white">
                {selectedProductIds.length} Product(s) Selected
              </span>
              <p className="text-[11px] text-amber-100 font-medium">
                Bulk edits propagate instantly across POS grid, store catalog, and quotes.
              </p>
              {hiddenSelectedCount > 0 && (
                <p className="text-[11px] text-white font-extrabold mt-0.5 bg-rose-600/80 px-2 py-0.5 rounded inline-block">
                  ⚠ {hiddenSelectedCount} selected item(s) are hidden by the current filter and will still be edited.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              Bulk Edit Selected Items
            </button>
            <button
              onClick={() => setSelectedProductIds([])}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Product List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    title="Select/Deselect All Filtered Products"
                  />
                </th>
                <th className="p-4">Photo</th>
                <th className="p-4">Business & Brand</th>
                <th className="p-4">Product Name / SKU & Tags</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Cost Price</th>
                <th className="p-4 text-right">Retail Rate</th>
                <th className="p-4 text-right">Wholesale Rate</th>
                <th className="p-4 text-center">Stock Level</th>
                <th className="p-4 text-center">Website</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredProducts.map((p) => {
                const isElectronics = p.business === 'amanot_electronics';
                const isLow = p.stockQty <= p.minStockAlert;
                const galleryCount = p.images?.length || (p.image ? 1 : 0);
                const isSelected = selectedProductIds.includes(p.id);

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(p.id)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>

                    {/* Primary Photo Thumbnail */}
                    <td className="p-4">
                      <div className="relative w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-contain p-0.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                        {galleryCount > 1 && (
                          <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white text-[8px] font-bold px-1 rounded-tl-md">
                            +{galleryCount - 1}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        isElectronics ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}
                      </span>
                      <p className="font-extrabold text-slate-900 mt-1">{p.brand}</p>
                    </td>

                    <td className="p-4 font-medium max-w-xs space-y-1">
                      <p className="font-bold text-slate-900 text-sm leading-snug">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{p.warranty}</p>

                      {/* Product Tags Badges */}
                      {p.tags && p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.2 bg-slate-100 text-slate-700 font-bold text-[9px] rounded-md border border-slate-200"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="p-4 font-semibold text-slate-600">{p.category}</td>

                    <td className="p-4 text-right font-mono font-medium text-slate-600">৳{p.costPrice.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-900">৳{p.retailPrice.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-indigo-700">৳{p.wholesalePrice.toLocaleString()}</td>

                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold ${
                        isLow ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.stockQty} {p.unit}
                        {isLow && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.isFeaturedOnWebsite ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.isFeaturedOnWebsite ? 'Featured' : 'Standard'}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition font-bold"
                        title="Edit Product, Photos, Gallery & Specs"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          const newQty = prompt(`Update stock quantity for ${p.name}:`, String(p.stockQty));
                          if (newQty !== null) {
                            updateProduct(p.id, { stockQty: Number(newQty) });
                          }
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                        title="Adjust Stock Qty"
                      >
                        Adjust
                      </button>

                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* SUB-TAB 2: Stock Adjustments History */}
      {inventoryTab === 'stock_adjustments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Physical Stock Adjustment Audit Logs
              </h2>
              <p className="text-[11px] text-slate-300">
                Audit count corrections and physical variance logs
              </p>
            </div>
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
            >
              + New Adjustment
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Ref ID / Date</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {stockAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {adj.id}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {new Date(adj.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {adj.productName}
                      <span className="block text-[10px] text-slate-500">[{adj.brand}] {adj.sku}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          adj.adjustmentType === 'increase'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {adj.adjustmentType === 'increase' ? '+ INCREASE' : '- DECREASE'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-extrabold text-sm font-mono">
                      {adj.quantity} Pcs
                    </td>
                    <td className="p-3 font-medium text-slate-700">
                      {adj.reason}
                      {adj.notes && <p className="text-[10px] text-slate-400 italic">{adj.notes}</p>}
                    </td>
                    <td className="p-3 font-bold text-slate-600">{adj.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Damage Control Logs */}
      {inventoryTab === 'damage_logs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-rose-950 to-slate-900 text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Damaged Product & Financial Write-Off History
              </h2>
              <p className="text-[11px] text-amber-200">
                Transit damage, display scratches, and component defects
              </p>
            </div>
            <button
              onClick={() => setIsDamageModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
            >
              + Report Damage
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Damage ID / Date</th>
                  <th className="p-3">Product Item</th>
                  <th className="p-3 text-center">Qty Damaged</th>
                  <th className="p-3 text-right">Financial Loss</th>
                  <th className="p-3">Damage Cause</th>
                  <th className="p-3">Action Taken</th>
                  <th className="p-3">Reported By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {damageLogs.map((dmg) => (
                  <tr key={dmg.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {dmg.id}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {new Date(dmg.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {dmg.productName}
                      <span className="block text-[10px] text-slate-500">[{dmg.brand}] {dmg.sku}</span>
                    </td>
                    <td className="p-3 text-center font-extrabold text-rose-700 font-mono text-sm">
                      {dmg.quantity} Pcs
                    </td>
                    <td className="p-3 text-right font-extrabold text-rose-800 font-mono text-sm">
                      ৳{dmg.totalLoss.toLocaleString()}
                    </td>
                    <td className="p-3 font-medium text-slate-700">
                      {dmg.cause}
                      {dmg.notes && <p className="text-[10px] text-slate-400 italic">{dmg.notes}</p>}
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-full text-[10px] font-extrabold uppercase text-slate-800">
                        {dmg.actionTaken.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-600">{dmg.reportedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Supplier Returns */}
      {inventoryTab === 'supplier_returns' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <Undo2 className="w-4 h-4 text-indigo-400" />
                Return to Supplier Audit Records
              </h2>
              <p className="text-[11px] text-slate-300">
                Supplier credit memos and factory defect return history
              </p>
            </div>
            <button
              onClick={() => setIsSupplierReturnModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
            >
              + Return to Supplier
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Return Ref / Date</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Items Returned</th>
                  <th className="p-3 text-right">Refund Credit</th>
                  <th className="p-3 text-center">Settlement</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {supplierReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {ret.id}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-indigo-950">{ret.supplierName}</td>
                    <td className="p-3 text-xs">
                      {ret.items.map((i, idx) => (
                        <div key={idx} className="font-medium text-slate-800">
                          {i.quantity}x {i.productName} (৳{i.unitCost.toLocaleString()})
                        </div>
                      ))}
                    </td>
                    <td className="p-3 text-right font-extrabold text-indigo-900 font-mono text-sm">
                      ৳{ret.totalRefundAmount.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold rounded-full uppercase">
                        {ret.refundMode.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{ret.reason}</td>
                    <td className="p-3 font-bold text-slate-600">{ret.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <StockAdjustmentModal
          onClose={() => setIsAdjustmentModalOpen(false)}
          onCreateRestock={(pid) => {
            setIsAdjustmentModalOpen(false);
            setRestockPrefillProductId(pid || null);
            setIsBulkEntryOpen(true);
          }}
        />
      )}

      {/* Damage Control Modal */}
      {isDamageModalOpen && (
        <DamageControlModal onClose={() => setIsDamageModalOpen(false)} />
      )}

      {/* Supplier Return Modal */}
      {isSupplierReturnModalOpen && (
        <SupplierReturnModal onClose={() => setIsSupplierReturnModalOpen(false)} />
      )}

      {/* Master Lists Manager Modal */}
      {isMasterListsModalOpen && (
        <MasterListsManagerModal onClose={() => setIsMasterListsModalOpen(false)} />
      )}

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <EditProductModal
          product={null}
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {/* Edit Existing Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {/* Bulk Product Entry Modal */}
      {isBulkEntryOpen && (
        <BulkProductEntryModal
          isOpen={isBulkEntryOpen}
          prefillProductId={restockPrefillProductId}
          onClose={() => {
            setIsBulkEntryOpen(false);
            setRestockPrefillProductId(null);
          }}
        />
      )}

      {/* Bulk Edit Products Modal */}
      {isBulkEditModalOpen && (
        <BulkEditProductsModal
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          selectedProductIds={selectedProductIds}
          onClearSelection={() => setSelectedProductIds([])}
        />
      )}

    </div>
  );
};
