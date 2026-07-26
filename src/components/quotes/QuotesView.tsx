import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Quotation, BusinessType, Product } from '../../types';
import {
  FileCheck,
  Search,
  Plus,
  ArrowRight,
  Globe,
  Calendar,
  X,
  Send,
  Edit3,
  Trash2,
  Printer,
  Download,
  Building2,
  FileText
} from 'lucide-react';
import { safeHtml2Canvas } from '../../utils/html2canvasFix';
import jsPDF from 'jspdf';

export const QuotesView: React.FC = () => {
  const {
    quotations,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    convertQuoteToSale,
    products,
    activeBusiness,
    currentUser,
    sendSMS,
    settings
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);

  // Printable Modal
  const [printQuote, setPrintQuote] = useState<Quotation | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  // New Quote form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [business, setBusiness] = useState<BusinessType>('amanot_electronics');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  // Edit Quote form items state
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editBusiness, setEditBusiness] = useState<BusinessType>('amanot_electronics');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editStatus, setEditStatus] = useState<Quotation['status']>('sent');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<Quotation['items']>([]);

  // Extra item adder for Edit Modal
  const [addEditProductId, setAddEditProductId] = useState('');
  const [addEditQty, setAddEditQty] = useState(1);
  const [addEditUnitPrice, setAddEditUnitPrice] = useState(0);

  const filteredQuotes = useMemo(() => {
    return quotations.filter((q) => {
      if (activeBusiness !== 'all' && q.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && q.business !== currentUser.assignedBusiness) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.id.toLowerCase().includes(query) ||
          q.customerName.toLowerCase().includes(query) ||
          q.customerPhone.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [quotations, activeBusiness, currentUser, searchQuery]);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find((x) => x.id === prodId);
    if (p) {
      setUnitPrice(p.retailPrice);
      setBusiness(p.business);
    }
  };

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !selectedProductId) return;

    addQuotation({
      business,
      customerName,
      customerPhone,
      customerAddress,
      source: 'pos_walkin',
      items: [
        {
          productId: selectedProductId,
          quantity,
          unitPrice
        }
      ]
    });

    setIsAddModalOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setSelectedProductId('');
  };

  const handleOpenEditModal = (q: Quotation) => {
    setEditingQuote(q);
    setEditCustomerName(q.customerName);
    setEditCustomerPhone(q.customerPhone);
    setEditCustomerAddress(q.customerAddress);
    setEditBusiness(q.business);
    setEditValidUntil(q.validUntil);
    setEditStatus(q.status);
    setEditNotes(q.notes || '');
    setEditItems([...q.items]);
    setIsEditModalOpen(true);
  };

  const handleAddItemToEditQuote = () => {
    if (!addEditProductId) return;
    const prod = products.find((p) => p.id === addEditProductId);
    if (!prod) return;

    const newItem = {
      productId: prod.id,
      productName: prod.name,
      brand: prod.brand,
      quantity: addEditQty,
      unitPrice: addEditUnitPrice || prod.retailPrice,
      total: (addEditUnitPrice || prod.retailPrice) * addEditQty
    };

    setEditItems((prev) => [...prev, newItem]);
    setAddEditProductId('');
    setAddEditQty(1);
    setAddEditUnitPrice(0);
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEditItemQtyPrice = (index: number, newQty: number, newPrice: number) => {
    setEditItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          quantity: newQty,
          unitPrice: newPrice,
          total: newQty * newPrice
        };
      })
    );
  };

  const handleSaveEditedQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote || editItems.length === 0) {
      alert('A quotation must have at least 1 item.');
      return;
    }

    updateQuotation(editingQuote.id, {
      customerName: editCustomerName,
      customerPhone: editCustomerPhone,
      customerAddress: editCustomerAddress,
      business: editBusiness,
      validUntil: editValidUntil,
      status: editStatus,
      notes: editNotes,
      items: editItems
    });

    setIsEditModalOpen(false);
    setEditingQuote(null);
  };

  const handleDeleteQuote = (id: string) => {
    if (confirm(`Are you sure you want to delete quotation #${id}?`)) {
      deleteQuotation(id);
    }
  };

  const handleSendQuoteSMS = (q: Quotation) => {
    const bName = q.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise';
    const msg = `Dear ${q.customerName}, quotation #${q.id} from ${bName}. Total Est: BDT ${q.totalAmount.toLocaleString()}. Valid until ${q.validUntil}. Call us to confirm your order!`;
    sendSMS(q.customerPhone, q.customerName, msg, 'marketing_campaign', q.business);
  };

  const downloadQuotePDF = async () => {
    if (!printableRef.current || !printQuote) return;

    try {
      const element = printableRef.current;
      const canvas = await safeHtml2Canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Quotation_${printQuote.id}_${printQuote.customerName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. You can use Print to PDF instead.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-yellow-500" />
            Quotations & Price Inquiries
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Create, edit, print, and convert customer price quotations and website lead estimates.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-98"
        >
          <Plus className="w-4 h-4" />
          Create New Quotation
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Quote #, Customer Name or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Quote # & Date</th>
                <th className="p-4">Business</th>
                <th className="p-4">Customer Info</th>
                <th className="p-4">Source</th>
                <th className="p-4">Quoted Items</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No quotations found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const isElectronics = q.business === 'amanot_electronics';

                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono">
                        <p className="font-bold text-yellow-700 text-sm">{q.id}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{q.createdAt}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Valid to: {q.validUntil}</p>
                      </td>

                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                          isElectronics ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-900 text-sm">{q.customerName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{q.customerPhone}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{q.customerAddress}</p>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.source === 'website_inquiry' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {q.source === 'website_inquiry' && <Globe className="w-3 h-3" />}
                          {q.source === 'website_inquiry' ? 'Website Inquiry' : 'Showroom Walk-in'}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{q.items.length} Product(s)</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">
                          {q.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                        </p>
                      </td>

                      <td className="p-4 text-right font-mono font-black text-slate-900 text-sm">
                        ৳{q.totalAmount.toLocaleString()}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          q.status === 'converted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'sent'
                            ? 'bg-amber-100 text-amber-800'
                            : q.status === 'draft'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {q.status}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-1.5">
                        <button
                          onClick={() => setPrintQuote(q)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs inline-flex items-center"
                          title="Print / View Formal PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(q)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs inline-flex items-center"
                          title="Edit Quotation"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleSendQuoteSMS(q)}
                          className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-xs inline-flex items-center"
                          title="Send SMS Notice"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {q.status !== 'converted' && (
                          <button
                            onClick={() => convertQuoteToSale(q.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-xs transition active:scale-98"
                          >
                            <ArrowRight className="w-3.5 h-3.5" /> Convert
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteQuote(q.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs inline-flex items-center"
                          title="Delete Quotation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Quotation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 my-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-yellow-500" />
                Create New Quotation
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-4 text-xs font-medium">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mrs. Shamima Akhter"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Customer Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="017..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Address / Location</label>
                  <input
                    type="text"
                    placeholder="Dhaka"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Select Product to Quote</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.business === 'amanot_electronics' ? 'Electronics' : 'Enterprise'}] {p.name} ({p.brand}) - ৳{p.retailPrice.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Unit Quoted Rate (BDT)</label>
                  <input
                    type="number"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border rounded-lg font-mono font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black rounded-xl shadow-md"
                >
                  Generate Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT QUOTATION MODAL */}
      {isEditModalOpen && editingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-auto animate-in zoom-in-95 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Edit Quotation #{editingQuote.id}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedQuote} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Phone</label>
                  <input
                    type="text"
                    required
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Address</label>
                  <input
                    type="text"
                    value={editCustomerAddress}
                    onChange={(e) => setEditCustomerAddress(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Business Entity</label>
                  <select
                    value={editBusiness}
                    onChange={(e) => setEditBusiness(e.target.value as any)}
                    className="w-full p-2 border rounded-lg font-bold bg-slate-50"
                  >
                    <option value="amanot_electronics">Amanot Electronics</option>
                    <option value="amanot_enterprise">Amanot Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valid Until Date</label>
                  <input
                    type="date"
                    required
                    value={editValidUntil}
                    onChange={(e) => setEditValidUntil(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quote Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2 border rounded-lg font-bold bg-slate-50 uppercase"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="converted">Converted</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Items List in Edit Quote */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                  Quoted Products ({editItems.length})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                        <p className="text-[10px] text-slate-400">{item.brand}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Qty</span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdateEditItemQtyPrice(idx, Number(e.target.value), item.unitPrice)}
                            className="w-14 p-1 border rounded text-xs font-mono font-bold"
                          />
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Unit BDT</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateEditItemQtyPrice(idx, item.quantity, Number(e.target.value))}
                            className="w-24 p-1 border rounded text-xs font-mono font-bold text-blue-700"
                          />
                        </div>

                        <div className="text-right min-w-[70px]">
                          <span className="text-[9px] text-slate-400 font-bold block">Line Total</span>
                          <span className="font-mono font-black text-slate-900 text-xs">৳{item.total.toLocaleString()}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(idx)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new product row */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Add Another Product</label>
                    <select
                      value={addEditProductId}
                      onChange={(e) => {
                        setAddEditProductId(e.target.value);
                        const p = products.find((x) => x.id === e.target.value);
                        if (p) setAddEditUnitPrice(p.retailPrice);
                      }}
                      className="w-full p-1.5 border rounded-lg text-xs font-bold"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.brand}) - ৳{p.retailPrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={addEditQty}
                      onChange={(e) => setAddEditQty(Number(e.target.value))}
                      className="w-full p-1.5 border rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToEditQuote}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-xs shrink-0"
                  >
                    Add Product
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Special Terms / Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-between items-center border-t">
                <div className="font-mono text-sm font-black text-slate-900">
                  Total Quoted: ৳{editItems.reduce((acc, i) => acc + i.total, 0).toLocaleString()}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORMAL PRINT / PDF QUOTATION MODAL */}
      {printQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-auto animate-in zoom-in-95 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-500" />
                Quotation Letterhead Document
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadQuotePDF}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={() => setPrintQuote(null)} className="text-slate-400 hover:text-slate-700 ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Node */}
            <div
              ref={printableRef}
              className="p-8 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-900"
              style={{ minHeight: '500px' }}
            >
              {/* Company Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {printQuote.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    {printQuote.business === 'amanot_electronics'
                      ? settings.amanotElectronicsAddress
                      : settings.amanotEnterpriseAddress}
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    Phone:{' '}
                    {printQuote.business === 'amanot_electronics'
                      ? settings.amanotElectronicsPhone
                      : settings.amanotEnterprisePhone}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block bg-yellow-500 text-slate-900 px-3 py-1 rounded font-black text-xs uppercase tracking-wider">
                    PRICE QUOTATION
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-900 mt-2">Ref: {printQuote.id}</p>
                  <p className="text-xs text-slate-500 font-medium">Date: {printQuote.createdAt}</p>
                  <p className="text-xs text-slate-500 font-medium">Valid Until: {printQuote.validUntil}</p>
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Quotation Prepared For</span>
                  <p className="font-black text-sm text-slate-900 mt-0.5">{printQuote.customerName}</p>
                  <p className="font-mono font-bold text-slate-700">{printQuote.customerPhone}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Address / Destination</span>
                  <p className="font-medium text-slate-800 mt-0.5">{printQuote.customerAddress || 'Dhaka'}</p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead className="text-white font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Product Description</th>
                    <th className="p-2.5 text-center">Brand</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Rate</th>
                    <th className="p-2.5 text-right">Total (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printQuote.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                      <td className="p-2.5 text-center text-slate-600 font-medium">{item.brand}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">৳{item.unitPrice.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono font-bold">৳{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 max-w-sm space-y-1">
                  <p className="font-bold text-slate-700">Terms & Conditions:</p>
                  <p>1. Prices are valid until {printQuote.validUntil}.</p>
                  <p>2. Payment via Cash, Bank Transfer, Card or bKash / Nagad.</p>
                  {printQuote.notes && <p className="italic text-slate-700">Notes: {printQuote.notes}</p>}
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-slate-500 uppercase block">Grand Total Estimated</span>
                  <span className="text-2xl font-black text-slate-900">৳{printQuote.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Signature Footer */}
              <div className="pt-12 flex justify-between text-xs text-slate-500 font-bold border-t border-slate-100">
                <div>
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span>Customer Acceptance Signature</span>
                </div>
                <div className="text-right">
                  <div className="w-36 border-b border-slate-400 mb-1 ml-auto" />
                  <span>Authorized Representative</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
