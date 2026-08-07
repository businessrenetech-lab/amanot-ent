import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { Product, BusinessType, PaymentMode, SaleInvoice } from '../../types';
import { exportCustomerInvoicePDF } from '../../utils/invoicePdfExport';
import { getCompatiblePaymentAccounts, resolvePaymentAccount } from '../../utils/paymentAccounts';
import { findCustomerByPhone, searchCustomersByPhone, phonesMatch } from '../../utils/phone';
import { searchProducts, normalizeSearchText } from '../../utils/productSearch';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  Smartphone,
  MapPin,
  CreditCard,
  Building2,
  Tag,
  CheckCircle2,
  Zap,
  Sparkles,
  Calculator,
  ShieldCheck,
  Maximize2,
  Minimize2,
  X,
  RotateCcw,
  FileText,
  Clock,
  Edit3,
  AlertCircle,
  Wrench,
  ChevronDown,
  Landmark,
  Layers
} from 'lucide-react';

/**
 * A product is only installable when an installation charge is actually configured
 * on it. Items like refrigerators and TVs carry no charge, so POS must not add one.
 */
const getInstallationCharge = (product: Product): number =>
  product.installationCharge && product.installationCharge > 0 ? product.installationCharge : 0;

const isInstallable = (product: Product): boolean => getInstallationCharge(product) > 0;

interface CartItem {
  product: Product;
  quantity: number;
  priceType: 'retail' | 'wholesale';
  unitPrice: number;
  discount: number;
  includeInstallationFee: boolean;
  installationFee: number;
  extraPipingFt: number;
  extraPipingFee: number;
}

export const POSView: React.FC = () => {
  const {
    products,
    customers,
    sales,
    addSale,
    updateSale,
    deleteSale,
    accounts,
    activeBusiness,
    currentUser,
    settings,
    brands,
    categories,
    installmentPlans,
    editingSaleInvoice,
    setEditingSaleInvoice,
    posPrefill,
    setPosPrefill,
    setActiveReceiptInvoice,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalPriceType, setGlobalPriceType] = useState<'retail' | 'wholesale'>('retail');

  // Customer form state
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  // CRM record linked to this sale (set when the typed number matches an existing customer)
  const [linkedCustomerId, setLinkedCustomerId] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Payment state
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  // Split tender: pay one invoice with multiple methods (e.g. part cash + part bKash)
  const [splitMode, setSplitMode] = useState<boolean>(false);
  const [splitRows, setSplitRows] = useState<
    Array<{ id: string; mode: PaymentMode; accountId: string; amount: number; paymentNumber?: string }>
  >([]);
  const [customerPaymentNumber, setCustomerPaymentNumber] = useState('');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');

  // Special (referral) discount — internal only, never printed on the customer invoice
  const [showSpDiscount, setShowSpDiscount] = useState<boolean>(false);
  const [spDiscountMode, setSpDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [spDiscountInput, setSpDiscountInput] = useState<number>(0);
  const [referralName, setReferralName] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isCustomPaid, setIsCustomPaid] = useState<boolean>(false);
  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [installmentMonths, setInstallmentMonths] = useState<number>(3);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  // Drafts Modal state
  const [showDraftsModal, setShowDraftsModal] = useState<boolean>(false);

  // Load editing sale invoice into cart state if provided by context
  useEffect(() => {
    if (editingSaleInvoice) {
      setCustomerName(editingSaleInvoice.customerName || '');
      setCustomerPhone(editingSaleInvoice.customerPhone || '');
      setCustomerAddress(editingSaleInvoice.customerAddress || '');
      setLinkedCustomerId(
        editingSaleInvoice.customerId ||
          findCustomerByPhone(customers, editingSaleInvoice.customerPhone || '')?.id ||
          ''
      );
      setOverallDiscount(editingSaleInvoice.discountTotal || 0);
      const loadedSp = editingSaleInvoice.specialDiscount || 0;
      setShowSpDiscount(loadedSp > 0);
      setSpDiscountMode(editingSaleInvoice.specialDiscountMode || 'amount');
      setSpDiscountInput(
        editingSaleInvoice.specialDiscountMode === 'percent'
          ? editingSaleInvoice.specialDiscountRate || 0
          : loadedSp
      );
      setReferralName(editingSaleInvoice.referralName || '');
      setPaidAmount(editingSaleInvoice.paidAmount || 0);
      setIsCustomPaid(true);
      setPaymentMode(editingSaleInvoice.paymentMode === 'bkash_nagad' ? 'bkash' : editingSaleInvoice.paymentMode || 'cash');
      setSelectedAccountId(editingSaleInvoice.accountId || '');
      setCustomerPaymentNumber(editingSaleInvoice.customerPaymentNumber || '');
      // Restore a split tender so appended edits keep the multi-method breakdown
      if (editingSaleInvoice.paymentSplits && editingSaleInvoice.paymentSplits.length > 1) {
        setSplitMode(true);
        setSplitRows(
          editingSaleInvoice.paymentSplits.map((s, i) => ({
            id: `split_load_${i}`,
            mode: s.paymentMode,
            accountId: s.accountId || '',
            amount: s.amount,
            paymentNumber: s.paymentNumber || ''
          }))
        );
      } else {
        setSplitMode(false);
        setSplitRows([]);
      }
      setIsInstallment(!!editingSaleInvoice.isInstallment);
      setSaleNotes(editingSaleInvoice.notes || '');
      // Keep the price mode matching the invoice so appended items price correctly
      setGlobalPriceType(editingSaleInvoice.saleType === 'wholesale' ? 'wholesale' : 'retail');

      const loadedCartItems: CartItem[] = editingSaleInvoice.items.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const fallbackProduct: Product = prod || {
          id: item.productId,
          sku: item.productId,
          name: item.productName,
          business: editingSaleInvoice.business,
          brand: item.brand || 'Generic',
          category: item.category || 'General',
          model: item.model,
          typeSeries: item.typeSeries,
          capacity: item.capacity,
          costPrice: item.costPrice || 0,
          retailPrice: item.unitPrice,
          wholesalePrice: item.unitPrice,
          stockQty: 999,
          minStockAlert: 1,
          unit: 'Pcs'
        };

        return {
          product: fallbackProduct,
          quantity: item.quantity,
          priceType: item.priceType || 'retail',
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          // Installation fee is no longer charged on POS sales / customer invoices
          includeInstallationFee: false,
          installationFee: 0,
          extraPipingFt: 0,
          extraPipingFee: 0
        };
      });

      setCart(loadedCartItems);
    }
  }, [editingSaleInvoice, products]);

  // One-shot seed: open the POS prefilled with a customer + price mode
  // (used by "New Wholesale Invoice" in the wholesale ledger).
  useEffect(() => {
    if (!posPrefill || editingSaleInvoice) return;
    const cust = customers.find((c) => c.id === posPrefill.customerId);
    if (cust) {
      setLinkedCustomerId(cust.id);
      setCustomerPhone(cust.phone);
      setCustomerName(cust.name);
      setCustomerAddress(cust.address || '');
    }
    setGlobalPriceType(posPrefill.priceType);
    showToast(
      `${posPrefill.priceType === 'wholesale' ? 'Wholesale' : 'Retail'} sale started${cust ? ` for ${cust.name}` : ''}.`
    );
    setPosPrefill(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posPrefill]);

  // Cancel Editing handler
  const handleCancelEditing = () => {
    setEditingSaleInvoice(null);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setLinkedCustomerId('');
    setOverallDiscount(0);
    setShowSpDiscount(false);
    setSpDiscountInput(0);
    setReferralName('');
    setPaidAmount(0);
    setIsCustomPaid(false);
    setIsInstallment(false);
    setCustomerPaymentNumber('');
    setSaleNotes('');
  };

  // Keyboard shortcut listener for Esc key to exit full screen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  useEffect(() => {
    if (cart.length <= 2) setIsCartExpanded(false);
  }, [cart.length]);

  // Compute total sales quantity per product to rank top selling items
  const productSalesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (sales && sales.length > 0) {
      sales.forEach((s) => {
        if (!s.isDraft && s.items && s.items.length > 0) {
          s.items.forEach((item) => {
            map[item.productId] = (map[item.productId] || 0) + item.quantity;
          });
        }
      });
    }
    return map;
  }, [sales]);

  // Draft Invoices list
  const draftInvoices = useMemo(() => {
    return sales.filter((s) => s.isDraft);
  }, [sales]);

  // Filter & sort products based on active business scope, search query, and top selling count
  const filteredProducts = useMemo(() => {
    const scoped = products.filter((p) => {
      // Check business filter
      if (activeBusiness !== 'all' && p.business !== activeBusiness) return false;
      if (currentUser.assignedBusiness !== 'all' && p.business !== currentUser.assignedBusiness) return false;

      // Brand filter
      if (selectedBrand !== 'all' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;

      // Category filter
      if (selectedCategory !== 'all' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;

      return true;
    });

    const isSearching = searchQuery.trim().length > 0;
    const matches = searchProducts(scoped, searchQuery);

    // While searching, relevance leads; ties fall back to best sellers and stock
    return matches
      .sort((a, b) => {
        if (isSearching && b.score !== a.score) return b.score - a.score;

        const salesA = productSalesCountMap[a.product.id] || 0;
        const salesB = productSalesCountMap[b.product.id] || 0;
        if (salesB !== salesA) return salesB - salesA;

        if (a.product.stockQty > 0 && b.product.stockQty <= 0) return -1;
        if (a.product.stockQty <= 0 && b.product.stockQty > 0) return 1;

        return a.product.name.localeCompare(b.product.name);
      })
      .map((m) => m.product);
  }, [products, activeBusiness, currentUser, selectedBrand, selectedCategory, searchQuery, productSalesCountMap]);

  // Handle phone auto-lookup for existing customer
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);

    const existing = findCustomerByPhone(customers, val);
    if (existing) {
      // Full number typed and it belongs to a known customer — pull their details in
      setLinkedCustomerId(existing.id);
      setCustomerName(existing.name);
      setCustomerAddress(existing.address || '');
      setShowCustomerSuggestions(false);
      return;
    }

    // Number no longer matches the linked record — unlink so we don't post against the wrong CRM profile
    if (linkedCustomerId) {
      const linked = customers.find((c) => c.id === linkedCustomerId);
      if (!linked || !phonesMatch(linked.phone, val)) setLinkedCustomerId('');
    }
    setShowCustomerSuggestions(true);
  };

  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) return;

    const defaultInstFee = getInstallationCharge(product);

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx > -1) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: Math.min(product.stockQty, item.quantity + 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          priceType: globalPriceType,
          unitPrice: globalPriceType === 'retail' ? product.retailPrice : product.wholesalePrice,
          discount: 0,
          // Installation fee is not charged on POS sales / customer invoices
          includeInstallationFee: false,
          installationFee: 0,
          extraPipingFt: 0,
          extraPipingFee: 0
        }
      ];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: Math.min(item.product.stockQty, newQty) };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const setItemPriceType = (productId: string, type: 'retail' | 'wholesale') => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            priceType: type,
            unitPrice: type === 'retail' ? item.product.retailPrice : item.product.wholesalePrice
          };
        }
        return item;
      })
    );
  };

  const toggleItemInstallation = (productId: string, include: boolean) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const defaultFee = getInstallationCharge(item.product);
          if (defaultFee <= 0) return item; // nothing to charge for this product
          return {
            ...item,
            includeInstallationFee: include,
            installationFee: include ? defaultFee : 0,
            extraPipingFt: include ? item.extraPipingFt : 0,
            extraPipingFee: include ? item.extraPipingFt * (item.product.extraPipingFeePerFt || 550) : 0
          };
        }
        return item;
      })
    );
  };

  const updateItemExtraPipingFt = (productId: string, ft: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const perFtRate = item.product.extraPipingFeePerFt || 550;
          const fee = ft * perFtRate;
          return {
            ...item,
            extraPipingFt: ft,
            extraPipingFee: fee
          };
        }
        return item;
      })
    );
  };

  // Switch all items in cart between retail / wholesale
  const toggleGlobalPriceType = (type: 'retail' | 'wholesale') => {
    setGlobalPriceType(type);
    setCart((prev) =>
      prev.map((item) => ({
        ...item,
        priceType: type,
        unitPrice: type === 'retail' ? item.product.retailPrice : item.product.wholesalePrice
      }))
    );
  };

  // Calculations
  const productsSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0);
  }, [cart]);

  const installationFeeTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (!item.includeInstallationFee) return sum;
      return sum + (item.installationFee || 0) + (item.extraPipingFee || 0);
    }, 0);
  }, [cart]);

  // Resolved discount in BDT (supports flat ৳ or % of the pre-discount bill)
  const discountAmount = useMemo(() => {
    const base = productsSubtotal + installationFeeTotal;
    if (discountMode === 'percent') {
      return Math.round((base * Math.min(100, Math.max(0, overallDiscount || 0))) / 100);
    }
    return Math.max(0, overallDiscount || 0);
  }, [discountMode, overallDiscount, productsSubtotal, installationFeeTotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, productsSubtotal + installationFeeTotal - discountAmount);
  }, [productsSubtotal, installationFeeTotal, discountAmount]);

  // Referral payout we absorb. It never reduces what the customer pays.
  const specialDiscountAmount = useMemo(() => {
    if (!showSpDiscount || spDiscountInput <= 0) return 0;
    const raw =
      spDiscountMode === 'percent' ? (grandTotal * spDiscountInput) / 100 : spDiscountInput;
    return Math.max(0, Math.min(grandTotal, Math.round(raw)));
  }, [showSpDiscount, spDiscountInput, spDiscountMode, grandTotal]);

  // What the business actually keeps once the referral is paid out
  const netSalesAfterReferral = grandTotal - specialDiscountAmount;

  // Keep paidAmount in sync with grandTotal unless cashier typed custom paid amount
  useEffect(() => {
    if (!isCustomPaid && !splitMode) {
      setPaidAmount(grandTotal);
    }
  }, [grandTotal, isCustomPaid, splitMode]);

  // In split mode the paid figure is driven by the sum of the tender rows.
  const splitTotal = useMemo(
    () => splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [splitRows]
  );
  const effectivePaidAmount = splitMode ? splitTotal : paidAmount;

  // Detect predominant business for this sale
  const determinedBusiness: BusinessType = useMemo(() => {
    if (cart.length === 0) return activeBusiness === 'amanot_enterprise' ? 'amanot_enterprise' : 'amanot_electronics';
    const hasEnterprise = cart.some((i) => i.product.business === 'amanot_enterprise');
    return hasEnterprise ? 'amanot_enterprise' : 'amanot_electronics';
  }, [cart, activeBusiness]);

  const compatiblePaymentAccounts = useMemo(
    () => getCompatiblePaymentAccounts(accounts, paymentMode, determinedBusiness),
    [accounts, paymentMode, determinedBusiness]
  );

  useEffect(() => {
    const resolved = resolvePaymentAccount(accounts, paymentMode, determinedBusiness, selectedAccountId);
    setSelectedAccountId(resolved?.id || '');
  }, [accounts, paymentMode, determinedBusiness, selectedAccountId]);

  // --- Split tender helpers ---
  const defaultAccountFor = (mode: PaymentMode): string =>
    resolvePaymentAccount(accounts, mode, determinedBusiness)?.id || '';

  const makeSplitRow = (mode: PaymentMode, amount = 0) => ({
    id: `split_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    mode,
    accountId: defaultAccountFor(mode),
    amount,
    paymentNumber: ''
  });

  const enableSplitMode = () => {
    setSplitMode(true);
    setIsInstallment(false);
    setIsCustomPaid(true);
    // Seed with the current method carrying the full total, plus an empty bKash row.
    const first = paymentMode === 'installment' ? 'cash' : paymentMode;
    setSplitRows([makeSplitRow(first, grandTotal), makeSplitRow('bkash', 0)]);
  };

  const disableSplitMode = () => {
    setSplitMode(false);
    setSplitRows([]);
    setIsCustomPaid(false);
  };

  const addSplitRow = () => setSplitRows((prev) => [...prev, makeSplitRow('cash', 0)]);
  const removeSplitRow = (id: string) =>
    setSplitRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  const updateSplitRow = (
    id: string,
    patch: Partial<{ mode: PaymentMode; accountId: string; amount: number; paymentNumber: string }>
  ) =>
    setSplitRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        // When the method changes, re-point the account to that method's default.
        if (patch.mode && patch.mode !== r.mode) next.accountId = defaultAccountFor(patch.mode);
        return next;
      })
    );

  // Drop the remaining unpaid balance into the given split row.
  const fillRemainingInto = (id: string) => {
    const others = splitRows.filter((r) => r.id !== id).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    updateSplitRow(id, { amount: Math.max(0, grandTotal - others) });
  };

  const dueAmount = Math.max(0, grandTotal - effectivePaidAmount);

  // Check editing permission
  const isEditingPostedSale = editingSaleInvoice && !editingSaleInvoice.isDraft;
  // Wholesale invoices are continuation ledgers — staff may append items to them.
  // Retail posted invoices still require a Super Admin to edit.
  const isEditingRestricted =
    isEditingPostedSale &&
    editingSaleInvoice?.saleType !== 'wholesale' &&
    currentUser.role !== 'super_admin';

  const handleCheckout = (isDraftSave: boolean = false) => {
    if (cart.length === 0) return;

    if (isEditingRestricted) {
      showToast('Permission Denied: Posted sales can only be modified by Super Admin.');
      return;
    }

    // --- Split tender path: settle one invoice across multiple methods ---
    let splitPayload:
      | Array<{ paymentMode: PaymentMode; accountId: string; amount: number; paymentNumber?: string }>
      | undefined;
    if (splitMode && !isDraftSave) {
      const funded = splitRows.filter((r) => (Number(r.amount) || 0) > 0);
      if (funded.length < 2) {
        showToast('Split payment needs at least two funded methods — or turn off split.');
        return;
      }
      for (const r of funded) {
        if (!r.accountId) {
          showToast(`Choose an account for the ${r.mode.replace('_', ' ')} portion.`);
          return;
        }
        if (['bkash', 'nagad', 'rocket'].includes(r.mode)) {
          const digits = (r.paymentNumber || '').replace(/\D/g, '');
          const normalized = digits.startsWith('880') ? `0${digits.slice(3)}` : digits;
          if (normalized.length !== 11) {
            showToast(`Enter the customer's valid 11-digit ${r.mode} number for that portion.`);
            return;
          }
        }
      }
      if (splitTotal > grandTotal) {
        showToast(`Split total ৳${splitTotal.toLocaleString()} exceeds the grand total. Adjust the amounts.`);
        return;
      }
      splitPayload = funded.map((r) => {
        const digits = (r.paymentNumber || '').replace(/\D/g, '');
        const normalized = digits.startsWith('880') ? `0${digits.slice(3)}` : digits;
        return {
          paymentMode: r.mode,
          accountId: r.accountId,
          amount: Number(r.amount),
          paymentNumber: ['bkash', 'nagad', 'rocket'].includes(r.mode) ? normalized : undefined
        };
      });
    }

    // Primary method/account = the largest tender in a split, else the single selection.
    const primaryTender = splitPayload ? [...splitPayload].sort((a, b) => b.amount - a.amount)[0] : undefined;
    const effectivePaymentMode: PaymentMode = splitPayload
      ? primaryTender!.paymentMode
      : isInstallment
      ? 'installment'
      : paymentMode;
    const targetAccount = isDraftSave
      ? undefined
      : splitPayload
      ? accounts.find((a) => a.id === primaryTender!.accountId)
      : resolvePaymentAccount(accounts, effectivePaymentMode, determinedBusiness, selectedAccountId);
    if (!isDraftSave && !targetAccount) {
      showToast(`Add an active ${effectivePaymentMode.replace('_', ' ')} account before completing this sale.`);
      return;
    }

    const isMobileWallet = !splitPayload && ['bkash', 'nagad', 'rocket'].includes(effectivePaymentMode);
    const walletDigits = customerPaymentNumber.replace(/\D/g, '');
    const normalizedWalletNumber = walletDigits.startsWith('880')
      ? `0${walletDigits.slice(3)}`
      : walletDigits;
    if (!isDraftSave && isMobileWallet && normalizedWalletNumber.length !== 11) {
      showToast(`Enter the customer's valid 11-digit ${effectivePaymentMode} number.`);
      return;
    }
    // A split's wallet number (for SMS/receipt) comes from its mfs portion.
    const splitWalletNumber = splitPayload?.find((s) => s.paymentNumber)?.paymentNumber;

    const formattedItems = cart.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      priceType: i.priceType,
      unitPrice: i.unitPrice,
      discount: i.discount,
      includeInstallationFee: i.includeInstallationFee,
      installationFee: i.includeInstallationFee ? i.installationFee : 0,
      extraPipingFt: i.extraPipingFt,
      extraPipingFee: i.extraPipingFee
    }));

    let completedInvoice: SaleInvoice;

    if (editingSaleInvoice) {
      // Update existing sale or draft
      completedInvoice = updateSale(editingSaleInvoice.id, {
        business: determinedBusiness,
        customerId: linkedCustomerId,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || '01700000000',
        customerAddress: customerAddress.trim() || 'Showroom Counter',
        items: formattedItems,
        discountTotal: discountAmount,
        specialDiscount: specialDiscountAmount,
        specialDiscountMode: specialDiscountAmount > 0 ? spDiscountMode : undefined,
        specialDiscountRate:
          specialDiscountAmount > 0 && spDiscountMode === 'percent' ? spDiscountInput : undefined,
        referralName: specialDiscountAmount > 0 ? referralName.trim() || undefined : undefined,
        taxAmount: 0,
        paidAmount: isDraftSave ? 0 : effectivePaidAmount,
        paymentMode: effectivePaymentMode,
        accountId: targetAccount?.id,
        paymentSplits: splitPayload,
        customerPaymentNumber: isMobileWallet ? normalizedWalletNumber : splitWalletNumber,
        isInstallment: splitPayload ? false : isInstallment,
        installmentMonths: !splitPayload && isInstallment ? installmentMonths : undefined,
        downPayment: !splitPayload && isInstallment ? downPayment : undefined,
        notes: saleNotes,
        isDraft: isDraftSave,
        saleType: editingSaleInvoice?.saleType ?? (globalPriceType === 'wholesale' ? 'wholesale' : 'retail')
      });
      setEditingSaleInvoice(null);
    } else {
      // Create new sale or new draft
      completedInvoice = addSale({
        business: determinedBusiness,
        customerId: linkedCustomerId,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || '01700000000',
        customerAddress: customerAddress.trim() || 'Showroom Counter',
        items: formattedItems,
        discountTotal: discountAmount,
        specialDiscount: specialDiscountAmount,
        specialDiscountMode: specialDiscountAmount > 0 ? spDiscountMode : undefined,
        specialDiscountRate:
          specialDiscountAmount > 0 && spDiscountMode === 'percent' ? spDiscountInput : undefined,
        referralName: specialDiscountAmount > 0 ? referralName.trim() || undefined : undefined,
        taxAmount: 0,
        paidAmount: isDraftSave ? 0 : effectivePaidAmount,
        paymentMode: effectivePaymentMode,
        accountId: targetAccount?.id,
        paymentSplits: splitPayload,
        customerPaymentNumber: isMobileWallet ? normalizedWalletNumber : splitWalletNumber,
        isInstallment: splitPayload ? false : isInstallment,
        installmentMonths: !splitPayload && isInstallment ? installmentMonths : undefined,
        downPayment: !splitPayload && isInstallment ? downPayment : undefined,
        notes: saleNotes,
        isDraft: isDraftSave,
        saleType: editingSaleInvoice?.saleType ?? (globalPriceType === 'wholesale' ? 'wholesale' : 'retail')
      });
    }

    if (!isDraftSave) {
      const installmentPlan = installmentPlans.find(
        (plan) => plan.id === completedInvoice.installmentPlanId || plan.invoiceId === completedInvoice.id
      );
      exportCustomerInvoicePDF(completedInvoice, settings, 'bw', installmentPlan);
      setActiveReceiptInvoice(null);
    }

    // Reset POS cart for next sale
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setLinkedCustomerId('');
    setOverallDiscount(0);
    setShowSpDiscount(false);
    setSpDiscountInput(0);
    setReferralName('');
    setPaidAmount(0);
    setIsCustomPaid(false);
    setDownPayment(0);
    setIsInstallment(false);
    setCustomerPaymentNumber('');
    setSplitMode(false);
    setSplitRows([]);
    setIsCartExpanded(false);
    setSaleNotes('');
  };

  // CRM record currently attached to this sale
  const linkedCustomer = useMemo(
    () => customers.find((c) => c.id === linkedCustomerId) || null,
    [customers, linkedCustomerId]
  );

  // Partial-number matches shown as a pick list while the number is being typed
  const customerSuggestions = useMemo(() => {
    if (linkedCustomer) return [];
    return searchCustomersByPhone(customers, customerPhone);
  }, [customers, customerPhone, linkedCustomer]);

  // Latest open wholesale invoice for the entered phone — offered as "continue & add items".
  const openWholesaleInvoice = useMemo(() => {
    if (editingSaleInvoice) return null; // already editing something
    const phone = customerPhone.trim();
    if (phone.replace(/\D/g, '').length < 6) return null;
    const matches = sales.filter(
      (s) => !s.isDraft && s.saleType === 'wholesale' && phonesMatch(s.customerPhone, phone)
    );
    if (matches.length === 0) return null;
    return matches
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  }, [customerPhone, sales, editingSaleInvoice]);

  const handleApplyMatchedCustomer = (c: typeof customers[0]) => {
    setLinkedCustomerId(c.id);
    setCustomerPhone(c.phone);
    setCustomerName(c.name);
    setCustomerAddress(c.address || '');
    setShowCustomerSuggestions(false);
  };

  const handleClearLinkedCustomer = () => {
    setLinkedCustomerId('');
    setCustomerName('');
    setCustomerAddress('');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Tolerant compare so a scanned or hand-typed code matches however it is punctuated
      const q = normalizeSearchText(searchQuery);
      const exactSkuMatch = filteredProducts.find(
        (p) => normalizeSearchText(p.sku) === q || (p.model && normalizeSearchText(p.model) === q)
      );
      if (exactSkuMatch && exactSkuMatch.stockQty > 0) {
        addToCart(exactSkuMatch);
        setSearchQuery('');
      } else if (filteredProducts.length === 1 && filteredProducts[0].stockQty > 0) {
        addToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  const panelBg = 'bg-white border-slate-200';
  const fieldCls = 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400';
  const chipCls = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
  // Checkout terminal is always dark for a premium, consistent POS look.
  const termField = 'bg-slate-800/70 border-slate-700 text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div
      className={
        isMaximized
          ? 'fixed inset-0 z-50 bg-slate-950 text-slate-100 p-3 sm:p-4 overflow-hidden flex flex-col gap-3 font-sans animate-in fade-in duration-200'
          : 'flex flex-col gap-3 font-sans h-[calc(100vh-6.5rem)] min-h-[600px] overflow-hidden'
      }
    >
      {/* Maximized Fullscreen Top Bar Header */}
      {isMaximized && (
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 px-4 rounded-2xl shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-md">
              ⚡
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                Amanot Fullscreen Cashier Terminal
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  LIVE POS
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Staff: <strong className="text-slate-200">{currentUser.name}</strong> • Business:{' '}
                <strong className="text-blue-400 uppercase">
                  {activeBusiness === 'all' ? 'All Businesses (Electronics & Enterprise)' : activeBusiness}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden md:inline-block">
              Press <kbd className="bg-slate-800 text-slate-200 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]">ESC</kbd> to exit
            </span>
            <button
              onClick={() => setIsMaximized(false)}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-md active:scale-95"
            >
              <Minimize2 className="w-4 h-4" />
              Exit Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Editing Sale Banner Notice */}
      {editingSaleInvoice && (
        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 shrink-0 ${
          editingSaleInvoice.isDraft
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-800'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <Edit3 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Editing {editingSaleInvoice.isDraft ? 'Draft Sale' : 'Posted Sale Invoice'}:{' '}
              <strong className="font-mono underline">{editingSaleInvoice.id}</strong> ({editingSaleInvoice.customerName})
            </span>
            {isEditingPostedSale && (
              <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded font-extrabold border border-purple-300">
                SUPER ADMIN EDIT MODE
              </span>
            )}
          </div>

          <button
            onClick={handleCancelEditing}
            className="px-3 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold rounded-lg transition shrink-0"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {/* Main Body Wrapper */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-4 min-h-0 overflow-hidden">

        {/* ============================= LEFT: Product Catalog ============================= */}
        <div className={`flex-1 flex flex-col gap-3 min-h-0 overflow-hidden ${
          isMaximized ? 'bg-slate-100 border border-slate-200 rounded-2xl p-3' : ''
        }`}>

          {/* Top Search & Filter Bar */}
          <div className={`${panelBg} p-3 rounded-2xl shadow-sm border space-y-2.5 shrink-0`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder='Search "gree 2 ton ac", SKU, model, series or capacity…  (Enter to add exact match)'
                  value={searchQuery}
                  onKeyDown={handleSearchKeyDown}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-8 py-2.5 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${fieldCls}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Price Type Selector Toggle */}
              <div className="flex items-center p-1 rounded-xl text-xs font-semibold shrink-0 border bg-slate-100 border-slate-200">
                <button
                  onClick={() => toggleGlobalPriceType('retail')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    globalPriceType === 'retail' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-slate-500'
                  }`}
                >
                  Retail
                </button>
                <button
                  onClick={() => toggleGlobalPriceType('wholesale')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    globalPriceType === 'wholesale' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-slate-500'
                  }`}
                >
                  Wholesale
                </button>
              </div>

              {/* Saved Drafts Button */}
              <button
                type="button"
                onClick={() => setShowDraftsModal(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-bold text-xs rounded-xl border border-amber-500/30 transition shrink-0"
              >
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Drafts ({draftInvoices.length})</span>
              </button>

              {/* Maximize / Minimize Controller Button */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-xl transition shrink-0 bg-slate-900 hover:bg-slate-800 text-amber-400"
                title={isMaximized ? 'Exit fullscreen' : 'Maximize POS for full screen cashier layout'}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isMaximized ? 'Minimize' : 'Fullscreen'}</span>
              </button>
            </div>

            {/* Quick Filters: Brands & Categories */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 text-xs">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider shrink-0">Brands:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {['all', ...brands].map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                      selectedBrand.toLowerCase() === b.toLowerCase() ? 'bg-blue-600 text-white shadow-sm' : chipCls
                    }`}
                  >
                    {b === 'all' ? 'All Brands' : b}
                  </button>
                ))}
              </div>

              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider shrink-0 ml-2">Category:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {['all', ...categories].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                      selectedCategory.toLowerCase() === c.toLowerCase() ? 'bg-indigo-600 text-white shadow-sm' : chipCls
                    }`}
                  >
                    {c === 'all' ? 'All Categories' : c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto pr-1 grid gap-3 auto-rows-max ${
              isMaximized
                ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
            }`}
          >
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center space-y-2">
                <Search className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm font-bold text-slate-400">No products match your search/filter</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBrand('all');
                    setSelectedCategory('all');
                  }}
                  className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-500"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isElectronics = product.business === 'amanot_electronics';
                const price = globalPriceType === 'retail' ? product.retailPrice : product.wholesalePrice;
                const inCart = cart.find((i) => i.product.id === product.id);
                const salesQty = productSalesCountMap[product.id] || 0;
                const lowStock = product.stockQty <= product.minStockAlert;

                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`rounded-2xl p-3 border transition-all duration-150 cursor-pointer flex flex-col group relative overflow-hidden ${
                      product.stockQty <= 0
                        ? 'opacity-50 border-rose-200 bg-rose-50/10 pointer-events-none'
                        : inCart
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 text-slate-900'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-bl-lg z-10">
                        {inCart.quantity} in cart
                      </span>
                    )}

                    {/* Top Row: Business dot + brand + sold */}
                    <div className="flex justify-between items-center gap-1.5 mb-1.5">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${isElectronics ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        {isElectronics ? 'Electronics' : 'Enterprise'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {salesQty > 0 && (
                          <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> {salesQty}
                          </span>
                        )}
                        <BrandLogo brand={product.brand} heightClass="h-5" />
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="font-bold text-[13px] leading-snug line-clamp-2 transition-colors text-slate-900 group-hover:text-blue-700">
                      {product.name}
                    </h3>

                    {/* Specs pills */}
                    {(product.model || product.typeSeries || product.capacity) && (
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        {product.model && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
                            {product.model}
                          </span>
                        )}
                        {product.typeSeries && (
                          <span className="bg-blue-500/10 text-blue-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20">
                            {product.typeSeries}
                          </span>
                        )}
                        {product.capacity && (
                          <span className="bg-amber-500/10 text-amber-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
                            {product.capacity}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer: price + stock + add */}
                    <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold uppercase">
                          {globalPriceType}
                        </span>
                        <span className="text-base font-black font-mono text-slate-900">
                          ৳{price.toLocaleString()}
                        </span>
                        <span className={`text-[10px] font-bold block mt-0.5 ${lowStock ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {product.stockQty > 0 ? `${product.stockQty} ${product.unit} left` : 'Out of stock'}
                        </span>
                      </div>
                      <button
                        disabled={product.stockQty <= 0}
                        className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl transition shadow-sm active:scale-95 ${
                          inCart ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {inCart ? 'Added' : 'Add'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================= RIGHT: Checkout Terminal (Bright Light Theme) ============================= */}
        <aside className="w-full lg:w-[400px] xl:w-[440px] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden shrink-0 min-h-0 text-slate-900">
          {/* Terminal Header */}
          <div className="p-3 px-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h2 className="font-extrabold text-xs tracking-wider uppercase">Checkout Terminal</h2>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={() => {
                    setCart([]);
                    setIsCartExpanded(false);
                  }}
                  className="text-[10px] text-rose-300 hover:text-rose-200 font-bold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              )}
              {cart.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setIsCartExpanded((expanded) => !expanded)}
                  aria-expanded={isCartExpanded}
                  title={isCartExpanded ? 'Return to checkout' : 'Show full cart list'}
                  className="text-[10px] font-mono font-bold bg-blue-950 hover:bg-blue-900 text-blue-200 px-2 py-0.5 rounded border border-blue-700 flex items-center gap-1 transition"
                >
                  {cart.length} items
                  <ChevronDown className={`w-3 h-3 transition-transform ${isCartExpanded ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-200 px-2 py-0.5 rounded border border-blue-800">
                  {cart.length} item{cart.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Cart Items (Bright, Crisp Cards with Full Product Names) */}
          <div className={`p-2.5 overflow-y-auto space-y-2 bg-slate-50/50 ${
            isCartExpanded ? 'flex-1 min-h-0' : 'shrink-0 h-[190px]'
          }`}>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2 py-8">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-700">Cart is empty</p>
                <p className="text-[11px] text-slate-500 max-w-[200px]">Click any product on the left to add it to cart.</p>
              </div>
            ) : (
              cart.map((item) => {
                const prodInstCharge = getInstallationCharge(item.product);
                const lineTotal = item.quantity * item.unitPrice - item.discount;

                return (
                  <div
                    key={item.product.id}
                    className="bg-white border border-slate-200 shadow-sm rounded-xl p-2 space-y-1.5 hover:border-blue-300 transition"
                  >
                    {/* Top Row: Brand + Product Name + Trash Icon */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <BrandLogo brand={item.product.brand} heightClass="h-4" className="shrink-0" />
                        <span className="font-black text-slate-900 text-xs truncate" title={item.product.name}>
                          {item.product.name}
                        </span>
                        {(item.product.model || item.product.capacity) && (
                          <span className="text-[10px] text-slate-500 font-mono hidden xl:inline shrink-0 font-semibold">
                            ({item.product.model || item.product.capacity})
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCartItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 transition p-0.5 shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Row: Price Toggle, Stepper, Line Total */}
                    <div className="flex items-center justify-between gap-1.5 text-xs pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemPriceType(item.product.id, item.priceType === 'retail' ? 'wholesale' : 'retail')}
                          className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-extrabold px-1.5 py-0.5 rounded hover:bg-blue-100 font-mono transition"
                          title="Click to toggle Retail / Wholesale price"
                        >
                          ৳{item.unitPrice.toLocaleString()} ({item.priceType === 'retail' ? 'R' : 'W'})
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Stepper */}
                        <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, -1)}
                            className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-200 text-slate-700"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-5 text-center text-xs font-black font-mono text-slate-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, 1)}
                            className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-200 text-slate-700"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <span className="text-xs font-black font-mono text-emerald-600 shrink-0 w-16 text-right">
                          ৳{lineTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ===== PINNED BOTTOM: Customer + Payment (Bright Light Mode) ===== */}
          {!isCartExpanded && (
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-slate-200 bg-white">
            {/* Customer Info (Bright Compact Inputs) */}
            <div className="p-2 px-3 border-b border-slate-200 bg-slate-50/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-600" /> Customer Details
                </p>
                {linkedCustomer && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Existing customer
                  </span>
                )}
              </div>

              {/* Fetched CRM profile summary */}
              {linkedCustomer && (
                <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-emerald-900 truncate">
                      {linkedCustomer.name}
                      <span className="ml-1 font-bold text-emerald-700 uppercase">
                        · {linkedCustomer.customerType.replace('_', ' ')}
                      </span>
                    </p>
                    <p className="text-[9px] font-bold text-emerald-700">
                      Purchases: ৳{linkedCustomer.totalPurchases.toLocaleString()}
                      {linkedCustomer.currentDue > 0 && (
                        <span className="ml-1 text-rose-600">
                          · Due: ৳{linkedCustomer.currentDue.toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handleClearLinkedCustomer}
                    title="Unlink and enter details manually"
                    className="shrink-0 text-[9px] font-extrabold text-slate-500 hover:text-rose-600 border border-slate-300 bg-white rounded px-1.5 py-0.5 transition"
                  >
                    Clear
                  </button>
                </div>
              )}

              {openWholesaleInvoice && (
                <button
                  type="button"
                  onClick={() => setEditingSaleInvoice(openWholesaleInvoice)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition"
                  title="Load this wholesale invoice into the cart and append new items"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    Continue wholesale invoice #{openWholesaleInvoice.id}
                  </span>
                  <span className="font-mono shrink-0">Due ৳{openWholesaleInvoice.dueAmount.toLocaleString()}</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <div className="relative">
                  <Phone className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Phone (017…)"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onFocus={() => setShowCustomerSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
                    className={`w-full pl-7 pr-2 py-1 border rounded-lg text-xs font-bold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      linkedCustomer ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300'
                    }`}
                  />
                  {showCustomerSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 bottom-full mb-1 bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden">
                      <p className="px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                        Existing customers
                      </p>
                      {customerSuggestions.map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleApplyMatchedCustomer(c)}
                          className="w-full text-left px-2 py-1 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition"
                        >
                          <p className="text-[10px] font-extrabold text-slate-800 truncate">{c.name}</p>
                          <p className="text-[9px] font-bold text-slate-500 font-mono">
                            {c.phone}
                            {c.currentDue > 0 && (
                              <span className="ml-1 text-rose-600 font-sans">
                                Due ৳{c.currentDue.toLocaleString()}
                              </span>
                            )}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Name (Walk-in)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <MapPin className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Delivery address (optional)"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment + Totals */}
            <div className="p-2.5 space-y-2">
              {/* Single vs Split tender toggle */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={disableSplitMode}
                  className={`py-1 text-[10px] font-extrabold rounded-md transition ${
                    !splitMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Single Method
                </button>
                <button
                  type="button"
                  onClick={() => (splitMode ? undefined : enableSplitMode())}
                  className={`py-1 text-[10px] font-extrabold rounded-md transition flex items-center justify-center gap-1 ${
                    splitMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="w-3 h-3" /> Split Payment
                </button>
              </div>

              {!splitMode && (
                <>
                  {/* Payment Methods */}
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'cash', label: 'Cash' },
                      { id: 'bkash', label: 'bKash' },
                      { id: 'nagad', label: 'Nagad' },
                      { id: 'rocket', label: 'Rocket' },
                      { id: 'card', label: 'Card' },
                      { id: 'installment', label: 'EMI' },
                      { id: 'bank_transfer', label: 'Bank' }
                    ].map((m: { id: PaymentMode; label: string }) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setPaymentMode(m.id);
                          if (m.id === 'installment') {
                            const initialDownPayment = isCustomPaid ? Math.min(paidAmount, grandTotal) : 0;
                            setIsInstallment(true);
                            setPaidAmount(initialDownPayment);
                            setDownPayment(initialDownPayment);
                            setIsCustomPaid(true);
                          } else {
                            if (isInstallment) {
                              setPaidAmount(grandTotal);
                              setDownPayment(0);
                              setIsCustomPaid(false);
                            }
                            setIsInstallment(false);
                          }
                          if (!['bkash', 'nagad', 'rocket'].includes(m.id)) setCustomerPaymentNumber('');
                        }}
                        className={`py-1 text-[10px] font-extrabold rounded-lg border transition-all ${
                          paymentMode === m.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {['bkash', 'nagad', 'rocket'].includes(paymentMode) && (
                    <div className="relative">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={customerPaymentNumber}
                        onChange={(e) => setCustomerPaymentNumber(e.target.value.replace(/[^\d+]/g, '').slice(0, 14))}
                        placeholder={`Customer ${paymentMode} number (11 digits)`}
                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Target Account Selector */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 px-2 rounded-lg border border-slate-200">
                    <span className="text-slate-600 font-extrabold flex items-center gap-1">
                      <Landmark className="w-3 h-3 text-blue-600" /> Account:
                    </span>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="bg-white border border-slate-300 text-slate-900 font-extrabold text-[11px] rounded px-2 py-0.5 focus:outline-none max-w-[220px] truncate"
                    >
                      {compatiblePaymentAccounts.length === 0 && (
                        <option value="">No compatible account</option>
                      )}
                      {compatiblePaymentAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} (৳{a.currentBalance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Split tender editor */}
              {splitMode && (
                <div className="space-y-1.5 bg-indigo-50/60 border border-indigo-200 rounded-lg p-2">
                  {splitRows.map((row) => {
                    const rowAccounts = getCompatiblePaymentAccounts(accounts, row.mode, determinedBusiness);
                    const isWallet = ['bkash', 'nagad', 'rocket'].includes(row.mode);
                    return (
                      <div key={row.id} className="space-y-1 bg-white rounded-lg border border-indigo-100 p-1.5">
                        <div className="flex items-center gap-1">
                          <select
                            value={row.mode}
                            onChange={(e) => updateSplitRow(row.id, { mode: e.target.value as PaymentMode })}
                            className="border border-slate-300 rounded-md px-1 py-1 text-[10px] font-extrabold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="cash">Cash</option>
                            <option value="bkash">bKash</option>
                            <option value="nagad">Nagad</option>
                            <option value="rocket">Rocket</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank</option>
                          </select>
                          <div className="relative flex-1">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">৳</span>
                            <input
                              type="number"
                              min="0"
                              value={row.amount || ''}
                              onChange={(e) => updateSplitRow(row.id, { amount: Math.max(0, Number(e.target.value)) })}
                              placeholder="0"
                              className="w-full pl-4 pr-1 py-1 border border-slate-300 rounded-md text-[11px] font-mono font-black text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => fillRemainingInto(row.id)}
                            title="Fill remaining balance"
                            className="px-1.5 py-1 bg-slate-700 hover:bg-indigo-600 text-white rounded-md text-[9px] font-extrabold shrink-0"
                          >
                            Rest
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSplitRow(row.id)}
                            disabled={splitRows.length === 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                            title="Remove method"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Landmark className="w-3 h-3 text-indigo-500 shrink-0" />
                          <select
                            value={row.accountId}
                            onChange={(e) => updateSplitRow(row.id, { accountId: e.target.value })}
                            className="flex-1 min-w-0 border border-slate-200 rounded-md px-1 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-50 focus:outline-none truncate"
                          >
                            {rowAccounts.length === 0 && <option value="">No compatible account</option>}
                            {rowAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.accountName} (৳{a.currentBalance.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>
                        {isWallet && (
                          <div className="relative">
                            <Smartphone className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={row.paymentNumber || ''}
                              onChange={(e) =>
                                updateSplitRow(row.id, { paymentNumber: e.target.value.replace(/[^\d+]/g, '').slice(0, 14) })
                              }
                              placeholder={`${row.mode} number (11 digits)`}
                              className="w-full pl-7 pr-1 py-1 border border-slate-300 rounded-md text-[10px] font-bold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={addSplitRow}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-[10px] rounded-md"
                    >
                      <Plus className="w-3 h-3" /> Add Method
                    </button>
                    <div className="text-[10px] font-extrabold text-right">
                      <span className={`${splitTotal > grandTotal ? 'text-rose-600' : 'text-slate-600'}`}>
                        Tendered ৳{splitTotal.toLocaleString()}
                      </span>
                      <span className="text-slate-400"> / ৳{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Totals Box */}
              <div className="space-y-1 text-xs bg-slate-50 rounded-lg p-2 border border-slate-200">
                <div className="flex justify-between text-slate-600 text-[11px] font-semibold">
                  <span>Product Total</span>
                  <span className="font-mono font-bold text-slate-900">৳{productsSubtotal.toLocaleString()}</span>
                </div>
                {installationFeeTotal > 0 && (
                  <div className="flex justify-between text-blue-600 text-[11px] font-bold">
                    <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Install & Piping</span>
                    <span className="font-mono font-bold">৳{installationFeeTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 font-semibold">
                    Discount{discountMode === 'percent' && discountAmount > 0 ? ` (−৳${discountAmount.toLocaleString()})` : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="flex rounded border border-slate-300 overflow-hidden shrink-0">
                      {(['amount', 'percent'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setDiscountMode(mode)}
                          className={`px-1.5 py-0.5 text-[10px] font-extrabold transition ${
                            discountMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {mode === 'amount' ? '৳' : '%'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={discountMode === 'percent' ? 100 : undefined}
                      value={overallDiscount || ''}
                      placeholder={discountMode === 'percent' ? '0 %' : '0'}
                      onChange={(e) => setOverallDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-16 px-2 py-0.5 bg-white border border-slate-300 rounded text-right font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Special (referral) discount — internal, never printed for the customer */}
                {!showSpDiscount ? (
                  <button
                    type="button"
                    onClick={() => setShowSpDiscount(true)}
                    className="flex items-center gap-1 text-[10px] font-extrabold text-violet-700 hover:text-violet-900 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add SP Discount
                  </button>
                ) : (
                  <div className="rounded-lg border border-violet-200 bg-violet-50/70 p-1.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-violet-800 uppercase tracking-wide">
                        SP Discount (internal)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSpDiscount(false);
                          setSpDiscountInput(0);
                          setReferralName('');
                        }}
                        className="text-violet-400 hover:text-rose-600 transition"
                        title="Remove special discount"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex rounded border border-violet-300 overflow-hidden shrink-0">
                        {(['amount', 'percent'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSpDiscountMode(mode)}
                            className={`px-1.5 py-0.5 text-[10px] font-extrabold transition ${
                              spDiscountMode === mode
                                ? 'bg-violet-600 text-white'
                                : 'bg-white text-violet-700 hover:bg-violet-100'
                            }`}
                          >
                            {mode === 'amount' ? '৳' : '%'}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={spDiscountMode === 'percent' ? 100 : undefined}
                        value={spDiscountInput || ''}
                        placeholder={spDiscountMode === 'percent' ? '0 %' : '0'}
                        onChange={(e) => setSpDiscountInput(Math.max(0, Number(e.target.value)))}
                        className="w-16 px-1.5 py-0.5 bg-white border border-violet-300 rounded text-right font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <input
                        type="text"
                        value={referralName}
                        onChange={(e) => setReferralName(e.target.value)}
                        placeholder="Referral name"
                        className="flex-1 min-w-0 px-1.5 py-0.5 bg-white border border-violet-300 rounded text-[11px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    {specialDiscountAmount > 0 && (
                      <div className="flex justify-between text-[10px] font-bold text-violet-800">
                        <span>
                          Referral payout
                          {spDiscountMode === 'percent' ? ` (${spDiscountInput}%)` : ''}
                        </span>
                        <span className="font-mono">-৳{specialDiscountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <p className="text-[9px] font-bold text-violet-500 leading-tight">
                      Customer still pays the full Grand Total. Not shown on the invoice.
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-200 pt-1 mt-1">
                  <span className="text-slate-900 font-black text-xs">Grand Total</span>
                  <span className="font-mono text-amber-600 text-base font-black">৳{grandTotal.toLocaleString()}</span>
                </div>
                {specialDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-bold text-violet-700">
                    <span>Net sales after referral</span>
                    <span className="font-mono">৳{netSalesAfterReferral.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Split summary: total tendered is derived from the rows above */}
              {splitMode && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[11px] font-black">
                  <span className="flex items-center gap-1 text-emerald-800">
                    <Layers className="w-3.5 h-3.5" /> Total Paid (Split)
                  </span>
                  <span className="font-mono text-emerald-700">৳{splitTotal.toLocaleString()}</span>
                </div>
              )}

              {/* Paid Input + Quick Actions */}
              {!splitMode && (
              <div className="flex gap-1.5 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black">PAID</span>
                  <input
                    type="number"
                    placeholder={grandTotal.toString()}
                    value={paidAmount || ''}
                    onChange={(e) => {
                      const amount = Number(e.target.value);
                      setPaidAmount(amount);
                      if (isInstallment) setDownPayment(amount);
                      setIsCustomPaid(true);
                    }}
                    className="w-full pl-11 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-black text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPaidAmount(grandTotal);
                    if (isInstallment) setDownPayment(grandTotal);
                    setIsCustomPaid(false);
                  }}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-extrabold shrink-0"
                >
                  Exact
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaidAmount(0);
                    if (isInstallment) setDownPayment(0);
                    setIsCustomPaid(true);
                  }}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-rose-600 text-white rounded-lg text-[10px] font-extrabold shrink-0"
                >
                  Due
                </button>
              </div>
              )}

              {/* Due highlight + EMI */}
              {dueAmount > 0 && (
                <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-[11px]">
                  <div className="flex items-center justify-between font-black">
                    <span className="flex items-center gap-1 text-amber-800"><Calculator className="w-3 h-3" /> Due Balance</span>
                    <span className="font-mono text-rose-600 font-black">৳{dueAmount.toLocaleString()}</span>
                  </div>
                  {isInstallment && (
                    <div className="pt-1 flex items-center justify-between text-[10px] border-t border-amber-200">
                      <span className="flex items-center gap-1.5 font-bold text-amber-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Installment EMI Plan
                      </span>
                      <select
                        value={installmentMonths}
                        onChange={(e) => setInstallmentMonths(Number(e.target.value))}
                        className="px-1.5 py-0.5 bg-white border border-amber-300 text-slate-900 rounded text-[10px] font-bold"
                      >
                        <option value={3}>3 Mo</option>
                        <option value={6}>6 Mo</option>
                        <option value={12}>12 Mo</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
          )}

          {/* Fixed checkout footer: always visible without scrolling the payment panel. */}
          {!isCartExpanded && (
            <div className="shrink-0 p-2 bg-white border-t border-slate-200 shadow-[0_-6px_16px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => handleCheckout(true)}
                  className="px-3 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Save as Draft and clear the terminal"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="hidden xl:inline">Draft</span>
                </button>
                <button
                  disabled={cart.length === 0 || Boolean(isEditingRestricted)}
                  onClick={() => handleCheckout(false)}
                  title="Complete the sale and open the vector PDF invoice"
                  className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                    cart.length === 0 || isEditingRestricted
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingSaleInvoice ? 'Update & Export Vector PDF' : 'Complete & Export Vector PDF'}
                </button>
              </div>
            </div>
          )}
        </aside>

      </div>

      {/* Saved Drafts Modal */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Saved POS Draft Sales ({draftInvoices.length})</h3>
              </div>
              <button
                onClick={() => setShowDraftsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {draftInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-500 opacity-50" />
                  <p className="font-bold text-sm">No draft sales found</p>
                  <p className="text-xs text-slate-500">Draft sales saved from the POS terminal will appear here.</p>
                </div>
              ) : (
                draftInvoices.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex items-center justify-between gap-3 hover:border-amber-500 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-amber-600 dark:text-amber-400">
                          {draft.id}
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                          DRAFT
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {draft.customerName} ({draft.customerPhone})
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        Items: {draft.items.length} • Total: ৳{draft.grandTotal.toLocaleString()} • Date: {draft.createdAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingSaleInvoice(draft);
                          setShowDraftsModal(false);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Load Draft
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete draft ${draft.id}?`)) {
                            deleteSale(draft.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
