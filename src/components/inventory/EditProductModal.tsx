import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, BusinessType } from '../../types';
import {
  X,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  Star,
  Tag as TagIcon,
  Sparkles,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Sliders,
  DollarSign,
  Package,
  Layers,
  FileText
} from 'lucide-react';

interface EditProductModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

// Preset Appliance Sample Images
const PRESET_PHOTOS = [
  {
    category: 'AC',
    label: 'Inverter Split AC',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'AC',
    label: 'Air Conditioner Unit',
    url: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'TV',
    label: '4K Smart LED TV',
    url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'TV',
    label: 'Frameless Display',
    url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Refrigerator',
    label: 'Glass Door Fridge',
    url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Refrigerator',
    label: 'French Door Refrigerator',
    url: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Washing Machine',
    label: 'Front Load Washer',
    url: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80'
  }
];

const POPULAR_TAG_SUGGESTIONS = [
  'Inverter',
  '5-Star Energy',
  '4K UHD',
  'Non-Frost',
  'Direct Cool',
  'Wi-Fi Smart',
  'Cold Plasma',
  'Copper Pipe',
  'Triple Inverter',
  'Hot Sale',
  'Official Import',
  '10-Year Warranty',
  'Free Installation'
];

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose
}) => {
  const {
    addProduct,
    updateProduct,
    suppliers,
    brands,
    addBrand,
    categories,
    addCategory,
    showToast
  } = useApp();

  const isEditing = Boolean(product);

  // Form Fields State
  const [business, setBusiness] = useState<BusinessType>('amanot_electronics');
  const [supplierId, setSupplierId] = useState('supp_electro_mart');
  const [supplierName, setSupplierName] = useState('Electro Mart Bangladesh Ltd');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Gree');
  const [category, setCategory] = useState('Inverter AC');
  const [costPrice, setCostPrice] = useState(50000);
  const [retailPrice, setRetailPrice] = useState(62000);
  const [wholesalePrice, setWholesalePrice] = useState(57000);
  const [stockQty, setStockQty] = useState(10);
  const [minStockAlert, setMinStockAlert] = useState(3);
  const [unit, setUnit] = useState('Pcs');
  const [warranty, setWarranty] = useState('10 Years Compressor, 1 Year Spare Parts');

  // Technical specification fields (shown small on invoices)
  const [model, setModel] = useState('');
  const [typeSeries, setTypeSeries] = useState('');
  const [acType, setAcType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [size, setSize] = useState('');
  const [installationCharge, setInstallationCharge] = useState<number>(0);
  const [extraPipingFeePerFt, setExtraPipingFeePerFt] = useState<number>(0);

  const [description, setDescription] = useState('');
  const [storefrontDescription, setStorefrontDescription] = useState('');
  const [isFeaturedOnWebsite, setIsFeaturedOnWebsite] = useState(true);

  // Photo state
  const [primaryImage, setPrimaryImage] = useState<string>(PRESET_PHOTOS[0].url);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Tags state
  const [tags, setTags] = useState<string[]>(['Inverter', '5-Star Energy', 'Hot Sale']);
  const [tagInput, setTagInput] = useState('');

  // Active sub-tab inside modal
  const [activeTab, setActiveTab] = useState<'photos' | 'basic' | 'pricing' | 'description'>('photos');

  // Populate when editing existing product
  useEffect(() => {
    if (product) {
      setBusiness(product.business);
      setSupplierId(product.supplierId || 'supp_electro_mart');
      setSupplierName(product.supplierName || 'Electro Mart Bangladesh Ltd');
      setSku(product.sku);
      setName(product.name);
      setBrand(product.brand);
      setCategory(product.category);
      setCostPrice(product.costPrice);
      setRetailPrice(product.retailPrice);
      setWholesalePrice(product.wholesalePrice);
      setStockQty(product.stockQty);
      setMinStockAlert(product.minStockAlert);
      setUnit(product.unit);
      setWarranty(product.warranty);
      setModel(product.model || '');
      setTypeSeries(product.typeSeries || '');
      setAcType(product.acType || '');
      setCapacity(product.capacity || '');
      setSize(product.size || '');
      setInstallationCharge(product.installationCharge || 0);
      setExtraPipingFeePerFt(product.extraPipingFeePerFt || 0);
      setDescription(product.description || '');
      setStorefrontDescription(product.storefrontDescription || '');
      setIsFeaturedOnWebsite(product.isFeaturedOnWebsite ?? true);
      setPrimaryImage(product.image || PRESET_PHOTOS[0].url);
      setGalleryImages(product.images || [product.image || PRESET_PHOTOS[0].url]);
      setTags(product.tags || []);
    } else {
      // Reset defaults for add mode
      setBusiness('amanot_electronics');
      setSku('');
      setName('');
      setBrand('Gree');
      setCategory('Inverter AC');
      setCostPrice(50000);
      setRetailPrice(62000);
      setWholesalePrice(57000);
      setStockQty(10);
      setMinStockAlert(3);
      setUnit('Pcs');
      setWarranty('10 Years Compressor, 1 Year Spare Parts');
      setModel('');
      setTypeSeries('');
      setAcType('');
      setCapacity('');
      setSize('');
      setInstallationCharge(3000);
      setExtraPipingFeePerFt(550);
      setDescription('');
      setStorefrontDescription('');
      setIsFeaturedOnWebsite(true);
      setPrimaryImage(PRESET_PHOTOS[0].url);
      setGalleryImages([PRESET_PHOTOS[0].url]);
      setTags(['Inverter', '5-Star Energy']);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  // File Upload Handler (FileReader -> Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          // Add to gallery
          setGalleryImages((prev) => [...prev, result]);
          // If no primary image or placeholder, set as primary
          if (!primaryImage || galleryImages.length === 0) {
            setPrimaryImage(result);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    showToast('Photo uploaded successfully');
  };

  // Add Custom Image URL
  const handleAddCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim();
    setGalleryImages((prev) => [...prev, url]);
    if (!primaryImage) setPrimaryImage(url);
    setCustomUrlInput('');
    showToast('Image URL added to gallery');
  };

  // Tag Handlers
  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim();
    if (!clean) return;
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return;
    setTags((prev) => [...prev, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Generate Storefront Description Template
  const handleGenerateTemplate = () => {
    const template = `Official ${brand} ${name} (${sku}). Features high efficiency power saving technology, tropicalized heavy-duty compressor, and genuine factory performance. Backed by ${warranty}. Ideal for home and official installation in Bangladesh.`;
    setStorefrontDescription(template);
    showToast('Storefront description template generated');
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      showToast('Product Name and SKU/Model code are required');
      return;
    }

    const payload = {
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      business,
      brand,
      category,
      costPrice: Number(costPrice) || 0,
      retailPrice: Number(retailPrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      stockQty: Number(stockQty) || 0,
      minStockAlert: Number(minStockAlert) || 1,
      unit,
      warranty,
      model: model.trim() || undefined,
      typeSeries: typeSeries.trim() || undefined,
      acType: acType.trim() || undefined,
      capacity: capacity.trim() || undefined,
      size: size.trim() || undefined,
      installationCharge: Number(installationCharge) || undefined,
      extraPipingFeePerFt: Number(extraPipingFeePerFt) || undefined,
      image: primaryImage || galleryImages[0] || PRESET_PHOTOS[0].url,
      images: galleryImages.length > 0 ? galleryImages : [primaryImage || PRESET_PHOTOS[0].url],
      tags,
      description,
      storefrontDescription,
      isFeaturedOnWebsite,
      supplierId,
      supplierName
    };

    if (isEditing && product) {
      updateProduct(product.id, payload);
      showToast(`Product "${name}" updated successfully`);
    } else {
      addProduct(payload);
      showToast(`Product "${name}" created and added to inventory`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 my-auto overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-md">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {isEditing ? `Edit Product: ${product?.name}` : 'Add New Product to Inventory'}
              </h2>
              <p className="text-[11px] text-blue-200">
                Primary photos, photo gallery, storefront options & ERP details
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-Tab Navigation Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-3 flex items-center gap-2 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5 border-t-2 ${
              activeTab === 'photos'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm font-extrabold'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-blue-600" />
            <span>Photos & Gallery ({galleryImages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5 border-t-2 ${
              activeTab === 'basic'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm font-extrabold'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Product Identity & Brand</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5 border-t-2 ${
              activeTab === 'pricing'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm font-extrabold'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-indigo-600" />
            <span>Pricing & Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-1.5 border-t-2 ${
              activeTab === 'description'
                ? 'bg-white text-blue-700 border-blue-600 shadow-sm font-extrabold'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-purple-600" />
            <span>Storefront & Tags ({tags.length})</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* TAB 1: PHOTOS & GALLERY */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              
              {/* Primary Photo Spotlight & Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="md:col-span-1 space-y-3">
                  <label className="font-extrabold text-slate-800 uppercase tracking-wider block text-[11px]">
                    Primary Cover Photo
                  </label>
                  
                  <div className="relative h-52 bg-slate-50 border-2 border-dashed border-blue-300 rounded-2xl flex flex-col items-center justify-center p-3 overflow-hidden group">
                    {primaryImage ? (
                      <>
                        <img
                          src={primaryImage}
                          alt="Primary Product"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                          ★ Primary Photo
                        </span>
                      </>
                    ) : (
                      <div className="text-center text-slate-400 space-y-1">
                        <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="font-bold text-xs">No primary photo</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    This primary photo is displayed on POS cards, sales receipts, and website catalog.
                  </p>
                </div>

                {/* Upload & Add URL controls */}
                <div className="md:col-span-2 space-y-4">
                  
                  {/* Local File Upload Box */}
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-blue-950 flex items-center gap-2 text-xs">
                        <Upload className="w-4 h-4 text-blue-600" />
                        Upload Photos from Computer/Phone
                      </h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                        PNG, JPG, WEBP
                      </span>
                    </div>

                    <label className="flex items-center justify-center gap-2 p-3 bg-white border border-blue-300 rounded-xl cursor-pointer hover:bg-blue-50 transition shadow-sm font-bold text-blue-700">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>Choose Local Photo Files</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Add Photo URL */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="font-bold text-slate-700 block text-[11px]">
                      Or Add Image URL Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomUrl}
                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition"
                      >
                        + Add Photo
                      </button>
                    </div>
                  </div>

                  {/* Preset Quick Select Photos */}
                  <div>
                    <label className="font-bold text-slate-700 block text-[11px] mb-2">
                      Quick Pick Preset Appliance Images
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRESET_PHOTOS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPrimaryImage(preset.url);
                            if (!galleryImages.includes(preset.url)) {
                              setGalleryImages((prev) => [...prev, preset.url]);
                            }
                            showToast(`Selected preset: ${preset.label}`);
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 text-left transition group relative overflow-hidden"
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="h-12 w-full object-contain rounded-lg bg-white"
                            referrerPolicy="no-referrer"
                          />
                          <p className="text-[9px] font-bold text-slate-700 truncate mt-1">
                            {preset.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

              {/* Photo Gallery Thumbnails Bar */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    Photo Gallery ({galleryImages.length} Images)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Click ★ to set image as primary cover photo
                  </span>
                </div>

                {galleryImages.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">No gallery images added yet.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {galleryImages.map((imgUrl, index) => {
                      const isPrimary = primaryImage === imgUrl;
                      return (
                        <div
                          key={index}
                          className={`relative group rounded-xl border p-1 bg-white transition-all ${
                            isPrimary
                              ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Gallery ${index + 1}`}
                            className="h-20 w-full object-contain rounded-lg bg-slate-50"
                            referrerPolicy="no-referrer"
                          />

                          {/* Quick Action Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPrimaryImage(imgUrl);
                                showToast('Set as primary cover photo');
                              }}
                              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                                isPrimary
                                  ? 'bg-amber-400 text-slate-900'
                                  : 'bg-white/80 text-slate-900 hover:bg-white'
                              }`}
                              title="Set as Primary"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGalleryImages((prev) => prev.filter((_, i) => i !== index));
                                if (primaryImage === imgUrl && galleryImages.length > 1) {
                                  setPrimaryImage(galleryImages.find((g) => g !== imgUrl) || '');
                                }
                              }}
                              className="p-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-500 transition"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isPrimary && (
                            <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-md">
                              ★ Primary
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: BASIC IDENTITY & BRAND */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              
              {/* Business Entity Choice */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2">
                <label className="font-extrabold text-blue-900 uppercase tracking-wider block text-[11px]">
                  Select Business Entity (Mandatory)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                      business === 'amanot_electronics'
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="businessChoiceModal"
                      checked={business === 'amanot_electronics'}
                      onChange={() => {
                        const defaultSupp =
                          suppliers.find((s) => s.business === 'amanot_electronics') || suppliers[0];
                        setBusiness('amanot_electronics');
                        setBrand('Gree');
                        setSupplierId(defaultSupp?.id || 'supp_electro_mart');
                        setSupplierName(defaultSupp?.companyName || 'Electro Mart Bangladesh Ltd');
                      }}
                      className="hidden"
                    />
                    <span>Amanot Electronics (Gree, Konka, Haiko)</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                      business === 'amanot_enterprise'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="businessChoiceModal"
                      checked={business === 'amanot_enterprise'}
                      onChange={() => {
                        const defaultSupp =
                          suppliers.find((s) => s.business === 'amanot_enterprise') || suppliers[1];
                        setBusiness('amanot_enterprise');
                        setBrand('Haier');
                        setSupplierId(defaultSupp?.id || 'supp_haier_bd');
                        setSupplierName(defaultSupp?.companyName || 'Haier Bangladesh Industrial Ltd');
                      }}
                      className="hidden"
                    />
                    <span>Amanot Enterprise (Haier)</span>
                  </label>
                </div>
              </div>

              {/* Supplier Selection */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="font-extrabold text-slate-800 uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Supplier / Distributor
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    const found = suppliers.find((s) => s.id === e.target.value);
                    if (found) {
                      setSupplierId(found.id);
                      setSupplierName(found.companyName);
                      setBusiness(found.business);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} (Brands: {s.brandsSupplied.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* SKU & Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">SKU / Model Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GREE-18X-INV"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-mono uppercase font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Brand Name *</label>
                  <select
                    value={brand}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM_NEW_BRAND') {
                        const custom = prompt('Enter New Brand Name:');
                        if (custom) {
                          addBrand(custom);
                          setBrand(custom);
                        }
                      } else {
                        setBrand(val);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="CUSTOM_NEW_BRAND">+ Add New Brand...</option>
                  </select>
                </div>
              </div>

              {/* Full Product Name */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Full Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GREE 1.5 TON Zeno Split Inverter AC (GS-18XZNA3V)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Keep the name headline-style (big). The structured technical fields below print small on the invoice.
                </p>
              </div>

              {/* Technical Specifications */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="font-extrabold text-slate-800 uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  Technical Specifications
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">Product Model</label>
                    <input
                      type="text"
                      placeholder="GS-18XZNA3V"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">Type / Series</label>
                    <input
                      type="text"
                      placeholder="Zeno, Shimo, Charmo…"
                      value={typeSeries}
                      onChange={(e) => setTypeSeries(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">AC Type</label>
                    <input
                      type="text"
                      list="acTypeOptions"
                      placeholder="Split Inverter / Split"
                      value={acType}
                      onChange={(e) => setAcType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                    <datalist id="acTypeOptions">
                      <option value="Split Inverter" />
                      <option value="Split" />
                      <option value="Floor Standing" />
                      <option value="Cassette" />
                      <option value="Portable" />
                      <option value="Ducted Split" />
                    </datalist>
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">Capacity</label>
                    <input
                      type="text"
                      placeholder="18000 BTU / 135 LTR"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">Size</label>
                    <input
                      type="text"
                      placeholder='1.5 Ton / 32" / 8 KG'
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">Unit</label>
                    <input
                      type="text"
                      placeholder="Set / Pcs"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">
                      Install Charge (৳) <span className="font-medium text-slate-400">— blank = none</span>
                    </label>
                    <input
                      type="number"
                      placeholder="No installation"
                      value={installationCharge || ''}
                      onChange={(e) => setInstallationCharge(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">Extra Piping /ft (৳)</label>
                    <input
                      type="number"
                      placeholder="550"
                      value={extraPipingFeePerFt || ''}
                      onChange={(e) => setExtraPipingFeePerFt(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Category & Warranty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM_NEW_CAT') {
                        const custom = prompt('Enter New Category Name:');
                        if (custom) {
                          addCategory(custom);
                          setCategory(custom);
                        }
                      } else {
                        setCategory(val);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
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
                  <label className="text-slate-700 font-bold block mb-1">Official Warranty Term</label>
                  <input
                    type="text"
                    placeholder="e.g. 10 Years Compressor, 1 Year Spare Parts"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PRICING & STOCK */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Wholesale & Retail Pricing Engine (BDT)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-600 block">
                      Cost Purchase Price (৳)
                    </label>
                    <input
                      type="number"
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-slate-900 text-sm"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1">
                    <label className="text-[11px] font-extrabold text-blue-900 block">
                      Retail Selling Rate (৳)
                    </label>
                    <input
                      type="number"
                      required
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-blue-700 text-sm"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-1">
                    <label className="text-[11px] font-extrabold text-indigo-900 block">
                      Wholesale Rate (৳)
                    </label>
                    <input
                      type="number"
                      required
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-indigo-700 text-sm"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-bold flex items-center justify-between">
                  <span>Retail Profit Margin:</span>
                  <span className="font-mono text-xs">
                    ৳{(retailPrice - costPrice).toLocaleString()} (
                    {costPrice > 0 ? Math.round(((retailPrice - costPrice) / costPrice) * 100) : 0}%)
                  </span>
                </div>
              </div>

              {/* Stock Quantity & Unit */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  Inventory & Stock Control
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Current Stock Qty</label>
                    <input
                      type="number"
                      required
                      value={stockQty}
                      onChange={(e) => setStockQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Min Stock Alert</label>
                    <input
                      type="number"
                      required
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Unit Type</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-bold"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Set">Set</option>
                      <option value="Box">Box</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: STOREFRONT OPTIONS & TAGS */}
          {activeTab === 'description' && (
            <div className="space-y-5">
              
              {/* Product Tags Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <TagIcon className="w-4 h-4 text-blue-600" />
                    Product Tags & Keywords
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Used for search filters & badges
                  </span>
                </div>

                {/* Active Tags */}
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 bg-white border border-slate-200 rounded-xl">
                  {tags.length === 0 ? (
                    <span className="text-slate-400 text-xs italic">No tags added yet.</span>
                  ) : (
                    tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-900 text-xs font-bold rounded-lg border border-blue-200"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-blue-500 hover:text-rose-600 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Tag Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a tag name (e.g. Copper Condenser) and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
                  >
                    + Tag
                  </button>
                </div>

                {/* Popular Tags Quick-Pick */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Suggested Popular Tags:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_TAG_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddTag(sug)}
                        className="px-2 py-0.5 bg-slate-200/70 hover:bg-blue-100 text-slate-700 hover:text-blue-800 text-[10px] font-bold rounded-md transition"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ERP Short Description */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  ERP Short Description (Internal Notes / Invoices)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Energy saving R32 eco-refrigerant with 60% power saving"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Storefront Detailed Description Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-bold block text-xs">
                    Storefront Online Description & Features Specification
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTemplate}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] rounded-lg border border-purple-200 flex items-center gap-1 transition"
                  >
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    Auto-Generate Template
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Enter rich details for website buyers e.g. Turbo cooling, copper condensing coil, smart app connectivity, voltage stabilizer requirements..."
                  value={storefrontDescription}
                  onChange={(e) => setStorefrontDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-2xl font-medium leading-relaxed focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              {/* Featured on Website Toggle */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" />
                    Feature Product on Public Website Storefront
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    When enabled, this product is highlighted on the website homepage and store search.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeaturedOnWebsite}
                    onChange={(e) => setIsFeaturedOnWebsite(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

            </div>
          )}

          {/* Footer Action Bar */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border rounded-2xl text-slate-600 hover:bg-slate-50 font-bold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Save Product Changes' : 'Save Product to Inventory'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
