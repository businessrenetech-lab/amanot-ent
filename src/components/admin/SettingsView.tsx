import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Eye, EyeOff, Smartphone, Building2, Save, CheckCircle2, Landmark, ExternalLink, ImageIcon, Upload, Trash2, Plus } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, accounts, brands, setActiveTab, showToast } = useApp();

  const [showPrices, setShowPrices] = useState(settings.showPricesOnWebsite);
  const [apiKey, setApiKey] = useState(settings.alphaSmsApiKey);
  const [senderId, setSenderId] = useState(settings.alphaSmsSenderId);
  const [elecAddress, setElecAddress] = useState(settings.amanotElectronicsAddress);
  const [elecPhone, setElecPhone] = useState(settings.amanotElectronicsPhone);
  const [entAddress, setEntAddress] = useState(settings.amanotEnterpriseAddress);
  const [entPhone, setEntPhone] = useState(settings.amanotEnterprisePhone);

  // Brand logos (keyed by lowercased brand name)
  const [brandLogos, setBrandLogos] = useState<Record<string, string>>(settings.brandLogos || {});
  const [newBrandName, setNewBrandName] = useState('');

  const handleLogoUpload = (brandKey: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file (PNG/JPG/WEBP/SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setBrandLogos((prev) => ({ ...prev, [brandKey.trim().toLowerCase()]: result }));
        showToast(`Logo set for ${brandKey}. Remember to Save.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = (brandKey: string) => {
    setBrandLogos((prev) => {
      const next = { ...prev };
      delete next[brandKey.trim().toLowerCase()];
      return next;
    });
  };

  // Brands that have a slot shown in the uploader (known brands ∪ any brand already having a logo)
  const logoBrandList = Array.from(
    new Set([...brands, ...Object.keys(brandLogos)].map((b) => b.trim()).filter(Boolean))
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      showPricesOnWebsite: showPrices,
      alphaSmsApiKey: apiKey,
      alphaSmsSenderId: senderId,
      amanotElectronicsAddress: elecAddress,
      amanotElectronicsPhone: elecPhone,
      amanotEnterpriseAddress: entAddress,
      amanotEnterprisePhone: entPhone,
      brandLogos
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700" />
          System & Storefront Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Configure public website display options, Alpha SMS API credentials, and store outlet details for receipt headers.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs font-medium">
        
        {/* 1. Website Price Toggle (EXPLICIT USER REQUIREMENT) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                {showPrices ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-amber-600" />}
                Public Website Price Display Mode
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose whether product prices (BDT) are visible to public visitors on the electronic store frontend.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPrices(!showPrices)}
              className={`px-4 py-2 rounded-xl font-black text-xs transition ${
                showPrices
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-amber-500 text-slate-950 shadow-md'
              }`}
            >
              {showPrices ? 'Prices VISIBLE on Website' : 'Prices HIDDEN (Request Quote)'}
            </button>
          </div>

          {!showPrices && (
            <p className="text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
              Note: When prices are hidden, products will display "Call for Price / Get a Quote". Clicking the button prompts visitors to submit their Name & Phone number directly to your back-office Quotation CRM!
            </p>
          )}
        </div>

        {/* 2. Alpha SMS API Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b pb-3">
            <Smartphone className="w-4 h-4 text-blue-600" />
            Alpha SMS Gateway Integration Settings
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Alpha SMS API Secret Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-mono text-xs font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Masking Sender ID / Branding</label>
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-mono text-xs font-bold uppercase"
              />
            </div>
          </div>
        </div>

        {/* 3. Outlet Branding */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b pb-3">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Store Outlet Info for Branded Receipts
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="font-extrabold text-blue-900">Amanot Electronics Outlet</p>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Phones</label>
                <input
                  type="text"
                  value={elecPhone}
                  onChange={(e) => setElecPhone(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Address</label>
                <input
                  type="text"
                  value={elecAddress}
                  onChange={(e) => setElecAddress(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="space-y-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <p className="font-extrabold text-emerald-900">Amanot Enterprise Outlet</p>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Phones</label>
                <input
                  type="text"
                  value={entPhone}
                  onChange={(e) => setEntPhone(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Address</label>
                <input
                  type="text"
                  value={entAddress}
                  onChange={(e) => setEntAddress(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Financial Accounts Configuration */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" />
                Financial Store Accounts & Bank Configuration
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure Bank accounts (DBBL, City Bank), MFS wallets (bKash, Nagad), and POS Cash drawers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs flex items-center gap-1 transition"
            >
              Open Full Accounts Ledger <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {accounts.slice(0, 3).map((acc) => (
              <div key={acc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  {acc.type}
                </span>
                <p className="font-extrabold text-slate-900 mt-1 text-xs truncate">{acc.accountName}</p>
                <p className="text-[11px] font-mono text-emerald-600 font-black mt-0.5">
                  Bal: ৳{acc.currentBalance.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Logos (POS cards, storefront & receipts) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              Brand Logos (Website, POS & Receipts)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload a logo for each brand. It replaces the brand name on POS product cards,
              the public storefront, and receipts. PNG/SVG with transparent background works best.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {logoBrandList.map((b) => {
              const key = b.toLowerCase();
              const logo = brandLogos[key];
              return (
                <div key={key} className="border border-slate-200 rounded-2xl p-3 bg-slate-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">{b}</span>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => removeLogo(key)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition"
                        title="Remove logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Preview plate */}
                  <div className="h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden px-3">
                    {logo ? (
                      <img src={logo} alt={b} className="h-10 w-auto max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No logo</span>
                    )}
                  </div>

                  <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-xl border border-blue-200 transition">
                    <Upload className="w-3.5 h-3.5" />
                    {logo ? 'Replace Logo' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(b, e.target.files?.[0])}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          {/* Add a logo for a brand not listed above */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-2 border-t border-slate-100">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Add logo for another brand</label>
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="e.g. Haier, Samsung"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label
              className={`cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2 font-bold text-[11px] rounded-xl border transition ${
                newBrandName.trim()
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Choose Logo
              <input
                type="file"
                accept="image/*"
                disabled={!newBrandName.trim()}
                className="hidden"
                onChange={(e) => {
                  if (!newBrandName.trim()) return;
                  handleLogoUpload(newBrandName, e.target.files?.[0]);
                  setNewBrandName('');
                }}
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-98"
        >
          <Save className="w-4 h-4" />
          Save System Settings
        </button>

      </form>
    </div>
  );
};
