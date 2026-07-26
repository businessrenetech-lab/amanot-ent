import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SupplierRequisition, RequisitionItem, BusinessType } from '../../types';
import { exportSupplierRequisitionPDF } from '../../utils/supplierPdfExport';
import {
  FileText,
  X,
  Plus,
  Trash2,
  Building2,
  Calendar,
  AlertCircle,
  Package,
  Save,
  CheckCircle2,
  Printer
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requisitionToEdit?: SupplierRequisition | null;
}

export const SupplierRequisitionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  requisitionToEdit
}) => {
  const {
    suppliers,
    products,
    brands,
    addBrand,
    categories,
    addCategory,
    addSupplierRequisition,
    updateSupplierRequisition,
    settings,
    currentUser
  } = useApp();

  const [business, setBusiness] = useState<BusinessType>('amanot_electronics');
  const [supplierId, setSupplierId] = useState('');
  const [requisitionDate, setRequisitionDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredByDate, setRequiredByDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [status, setStatus] = useState<'draft' | 'pending_approval' | 'approved' | 'rejected' | 'fulfilled'>('pending_approval');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<RequisitionItem[]>([
    {
      isNewProduct: false,
      productId: '',
      productName: '',
      brand: 'Gree',
      category: 'Inverter AC',
      unit: 'Pcs',
      quantity: 5,
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
    if (requisitionToEdit) {
      setBusiness(requisitionToEdit.business);
      setSupplierId(requisitionToEdit.supplierId);
      setRequisitionDate(requisitionToEdit.requisitionDate);
      setRequiredByDate(requisitionToEdit.requiredByDate);
      setPriority(requisitionToEdit.priority);
      setStatus(requisitionToEdit.status);
      setNotes(requisitionToEdit.notes || '');
      setItems(
        requisitionToEdit.items.map((i) => ({
          ...i,
          totalCost: i.totalCost || i.quantity * i.costPrice
        }))
      );
    } else {
      // Reset defaults
      setBusiness('amanot_electronics');
      setRequisitionDate(new Date().toISOString().split('T')[0]);
      setPriority('high');
      setStatus('pending_approval');
      setNotes('');
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
            quantity: 5,
            costPrice: firstP.costPrice,
            retailPrice: firstP.retailPrice,
            wholesalePrice: firstP.wholesalePrice,
            warranty: firstP.warranty,
            totalCost: firstP.costPrice * 5
          }
        ]);
      }
    }
  }, [requisitionToEdit, products]);

  if (!isOpen) return null;

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
            quantity: 1,
            costPrice: defaultProduct.costPrice,
            retailPrice: defaultProduct.retailPrice,
            wholesalePrice: defaultProduct.wholesalePrice,
            warranty: defaultProduct.warranty,
            totalCost: defaultProduct.costPrice
          }
        : {
            isNewProduct: true,
            productName: '',
            brand: 'Gree',
            category: 'Inverter AC',
            unit: 'Pcs',
            quantity: 1,
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

  const totalEstimatedCost = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);

  const handleSaveAndExportPDF = () => {
    if (items.length === 0) return;
    const selectedSup = suppliers.find((s) => s.id === supplierId);
    const reqPayload: SupplierRequisition = {
      id: requisitionToEdit ? requisitionToEdit.id : `REQ-${Date.now().toString().slice(-6)}`,
      business,
      supplierId,
      supplierName: selectedSup ? selectedSup.companyName : 'Supplier',
      requisitionDate,
      requiredByDate,
      priority,
      status,
      items,
      totalEstimatedCost,
      notes,
      createdByStaffName: currentUser?.name || 'Store Manager',
      createdAt: requisitionToEdit ? requisitionToEdit.createdAt : new Date().toISOString().split('T')[0]
    };

    if (requisitionToEdit) {
      updateSupplierRequisition(requisitionToEdit.id, reqPayload);
    } else {
      addSupplierRequisition(reqPayload);
    }

    exportSupplierRequisitionPDF(reqPayload, settings);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const selectedSup = suppliers.find((s) => s.id === supplierId);

    if (requisitionToEdit) {
      updateSupplierRequisition(requisitionToEdit.id, {
        business,
        supplierId,
        supplierName: selectedSup ? selectedSup.companyName : 'Supplier',
        requisitionDate,
        requiredByDate,
        priority,
        status,
        items,
        totalEstimatedCost,
        notes
      });
    } else {
      addSupplierRequisition({
        business,
        supplierId,
        supplierName: selectedSup ? selectedSup.companyName : 'Supplier',
        requisitionDate,
        requiredByDate,
        priority,
        status,
        items,
        totalEstimatedCost,
        notes
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 border border-slate-200 animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {requisitionToEdit
                    ? `Edit Requisition #${requisitionToEdit.id}`
                    : 'Create Supplier Requisition Form'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Request stock from distributor with existing catalog items & custom new product entries.
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
          
          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
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
                Select Supplier
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
                Requisition Date
              </label>
              <input
                type="date"
                value={requisitionDate}
                onChange={(e) => setRequisitionDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                Required By Date
              </label>
              <input
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              >
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Delivery</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                Requisition Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              >
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="fulfilled">Fulfilled / Received</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                Requisition Notes / Justification
              </label>
              <input
                type="text"
                placeholder="e.g. Stock replenishment for seasonal summer sale..."
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
                <Package className="w-4 h-4 text-purple-600" />
                Requisition Items & Product Specifications ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
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
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center font-mono">
                        #{index + 1}
                      </span>
                      
                      {/* Product Mode Toggle */}
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, 'isNewProduct', false)}
                          className={`px-2.5 py-1 rounded-md transition ${
                            !item.isNewProduct
                              ? 'bg-white text-purple-700 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Existing Catalog Product
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, 'isNewProduct', true)}
                          className={`px-2.5 py-1 rounded-md transition ${
                            item.isNewProduct
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          + Brand New Product
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        Subtotal: <strong className="text-slate-900 font-black">৳{(item.totalCost || 0).toLocaleString()}</strong>
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
                          Requisition Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Cost Rate (BDT ৳)
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-purple-900 block mb-1">
                          New Product Title / Model
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Gree 2.0 Ton Double Inverter Split AC"
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          className="w-full border border-purple-200 rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
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
                          Requisition Qty
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
                          Cost Price (BDT)
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
                          placeholder="e.g. 10 Yrs Compressor"
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

          {/* Requisition Total Summary Banner */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase block">
                Total Estimated Requisition Value
              </span>
              <p className="text-2xl font-black font-mono text-purple-300 mt-0.5">
                ৳{totalEstimatedCost.toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAndExportPDF}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition"
                title="Save requisition and open branded PDF in new tab"
              >
                <Printer className="w-4 h-4" /> Save & Export PDF
              </button>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                <Save className="w-4 h-4" />
                {requisitionToEdit ? 'Save Changes' : 'Submit Requisition'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
