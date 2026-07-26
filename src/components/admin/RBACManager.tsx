import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StaffUser, BusinessType } from '../../types';
import { createStaffUser } from '../../api/sync';
import { ShieldAlert, UserPlus, Save, Loader2, X, KeyRound } from 'lucide-react';

const PERMISSION_FIELDS: { key: keyof StaffUser['permissions']; label: string }[] = [
  { key: 'canViewGlobalReports', label: 'View Global Real Financials' },
  { key: 'canManageAuditConfig', label: 'Control Tax Audit Config' },
  { key: 'canManageInventory', label: 'Manage Stock & Inventory' },
  { key: 'canManagePOS', label: 'Access POS & Sales' },
  { key: 'canManageExpenses', label: 'Record Business Expenses' },
  { key: 'canManageCRM', label: 'CRM & Alpha SMS Access' },
  { key: 'canManageRBAC', label: 'Manage Staff & RBAC' },
];

const DEFAULT_PERMISSIONS: StaffUser['permissions'] = {
  canViewGlobalReports: false,
  canManageAuditConfig: false,
  canManageInventory: true,
  canManagePOS: true,
  canManageExpenses: false,
  canManageCRM: true,
  canManageRBAC: false,
};

export const RBACManager: React.FC = () => {
  const { staffUsers, updateStaffUsers, currentUser } = useApp();

  const [users, setUsers] = useState<StaffUser[]>(staffUsers);
  const [dirty, setDirty] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // New-staff form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assignedBusiness, setAssignedBusiness] = useState<'all' | BusinessType>('all');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const markDirty = () => setDirty(true);

  const handleBusinessChange = (userId: string, newBiz: 'all' | BusinessType) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, assignedBusiness: newBiz } : u)));
    markDirty();
  };

  const handlePermissionToggle = (userId: string, permKey: keyof StaffUser['permissions']) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, permissions: { ...u.permissions, [permKey]: !u.permissions[permKey] } }
          : u,
      ),
    );
    markDirty();
  };

  const handleSave = () => {
    updateStaffUsers(users);
    setDirty(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    const res = await createStaffUser({
      name: name.trim(),
      email: email.trim(),
      password,
      assignedBusiness,
      role: 'staff',
      permissions: DEFAULT_PERMISSIONS,
    });
    setCreating(false);
    if (res.ok && res.user) {
      const next = [...users, res.user as unknown as StaffUser];
      setUsers(next);
      updateStaffUsers(next);
      setShowAdd(false);
      setName('');
      setEmail('');
      setPassword('');
      setAssignedBusiness('all');
    } else {
      setFormError(res.error || 'Could not create user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-orange-600" />
            Staff RBAC & Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Assign staff to a business and grant module permissions. Changes apply on Save and sync
            to the database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Add Staff Login
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 ${
              dirty
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" /> {dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {users.map((u) => {
          const isSelf = u.id === currentUser.id;
          const lockAdmin = u.role === 'super_admin';
          return (
            <div key={u.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase mb-1 ${
                      u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {u.role === 'super_admin' ? '⚡ Super Admin' : 'Staff Member'}
                    {isSelf && ' • You'}
                  </span>
                  <h3 className="text-base font-black text-slate-900">{u.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Assigned Business</label>
                  <select
                    disabled={lockAdmin}
                    value={u.assignedBusiness}
                    onChange={(e) => handleBusinessChange(u.id, e.target.value as any)}
                    className="mt-1 text-xs font-extrabold p-1.5 border rounded-lg bg-slate-50 disabled:opacity-60"
                  >
                    <option value="all">Both Businesses (Global)</option>
                    <option value="amanot_electronics">Amanot Electronics Only</option>
                    <option value="amanot_enterprise">Amanot Enterprise Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-400 uppercase text-[10px]">Module Permissions</p>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSION_FIELDS.map((p) => {
                    const isChecked = u.permissions[p.key];
                    return (
                      <label
                        key={p.key}
                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        } ${lockAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <span>{p.label}</span>
                        <input
                          type="checkbox"
                          disabled={lockAdmin}
                          checked={isChecked}
                          onChange={() => handlePermissionToggle(u.id, p.key)}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                      </label>
                    );
                  })}
                </div>
                {lockAdmin && (
                  <p className="text-[10px] text-slate-400 italic">
                    Super Admin always has full access — permissions are locked.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" /> New Staff Login
              </h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Rahim Uddin"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="staff@amanatgroup.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Temporary Password</label>
                <input
                  required
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                  placeholder="Set a password"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Assigned Business</label>
                <select
                  value={assignedBusiness}
                  onChange={(e) => setAssignedBusiness(e.target.value as any)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Both Businesses (Global)</option>
                  <option value="amanot_electronics">Amanot Electronics Only</option>
                  <option value="amanot_enterprise">Amanot Enterprise Only</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                New staff start with standard permissions (POS, Inventory, CRM). Adjust them on the card
                after creating, then Save.
              </p>
              <button
                type="submit"
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 rounded-xl transition active:scale-[0.98] disabled:opacity-60"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {creating ? 'Creating…' : 'Create Staff Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
