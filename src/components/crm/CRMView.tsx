import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, Quotation } from '../../types';
import {
  Users,
  Search,
  FileSpreadsheet,
  Send,
  Plus,
  Edit3,
  Trash2,
  Phone,
  MapPin,
  Tag,
  Globe,
  Filter,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  DollarSign,
  X,
  MessageSquare,
  Layers,
  UserCheck,
  UserX,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterListsManagerModal } from '../common/MasterListsManagerModal';
import { CustomerDetailDashboard } from './CustomerDetailDashboard';

export const CRMView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    importCustomersFromExcel,
    quotations,
    sales,
    sendSMS,
    smsLogs,
    activeBusiness,
    crmGroups,
    crmLeadSources
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'contacts' | 'leads' | 'campaigns' | 'logs'>('contacts');

  // Customer Group Filter
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isMasterListsModalOpen, setIsMasterListsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewCustomerDetail, setViewCustomerDetail] = useState<Customer | null>(null);

  // Form State for Add/Edit Customer
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custType, setCustType] = useState<Customer['customerType']>('regular');
  const [custGroup, setCustGroup] = useState<Customer['group']>('General');
  const [custNotes, setCustNotes] = useState('');

  // Bulk Campaign state
  const [campaignTargetGroup, setCampaignTargetGroup] = useState<string>('all');
  const [campaignMessage, setCampaignMessage] = useState(
    'Amanot Electronics & Enterprise: Special Offer! Enjoy up to 15% discount on Gree ACs & Haier Refrigerators. Visit our showroom today!'
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const parsed = data
          .map((row) => ({
            name: row.Name || row.name || row.Customer || 'Valued Client',
            phone: String(row.Phone || row.phone || row.Mobile || row.mobile || '').replace(/[^0-9]/g, ''),
            address: row.Address || row.address || 'Dhaka',
            notes: row.Notes || 'Excel Import'
          }))
          .filter((x) => x.phone.length >= 10);

        importCustomersFromExcel(parsed);
      } catch (err) {
        alert('Failed to parse Excel file. Please ensure columns have Name and Phone headers.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustEmail('');
    setCustType('regular');
    setCustGroup('General');
    setCustNotes('');
    setIsAddCustomerOpen(true);
  };

  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustName(c.name);
    setCustPhone(c.phone);
    setCustAddress(c.address);
    setCustEmail(c.email || '');
    setCustType(c.customerType);
    setCustGroup(c.group || 'General');
    setCustNotes(c.notes || '');
    setIsAddCustomerOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: custName,
        phone: custPhone,
        address: custAddress || 'Dhaka',
        email: custEmail,
        customerType: custType,
        group: custGroup,
        notes: custNotes
      });
    } else {
      addCustomer({
        name: custName,
        phone: custPhone,
        address: custAddress || 'Dhaka',
        email: custEmail,
        customerType: custType,
        group: custGroup,
        notes: custNotes
      });
    }

    setIsAddCustomerOpen(false);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete customer record for "${name}"?`)) {
      deleteCustomer(id);
    }
  };

  const handleLaunchCampaign = () => {
    const targets = customers.filter((c) => {
      if (campaignTargetGroup === 'due_customers') return c.currentDue > 0;
      if (campaignTargetGroup !== 'all') return (c.group || 'General') === campaignTargetGroup;
      return true;
    });

    if (targets.length === 0) {
      alert('No target contacts found for the selected group filter.');
      return;
    }

    targets.forEach((c) => {
      sendSMS(c.phone, c.name, campaignMessage, 'marketing_campaign', activeBusiness === 'all' ? 'amanot_electronics' : activeBusiness);
    });

    alert(`Alpha SMS Campaign launched! Dispatched to ${targets.length} contact(s).`);
  };

  // Grouped customer counts
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'VIP Club': 0,
      'Wholesale Buyers': 0,
      'Installment EMI Clients': 0,
      'Website Leads': 0,
      'General': 0
    };

    customers.forEach((c) => {
      const g = c.group || 'General';
      counts[g] = (counts[g] || 0) + 1;
    });

    return counts;
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (selectedGroup !== 'all' && (c.group || 'General') !== selectedGroup) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [customers, selectedGroup, searchQuery]);

  // Lead list derived from Website Quotations & Lead status
  const leads = useMemo(() => {
    return quotations.filter((q) => q.source === 'website_inquiry' || q.status === 'sent' || q.status === 'draft');
  }, [quotations]);

  if (viewCustomerDetail) {
    return (
      <CustomerDetailDashboard
        customer={viewCustomerDetail}
        onClose={() => setViewCustomerDetail(null)}
        onEditCustomer={handleOpenEditCustomer}
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner — title + view dropdown & actions (top right) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-amber-500" />
          CRM & Customer Group Management
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View selector dropdown */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-900/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={activeSubTab}
              onChange={(e) => setActiveSubTab(e.target.value as any)}
              className="appearance-none bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl pl-9 pr-9 py-2.5 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300 transition min-w-[230px]"
            >
              <option value="contacts">Customer Directory & Groups ({customers.length})</option>
              <option value="leads">Website & Inquiry Leads ({leads.length})</option>
              <option value="campaigns">Alpha SMS Bulk Campaign</option>
              <option value="logs">SMS Gateway Logs ({smsLogs.length})</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-900 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsMasterListsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition active:scale-98"
          >
            <Layers className="w-4 h-4" />
            Manage Lists
          </button>

          <label className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition">
            <FileSpreadsheet className="w-4 h-4" />
            Import Contacts
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleOpenAddCustomer}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            Add New Contact
          </button>
        </div>
      </div>

      {/* 1. CONTACTS & GROUPS TAB */}
      {activeSubTab === 'contacts' && (
        <div className="space-y-4">
          {/* Group Count Chips */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-500" /> Filter by Customer Group:
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedGroup('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedGroup === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Contacts ({customers.length})
              </button>

              <button
                onClick={() => setSelectedGroup('VIP Club')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedGroup === 'VIP Club' ? 'bg-amber-500 text-slate-900 shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                VIP Club ({groupCounts['VIP Club'] || 0})
              </button>

              <button
                onClick={() => setSelectedGroup('Wholesale Buyers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedGroup === 'Wholesale Buyers' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                Wholesale Buyers ({groupCounts['Wholesale Buyers'] || 0})
              </button>

              <button
                onClick={() => setSelectedGroup('Installment EMI Clients')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedGroup === 'Installment EMI Clients' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                }`}
              >
                Installment EMI ({groupCounts['Installment EMI Clients'] || 0})
              </button>

              <button
                onClick={() => setSelectedGroup('Website Leads')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedGroup === 'Website Leads' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Website Leads ({groupCounts['Website Leads'] || 0})
              </button>

              <button
                onClick={() => setSelectedGroup('General')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedGroup === 'General' ? 'bg-slate-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                General ({groupCounts['General'] || 0})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer name, phone number, address, group or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Group Tag</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right">Total Purchases</th>
                    <th className="p-4 text-right">Current Due</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        No customer contacts found matching active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <button
                            onClick={() => setViewCustomerDetail(c)}
                            className="font-black text-slate-900 text-sm text-left hover:text-amber-600 transition flex items-center gap-1 group"
                          >
                            <span>{c.name}</span>
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <p className="text-[10px] text-slate-400">{c.address}</p>
                        </td>

                        <td className="p-4 font-mono font-bold text-blue-700">{c.phone}</td>

                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                            c.group === 'VIP Club'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : c.group === 'Wholesale Buyers'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : c.group === 'Installment EMI Clients'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : c.group === 'Website Leads'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {c.group || 'General'}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                            {c.customerType}
                          </span>
                        </td>

                        <td className="p-4 text-right font-mono font-bold">৳{c.totalPurchases.toLocaleString()}</td>

                        <td className="p-4 text-right font-mono font-extrabold text-rose-600">৳{c.currentDue.toLocaleString()}</td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewCustomerDetail(c)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition"
                              title="View Customer Journey & Profile Dashboard"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Journey & Profile
                            </button>

                            <button
                              onClick={() => handleOpenEditCustomer(c)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg"
                              title="Edit Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                const msg = prompt(`Enter SMS for ${c.name}:`);
                                if (msg) {
                                  sendSMS(c.phone, c.name, msg, 'marketing_campaign', 'amanot_electronics');
                                }
                              }}
                              className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg"
                              title="Send Quick SMS"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteCustomer(c.id, c.name)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. LEADS TAB */}
      {activeSubTab === 'leads' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                Website Inquiries & Prospect Leads
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All store quote requests and live website inquiries automatically captured into the CRM pipeline.
              </p>
            </div>
            <span className="bg-purple-100 text-purple-800 font-black px-3 py-1 rounded-full text-xs">
              {leads.length} Total Leads
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3">Inquiry Date</th>
                  <th className="p-3">Customer Contact</th>
                  <th className="p-3">Quoted / Requested Products</th>
                  <th className="p-3 text-right">Est. Value</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      No website inquiry leads recorded yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono">
                        <p className="font-bold text-slate-900">{l.createdAt}</p>
                        <p className="text-[10px] text-slate-400">{l.id}</p>
                      </td>

                      <td className="p-3">
                        <p className="font-bold text-slate-900 text-sm">{l.customerName}</p>
                        <p className="font-mono text-blue-700 text-xs">{l.customerPhone}</p>
                        <p className="text-[10px] text-slate-400">{l.customerAddress}</p>
                      </td>

                      <td className="p-3">
                        <p className="font-semibold text-slate-800">{l.items.map((i) => i.productName).join(', ')}</p>
                      </td>

                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        ৳{l.totalAmount.toLocaleString()}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          l.status === 'converted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            const msg = prompt(`Send follow-up SMS to ${l.customerName}:`);
                            if (msg) {
                              sendSMS(l.customerPhone, l.customerName, msg, 'marketing_campaign', l.business);
                            }
                          }}
                          className="px-3 py-1 bg-amber-500 text-slate-900 font-bold rounded-lg text-xs"
                        >
                          Follow-up SMS
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CAMPAIGN LAUNCHER TAB */}
      {activeSubTab === 'campaigns' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-2xl space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-500" />
            Launch Alpha SMS Bulk Marketing Campaign
          </h2>

          <div>
            <label className="font-bold text-xs text-slate-700 block mb-1">Target Audience Group</label>
            <select
              value={campaignTargetGroup}
              onChange={(e) => setCampaignTargetGroup(e.target.value)}
              className="w-full p-2.5 border rounded-xl text-xs font-bold bg-slate-50"
            >
              <option value="all">All Saved CRM Contacts ({customers.length})</option>
              <option value="due_customers">Customers with Pending Due Balance</option>
              <option value="VIP Club">VIP Club Group ({groupCounts['VIP Club'] || 0})</option>
              <option value="Wholesale Buyers">Wholesale Buyers Group ({groupCounts['Wholesale Buyers'] || 0})</option>
              <option value="Installment EMI Clients">Installment EMI Group ({groupCounts['Installment EMI Clients'] || 0})</option>
              <option value="Website Leads">Website Leads Group ({groupCounts['Website Leads'] || 0})</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-xs text-slate-700 block mb-1">Campaign Message Text</label>
            <textarea
              rows={4}
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
              className="w-full p-3 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Characters: {campaignMessage.length} (Est. 1 SMS parts per contact)</p>
          </div>

          <button
            onClick={handleLaunchCampaign}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900 font-black rounded-xl shadow-md transition active:scale-98 text-xs flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Dispatch Bulk SMS Campaign Now
          </button>
        </div>
      )}

      {/* 4. SMS LOGS TAB */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Alpha SMS API Gateway Logs
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold border-b">
                <tr>
                  <th className="p-3">Sent At</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Message Snippet</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Gateway Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      No SMS logs dispatched yet.
                    </td>
                  </tr>
                ) : (
                  smsLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500">{log.sentAt}</td>
                      <td className="p-3 font-bold font-sans text-slate-900">{log.recipientName}</td>
                      <td className="p-3 text-blue-700 font-bold">{log.recipientPhone}</td>
                      <td className="p-3 text-slate-700 font-sans max-w-xs truncate">{log.message}</td>
                      <td className="p-3 text-slate-500 font-sans">{log.type}</td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 my-auto animate-in zoom-in-95 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer Contact'}
              </h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alhaj Nurul Islam"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="017..."
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@mail.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="Mirpur, Dhaka"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Group Tag</label>
                  <select
                    value={custGroup}
                    onChange={(e) => setCustGroup(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                  >
                    <option value="General">General</option>
                    <option value="VIP Club">VIP Club</option>
                    <option value="Wholesale Buyers">Wholesale Buyers</option>
                    <option value="Installment EMI Clients">Installment EMI Clients</option>
                    <option value="Website Leads">Website Leads</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Category</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                  >
                    <option value="regular">Regular</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="lead">Lead Prospect</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl shadow-md"
                >
                  {editingCustomer ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Lists Modal for CRM Groups */}
      {isMasterListsModalOpen && (
        <MasterListsManagerModal defaultTab="crm" onClose={() => setIsMasterListsModalOpen(false)} />
      )}

    </div>
  );
};
