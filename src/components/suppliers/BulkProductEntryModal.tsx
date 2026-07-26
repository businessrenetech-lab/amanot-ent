import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RequisitionItem, BusinessType, SupplierRequisition } from '../../types';
import {
  PackagePlus,
  X,
  Plus,
  Trash2,
  Building2,
  Save,
  CheckCircle2,
  ArrowRightLeft,
  FileCheck,
  DollarSign,
  Landmark
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prefillRequisition?: SupplierRequisition | null;
}

export const BulkProductEntryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  prefillRequisition
}) => {
  const {
    suppliers,
    products,
    supplierRequisitions,
    brands,
    addBrand,
    categories,
    addCategory,
    accounts,
    processBulkProductEntry
  } = useApp();

  const [business, setBusiness] = useState<BusinessType>('amanot_electronics');
  const [supplierId, setSupplierId] = useState('');
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mfs' | 'cheque'>('cash');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<RequisitionItem[]>([
    {
      isNewProduct: false,
      productId: '',
      productName: '',
      brand: 'Gree',
      category: 'Inverter AC',
      unit: 'Pcs',
      quantity: 10,
      costPrice: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      warranty: 'Standard Warranty',
      totalCost: 0
    }
  ]);

  useEffect(() => {
    if (suppliers.length > 0 && !supplierId) {
      setSupplierId(suppliers[0].id);
    }
  }, [suppliers, supplierId]);

  useEffect(() => {
    if (prefillRequisition) {
      setBusiness(prefillRequisition.business);
      setSupplierId(prefillRequisition.supplierId);
      setSelectedReqId(prefillRequisition.id);
      setNotes(`Bulk product entry received for Requisition #${prefillRequisition.id}`);
      setItems(
        prefillRequisition.items.map((i) => ({
          ...i,
          totalCost: i.totalCost || i.quantity * i.costPrice
        }))
      );
    } else {
      setSelectedReqId('');
      setBusiness('amanot_electronics');
      setNotes('Bulk product entry stock shipment');
      if (products.length > 0) {
        const firstP = products[0];
        setItems([
          {
            isNewProduct: false,
            productId: firstP.id,
            productName: firstP.name,
            brand: firstP.brand,
            category: firstP.category,
            unit: firstP.unit,
            quantity: 10,
            costPrice: firstP.costPrice,
            retailPrice: firstP.retailPrice,
            wholesalePrice: firstP.wholesalePrice,
            warranty: firstP.warranty,
            totalCost: firstP.costPrice * 10
          }
        ]);
      }
    }
  }, [prefillRequisition, products]);

  if (!isOpen) return null;

  const handleSelectRequisition = (reqId: string) => {
    setSelectedReqId(reqId);
    if (!reqId) return;

    const req = supplierRequisitions.find((r) => r.id === reqId);
    if (req) {
      setBusiness(req.business);
      setSupplierId(req.supplierId);
      setNotes(`Bulk product entry received for Requisition #${req.id}`);
      setItems(
        req.items.map((i) => ({
          ...i,
          totalCost: i.totalCost || i.quantity * i.costPrice
        }))
      );
    }
  };

  const handleSelectExistingProduct = (index: number, pId: string) => {
    const p = products.find((x) => x.id === pId);
    if (!p) return;

    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        isNewProduct: false,
        productId: p.id,
        productName: p.name,
        brand: p.brand,
        category: p.category,
        sku: p.sku,
        unit: p.unit,
        quantity: next[index].quantity || 1,
        costPrice: p.costPrice,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        warranty: p.warranty,
        totalCost: p.costPrice * (next[index].quantity || 1)
      };
      return next;
    });
  };

  const handleItemChange = (index: number, field: keyof RequisitionItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: val };

      if (field === 'quantity' || field === 'costPrice') {
        const qty = Number(updated.quantity) || 0;
        const cost = Number(updated.costPrice) || 0;
        updated.totalCost = qty * cost;
      }

      next[index] = updated;
      return next;
    });
  };

  const handleAddItem = () => {
    const defaultProduct = products[0];
    setItems((prev) => [
      ...prev,
      defaultProduct
        ? {
            isNewProduct: false,
            productId: defaultProduct.id,
            productName: defaultProduct.name,
            brand: defaultProduct.brand,
            category: defaultProduct.category,
            unit: defaultProduct.unit,
            quantity: 5,
            costPrice: defaultProduct.costPrice,
            retailPrice: defaultProduct.retailPrice,
            wholesalePrice: defaultProduct.wholesalePrice,
            warranty: defaultProduct.warranty,
            totalCost: defaultProduct.costPrice * 5
          }
        : {
            isNewProduct: true,
            productName: '',
            brand: 'Gree',
            category: 'Inverter AC',
            unit: 'Pcs',
            quantity: 5,
            costPrice: 0,
            retailPrice: 0,
            wholesalePrice: 0,
            warranty: '1 Year Warranty',
            totalCost: 0
          }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalCost = items.reduce((acc, item) => acc + (item.totalCost || 0), 0);
  const remainingDue = Math.max(0, totalCost - paidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !supplierId) return;

    processBulkProductEntry({
      business,
      supplierId,
      items,
      paidAmount,
      notes,
      requisitionId: selectedReqId || undefined,
      accountId: accountId || accounts[0]?.id,
      paymentMethod
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 border border-slate-200 animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
                <PackagePlus className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Bulk Product Entry & Stock Receiving from Supplier
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Batch add multiple products into inventory from supplier shipment, update cost/selling rates, & record supplier ledger.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-6">
          
          {/* Requisition Selector Banner */}
          <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-teal-900 block">
                  Link with Approved Supplier Requisition?
                </span>
                <span className="text-[11px] text-teal-700">
                  Select an existing requisition to automatically import requested products and convert to received inventory.
                </span>
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedReqId}
                onChange={(e) => handleSelectRequisition(e.target.value)}
                className="w-full sm:w-64 bg-white border border-teal-300 rounded-lg p-2 text-xs font-bold text-teal-900"
              >
                <option value="">-- Direct Entry (No Requisition) --</option>
                {supplierRequisitions.map((req) => (
                  <option key={req.id} value={req.id}>
                    #{req.id} - {req.supplierName} (৳{req.totalEstimatedCost.toLocaleString()}) [{req.status}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                Business Branch
              </label>
              <select
                value={business}
                onChange={(e) => setBusiness(e.target.value as BusinessType)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              >
                <option value="amanot_electronics">Amanot Electronics</option>
                <option value="amanot_enterprise">Amanot Enterprise</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                Select Distributor / Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} ({s.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                Shipment / Invoice Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Challan #8821, Freight via Sundarban Courier"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Item Table Builder */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-teal-600" />
                Products Being Entered into Inventory ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Row
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 relative group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-extrabold text-xs flex items-center justify-center font-mono">
                        #{index + 1}
                      </span>
                      
                      {/* Product Mode Toggle */}
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, 'isNewProduct', false)}
                          className={`px-2.5 py-1 rounded-md transition ${
                            !item.isNewProduct
                              ? 'bg-white text-teal-700 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Existing Inventory Item
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, 'isNewProduct', true)}
                          className={`px-2.5 py-1 rounded-md transition ${
                            item.isNewProduct
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          + New Product Item
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        Item Cost Total: <strong className="text-slate-900 font-black">৳{(item.totalCost || 0).toLocaleString()}</strong>
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="Delete row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fields Row */}
                  {!item.isNewProduct ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Select Existing Product
                        </label>
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleSelectExistingProduct(index, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.brand} - {p.category}) [Stock: {p.stockQty}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Add Qty Received
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-teal-700 bg-teal-50/50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Cost Rate (BDT)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.costPrice}
                          onChange={(e) => handleItemChange(index, 'costPrice', Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Retail Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.retailPrice}
                          onChange={(e) => handleItemChange(index, 'retailPrice', Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium font-mono text-slate-700"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Wholesale Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.wholesalePrice}
                          onChange={(e) => handleItemChange(index, 'wholesalePrice', Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium font-mono text-slate-700"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-teal-50/50 p-3 rounded-lg border border-teal-100">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-teal-900 block mb-1">
                          New Product Title / Model
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Haier 43 Inch Bezel-Less Android TV"
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          className="w-full border border-teal-200 rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">
                          Brand Name (Backend)
                        </label>
                        <select
                          value={item.brand}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'CUSTOM_NEW_BRAND') {
                              const custom = prompt('Enter New Brand Name:');
                              if (custom) {
                                addBrand(custom);
                                handleItemChange(index, 'brand', custom);
                              }
                            } else {
                              handleItemChange(index, 'brand', val);
                            }
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 bg-white"
                        >
                          {brands.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                          <option value="CUSTOM_NEW_BRAND">+ Add New Brand...</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">
                          Category (Backend)
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'CUSTOM_NEW_CAT') {
                              const custom = prompt('Enter New Category Name:');
                              if (custom) {
                                addCategory(custom);
                                handleItemChange(index, 'category', custom);
                              }
                            } else {
                              handleItemChange(index, 'category', val);
                            }
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 bg-white"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="CUSTOM_NEW_CAT">+ Add New Category...</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">
                          Qty Received
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">
                          Cost Rate (BDT)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.costPrice}
                          onChange={(e) => handleItemChange(index, 'costPrice', Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">
                          Retail Price (BDT)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.retailPrice}
                          onChange={(e) => handleItemChange(index, 'retailPrice', Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">
                          Warranty Terms
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2 Yrs Panel Warranty"
                          value={item.warranty}
                          onChange={(e) => handleItemChange(index, 'warranty', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Settlement Panel */}
          <div className="bg-slate-900 text-white p-5 rounded-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">
                  Total Shipment Cost
                </span>
                <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                  ৳{totalCost.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold uppercase block mb-1">
                  Amount Paid to Supplier Now (BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalCost}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-base font-black font-mono text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">
                  Remaining Owed Balance (Due)
                </span>
                <p className="text-2xl font-black font-mono text-rose-400 mt-0.5">
                  ৳{remainingDue.toLocaleString()}
                </p>
              </div>
            </div>

            {paidAmount > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs text-slate-300 font-bold uppercase block mb-1 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-blue-400" /> Pay From Bank / Cash Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-teal-400"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} (Current Bal: ৳{a.currentBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold uppercase block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mfs">MFS (bKash / Nagad)</option>
                    <option value="cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-end items-center gap-3 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition"
              >
                <Save className="w-4 h-4" /> Save & Receive Bulk Products to Inventory
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
