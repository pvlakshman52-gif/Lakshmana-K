import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Product, OnlineOrder, DeliveryStatus } from '../../types/erp';
import { ProductIcon } from '../common/ProductIcon';
import { ProductImageHoverPreview, ProductDetailsModal } from '../common/ProductImageHoverPreview';
import { CustomerAuthModal } from './CustomerAuthModal';
import { isProductInCategory, getCategoryDisplayName } from '../../utils/categoryUtils';
import { 
  ShoppingBag, 
  Search, 
  Calendar, 
  Truck, 
  Check, 
  MessageSquare, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  ShieldCheck, 
  ArrowRight,
  Clock,
  Sparkles,
  MapPin,
  UserCheck,
  LogOut,
  KeyRound,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  Phone,
  Printer
} from 'lucide-react';

interface CustomerStorePortalProps {
  onBackToERP?: () => void;
}

export const CustomerStorePortal: React.FC<CustomerStorePortalProps> = ({
  onBackToERP
}) => {
  const { 
    products, 
    categories, 
    subcategories,
    locations, 
    batches,
    selectedLocationId,
    onlineOrders, 
    updateOnlineOrderStatus, 
    createOnlineOrder,
    courierSettings,
    currentCustomer,
    logoutCustomer,
    currentUser,
    isAuthenticated,
    batchPricingMode,
    getProductPriceResolution
  } = useClinic();

  // Location-wise by default: if ALL is selected, default to Hubballi or Hospete based on active context
  const [storeLocationId, setStoreLocationId] = useState<string>(
    selectedLocationId === 'ALL' ? 'LOC-HUB' : selectedLocationId
  );

  // Keep store location synced when location in ERP header changes
  React.useEffect(() => {
    if (selectedLocationId && selectedLocationId !== 'ALL') {
      setStoreLocationId(selectedLocationId);
      setAssignedBranch(selectedLocationId);
    }
  }, [selectedLocationId]);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedOrderTracking, setSelectedOrderTracking] = useState<OnlineOrder | null>(null);
  const [orderForBill, setOrderForBill] = useState<OnlineOrder | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);

  // Customer authentication modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingProductToBuy, setPendingProductToBuy] = useState<Product | null>(null);

  // Checkout form
  const [customerName, setCustomerName] = useState(currentCustomer?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(currentCustomer?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(currentCustomer?.address || '');
  const [assignedBranch, setAssignedBranch] = useState(storeLocationId === 'ALL' ? (locations[0]?.locationId || 'LOC-HOS') : storeLocationId);
  const [paymentMethod, setPaymentMethod] = useState<'UPI Online' | 'Cash on Delivery'>('UPI Online');

  // Keep fulfilling branch in sync with active store location filter
  useEffect(() => {
    if (storeLocationId !== 'ALL') {
      setAssignedBranch(storeLocationId);
    }
  }, [storeLocationId]);

  // Appointment Form
  const [apptName, setApptName] = useState(currentCustomer?.customerName || '');
  const [apptPhone, setApptPhone] = useState(currentCustomer?.phone || '');
  const [apptBranch, setApptBranch] = useState(storeLocationId === 'ALL' ? 'LOC-HOS' : storeLocationId);
  const [apptDate, setApptDate] = useState('2026-09-28');
  const [apptConcern, setApptConcern] = useState('Hair thinning & dandruff consultation');
  const [apptBookedSuccess, setApptBookedSuccess] = useState(false);

  // Delivery Pipeline Filter states
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState<'ALL' | DeliveryStatus>('ALL');
  const [guestLookupPhone, setGuestLookupPhone] = useState<string>('');
  const [guestLookupSubmitted, setGuestLookupSubmitted] = useState<boolean>(false);
  const [editingNoteOrderId, setEditingNoteOrderId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');

  // 1. Customer Orders: customer can see ONLY their orders
  const customerOrders = useMemo(() => {
    if (!currentCustomer) return [];
    const cleanCustomerPhone = currentCustomer.phone.replace(/\D/g, '');
    const cleanCustomerName = currentCustomer.customerName.toLowerCase().trim();
    return onlineOrders.filter(order => {
      const orderPhone = (order.phone || '').replace(/\D/g, '');
      const orderName = (order.customerName || '').toLowerCase().trim();
      const isMatch = (order.customerId && order.customerId === currentCustomer.customerId) ||
                      (cleanCustomerPhone.length >= 6 && orderPhone.includes(cleanCustomerPhone)) || 
                      (cleanCustomerName && orderName === cleanCustomerName);
      if (!isMatch) return false;
      if (pipelineStatusFilter !== 'ALL' && order.status !== pipelineStatusFilter) return false;
      return true;
    });
  }, [onlineOrders, currentCustomer, pipelineStatusFilter]);

  // 2. Clinic Staff Orders: clinic staff can see their clinic's orders
  const staffOrders = useMemo(() => {
    if (!isAuthenticated || !currentUser) return [];
    return onlineOrders.filter(order => {
      if (currentUser.role !== 'Admin') {
        // Staff strictly sees only their assigned branch orders
        if (order.locationId !== currentUser.locationId) return false;
      } else {
        // Admin can filter by store location or see all
        if (storeLocationId !== 'ALL' && order.locationId !== storeLocationId) return false;
      }
      if (pipelineStatusFilter !== 'ALL' && order.status !== pipelineStatusFilter) return false;
      return true;
    });
  }, [onlineOrders, isAuthenticated, currentUser, storeLocationId, pipelineStatusFilter]);

  // 3. Guest Patient Orders (searched by mobile number for privacy)
  const guestOrders = useMemo(() => {
    if (currentCustomer || (isAuthenticated && currentUser)) return [];
    if (!guestLookupSubmitted || !guestLookupPhone.trim()) return [];
    const cleanInput = guestLookupPhone.replace(/\D/g, '');
    if (cleanInput.length < 5) return [];
    return onlineOrders.filter(order => {
      const orderPhone = (order.phone || '').replace(/\D/g, '');
      const isMatch = orderPhone.includes(cleanInput);
      if (!isMatch) return false;
      if (pipelineStatusFilter !== 'ALL' && order.status !== pipelineStatusFilter) return false;
      return true;
    });
  }, [onlineOrders, currentCustomer, isAuthenticated, currentUser, guestLookupSubmitted, guestLookupPhone, pipelineStatusFilter]);

  // Subcategories available for active category
  const availableSubcategories = useMemo(() => {
    if (activeCategory === 'ALL') return [];
    return subcategories.filter(s => s.categoryId === activeCategory);
  }, [subcategories, activeCategory]);

  // Filter products for store showcase
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isActive) return false;
      if (activeCategory !== 'ALL' && !isProductInCategory(p, activeCategory, categories)) return false;
      if (activeSubcategory !== 'ALL' && p.subcategoryId !== activeSubcategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.productName.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, activeCategory, activeSubcategory, categories, searchQuery]);

  // Single source of truth pricing for customer store portal
  const getStoreItemPrice = useCallback((product: Product) => {
    if (!product) return 0;
    const targetBranch = storeLocationId === 'ALL' ? undefined : (assignedBranch || storeLocationId);
    const priceRes = getProductPriceResolution(product, targetBranch);
    return priceRes.effectivePrice;
  }, [storeLocationId, assignedBranch, getProductPriceResolution]);

  const itemsSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      if (!item || !item.product) return acc;
      const unitPrice = getStoreItemPrice(item.product);
      return acc + unitPrice * item.quantity;
    }, 0);
  }, [cart, getStoreItemPrice]);

  const courierCharge = useMemo(() => {
    if (!courierSettings || !courierSettings.enabled) return 0;
    if (courierSettings.freeDeliveryAbove > 0 && itemsSubtotal >= courierSettings.freeDeliveryAbove) {
      return 0;
    }
    if (assignedBranch === 'LOC-HOS') {
      return courierSettings.hospeteDepotCharge ?? courierSettings.standardCourierCharge ?? 50;
    } else if (assignedBranch === 'LOC-HUB') {
      return courierSettings.hubballiDepotCharge ?? courierSettings.standardCourierCharge ?? 50;
    }
    return courierSettings.standardCourierCharge ?? 50;
  }, [courierSettings, itemsSubtotal, assignedBranch]);

  const orderBillTotal = itemsSubtotal + courierCharge;
  const cartTotal = orderBillTotal;

  // Add to cart with mandatory customer authentication requirement
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    if (!product || !product.productId) return;
    if (!currentCustomer) {
      setPendingProductToBuy(product);
      setIsAuthModalOpen(true);
      return;
    }

    setCart(prev => {
      const ex = prev.find(i => i.product && i.product.productId === product.productId);
      if (ex) {
        return prev.map(i => i.product && i.product.productId === product.productId ? { ...i, quantity: i.quantity + quantityToAdd } : i);
      }
      return [...prev, { product, quantity: quantityToAdd }];
    });
    setIsCartOpen(true);
  };

  // Immediate Buy Now requiring customer authentication
  const handleBuyNow = (product: Product) => {
    if (!product || !product.productId) return;
    if (!currentCustomer) {
      setPendingProductToBuy(product);
      setIsAuthModalOpen(true);
      return;
    }

    setCart(prev => {
      const ex = prev.find(i => i.product && i.product.productId === product.productId);
      if (ex) {
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });

    setCustomerName(currentCustomer.customerName);
    setCustomerPhone(currentCustomer.phone);
    setCustomerAddress(currentCustomer.address);
    setAssignedBranch(storeLocationId === 'ALL' ? 'LOC-HUB' : storeLocationId);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const updateCartQty = (productId: string, delta: number) => {
    if (!productId) return;
    setCart(prev => {
      const ex = prev.find(i => i.product && i.product.productId === productId);
      if (!ex) return prev;
      const newQty = ex.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(i => i.product && i.product.productId !== productId);
      }
      return prev.map(i => i.product && i.product.productId === productId ? { ...i, quantity: newQty } : i);
    });
  };

  const removeFromCart = (productId: string) => {
    if (!productId) return;
    setCart(prev => prev.filter(i => i.product && i.product.productId !== productId));
  };

  const openCheckout = () => {
    if (!currentCustomer) {
      setIsAuthModalOpen(true);
      return;
    }
    setCustomerName(currentCustomer.customerName);
    setCustomerPhone(currentCustomer.phone);
    setCustomerAddress(currentCustomer.address);
    setAssignedBranch(storeLocationId === 'ALL' ? 'LOC-HOS' : storeLocationId);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !customerName.trim() || !customerPhone.trim()) return;

    const newOrder = createOnlineOrder({
      customerId: currentCustomer?.customerId,
      customerName: customerName.trim(),
      phone: customerPhone.trim(),
      shippingAddress: customerAddress.trim() || 'Hospete / Hubballi Local',
      locationId: assignedBranch,
      items: cart.map(c => {
        const unitPrice = getStoreItemPrice(c.product);
        const priceRes = getProductPriceResolution(c.product, assignedBranch);
        return {
          productId: c.product.productId,
          productName: c.product.productName,
          quantity: c.quantity,
          price: unitPrice,
          batchNumber: priceRes.activeBatch?.batchNumber,
          batchId: priceRes.activeBatch?.batchId,
          costPrice: priceRes.costPrice,
          profit: (unitPrice - priceRes.costPrice) * c.quantity
        };
      }),
      itemsTotal: itemsSubtotal,
      courierCharges: courierCharge,
      totalAmount: orderBillTotal,
      paymentMethod,
      status: 'Pending',
      trackingNotes: `Order placed online via customer portal. Assigned to ${locations.find(l => l.locationId === assignedBranch)?.locationName.split(' ')[0]}`
    });

    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setSelectedOrderTracking(newOrder);
    setOrderForBill(newOrder);
  };

  const handleWhatsAppOrder = (product?: Product) => {
    if (!currentCustomer) {
      if (product) setPendingProductToBuy(product);
      setIsAuthModalOpen(true);
      return;
    }

    const branch = locations.find(l => l.locationId === assignedBranch) || locations[0];
    let msg = '';
    if (product) {
      const itemPrice = getStoreItemPrice(product);
      msg = `Hello Doctor, I would like to order *${product.productName}* (₹${itemPrice}) from ${branch.locationName}. Please confirm availability and delivery.`;
    } else {
      const itemsList = cart.map(i => `• ${i.product.productName} x ${i.quantity}`).join('%0A');
      msg = `Hello ${branch.locationName}, I want to order the following items online:%0A${itemsList}%0A%0ATotal Amount: ₹${cartTotal}%0APlease process my home delivery.`;
    }
    window.open(`https://wa.me/918394225890?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setApptBookedSuccess(true);
    setTimeout(() => {
      setApptBookedSuccess(false);
      setIsAppointmentModalOpen(false);
      setApptName('');
      setApptPhone('');
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Clinic Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-sm border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-teal-400 text-xs font-semibold uppercase tracking-wider">
              MediClinic Pharmacy & Patient Portal
            </span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              Dermatologist Formulated Clinical Skin & Hair Care
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Prescription-grade formulations available for clinic pick-up or expedited home delivery across Hospete & Hubballi.
            </p>

            {/* Fulfillment Clinic Selector (By default location wise products show) */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-700/60">
              <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-300 mr-1">Fulfillment Clinic:</span>
              {locations.map(loc => (
                <button
                  key={loc.locationId}
                  type="button"
                  onClick={() => {
                    setStoreLocationId(loc.locationId);
                    setAssignedBranch(loc.locationId);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    storeLocationId === loc.locationId
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {loc.locationCode} - {loc.locationName.split(' ')[0]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStoreLocationId('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  storeLocationId === 'ALL'
                    ? 'bg-teal-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white bg-white/10 hover:bg-white/20'
                }`}
              >
                All Branches
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Customer Authentication Status Badge */}
            {currentCustomer ? (
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                <div className="text-left">
                  <span className="font-semibold block text-[11px] leading-tight text-white">{currentCustomer.customerName}</span>
                  <span className="text-[10px] text-slate-300 font-mono">+91 {currentCustomer.phone}</span>
                </div>
                <button
                  type="button"
                  onClick={logoutCustomer}
                  title="Sign Out of Customer Account"
                  className="ml-1 text-slate-400 hover:text-rose-300 p-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-teal-400 transition-colors shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Sign In / Register to Buy</span>
              </button>
            )}

            <button
              onClick={() => setIsAppointmentModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold rounded-lg text-xs transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Consultation</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold rounded-lg text-xs transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>View Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
            </button>

            {/* Back to ERP portal link for authenticated clinic staff */}
            {onBackToERP && isAuthenticated && (
              <button
                type="button"
                onClick={onBackToERP}
                className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>← Clinic ERP</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories & Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search serums, face wash, hair oils, soap..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => {
              setActiveCategory('ALL');
              setActiveSubcategory('ALL');
            }}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Products ({products.filter(p => p.isActive).length})
          </button>
          {categories.map(c => {
            const count = products.filter(p => p.isActive && isProductInCategory(p, c.categoryId, categories)).length;
            return (
              <button
                key={c.categoryId}
                onClick={() => {
                  setActiveCategory(c.categoryId);
                  setActiveSubcategory('ALL');
                }}
                className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === c.categoryId ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c.categoryName} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategories Filter Bar when Category is selected */}
      {availableSubcategories.length > 0 && (
        <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-2.5 flex items-center gap-2 overflow-x-auto text-xs animate-in fade-in duration-150">
          <span className="text-[11px] font-bold text-teal-900 px-2 shrink-0">Subcategories:</span>
          <button
            onClick={() => setActiveSubcategory('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap text-xs transition-colors cursor-pointer ${
              activeSubcategory === 'ALL'
                ? 'bg-teal-700 text-white shadow-xs font-bold'
                : 'bg-white/80 text-teal-950 hover:bg-white border border-teal-200/60'
            }`}
          >
            All Subcategories
          </button>
          {availableSubcategories.map(sub => {
            const count = products.filter(p => p.isActive && p.subcategoryId === sub.subcategoryId).length;
            return (
              <button
                key={sub.subcategoryId}
                onClick={() => setActiveSubcategory(sub.subcategoryId)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap text-xs transition-colors cursor-pointer ${
                  activeSubcategory === sub.subcategoryId
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'bg-white/80 text-teal-950 hover:bg-white border border-teal-200/60'
                }`}
              >
                {sub.subcategoryName} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Location Filter Banner when a specific clinic is active */}
      {selectedLocationId !== 'ALL' && (
        <div className="bg-teal-50 border border-teal-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="font-semibold text-teal-950">
              Showing products fulfilled by {locations.find(l => l.locationId === selectedLocationId)?.locationName}
            </span>
            <span className="text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full font-mono text-[10px]">
              {filteredProducts.length} items available
            </span>
          </div>
        </div>
      )}

      {/* Products Showcase Grid (Tall Vertical Retail Showcase Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-sm font-semibold text-slate-700">
              No products available in {locations.find(l => l.locationId === selectedLocationId)?.locationName || 'this clinic'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Switch to "All Branches (Consolidated)" in the top bar to view all dermatological formulations.
            </p>
          </div>
        )}
        {filteredProducts.map(product => {
          const cat = categories.find(c => c.categoryId === product.categoryId);
          const priceRes = getProductPriceResolution(product, storeLocationId === 'ALL' ? undefined : storeLocationId);
          const activePrice = priceRes.effectivePrice;
          const activeBatch = priceRes.activeBatch;
          const originalMrp = Math.round(activePrice * 1.18);
          const hasStock = priceRes.totalAvailableQty > 0;

          return (
            <div
              key={product.productId}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
                hasStock
                  ? 'border-slate-200 hover:shadow-lg hover:border-teal-400/80'
                  : 'border-rose-200 bg-rose-50/15 hover:border-rose-300'
              }`}
            >
              {/* Tall Vertical Product Image Frame with Click-to-View Multi-View Inspector */}
              <div className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40">
                <ProductImageHoverPreview
                  product={product}
                  className={`h-64 sm:h-72 w-full ${!hasStock ? 'opacity-85' : ''}`}
                  categoryName={getCategoryDisplayName(product, categories)}
                  contextMode="store"
                  locationId={storeLocationId === 'ALL' ? undefined : storeLocationId}
                  disableInternalModal={true}
                  onThumbnailClick={() => setSelectedProductForDetails(product)}
                  actionLabel={hasStock ? "Add to Cart" : undefined}
                  onAction={hasStock ? ((qty) => {
                    addToCart(product, qty || 1);
                  }) : undefined}
                  secondaryActionLabel={hasStock ? "Order via WhatsApp" : "Inquire via WhatsApp"}
                  onSecondaryAction={() => handleWhatsAppOrder(product)}
                  showQuickFlipBadge={true}
                />

                {/* Prominent SOLD OUT Watermark Overlay when stock is zero (as shown in user Image 1) */}
                {!hasStock && (
                  <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[0.5px] flex items-center justify-center z-10 pointer-events-none">
                    <span className="bg-rose-600 text-white font-black text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg border-2 border-white transform -rotate-6">
                      Sold Out
                    </span>
                  </div>
                )}
                
                {/* Top Right Live Stock / Category Badge */}
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  {!hasStock ? (
                    <span className="text-[10px] font-bold font-mono text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-2xs uppercase">
                      SOLD OUT
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-700 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                      {getCategoryDisplayName(product, categories)}
                    </span>
                  )}
                </div>

                <span className="absolute bottom-2 left-3 z-10 text-[10px] font-mono text-slate-400 bg-white/90 px-2 py-0.5 rounded border border-slate-100 pointer-events-none">
                  {product.volumeSize}
                </span>
              </div>

              {/* Product Details & Information - Click to Open Inspector */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div 
                  onClick={() => setSelectedProductForDetails(product)}
                  className="cursor-pointer group/title"
                  title="Click to view full details & clinical specifications"
                >
                  <div className="text-[10px] font-mono text-slate-400 mb-0.5">{product.productCode}</div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover/title:text-teal-700 transition-colors">
                    {product.productName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Pricing & Add to Cart Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                  <div>
                    <div className="text-base font-bold font-mono text-slate-900">
                      Rs. {activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span className="line-through">
                        Rs. {originalMrp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-teal-700 font-semibold text-[10px] bg-teal-50 px-1 py-0.2 rounded">
                        (-15%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleWhatsAppOrder(product)}
                      title={hasStock ? "Order via WhatsApp" : "Inquire via WhatsApp"}
                      className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/80"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    {!hasStock ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold cursor-not-allowed uppercase tracking-wider"
                        title="Product is currently sold out"
                      >
                        Sold Out
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => addToCart(product)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                        <button
                          onClick={() => handleBuyNow(product)}
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Buy Now</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Patient Home Delivery & Order Pipeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 mt-8">
        
        {/* Header with Role Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg border border-teal-200">
                <Truck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Live Patient Home Delivery & Order Pipeline
              </h2>
            </div>
            
            {/* Context Badge */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {currentCustomer ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Personal Customer View: Showing only orders for {currentCustomer.customerName} (+91 {currentCustomer.phone})</span>
                </span>
              ) : isAuthenticated && currentUser ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-semibold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full text-[11px]">
                    <ShieldCheck className="w-3 h-3 text-teal-700" />
                    <span>
                      Clinic Staff View: {currentUser.role === 'Admin' ? 'All Clinic Hubs Orders' : `${locations.find(l => l.locationId === currentUser.locationId)?.locationName.split(' ')[0]} Hub Orders`} ({currentUser.fullName} · {currentUser.role})
                    </span>
                  </span>
                  {onBackToERP && (
                    <button
                      type="button"
                      onClick={onBackToERP}
                      className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:text-teal-950 bg-white border border-teal-300 hover:bg-teal-50 px-2.5 py-0.5 rounded-full text-[11px] transition-colors"
                    >
                      <span>Open ERP Delivery Pipeline →</span>
                    </button>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[11px]">
                  <span>🔒 Patient Privacy Protected: Orders are confidential to each patient & clinic staff.</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Status Filter Tabs (for Customer or Staff) */}
          {(currentCustomer || (isAuthenticated && currentUser)) && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
              {(['ALL', 'Pending', 'Packed', 'Shipped', 'Delivered'] as const).map(st => {
                const isActive = pipelineStatusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setPipelineStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      isActive 
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 1. CUSTOMER VIEW: Customer can see ONLY their orders */}
        {currentCustomer && (
          <div className="space-y-4">
            {customerOrders.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 p-6">
                <Truck className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
                <h3 className="text-xs font-bold text-slate-700">No Orders Found for Your Account</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                  We could not find any active orders matching mobile number +91 {currentCustomer.phone}. Choose clinical products from our catalog above and click "Buy Now" to order.
                </p>
              </div>
            ) : (
              customerOrders.map(order => {
                const loc = locations.find(l => l.locationId === order.locationId);
                const stages: DeliveryStatus[] = ['Pending', 'Packed', 'Shipped', 'Delivered'];
                const currentStageIdx = stages.indexOf(order.status);

                return (
                  <div key={order.orderId} className="p-4 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs hover:border-teal-300 transition-all">
                    
                    {/* Top Row: Order ID, Amount, Hub */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{order.orderId}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOrderForBill(order)}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-teal-600" />
                          <span>View Bill</span>
                        </button>
                        <span className="font-mono font-bold text-slate-900 text-sm">₹{order.totalAmount}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {order.paymentMethod}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold text-[10px] border border-teal-200">
                          {loc?.locationName.split(' ')[0]} Clinic Depot
                        </span>
                      </div>
                    </div>

                    {/* Live Visual 4-Step Patient Stepper */}
                    <div className="py-4 my-1 border-b border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Live Delivery Progress</div>
                      <div className="grid grid-cols-4 gap-2 relative">
                        {stages.map((st, idx) => {
                          const isDone = currentStageIdx >= idx;
                          const isCurrent = order.status === st;

                          return (
                            <div key={st} className="flex flex-col items-center text-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                                isCurrent 
                                  ? 'bg-teal-600 text-white ring-4 ring-teal-100 shadow-xs' 
                                  : isDone 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}>
                                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                              </div>
                              <span className={`text-[11px] font-semibold leading-tight ${
                                isCurrent ? 'text-teal-900 font-bold' : isDone ? 'text-slate-800' : 'text-slate-400'
                              }`}>
                                {st === 'Pending' ? 'Order Placed' : st === 'Packed' ? 'Prescription Packed' : st === 'Shipped' ? 'Out for Delivery' : 'Delivered'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order Details & Courier Note */}
                    <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Prescribed Formulations</span>
                        <p className="text-slate-800 font-medium">
                          {order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                        </p>
                        <p className="text-slate-500 mt-1">
                          📍 <span className="font-semibold text-slate-700">Delivery Address:</span> {order.shippingAddress}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Fulfillment & Tracking Note</span>
                        <p className="text-teal-900 font-mono text-[11px]">
                          {order.trackingNotes || 'Order verified and preparing for clinic dispatch.'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Fulfilled by {loc?.locationName} · Phone support: {loc?.phone}
                        </p>
                      </div>
                    </div>

                    {/* Itemized Bill Breakdown */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                      <div className="flex items-center gap-3 text-slate-600">
                        <span>Items Subtotal: <strong>₹{order.itemsTotal ?? order.items.reduce((s, it) => s + it.price * it.quantity, 0)}</strong></span>
                        <span>•</span>
                        <span className="text-teal-800 font-semibold flex items-center gap-1">
                          <Truck className="w-3 h-3 text-teal-600" />
                          <span>Courier Charges: <strong>{order.courierCharges !== undefined && order.courierCharges > 0 ? `+₹${order.courierCharges}` : 'FREE (Waived)'}</strong></span>
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 font-sans">
                        Net Payable: <span className="font-mono text-teal-700">₹{order.totalAmount}</span>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. CLINIC STAFF VIEW: Clinic staff can see their orders & update status */}
        {isAuthenticated && currentUser && (
          <div className="space-y-3">
            {staffOrders.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 p-6">
                <Truck className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
                <h3 className="text-xs font-bold text-slate-700">No Orders in Pipeline for Your Clinic</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No online home delivery orders currently match this branch or filter.
                </p>
              </div>
            ) : (
              staffOrders.map(order => {
                const loc = locations.find(l => l.locationId === order.locationId);
                const statuses: DeliveryStatus[] = ['Pending', 'Packed', 'Shipped', 'Delivered'];

                return (
                  <div key={order.orderId} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 text-xs hover:border-slate-300 transition-all">
                    
                    {/* Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{order.orderId}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-bold text-slate-900">{order.customerName}</span>
                        <span className="text-slate-500 font-mono">({order.phone})</span>
                        <a
                          href={`https://wa.me/91${order.phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(order.customerName)},%20regarding%20your%20clinical%20order%20${order.orderId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-0.5 ml-1 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">₹{order.totalAmount}</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 font-medium">
                          {order.paymentMethod}
                        </span>
                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-teal-100/70 text-teal-900 border border-teal-200">
                          {loc?.locationCode} Hub
                        </span>
                      </div>
                    </div>

                    {/* Middle Grid */}
                    <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Ordered Products</span>
                        <p className="text-slate-800 font-medium">
                          {order.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          <span className="font-semibold">Deliver to:</span> {order.shippingAddress}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Order Date: {new Date(order.orderDate).toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Clickable Fulfillment Status Buttons for Staff */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">
                            Fulfillment Status (Click to transition)
                          </span>
                          <span className="text-[10px] text-teal-800 font-mono font-bold bg-teal-50 px-1.5 py-0.2 rounded">
                            Current: {order.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {statuses.map(st => {
                            const isCurrent = order.status === st;
                            const isPast = statuses.indexOf(order.status) >= statuses.indexOf(st);

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateOnlineOrderStatus(order.orderId, st)}
                                className={`py-1.5 px-2 rounded-lg text-center font-bold transition-all text-[11px] cursor-pointer ${
                                  isCurrent
                                    ? 'bg-teal-700 text-white shadow-xs'
                                    : isPast
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                                    : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>

                        {/* Tracking note display & inline editor */}
                        <div className="mt-2 text-[11px]">
                          {editingNoteOrderId === order.orderId ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="text"
                                value={editingNoteText}
                                onChange={e => setEditingNoteText(e.target.value)}
                                placeholder="e.g. Courier: DTDC #99402 or Runner: Ramesh"
                                className="flex-1 p-1.5 text-xs bg-white border border-teal-300 rounded font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  // Update order notes
                                  order.trackingNotes = editingNoteText;
                                  setEditingNoteOrderId(null);
                                }}
                                className="px-2 py-1 bg-teal-700 text-white rounded text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNoteOrderId(null)}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-200 rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-slate-600 bg-white p-1.5 rounded border border-slate-200 font-mono text-[10px]">
                              <span>Note: {order.trackingNotes || 'No dispatch notes recorded yet.'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteOrderId(order.orderId);
                                  setEditingNoteText(order.trackingNotes || '');
                                }}
                                className="text-teal-700 hover:underline font-sans font-semibold ml-2"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 3. GUEST VIEW: Neither Customer nor Staff is logged in */}
        {!currentCustomer && !isAuthenticated && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="max-w-md mx-auto text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Track Your Patient Home Delivery Orders</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                For patient confidentiality and safety, prescription orders are private. Sign in to your patient account to view your live orders, or enter your 10-digit mobile number below to track only your deliveries.
              </p>
            </div>

            {/* Phone search input */}
            <form 
              onSubmit={e => {
                e.preventDefault();
                setGuestLookupSubmitted(true);
              }}
              className="max-w-sm mx-auto flex items-center gap-2"
            >
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-semibold">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={guestLookupPhone}
                  onChange={e => {
                    setGuestLookupPhone(e.target.value.replace(/\D/g, ''));
                    setGuestLookupSubmitted(false);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full pl-11 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Track
              </button>
            </form>

            {/* Quick Login / Register button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="text-xs text-teal-800 hover:text-teal-950 font-bold inline-flex items-center gap-1.5 bg-white border border-teal-200 px-3.5 py-1.5 rounded-lg shadow-2xs hover:bg-teal-50 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-teal-700" />
                <span>Or Sign In with Mobile OTP / Register</span>
              </button>
            </div>

            {/* Results for guest phone search */}
            {guestLookupSubmitted && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                {guestOrders.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs text-center">
                    No home delivery orders found for mobile number <strong>+91 {guestLookupPhone}</strong>. Please check your number or place a new order.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                      <span>Showing {guestOrders.length} order(s) for +91 {guestLookupPhone}:</span>
                      <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-mono">Patient Verified</span>
                    </div>

                    {guestOrders.map(order => {
                      const loc = locations.find(l => l.locationId === order.locationId);
                      const stages: DeliveryStatus[] = ['Pending', 'Packed', 'Shipped', 'Delivered'];
                      const currentStageIdx = stages.indexOf(order.status);

                      return (
                        <div key={order.orderId} className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="font-mono font-bold text-slate-900">{order.orderId}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setOrderForBill(order)}
                                className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3 text-teal-600" />
                                <span>Bill</span>
                              </button>
                              <span className="font-mono font-bold text-slate-900">₹{order.totalAmount}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                {order.status}
                              </span>
                            </div>
                          </div>

                          <div className="py-2.5">
                            <div className="grid grid-cols-4 gap-1 relative my-2">
                              {stages.map((st, idx) => {
                                const isDone = currentStageIdx >= idx;
                                const isCurrent = order.status === st;
                                return (
                                  <div key={st} className="flex flex-col items-center text-center">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 ${
                                      isCurrent ? 'bg-teal-700 text-white ring-2 ring-teal-200' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                      {isDone ? '✓' : idx + 1}
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">{st}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium mt-2">
                              {order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Deliver to: {order.shippingAddress} · Dispatched by {loc?.locationName}
                            </p>
                            {order.trackingNotes && (
                              <p className="text-[10px] text-teal-800 font-mono mt-1 bg-teal-50 p-1.5 rounded">
                                {order.trackingNotes}
                              </p>
                            )}

                            {/* Itemized bill row */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-600">
                              <span>Items: ₹{order.itemsTotal ?? order.items.reduce((s, it) => s + it.price * it.quantity, 0)} | Courier: {order.courierCharges !== undefined && order.courierCharges > 0 ? `+₹${order.courierCharges}` : 'FREE'}</span>
                              <span className="font-bold text-slate-900 font-sans">Net Bill: <span className="font-mono text-teal-700">₹{order.totalAmount}</span></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-teal-700" />
                  <h3 className="font-bold text-sm text-slate-900">Your Online Prescription Cart</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="text-xs font-semibold text-slate-600">Cart is empty</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Add skin or hair care products to order online</p>
                </div>
              ) : (
                <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {cart.filter(item => item && item.product && item.product.productId).map(item => {
                    const unitPrice = getStoreItemPrice(item.product);
                    const lineTotal = unitPrice * item.quantity;
                    return (
                      <div key={item.product.productId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ProductImageHoverPreview
                            product={item.product}
                            className="w-12 h-12 rounded-lg shrink-0 border border-slate-200 bg-white p-0.5 shadow-2xs"
                            imageClassName="w-full h-full object-contain rounded-md"
                            categoryName={getCategoryDisplayName(item.product, categories)}
                            contextMode="catalog"
                            showQuickFlipBadge={false}
                            showClickHintBadge={false}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{item.product.productName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">₹{unitPrice} each</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.productId, -1)}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-slate-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.productId, 1)}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.productId)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors ml-0.5"
                            title="Remove item from cart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-16 text-right font-bold text-slate-900 ml-1">
                            ₹{lineTotal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                {/* Itemized Bill Breakdown in Cart */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-sans">Formulations Subtotal:</span>
                    <span>₹{itemsSubtotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-teal-800 font-semibold">
                    <span className="font-sans flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-teal-600" />
                      <span>Courier Delivery Charges:</span>
                    </span>
                    <span>
                      {courierCharge === 0 ? (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans text-[10px] font-bold">
                          FREE
                        </span>
                      ) : (
                        `+₹${courierCharge}`
                      )}
                    </span>
                  </div>
                  {courierCharge > 0 && courierSettings?.freeDeliveryAbove > 0 && itemsSubtotal < courierSettings.freeDeliveryAbove && (
                    <div className="text-[10px] text-amber-800 font-sans pt-0.5">
                      💡 Add ₹{courierSettings.freeDeliveryAbove - itemsSubtotal} more for <strong>FREE Delivery</strong>!
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                    <span className="font-sans">Estimated Bill Total:</span>
                    <span className="text-teal-700 text-base">₹{orderBillTotal}</span>
                  </div>
                </div>

                {!currentCustomer ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Customer Verification Required to Buy</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      To complete order purchase, please login with Mobile OTP or Register (User Name, Password, Address, Mobile No.).
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Login with Mobile OTP or Register to Buy</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => handleWhatsAppOrder()}
                      className="py-2.5 px-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp Order</span>
                    </button>

                    <button
                      onClick={openCheckout}
                      className="py-2.5 px-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Proceed Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Online Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Home Delivery & Checkout</h3>
            
            <form onSubmit={handlePlaceOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9845012345"
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Delivery Address</label>
                <textarea
                  required
                  rows={2}
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="House/Flat number, Street, Landmark, Pincode"
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Fulfilling Clinic Branch</label>
                  <select
                    value={assignedBranch}
                    onChange={e => setAssignedBranch(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
                  >
                    {locations.map(l => (
                      <option key={l.locationId} value={l.locationId}>
                        {l.locationCode} - {l.locationName.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Payment Option</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
                  >
                    <option value="UPI Online">UPI Online (Instant QR)</option>
                    <option value="Cash on Delivery">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              {/* Itemized Bill Summary in Checkout */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-sans">Formulations ({cart.reduce((a, b) => a + b.quantity, 0)} items):</span>
                  <span>₹{itemsSubtotal}</span>
                </div>
                <div className="flex items-center justify-between text-teal-800 font-semibold">
                  <span className="font-sans flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Courier / Delivery Fee:</span>
                  </span>
                  <span>
                    {courierCharge === 0 ? (
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans text-[10px] font-bold">
                        FREE
                      </span>
                    ) : (
                      `+₹${courierCharge}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                  <span className="font-sans">Total Bill Payable:</span>
                  <span className="text-teal-700 text-base">₹{orderBillTotal}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800"
                >
                  Confirm & Place Delivery Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {isAppointmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full">
            <h3 className="font-bold text-sm text-slate-900 mb-2">Book Doctor Consultation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Schedule an in-person appointment at Hospete or Hubballi clinic.
            </p>

            {apptBookedSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-medium">
                <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                Consultation appointment registered! Our clinic coordinator will call you to confirm the time slot.
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={apptName}
                    onChange={e => setApptName(e.target.value)}
                    placeholder="Full name"
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Mobile Phone</label>
                    <input
                      type="tel"
                      required
                      value={apptPhone}
                      onChange={e => setApptPhone(e.target.value)}
                      placeholder="9845012345"
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Clinic Branch</label>
                    <select
                      value={apptBranch}
                      onChange={e => setApptBranch(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
                    >
                      {locations.map(l => (
                        <option key={l.locationId} value={l.locationId}>
                          {l.locationCode} - {l.locationName.split(' ')[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Preferred Date</label>
                    <input
                      type="date"
                      required
                      value={apptDate}
                      onChange={e => setApptDate(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Primary Concern</label>
                    <select
                      value={apptConcern}
                      onChange={e => setApptConcern(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
                    >
                      <option value="Hair thinning & dandruff">Hair thinning / Dandruff</option>
                      <option value="Acne & Scars Treatment">Acne & Scars</option>
                      <option value="Pigmentation & Melasma">Pigmentation</option>
                      <option value="Routine Skin Checkup">Routine Skin Checkup</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAppointmentModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800"
                  >
                    Confirm Appointment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Customer Authentication Modal (Mobile OTP / Registration) */}
      {isAuthModalOpen && (
        <CustomerAuthModal
          targetProductTitle={pendingProductToBuy?.productName}
          onClose={() => {
            setIsAuthModalOpen(false);
            setPendingProductToBuy(null);
          }}
          onSuccess={(cust) => {
            setIsAuthModalOpen(false);
            setCustomerName(cust.customerName);
            setCustomerPhone(cust.phone);
            setCustomerAddress(cust.address);
            if (pendingProductToBuy && pendingProductToBuy.productId) {
              setCart(prev => {
                const ex = prev.find(i => i.product && i.product.productId === pendingProductToBuy.productId);
                if (ex) {
                  return prev.map(i => i.product && i.product.productId === pendingProductToBuy.productId ? { ...i, quantity: i.quantity + 1 } : i);
                }
                return [...prev, { product: pendingProductToBuy, quantity: 1 }];
              });
              setPendingProductToBuy(null);
              setIsCartOpen(true);
            }
          }}
        />
      )}

      {/* Customer Order Bill & Tax Receipt Modal */}
      {orderForBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in flex flex-col max-h-[92vh]">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-xs uppercase tracking-wider">Online Order Bill & Receipt</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Print Bill
                </button>
                <button
                  type="button"
                  onClick={() => setOrderForBill(null)}
                  className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans print:p-0">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
                <h2 className="text-base font-black tracking-wide uppercase text-slate-900">
                  MediClinic Derma Care & Hair Health
                </h2>
                <p className="text-[11px] text-slate-600">
                  {locations.find(l => l.locationId === orderForBill.locationId)?.locationName || 'Clinic Fulfillment Depot'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {locations.find(l => l.locationId === orderForBill.locationId)?.address} · Tel: {locations.find(l => l.locationId === orderForBill.locationId)?.phone}
                </p>
                <div className="inline-block mt-2 px-3 py-0.5 bg-teal-50 text-teal-900 border border-teal-200 font-bold uppercase tracking-wider text-[10px] rounded">
                  Patient Home Delivery Bill
                </div>
              </div>

              {/* Order Meta */}
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Consignee</span>
                  <div className="font-bold text-sm text-slate-900">{orderForBill.customerName}</div>
                  <div className="text-slate-700 mt-0.5 leading-relaxed">{orderForBill.shippingAddress}</div>
                  <div className="font-mono text-slate-800 mt-1 font-semibold">📞 +91 {orderForBill.phone}</div>
                </div>

                <div className="text-right space-y-1 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 font-sans text-[10px]">Order # / Bill ID: </span>
                    <strong className="text-slate-900">{orderForBill.orderId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[10px]">Date: </span>
                    <span>{new Date(orderForBill.orderDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[10px]">Payment: </span>
                    <span className="font-bold font-sans">{orderForBill.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[10px]">Status: </span>
                    <span className="font-bold text-teal-800 font-sans">{orderForBill.status}</span>
                  </div>
                  {orderForBill.deliveryAgent && (
                    <div>
                      <span className="text-slate-500 font-sans text-[10px]">Courier: </span>
                      <span>{orderForBill.deliveryAgent}</span>
                    </div>
                  )}
                  {orderForBill.trackingNumber && (
                    <div>
                      <span className="text-slate-500 font-sans text-[10px]">AWB: </span>
                      <span className="font-bold">{orderForBill.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600 bg-slate-50">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Prescribed Formulation</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Price</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {orderForBill.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-2 font-sans font-medium text-slate-900">{it.productName}</td>
                      <td className="py-2 px-2 text-center font-bold">{it.quantity}</td>
                      <td className="py-2 px-2 text-right">₹{it.price}</td>
                      <td className="py-2 px-2 text-right font-bold">₹{it.price * it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-300 font-medium text-slate-600">
                    <td colSpan={4} className="py-1.5 px-2 text-right font-sans">
                      Formulations Subtotal:
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-medium">
                      ₹{orderForBill.itemsTotal ?? orderForBill.items.reduce((s, it) => s + it.price * it.quantity, 0)}
                    </td>
                  </tr>
                  <tr className="font-medium text-teal-800">
                    <td colSpan={4} className="py-1.5 px-2 text-right font-sans">
                      Courier & Delivery Charges:
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold">
                      {orderForBill.courierCharges !== undefined && orderForBill.courierCharges > 0
                        ? `+₹${orderForBill.courierCharges}`
                        : 'FREE (Complimentary)'}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-slate-900 font-bold">
                    <td colSpan={4} className="py-2 px-2 text-right font-sans">
                      {orderForBill.paymentMethod === 'Cash on Delivery'
                        ? 'Cash to Collect (COD Bill Total):'
                        : 'Amount Paid (Prepaid UPI Bill Total):'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-sm text-teal-700">
                      ₹{orderForBill.totalAmount}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {orderForBill.trackingNotes && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600">
                  <span className="font-bold text-slate-800 block">Dispatch / Delivery Note:</span>
                  <span>{orderForBill.trackingNotes}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span>Computer generated delivery bill. Non-returnable once unsealed.</span>
                <span className="font-mono">Thank you for ordering with MediClinic!</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setOrderForBill(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rich Product Details & Multi-Angle Inspector Modal */}
      {selectedProductForDetails && selectedProductForDetails.productId && (
        <ProductDetailsModal
          product={selectedProductForDetails}
          isOpen={!!selectedProductForDetails}
          onClose={() => setSelectedProductForDetails(null)}
          categoryName={getCategoryDisplayName(selectedProductForDetails, categories)}
          contextMode="store"
          locationId={storeLocationId === 'ALL' ? undefined : storeLocationId}
          actionLabel="Add to Cart"
          onAction={(qty) => {
            addToCart(selectedProductForDetails, qty || 1);
          }}
          secondaryActionLabel="Order via WhatsApp"
          onSecondaryAction={() => handleWhatsAppOrder(selectedProductForDetails)}
        />
      )}

    </div>
  );
};
