import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Product, StockBatch, Customer, PaymentMode, SalesHeader } from '../../types/erp';
import { ProductIcon } from '../common/ProductIcon';
import { ProductImageHoverPreview, ProductDetailsModal } from '../common/ProductImageHoverPreview';
import { PrintReceiptModal } from './PrintReceiptModal';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  UserPlus, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  AlertCircle,
  Receipt,
  Sparkles,
  Truck,
  Tags,
  X,
  ShoppingBag
} from 'lucide-react';
import { sortBatchesByFefo } from '../../utils/batchPricing';
import { isProductInCategory, getCategoryDisplayName } from '../../utils/categoryUtils';

interface CartLine {
  product: Product;
  selectedBatchId: string;
  quantity: number;
}

export const PosBilling: React.FC = () => {
  const {
    products,
    categories,
    subcategories,
    batches,
    customers,
    selectedLocationId,
    activeLocation,
    locations,
    executeSale,
    quickAddCustomer,
    courierSettings,
    batchPricingMode,
    setBatchPricingMode,
    getProductPriceResolution
  } = useClinic();

  // If ALL is selected in header, default POS checkout to Hospete
  const currentBranchId = selectedLocationId === 'ALL' ? 'LOC-HOS' : selectedLocationId;
  const currentBranch = locations.find(l => l.locationId === currentBranchId) || locations[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-005'); // Walk-in Patient
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [upiRefNo, setUpiRefNo] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isCourierDelivery, setIsCourierDelivery] = useState(false);
  const [courierFee, setCourierFee] = useState<number>(() => courierSettings?.standardCourierCharge || 50);
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [recentCompletedSale, setRecentCompletedSale] = useState<SalesHeader | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [onlyLocationProducts, setOnlyLocationProducts] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batches for the current clinic branch
  const branchBatches = useMemo(() => {
    return batches.filter(b => b.locationId === currentBranchId && b.currentQuantity > 0);
  }, [batches, currentBranchId]);

  // Product stock calculation for current branch
  const productStockMap = useMemo(() => {
    const map: Record<string, { totalQty: number; batches: StockBatch[] }> = {};
    branchBatches.forEach(b => {
      if (!b || !b.productId) return;
      if (!map[b.productId]) {
        map[b.productId] = { totalQty: 0, batches: [] };
      }
      map[b.productId].totalQty += b.currentQuantity;
      map[b.productId].batches.push(b);
    });

    // Sort batches following FEFO (First Expiry First Out; tie-break: oldest purchaseDate)
    Object.values(map).forEach(entry => {
      entry.batches = sortBatchesByFefo(entry.batches);
    });

    return map;
  }, [branchBatches]);

  // Filtered products list (Strictly location-wise: only show products available at this clinic location)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isActive) return false;

      // When onlyLocationProducts is active, only show products with available stock in this clinic branch!
      if (onlyLocationProducts) {
        const stockInfo = productStockMap[p.productId];
        if (!stockInfo || stockInfo.totalQty <= 0) return false;
      }

      if (selectedCategory !== 'ALL' && !isProductInCategory(p, selectedCategory, categories)) return false;
      if (selectedSubcategory !== 'ALL' && p.subcategoryId !== selectedSubcategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.productName.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q) ||
          p.volumeSize.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, selectedSubcategory, searchQuery, onlyLocationProducts, productStockMap, categories]);

  // Add product to cart (auto-selects FEFO batch; automatically spills to next batch if first batch reaches max)
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    const stockInfo = productStockMap[product.productId];
    if (!stockInfo || stockInfo.totalQty <= 0) return;

    // Resolve FEFO active batch and effective price for single source of truth verification
    const priceRes = getProductPriceResolution(product, currentBranchId);
    const activeBatch = priceRes.activeBatch;
    const activePrice = priceRes.effectivePrice;

    // Structured Debug Logging (Requirement 6)
    console.log('[POS Pricing Audit] Action: addToCart', {
      ProductId: product.productId,
      'Active Batch Id': activeBatch?.batchId || 'NONE',
      'Active Batch Number': activeBatch?.batchNumber || 'NONE',
      'Active Batch Selling Price': activeBatch ? activeBatch.sellingPrice : product.sellingPrice,
      'UI Display Price': activePrice,
      'Cart Price': activePrice,
      'Quantity Requested': quantityToAdd,
      'Pricing Mode': batchPricingMode
    });

    // Validation Rule (Requirement 7): If Active Batch Price != Add To Bill Price
    if (batchPricingMode === 'ACTIVE_BATCH' && activeBatch) {
      if (activeBatch.sellingPrice !== activePrice) {
        console.warn('⚠️ PRICE SOURCE MISMATCH DETECTED: Active Batch Price != Add To Bill Price', {
          ProductId: product.productId,
          'Active Batch Price': activeBatch.sellingPrice,
          'Add To Bill Price': activePrice,
          'Active Batch Number': activeBatch.batchNumber
        });
      }
    }

    setCart(prev => {
      let remaining = quantityToAdd;
      let newCart = [...prev];

      const currentTotalInCart = newCart
        .filter(c => c.product.productId === product.productId)
        .reduce((sum, c) => sum + c.quantity, 0);

      const maxCanAdd = Math.max(0, stockInfo.totalQty - currentTotalInCart);
      const actualToAdd = Math.min(remaining, maxCanAdd);
      if (actualToAdd <= 0) return prev;

      remaining = actualToAdd;

      // Allocate across FEFO sorted batches
      for (const batch of stockInfo.batches) {
        if (remaining <= 0) break;
        if (batch.currentQuantity <= 0) continue;

        const lineIndex = newCart.findIndex(
          c => c.product.productId === product.productId && c.selectedBatchId === batch.batchId
        );
        const currentQtyInLine = lineIndex >= 0 ? newCart[lineIndex].quantity : 0;
        const availableInBatch = batch.currentQuantity - currentQtyInLine;

        if (availableInBatch > 0) {
          const allocate = Math.min(remaining, availableInBatch);
          if (lineIndex >= 0) {
            newCart[lineIndex] = {
              ...newCart[lineIndex],
              quantity: newCart[lineIndex].quantity + allocate
            };
          } else {
            newCart.push({
              product,
              selectedBatchId: batch.batchId,
              quantity: allocate
            });
          }
          remaining -= allocate;
        }
      }

      return newCart;
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const match = products.find(
      p => p.productCode.toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (match) {
      addToCart(match);
      setBarcodeInput('');
    }
  };

  const updateCartQty = (idx: number, delta: number) => {
    setCart(prev => {
      const target = prev[idx];
      if (!target || !target.product) return prev;
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      const stockInfo = productStockMap[target.product.productId];
      const batch = stockInfo?.batches.find(b => b.batchId === target.selectedBatchId);
      const maxAvailable = batch ? batch.currentQuantity : 0;
      if (newQty > maxAvailable) return prev;
      return prev.map((c, i) => i === idx ? { ...c, quantity: newQty } : c);
    });
  };

  const changeBatch = (idx: number, batchId: string) => {
    setCart(prev =>
      prev.map((c, i) => i === idx ? { ...c, selectedBatchId: batchId, quantity: 1 } : c)
    );
  };

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  // Helper: Get item selling rate respecting batchPricingMode
  const getItemRate = (item: CartLine): number => {
    if (!item || !item.product) return 0;
    const stockInfo = productStockMap[item.product.productId];
    const batch = stockInfo?.batches.find(b => b.batchId === item.selectedBatchId);
    if (batchPricingMode === 'ACTIVE_BATCH' && batch && batch.sellingPrice > 0) {
      return batch.sellingPrice;
    }
    return item.product.sellingPrice || 0;
  };

  // Financial calculations
  const grossTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const rate = getItemRate(item);
      return acc + rate * item.quantity;
    }, 0);
  }, [cart, productStockMap, batchPricingMode]);

  const activeCourierCharge = isCourierDelivery ? Math.max(0, Number(courierFee) || 0) : 0;
  const netPayable = Math.max(0, grossTotal + activeCourierCharge - (discountAmount || 0));

  const selectedCustomer = customers.find(c => c.customerId === selectedCustomerId) || customers[customers.length - 1];

  const handleCheckout = () => {
    if (cart.length === 0 || isSubmitting) return;
    if (paymentMode === 'UPI' && !upiRefNo.trim()) {
      alert('Please enter the UPI Reference Number for digital payments.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer.customerId,
        customerName: selectedCustomer.customerName,
        customerPhone: selectedCustomer.phone,
        items: cart.map(item => {
          const rate = getItemRate(item);
          return {
            productId: item.product.productId,
            batchId: item.selectedBatchId,
            quantity: item.quantity,
            rate
          };
        }),
        paymentMode,
        upiReferenceNo: paymentMode === 'UPI' ? upiRefNo.trim() : undefined,
        discountAmount: Number(discountAmount) || 0,
        courierCharges: activeCourierCharge
      };

      const newSale = executeSale(payload);
      setRecentCompletedSale(newSale);
      // Reset cart
      setCart([]);
      setDiscountAmount(0);
      setIsCourierDelivery(false);
      setUpiRefNo('');
      setSelectedCustomerId('CUST-005');
      setIsMobileCartOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    const created = quickAddCustomer(newCustName.trim(), newCustPhone.trim(), newCustAddress.trim());
    setSelectedCustomerId(created.customerId);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setIsNewCustModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Location Banner & Next Invoice Sequence Preview */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h1 className="text-base font-bold text-slate-900">
              {currentBranch.locationName}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-700">
              POS Counter
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentBranch.address} · {currentBranch.phone}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Admin Setting: Batch Pricing Mode Switcher */}
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200/90 rounded-lg px-2.5 py-1">
            <Tags className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="text-slate-600 font-sans text-[11px]">Pricing:</span>
            <button
              type="button"
              onClick={() => setBatchPricingMode(batchPricingMode === 'ACTIVE_BATCH' ? 'PRODUCT_MASTER' : 'ACTIVE_BATCH')}
              className="font-bold text-teal-900 hover:text-teal-700 underline decoration-dotted transition-colors text-[11px]"
              title="Click to toggle: Option A (Active Batch Price) vs Option B (Latest Product Master Price)"
            >
              {batchPricingMode === 'ACTIVE_BATCH' ? 'Active Batch (FEFO)' : 'Product Master'}
            </button>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-900 font-bold">
              {batchPricingMode === 'ACTIVE_BATCH' ? 'Option A' : 'Option B'}
            </span>
          </div>

          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
            Next Bill: <strong className="text-slate-900">{currentBranch.locationCode}-{String(currentBranch.nextInvoiceSeq).padStart(6, '0')}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Product Catalog & Fast Picker (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barcode & Search Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3 rounded-xl border border-slate-200">
            
            {/* Search Input */}
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search medicines, serums, lotions..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:bg-white text-slate-900"
              />
            </div>

            {/* Quick Barcode Scanner Form */}
            <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 relative">
              <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Scan / Type Code (e.g. PRD-HAIR-001)"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:bg-white font-mono text-slate-900"
              />
            </form>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedSubcategory('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Categories ({products.filter(p => p.isActive).length})
            </button>
            {categories
              .filter(cat => cat.isActive !== false || products.some(p => p.isActive && isProductInCategory(p, cat.categoryId, categories)))
              .map(cat => {
                const count = products.filter(p => p.isActive && isProductInCategory(p, cat.categoryId, categories)).length;
                return (
                  <button
                    key={cat.categoryId}
                    onClick={() => {
                      setSelectedCategory(cat.categoryId);
                      setSelectedSubcategory('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
                      selectedCategory === cat.categoryId
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat.categoryName} ({count})
                  </button>
                );
              })}
          </div>

          {/* Subcategory Filter Tabs (When category is selected) */}
          {selectedCategory !== 'ALL' && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 px-1 uppercase tracking-wider shrink-0">Subcategory:</span>
              <button
                type="button"
                onClick={() => setSelectedSubcategory('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors font-medium cursor-pointer ${
                  selectedSubcategory === 'ALL'
                    ? 'bg-teal-700 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-teal-900'
                }`}
              >
                All {categories.find(c => c.categoryId === selectedCategory)?.categoryName}
              </button>
              {subcategories
                .filter(s => s.categoryId === selectedCategory && s.isActive !== false)
                .map(sub => {
                  const count = products.filter(p => p.isActive && p.subcategoryId === sub.subcategoryId).length;
                  return (
                    <button
                      key={sub.subcategoryId}
                      type="button"
                      onClick={() => setSelectedSubcategory(sub.subcategoryId)}
                      className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors font-medium cursor-pointer ${
                        selectedSubcategory === sub.subcategoryId
                          ? 'bg-teal-700 text-white shadow-2xs font-bold'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-teal-900'
                      }`}
                    >
                      {sub.subcategoryName} ({count})
                    </button>
                  );
                })}
            </div>
          )}

          {/* Location Scope Indicator & Toggle */}
          <div className="flex items-center justify-between text-xs bg-teal-50/70 px-3 py-1.5 rounded-lg border border-teal-200">
            <span className="text-teal-900 font-medium">
              Showing <strong>{filteredProducts.length}</strong> items in <strong>{currentBranch.locationName}</strong>
            </span>
            <button
              type="button"
              onClick={() => setOnlyLocationProducts(!onlyLocationProducts)}
              className="text-teal-800 hover:text-teal-950 font-semibold underline text-[11px]"
            >
              {onlyLocationProducts ? 'Show all items (including Sold Out)' : 'Hide sold out items'}
            </button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 && (
              <div className="col-span-1 sm:col-span-2 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-700">No items available in {currentBranch.locationName}</p>
                <p className="text-[11px] text-slate-500 mt-1">Inward a stock batch or transfer products from another branch.</p>
              </div>
            )}
            {filteredProducts.map(product => {
              const stock = productStockMap[product.productId];
              const availableQty = stock ? stock.totalQty : 0;
              const hasStock = availableQty > 0;
              const priceRes = getProductPriceResolution(product, currentBranchId);
              const activePrice = priceRes.effectivePrice;
              const activeBatch = priceRes.activeBatch;
              const originalMrp = Math.round(activePrice * 1.18);

              return (
                <div
                  key={product.productId}
                  onClick={() => setSelectedProductForDetails(product)}
                  className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden cursor-pointer group ${
                    hasStock
                      ? 'border-slate-200 hover:border-teal-500 hover:shadow-md'
                      : 'border-rose-200 bg-rose-50/15 hover:border-rose-300'
                  }`}
                  title={hasStock ? "Click product to view details and multi-angle views" : "Sold Out - Click to view specifications"}
                >
                  {/* Tall Vertical Product Showcase with Click-to-View Multi-View Inspector */}
                  <div className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40">
                    <ProductImageHoverPreview
                      product={product}
                      className={`h-48 sm:h-52 w-full ${!hasStock ? 'opacity-85' : ''}`}
                      categoryName={getCategoryDisplayName(product, categories)}
                      stockQty={availableQty}
                      contextMode="pos"
                      locationId={currentBranchId}
                      actionLabel="Add to Bill"
                      disableInternalModal={true}
                      onThumbnailClick={() => setSelectedProductForDetails(product)}
                      onAction={(qty) => {
                        if (hasStock) addToCart(product, qty || 1);
                      }}
                      showQuickFlipBadge={true}
                    />

                    {/* Prominent SOLD OUT Watermark Overlay when stock is zero */}
                    {!hasStock && (
                      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[0.5px] flex items-center justify-center z-10 pointer-events-none">
                        <span className="bg-rose-600 text-white font-black text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg border-2 border-white transform -rotate-6">
                          Sold Out
                        </span>
                      </div>
                    )}

                    {/* Volume Badge */}
                    <span className="absolute bottom-2 left-2 z-10 text-[10px] font-mono text-slate-500 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200/80 pointer-events-none">
                      {product.volumeSize}
                    </span>

                    {/* Live Stock Badge */}
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                      {hasStock ? (
                        <span className="text-[10px] font-semibold font-mono text-teal-800 bg-teal-50/95 border border-teal-200 px-2 py-0.5 rounded-full shadow-2xs">
                          {availableQty} in stock
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold font-mono text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full shadow-2xs uppercase">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Details & Price */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] gap-1">
                        <span className="font-mono text-slate-400">{product.productCode}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium truncate max-w-[130px]">
                          {getCategoryDisplayName(product, categories)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug mt-1 group-hover:text-teal-900 transition-colors">
                        {product.productName}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          Rs. {activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {priceRes.pricingSource === 'active_batch' && activeBatch ? (
                          <div className="text-[10px] text-teal-800 font-mono font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                            <span className="truncate max-w-[130px]">FEFO: {activeBatch.batchNumber}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Master Default Price
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <span className="line-through">
                            Rs. {originalMrp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-teal-700 font-medium">(-15%)</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!hasStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasStock) addToCart(product);
                        }}
                        className={`min-h-[44px] px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                          hasStock
                            ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs'
                            : 'bg-rose-50 border border-rose-200 text-rose-600 cursor-not-allowed'
                        }`}
                        title={hasStock ? "Quick add 1 unit to bill" : "Product is Sold Out"}
                      >
                        {hasStock ? (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Add</span>
                          </>
                        ) : (
                          <span>Sold Out</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No matching products found</p>
                <p className="text-[11px] text-slate-400 mt-1">Try another search keyword or category filter</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Checkout Cart & Counter Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between min-h-[640px]">
          
          <div className="space-y-4">
            
            {/* Customer Selector / Quick Add */}
            <div className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-800">Patient / Customer</label>
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(true)}
                  className="text-xs text-teal-700 font-medium hover:text-teal-900 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Quick Add</span>
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                {customers.map(c => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.customerName} ({c.phone}) - {c.loyaltyPoints} pts
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
                <span>Items ({cart.length})</span>
                <span>Subtotal</span>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="text-xs font-medium text-slate-600">Cart is empty</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click any product to add to bill</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {cart.map((item, idx) => {
                    if (!item || !item.product) return null;
                    const stock = productStockMap[item.product.productId];
                    const availableBatches = stock ? stock.batches : [];
                    const selectedBatch = availableBatches.find(b => b.batchId === item.selectedBatchId);
                    const effectiveRate = getItemRate(item);
                    const batchCost = selectedBatch?.costPrice ?? item.product.costPrice;
                    const lineTotal = effectiveRate * item.quantity;
                    const lineProfit = (effectiveRate - batchCost) * item.quantity;
                    const lineMargin = effectiveRate > 0 ? ((effectiveRate - batchCost) / effectiveRate) * 100 : 0;

                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-start justify-between gap-2.5">
                          <ProductImageHoverPreview
                            product={item.product}
                            className="w-12 h-12 rounded-lg shrink-0 border border-slate-200 bg-white p-0.5 shadow-2xs"
                            imageClassName="w-full h-full object-contain rounded-md"
                            categoryName={getCategoryDisplayName(item.product, categories)}
                            stockQty={stock?.totalQty}
                            contextMode="catalog"
                            showQuickFlipBadge={false}
                            showClickHintBadge={false}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-900 line-clamp-1">{item.product.productName}</span>
                            <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>Batch Rate: <strong className="text-slate-800 font-mono">₹{effectiveRate}</strong></span>
                              <span>·</span>
                              <span>Cost: <strong className="text-slate-600 font-mono">₹{batchCost}</strong></span>
                              <span className="text-teal-700 bg-teal-50 px-1 py-0.2 rounded font-mono font-semibold text-[10px]">
                                {lineMargin.toFixed(0)}% margin (₹{lineProfit} profit)
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">₹{lineTotal}</span>
                        </div>

                        {/* Batch Selector (FEFO Priority) */}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 block mb-0.5">Batch Allocation (FEFO)</label>
                            <select
                              value={item.selectedBatchId}
                              onChange={e => changeBatch(idx, e.target.value)}
                              className="text-[11px] font-mono py-1 px-1.5 bg-white border border-slate-200 rounded w-full focus:outline-hidden"
                            >
                              {availableBatches.map(b => (
                                <option key={b.batchId} value={b.batchId}>
                                  {b.batchNumber} (Avail: {b.currentQuantity} | Rate: ₹{b.sellingPrice} | Cost: ₹{b.costPrice} | Exp: {b.expiryDate})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1 mt-3">
                            <button
                              onClick={() => updateCartQty(idx, -1)}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center font-mono font-bold text-slate-900">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(idx, 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="ml-1 text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Payment & Final Checkout Summary */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            
            {/* Payment Method Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMode === 'Cash'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMode === 'UPI'
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('Card')}
                  className={`py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMode === 'Card'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
              </div>

              {/* UPI Reference Input */}
              {paymentMode === 'UPI' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={upiRefNo}
                    onChange={e => setUpiRefNo(e.target.value)}
                    placeholder="Enter UPI Transaction / Ref # (e.g. 489128491023)"
                    className="w-full text-xs font-mono py-1.5 px-3 bg-teal-50/50 border border-teal-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-slate-900"
                    required
                  />
                </div>
              )}
            </div>

            {/* Courier / Home Delivery Option */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Courier / Home Delivery Dispatch</span>
                </span>
                <input
                  type="checkbox"
                  checked={isCourierDelivery}
                  onChange={e => setIsCourierDelivery(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
              </label>
              {isCourierDelivery && (
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 text-[11px] font-sans">Courier Charge (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={courierFee}
                    onChange={e => setCourierFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 text-right py-0.5 px-1.5 bg-white border border-teal-300 rounded text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Gross Amount</span>
                <span className="tabular-nums">₹{grossTotal.toFixed(2)}</span>
              </div>

              {isCourierDelivery && activeCourierCharge > 0 && (
                <div className="flex justify-between text-teal-800 font-semibold">
                  <span className="font-sans">Courier Charges</span>
                  <span className="tabular-nums">+₹{activeCourierCharge.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span className="font-sans">Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  max={grossTotal}
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-20 text-right py-0.5 px-1.5 bg-white border border-slate-200 rounded text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span className="font-sans">Net Payable</span>
                <span className="text-teal-700 tabular-nums">₹{netPayable.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                cart.length > 0
                  ? 'bg-teal-700 text-white hover:bg-teal-800 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Complete Sale & Generate Bill</span>
            </button>

          </div>

        </div>

      </div>

      {/* Floating Bottom Cart Trigger for Mobile (One-Hand Usable on Phone/Tablet) */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} Items in Bill
              </div>
              <div className="text-base font-bold text-teal-700 tabular-nums">
                ₹{netPayable.toFixed(2)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="min-h-[44px] px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Receipt className="w-4 h-4" />
              <span>Review Cart & Pay →</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Slide-Up Drawer (Fully Usable with One Hand on Phone/Tablet) */}
      {isMobileCartOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileCartOpen(false)}
        >
          <div 
            className="bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto p-5 pb-8 shadow-2xl space-y-4 border-t border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Current Sale Bill</h3>
                  <p className="text-xs text-slate-500">{currentBranch.locationName} · Next: {currentBranch.locationCode}-{String(currentBranch.nextInvoiceSeq).padStart(6, '0')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Selector */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700">Patient / Customer</label>
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(true)}
                  className="text-xs text-teal-700 font-semibold hover:text-teal-900 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Walk-in</span>
                </button>
              </div>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
              >
                {customers.map(c => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.customerName} ({c.phone}) - {c.loyaltyPoints} pts
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pb-1 border-b border-slate-100">
                <span>Items ({cart.length})</span>
                <span>Subtotal</span>
              </div>

              {cart.map((item, idx) => {
                if (!item || !item.product) return null;
                const stock = productStockMap[item.product.productId];
                const availableBatches = stock ? stock.batches : [];
                const effectiveRate = getItemRate(item);
                const lineTotal = effectiveRate * item.quantity;

                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 line-clamp-1">{item.product.productName}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Rate: <strong className="text-slate-800 font-mono">₹{effectiveRate}</strong> · {item.quantity} units
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                        ₹{lineTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Batch & Large Touch Controls */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                      <select
                        value={item.selectedBatchId}
                        onChange={e => changeBatch(idx, e.target.value)}
                        className="text-[11px] font-mono py-1 px-2 bg-white border border-slate-200 rounded-lg flex-1 focus:outline-hidden"
                      >
                        {availableBatches.map(b => (
                          <option key={b.batchId} value={b.batchId}>
                            {b.batchNumber} (Avail: {b.currentQuantity} | ₹{b.sellingPrice})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(idx, -1)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-white border border-slate-300 rounded-xl text-slate-700 active:bg-slate-200 font-bold cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-slate-900 text-sm">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(idx, 1)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-white border border-slate-300 rounded-xl text-slate-700 active:bg-slate-200 font-bold cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(idx)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-xl ml-1 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 block">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === 'Cash'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === 'UPI'
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('Card')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === 'Card'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>
              </div>

              {paymentMode === 'UPI' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={upiRefNo}
                    onChange={e => setUpiRefNo(e.target.value)}
                    placeholder="Enter UPI Ref # (e.g. 489128491023)"
                    className="w-full text-xs font-mono py-2.5 px-3 bg-teal-50/50 border border-teal-300 rounded-xl focus:outline-hidden text-slate-900"
                    required
                  />
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Gross Amount</span>
                <span className="tabular-nums">₹{grossTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="font-sans">Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  max={grossTotal}
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-24 text-right py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span className="font-sans">Net Payable</span>
                <span className="text-teal-700 tabular-nums">₹{netPayable.toFixed(2)}</span>
              </div>
            </div>

            {/* Mobile Checkout Button (Big 48px touch target) */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className={`w-full min-h-[48px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                cart.length > 0 && !isSubmitting
                  ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span>{isSubmitting ? 'Processing Bill...' : `Complete Sale · ₹${netPayable.toFixed(2)}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 max-w-sm w-full">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Add Walk-in Patient</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="e.g. Rajesh Patil"
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9845012345"
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Local Address / Locality</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  placeholder="e.g. College Road, Hospete"
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800"
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice & Receipt Print Modal */}
      {recentCompletedSale && (
        <PrintReceiptModal
          sale={recentCompletedSale}
          location={currentBranch}
          onClose={() => setRecentCompletedSale(null)}
        />
      )}

      {/* Product Details & Multi-Angle Inspector Modal Opened on Click */}
      {selectedProductForDetails && selectedProductForDetails.productId && (
        <ProductDetailsModal
          product={selectedProductForDetails}
          isOpen={!!selectedProductForDetails}
          onClose={() => setSelectedProductForDetails(null)}
          categoryName={getCategoryDisplayName(selectedProductForDetails, categories)}
          stockQty={productStockMap[selectedProductForDetails.productId]?.totalQty || 0}
          contextMode="pos"
          locationId={currentBranchId}
          actionLabel="Add to Bill"
          onAction={(qty) => {
            addToCart(selectedProductForDetails, qty || 1);
          }}
        />
      )}

    </div>
  );
};
