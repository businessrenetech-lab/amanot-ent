import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Plus, Trash2, Tag, Layers, Users, DollarSign, Check } from 'lucide-react';

interface MasterListsManagerModalProps {
  onClose: () => void;
  defaultTab?: 'categories' | 'brands' | 'crm' | 'expenses';
}

export const MasterListsManagerModal: React.FC<MasterListsManagerModalProps> = ({
  onClose,
  defaultTab = 'categories'
}) => {
  const {
    brands,
    addBrand,
    categories,
    addCategory,
    expenseCategories,
    addExpenseCategory,
    deleteExpenseCategory,
    crmGroups,
    addCrmGroup,
    crmLeadSources,
    addCrmLeadSource
  } = useApp();

  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'crm' | 'expenses'>(defaultTab);

  // Input states
  const [newCategory, setNewCategory] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCrmGroup, setNewCrmGroup] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    addCategory(newCategory.trim());
    setNewCategory('');
  };

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.trim()) return;
    addBrand(newBrand.trim());
    setNewBrand('');
  };

  const handleAddCrmGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrmGroup.trim()) return;
    addCrmGroup(newCrmGroup.trim());
    setNewCrmGroup('');
  };

  const handleAddLeadSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadSource.trim()) return;
    addCrmLeadSource(newLeadSource.trim());
    setNewLeadSource('');
  };

  const handleAddExpenseCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseCat.trim()) return;
    addExpenseCategory(newExpenseCat.trim());
    setNewExpenseCat('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              Master System Lists & Items
            </h2>
            <p className="text-xs text-slate-300">
              Manage Product Categories, Brand Names, CRM Custom Lists & Expense Items
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-2 border-b border-slate-200 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
              activeTab === 'categories'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Product Categories ({categories.length})
          </button>

          <button
            onClick={() => setActiveTab('brands')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
              activeTab === 'brands'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            Brand Names ({brands.length})
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
              activeTab === 'crm'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            CRM Custom Lists ({crmGroups.length})
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
              activeTab === 'expenses'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Expense Categories ({expenseCategories.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: Categories */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new Category name (e.g. Inverter AC, Solar Inverter, Refrigerator)..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Category Item
                </button>
              </form>

              <div>
                <h3 className="font-extrabold text-slate-800 text-xs mb-2">Active Product Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Brands */}
          {activeTab === 'brands' && (
            <div className="space-y-4">
              <form onSubmit={handleAddBrand} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new Brand name (e.g. Gree, Konka, Haiko, Haier, Samsung, LG)..."
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Brand Name
                </button>
              </form>

              <div>
                <h3 className="font-extrabold text-slate-800 text-xs mb-2">Active Authorized Brands</h3>
                <div className="flex flex-wrap gap-2">
                  {brands.map((b, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-bold flex items-center gap-1"
                    >
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CRM Custom Lists */}
          {activeTab === 'crm' && (
            <div className="space-y-6">
              {/* Customer Groups / Lists */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-900 text-xs">Customer Classification Groups</h3>
                <form onSubmit={handleAddCrmGroup} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Create custom CRM group (e.g. Corporate Dealers, VIP Club, High-Volume Installment)..."
                    value={newCrmGroup}
                    onChange={(e) => setNewCrmGroup(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Create CRM Group
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {crmGroups.map((g, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 font-bold flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* CRM Lead Sources */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="font-extrabold text-slate-900 text-xs">Lead Sources & Acquisition Channels</h3>
                <form onSubmit={handleAddLeadSource} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add Lead Source (e.g. Showroom Walk-in, Facebook Ads, Referral, Agent)..."
                    value={newLeadSource}
                    onChange={(e) => setNewLeadSource(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add Lead Source
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {crmLeadSources.map((s, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-bold"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Expense Categories */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <form onSubmit={handleAddExpenseCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new Expense Item/Category (e.g. Shop Rent, Electricity, Freight, Allowance)..."
                  value={newExpenseCat}
                  onChange={(e) => setNewExpenseCat(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Expense Category
                </button>
              </form>

              <div>
                <h3 className="font-extrabold text-slate-800 text-xs mb-2">Active Expense Categories</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {expenseCategories.map((cat, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-amber-900 font-bold flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        {cat}
                      </span>
                      {expenseCategories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteExpenseCategory(cat)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-100"
                          title="Remove expense category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
