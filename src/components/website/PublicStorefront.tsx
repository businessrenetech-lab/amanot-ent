import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router';
import { BrandLogo } from '../common/BrandLogo';
import { Product } from '../../types';
import {
  Search,
  Zap,
  ShieldCheck,
  PhoneCall,
  Sparkles,
  ChevronRight,
  Send,
  X,
  CheckCircle2,
  Tv,
  Wind,
  Flame,
  LayoutGrid,
  Building2,
  Globe,
  SlidersHorizontal,
  ArrowUpRight,
  Clock,
  Check,
  Truck,
  CreditCard,
  Phone,
  HelpCircle,
  Eye,
  Info,
  BadgePercent,
  Layers,
  ArrowRight
} from 'lucide-react';

export const PublicStorefront: React.FC = () => {
  const { products, settings, addQuotation, showToast, brands, categories } = useApp();
  const { navigate } = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // "Product Details" Page / Modal state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [activeDetailPhoto, setActiveDetailPhoto] = useState<string | null>(null);

  const openProductDetails = (product: Product) => {
    setDetailProduct(product);
    setActiveDetailPhoto(product.image || product.images?.[0] || null);
  };

  // "Get a Quote" Modal state
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorAddress, setVisitorAddress] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedBrand !== 'all' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
      if (selectedCategory !== 'all' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedBrand, selectedCategory, searchQuery]);

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteProduct || !visitorName || !visitorPhone) return;

    addQuotation({
      business: quoteProduct.business,
      customerName: visitorName,
      customerPhone: visitorPhone,
      customerAddress: visitorAddress || 'Website Inquirer',
      source: 'website_inquiry',
      items: [
        {
          productId: quoteProduct.id,
          quantity: 1,
          unitPrice: quoteProduct.retailPrice
        }
      ],
      notes: visitorNotes || `Inquiry for ${quoteProduct.name}`
    });

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setQuoteProduct(null);
      setVisitorName('');
      setVisitorPhone('');
      setVisitorAddress('');
      setVisitorNotes('');
      showToast('Thank you! Your quote request was received. Our team will contact you shortly.');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* ================= TOP ANNOUNCEMENT & HOTLINE BAR ================= */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          
          <div className="flex items-center gap-4 text-[11px] font-medium overflow-x-auto w-full md:w-auto">
            <span className="flex items-center gap-1 text-emerald-400 font-bold shrink-0">
              <Sparkles className="w-3.5 h-3.5" /> Official Authorized Distributor
            </span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" /> Sat - Thu: 10:00 AM - 8:30 PM
            </span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="shrink-0 text-slate-300 font-semibold">
              Gree • Konka • Haiko • Haier
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-bold">
            <a
              href={`tel:${settings.amanotElectronicsPhone}`}
              className="flex items-center gap-1 hover:text-cyan-400 transition"
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
              <span>Electronics Hotline: {settings.amanotElectronicsPhone}</span>
            </a>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <a
              href={`tel:${settings.amanotEnterprisePhone}`}
              className="flex items-center gap-1 hover:text-emerald-400 transition hidden sm:flex"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enterprise Hotline: {settings.amanotEnterprisePhone}</span>
            </a>
          </div>

        </div>
      </div>

      {/* ================= PROPER FULL-WIDTH NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-600/20">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900 leading-none">
                  AMANOT
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                  OFFICIAL OUTLET
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Electronics & Enterprise Showroom
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-extrabold text-slate-700">
            <button
              onClick={() => { setSelectedBrand('all'); setSelectedCategory('all'); }}
              className={`hover:text-blue-600 transition ${selectedBrand === 'all' && selectedCategory === 'all' ? 'text-blue-600 font-black' : ''}`}
            >
              All Appliances
            </button>
            <button
              onClick={() => { setSelectedBrand('Gree'); setSelectedCategory('Inverter AC'); }}
              className={`hover:text-blue-600 transition ${selectedBrand === 'Gree' ? 'text-blue-600 font-black' : ''}`}
            >
              Gree Inverter ACs
            </button>
            <button
              onClick={() => { setSelectedBrand('Konka'); setSelectedCategory('Smart LED TV'); }}
              className={`hover:text-blue-600 transition ${selectedBrand === 'Konka' ? 'text-blue-600 font-black' : ''}`}
            >
              Konka 4K TVs
            </button>
            <button
              onClick={() => { setSelectedBrand('Haier'); }}
              className={`hover:text-blue-600 transition ${selectedBrand === 'Haier' ? 'text-blue-600 font-black' : ''}`}
            >
              Haier Appliances
            </button>
            <button
              onClick={() => { setSelectedCategory('Refrigerator'); }}
              className={`hover:text-blue-600 transition ${selectedCategory === 'Refrigerator' ? 'text-blue-600 font-black' : ''}`}
            >
              Refrigerators
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition active:scale-95 shadow-sm"
            >
              <Building2 className="w-4 h-4 text-slate-200" />
              <span>Staff Login</span>
            </button>
          </div>

        </div>
      </header>

      {/* ================= HERO SECTION (FULL WIDTH, PURE WHITE FIGMA STYLE) ================= */}
      <section className="bg-white border-b border-slate-200 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        
        {/* Subtle geometric background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto relative z-10 space-y-10">
          
          <div className="max-w-3xl space-y-5 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Official Genuine Warranty • Direct Factory Imports
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
              Premium Electronics <br />
              <span className="text-blue-600">Built for Lifelong Comfort.</span>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg font-normal leading-relaxed max-w-2xl">
              Discover Bangladesh's most trusted showroom for <strong className="text-slate-900 font-bold">Gree, Konka, Haiko & Haier</strong>. 
              Featuring Triple Inverter ACs, 4K Frameless Android TVs, Non-Frost French Door Refrigerators & Washing Machines with up to 12 Years Warranty.
            </p>

            {/* Value Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
              <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>100% Original Product Guarantee</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                <BadgePercent className="w-4 h-4 text-blue-600" />
                <span>0% Interest EMI Facilities Available</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Fast Showroom Pickup & Home Delivery</span>
              </div>
            </div>
          </div>

          {/* Brand Cards Grid (FIGMA INSPIRED LIGHT TILES) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            
            {/* GREE */}
            <button
              onClick={() => { setSelectedBrand('Gree'); }}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                selectedBrand === 'Gree'
                  ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black tracking-wider text-slate-900">GREE</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full">
                  Official AC
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-2">Inverter Air Conditioners</p>
              <p className="text-[11px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                Explore Gree Catalog <ArrowRight className="w-3 h-3" />
              </p>
            </button>

            {/* KONKA */}
            <button
              onClick={() => { setSelectedBrand('Konka'); }}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                selectedBrand === 'Konka'
                  ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black tracking-wider text-cyan-800">KONKA</span>
                <span className="text-[10px] bg-cyan-100 text-cyan-900 font-extrabold px-2 py-0.5 rounded-full">
                  4K Android TV
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-2">Smart TVs & Refrigerators</p>
              <p className="text-[11px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                Explore Konka Catalog <ArrowRight className="w-3 h-3" />
              </p>
            </button>

            {/* HAIKO */}
            <button
              onClick={() => { setSelectedBrand('Haiko'); }}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                selectedBrand === 'Haiko'
                  ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black tracking-wider text-amber-800">HAIKO</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                  Deep Freezer
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-2">Freezers & Frameless TVs</p>
              <p className="text-[11px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                Explore Haiko Catalog <ArrowRight className="w-3 h-3" />
              </p>
            </button>

            {/* HAIER */}
            <button
              onClick={() => { setSelectedBrand('Haier'); }}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                selectedBrand === 'Haier'
                  ? 'bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black tracking-wider text-red-700">HAIER</span>
                <span className="text-[10px] bg-red-100 text-red-900 font-extrabold px-2 py-0.5 rounded-full">
                  Triple Inverter
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-2">Fridges & Washing Machines</p>
              <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                Explore Haier Catalog <ArrowRight className="w-3 h-3" />
              </p>
            </button>

          </div>

        </div>
      </section>

      {/* ================= CATALOG SECTION ================= */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        {/* Search & Filter Toolbar (FIGMA CLEAN DESIGN) */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by model, brand (Gree, Konka, Haiko, Haier), category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Brand Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold w-full md:w-auto overflow-x-auto shadow-sm">
              <span className="text-slate-400 px-2 text-[10px] uppercase tracking-wider font-extrabold shrink-0">
                Brand:
              </span>
              {['all', ...brands].map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(b)}
                  className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                    selectedBrand.toLowerCase() === b.toLowerCase()
                      ? 'bg-slate-900 text-white font-extrabold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {b === 'all' ? 'All Brands' : b}
                </button>
              ))}
            </div>

          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-200/80">
            <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider shrink-0 mr-1">
              Category:
            </span>
            {['all', ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 border ${
                  selectedCategory.toLowerCase() === c.toLowerCase()
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                {c === 'all' ? 'All Products' : c}
              </button>
            ))}
          </div>

        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Showing {filteredProducts.length} Official Products</span>
          {(selectedBrand !== 'all' || selectedCategory !== 'all' || searchQuery) && (
            <button
              onClick={() => { setSelectedBrand('all'); setSelectedCategory('all'); setSearchQuery(''); }}
              className="text-blue-600 hover:underline font-extrabold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const isElectronics = product.business === 'amanot_electronics';
            const emiMonthly = Math.round(product.retailPrice / 12);

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-blue-500 transition-all duration-300 group hover:shadow-xl shadow-sm relative"
              >
                
                {/* Image Section */}
                <div
                  onClick={() => setDetailProduct(product)}
                  className="h-48 bg-slate-50 p-4 relative overflow-hidden flex items-center justify-center cursor-pointer border-b border-slate-100"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />

                  {/* Brand Logo Overlay */}
                  <span className="absolute top-3 left-3">
                    <BrandLogo brand={product.brand} heightClass="h-6" />
                  </span>

                  <span className={`absolute top-3 right-3 text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                    isElectronics ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {isElectronics ? 'Amanot Electronics' : 'Amanot Enterprise'}
                  </span>
                </div>

                {/* Product Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider">
                        {product.category}
                      </span>
                      {product.images && product.images.length > 1 && (
                        <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          📷 {product.images.length} Photos
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => openProductDetails(product)}
                      className="text-sm font-extrabold text-slate-900 leading-snug mt-1 group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-2"
                    >
                      {product.name}
                    </h3>

                    {/* Product Tags */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {product.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-normal">
                      {product.storefrontDescription || product.description}
                    </p>
                  </div>

                  {/* Warranty & EMI Pill */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 font-medium space-y-1">
                    <p className="flex items-center gap-1.5 text-blue-700 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                      <span>{product.warranty}</span>
                    </p>
                    {settings.showPricesOnWebsite && (
                      <p className="flex items-center gap-1.5 text-slate-500 text-[10px] font-mono">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        <span>EMI from ৳{emiMonthly.toLocaleString()}/mo (12 Mos)</span>
                      </p>
                    )}
                  </div>

                  {/* Pricing & Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        {settings.showPricesOnWebsite ? 'Official Price' : 'Price Status'}
                      </span>
                      {settings.showPricesOnWebsite ? (
                        <span className="text-lg font-black text-slate-900 font-mono">
                          ৳{product.retailPrice.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-blue-600">Call for Quote</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openProductDetails(product)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="View Specifications & Gallery"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setQuoteProduct(product)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Quote</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            );
          })}
        </div>

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20 py-12 px-4 sm:px-6 lg:px-8 text-xs">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">
                A
              </div>
              <span className="text-white font-black text-base">Amanot Electronics & Enterprise</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Authorized direct outlet and wholesale distributor for Gree, Konka, Haiko, and Haier electronics in Bangladesh. Guaranteed original replacement warranty and official factory support.
            </p>
          </div>

          <div>
            <h5 className="text-white font-black text-sm mb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              Amanot Electronics Showroom
            </h5>
            <p className="text-slate-400 leading-relaxed">{settings.amanotElectronicsAddress}</p>
            <p className="text-blue-400 font-mono font-bold mt-2">Phone: {settings.amanotElectronicsPhone}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Distributor: Gree, Konka, Haiko</p>
          </div>

          <div>
            <h5 className="text-white font-black text-sm mb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Amanot Enterprise Showroom
            </h5>
            <p className="text-slate-400 leading-relaxed">{settings.amanotEnterpriseAddress}</p>
            <p className="text-emerald-400 font-mono font-bold mt-2">Phone: {settings.amanotEnterprisePhone}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Distributor: Haier Industrial Bangladesh</p>
          </div>

        </div>

        <div className="w-full max-w-7xl mx-auto border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-2">
          <p>© {new Date().getFullYear()} Amanot Group. All rights reserved.</p>
          <p>Official Authorized Retailer & Wholesale Engine</p>
        </div>
      </footer>

      {/* ================= PRODUCT DETAILS PAGE / MODAL (FIGMA CLEAN) ================= */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  {detailProduct.brand} • {detailProduct.category}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">{detailProduct.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Model SKU: {detailProduct.sku}</p>
              </div>

              <button
                onClick={() => setDetailProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Product Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Product Gallery & Main Image */}
              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-center h-64 overflow-hidden relative">
                  <img
                    src={activeDetailPhoto || detailProduct.image}
                    alt={detailProduct.name}
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                    {detailProduct.brand} Original
                  </span>
                </div>

                {/* Gallery Thumbnails Strip */}
                {detailProduct.images && detailProduct.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {detailProduct.images.map((gImg, gIdx) => {
                      const isActive = (activeDetailPhoto || detailProduct.image) === gImg;
                      return (
                        <button
                          key={gIdx}
                          type="button"
                          onClick={() => setActiveDetailPhoto(gImg)}
                          className={`relative h-14 w-14 shrink-0 rounded-xl border p-1 bg-white transition ${
                            isActive
                              ? 'border-blue-600 ring-2 ring-blue-500/30'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={gImg}
                            alt={`Gallery ${gIdx + 1}`}
                            className="h-full w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Specifications & Price */}
              <div className="space-y-4 text-xs">
                
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">
                    Outlet & Brand Authorization
                  </p>
                  <p className="font-bold text-slate-800">
                    {detailProduct.business === 'amanot_electronics'
                      ? 'Amanot Electronics (Gree, Konka, Haiko Outlet)'
                      : 'Amanot Enterprise (Haier Official Outlet)'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    In Stock at Showroom Warehouse ({detailProduct.stockQty} {detailProduct.unit} available)
                  </p>
                </div>

                <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-1.5">
                  <p className="font-extrabold text-blue-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Official Brand Warranty
                  </p>
                  <p className="font-black text-slate-900 text-sm">{detailProduct.warranty}</p>
                  <p className="text-[11px] text-slate-600">
                    100% Genuine factory replacement parts & direct official warranty claim support.
                  </p>
                </div>

                {/* Price Breakdown */}
                {settings.showPricesOnWebsite && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-bold">Official Retail Rate</span>
                      <span className="text-xl font-black font-mono text-cyan-400">
                        ৳{detailProduct.retailPrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[11px] text-slate-300">
                      <span>0% EMI 12 Months:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ৳{Math.round(detailProduct.retailPrice / 12).toLocaleString()} / month
                      </span>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Product Tags */}
            {detailProduct.tags && detailProduct.tags.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
                  Tags:
                </span>
                <div className="flex flex-wrap gap-1">
                  {detailProduct.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-lg border border-slate-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Storefront Description */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Storefront Overview & Features
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {detailProduct.storefrontDescription || detailProduct.description}
              </p>
              {detailProduct.storefrontDescription && detailProduct.description && (
                <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                  Note: {detailProduct.description}
                </p>
              )}
            </div>

            {/* Action Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={`tel:${detailProduct.business === 'amanot_electronics' ? settings.amanotElectronicsPhone : settings.amanotEnterprisePhone}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-extrabold text-xs hover:bg-slate-50 transition text-center flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-blue-600" />
                <span>Call Showroom Direct</span>
              </a>

              <button
                onClick={() => {
                  const p = detailProduct;
                  setDetailProduct(null);
                  setQuoteProduct(p);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Request Best Written Quote</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= "GET A QUOTE" MODAL (FIGMA CLEAN) ================= */}
      {quoteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 my-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                  Request Best Price Quote
                </span>
                <h3 className="text-base font-black text-slate-900">{quoteProduct.name}</h3>
              </div>
              <button
                onClick={() => setQuoteProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="text-lg font-black text-slate-900">Inquiry Submitted Successfully!</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our sales manager from {quoteProduct.business === 'amanot_electronics' ? 'Amanot Electronics' : 'Amanot Enterprise'} will call your phone number directly within 15 minutes with the best wholesale or retail discount rate.
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-4 text-xs font-medium">
                
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="text-[11px] text-slate-500">Selected Product:</p>
                  <p className="font-bold text-blue-900">{quoteProduct.name} ({quoteProduct.brand})</p>
                  <p className="text-[10px] text-slate-500 font-mono">SKU: {quoteProduct.sku}</p>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01712345678"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Delivery City / Location (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Uttara, Dhaka"
                    value={visitorAddress}
                    onChange={(e) => setVisitorAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Quantity or Special Requirements</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Need 3 units for office or installment quote..."
                    value={visitorNotes}
                    onChange={(e) => setVisitorNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-98"
                >
                  Submit Official Quote Request
                </button>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
