import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Product, ProductImageView, StockBatch } from '../../types/erp';
import { useClinic } from '../../context/ClinicContext';
import { resolveProductSellingPrice } from '../../utils/batchPricing';
import { ProductIcon } from './ProductIcon';
import { 
  Eye, 
  RotateCw, 
  Sparkles, 
  Maximize2, 
  X, 
  Check, 
  ShoppingBag, 
  Plus, 
  Minus,
  ShieldCheck, 
  FileText,
  ZoomIn,
  ZoomOut,
  MessageSquare,
  PackageCheck,
  Layers,
  ChevronRight,
  Info,
  Tags,
  CheckCircle2,
  Clock
} from 'lucide-react';

// Default clinical front and back image presets by category / product code
export const CATEGORY_IMAGE_PRESETS: Record<string, { front: string; back: string }> = {
  'CAT-HAIR': {
    front: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    back: 'https://images.unsplash.com/photo-1608248597359-bb43e26461a2?auto=format&fit=crop&w=800&q=80'
  },
  'CAT-SKIN': {
    front: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    back: 'https://images.unsplash.com/photo-1556228722-d0b5de70b774?auto=format&fit=crop&w=800&q=80'
  },
  'CAT-SOAP': {
    front: 'https://images.unsplash.com/photo-1607006314644-24e5ba7a1b32?auto=format&fit=crop&w=800&q=80',
    back: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=800&q=80'
  },
  'CAT-FACEWASH': {
    front: 'https://images.unsplash.com/photo-1556228722-d0b5de70b774?auto=format&fit=crop&w=800&q=80',
    back: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80'
  },
  'CAT-HAIROIL': {
    front: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80',
    back: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80'
  },
  'CAT-SUNSCREEN': {
    front: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
    back: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'
  }
};

/**
 * Resolves the primary Front View image URL for any clinical product.
 * Prioritizes custom uploaded front images, imageViews with 'front',
 * followed by specialized clinical name-matching presets, and category presets.
 */
export const getProductFrontImageUrl = (product?: Product | null): string => {
  if (!product) {
    return 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80';
  }
  if (product.imagePath && product.imagePath.trim()) {
    return product.imagePath.trim();
  }
  if (product.images && product.images.length > 0 && product.images[0] && product.images[0].trim()) {
    return product.images[0].trim();
  }
  if (product.imageViews && product.imageViews.length > 0) {
    const front = product.imageViews.find(v => v.viewType === 'front');
    if (front?.url && front.url.trim()) return front.url.trim();
    if (product.imageViews[0]?.url && product.imageViews[0].url.trim()) return product.imageViews[0].url.trim();
  }

  // Name and code-based matching for specific clinical products
  const name = (product.productName || '').toLowerCase();
  const code = (product.productCode || '').toLowerCase();

  if (name.includes('hair color') || name.includes('hair colour') || name.includes('henna') || code.includes('hair-010') || code.includes('hair-021')) {
    return 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80';
  }
  if (name.includes('aloe') || name.includes('facial gel') || code.includes('fcw-005')) {
    return 'https://images.unsplash.com/photo-1556228722-d0b5de70b774?auto=format&fit=crop&w=800&q=80';
  }
  if (name.includes('lightening') || name.includes('barrier cream') || code.includes('skn-230')) {
    return 'https://images.unsplash.com/photo-1608248597359-bb43e26461a2?auto=format&fit=crop&w=800&q=80';
  }
  if (name.includes('shampoo') || code.includes('hair-008') || code.includes('hair-009')) {
    return 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80';
  }

  const preset = (product.categoryId && CATEGORY_IMAGE_PRESETS[product.categoryId]) || CATEGORY_IMAGE_PRESETS['CAT-SKIN'];
  return preset.front;
};

// Helper: resolves full set of image views for any product
export const getProductImageViews = (product?: Product | null): ProductImageView[] => {
  if (!product) return [];
  const frontUrl = getProductFrontImageUrl(product);
  const preset = (product.categoryId && CATEGORY_IMAGE_PRESETS[product.categoryId]) || CATEGORY_IMAGE_PRESETS['CAT-SKIN'];

  if (product.imageViews && product.imageViews.length > 0) {
    // Ensure the front view has a valid image URL
    return product.imageViews.map((v, i) => {
      if (v.viewType === 'front' && (!v.url || !v.url.trim())) {
        return { ...v, url: frontUrl };
      }
      if (i === 0 && (!v.url || !v.url.trim())) {
        return { ...v, url: frontUrl };
      }
      return v;
    });
  }

  const views: ProductImageView[] = [];

  // Front View
  views.push({
    url: frontUrl,
    viewType: 'front',
    label: 'Front View (Packaging & Label)'
  });

  // Back View
  const backUrl = product.backImagePath || product.images?.[1] || preset.back;
  views.push({
    url: backUrl,
    viewType: 'back',
    label: 'Back View (Ingredients, Usage & Directions)'
  });

  // Additional views if images array has > 2
  if (product.images && product.images.length > 2) {
    for (let i = 2; i < product.images.length; i++) {
      if (product.images[i] && product.images[i].trim()) {
        views.push({
          url: product.images[i].trim(),
          viewType: i === 2 ? 'side' : 'packaging',
          label: i === 2 ? 'Side / Texture View' : `View Angle ${i + 1}`
        });
      }
    }
  }

  return views;
};

export interface ProductDetailsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  categoryName?: string;
  stockQty?: number;
  contextMode?: 'pos' | 'store' | 'catalog';
  actionLabel?: string;
  onAction?: (quantity?: number) => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  initialViewIndex?: number;
  locationId?: string;
  activeBatch?: StockBatch;
  nextBatch?: StockBatch;
}

/**
 * Rich Product Details Modal opened on Click
 * Displays high-res multi-view images (Front & Back), zoom inspection,
 * FEFO Current Selling Batch & Next Batch details, full clinical ingredients, usage directions, and direct actions.
 */
export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  categoryName,
  stockQty,
  contextMode = 'pos',
  actionLabel,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  initialViewIndex = 0,
  locationId,
  activeBatch: propActiveBatch,
  nextBatch: propNextBatch
}) => {
  const { batches, selectedLocationId, batchPricingMode } = useClinic();
  const views = useMemo(() => getProductImageViews(product), [product]);
  const [activeViewIndex, setActiveViewIndex] = useState(initialViewIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'clinical' | 'overview'>('clinical');
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Live FEFO Batch & Pricing Resolution
  const priceResolution = useMemo(() => {
    const loc = locationId || (selectedLocationId === 'ALL' ? undefined : selectedLocationId);
    return resolveProductSellingPrice({
      product,
      batches,
      locationId: loc,
      pricingMode: batchPricingMode
    });
  }, [product, batches, locationId, selectedLocationId, batchPricingMode]);

  const activeBatch = propActiveBatch || priceResolution.activeBatch;
  const nextBatch = propNextBatch || priceResolution.nextBatch;
  const effectivePrice = priceResolution.effectivePrice;
  const effectiveStock = stockQty !== undefined ? stockQty : priceResolution.totalAvailableQty;

  useEffect(() => {
    setActiveViewIndex(initialViewIndex);
    setIsZoomed(false);
    setQuantity(1);
    setAddedSuccess(false);
  }, [isOpen, initialViewIndex, product]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined' || !product || !product.productId) return null;

  const currentView = views[activeViewIndex] || views[0] || { url: '', viewType: 'front' as const, label: 'Front View' };
  const isBackView = currentView.viewType === 'back';
  const originalMrp = Math.round(effectivePrice * 1.18);
  const hasStock = stockQty === undefined || stockQty > 0;

  // Debug Logging & Single Source of Truth Validation (Requirements 6 & 7)
  useEffect(() => {
    if (!isOpen || !product || !product.productId) return;

    const activeBatchSellingPrice = activeBatch ? activeBatch.sellingPrice : product.sellingPrice;
    const uiDisplayPrice = effectivePrice;
    const cartPrice = effectivePrice;

    // Structured debug logging to easily verify pricing synchronization
    console.log('[POS Pricing Audit] Product Details Screen:', {
      ProductId: product.productId,
      'Active Batch Id': activeBatch?.batchId || 'NONE',
      'Active Batch Number': activeBatch?.batchNumber || 'NONE',
      'Active Batch Selling Price': activeBatchSellingPrice,
      'UI Display Price': uiDisplayPrice,
      'Cart Price': cartPrice,
      'Unit Add-To-Bill Price': effectivePrice,
      'Total Add-To-Bill Price': effectivePrice * quantity,
      'Pricing Mode': batchPricingMode
    });

    // Validation Rule: If Active Batch Price != Add To Bill Price
    if (batchPricingMode === 'ACTIVE_BATCH' && activeBatch) {
      if (activeBatch.sellingPrice !== effectivePrice) {
        console.warn('⚠️ PRICE SOURCE MISMATCH DETECTED: Active Batch Price != Add To Bill Price', {
          ProductId: product.productId,
          'Active Batch Price': activeBatch.sellingPrice,
          'Add To Bill Price': effectivePrice,
          'Active Batch Number': activeBatch.batchNumber
        });
      }
    }
  }, [isOpen, product.productId, activeBatch, effectivePrice, quantity, batchPricingMode]);

  const handleActionClick = () => {
    if (onAction) {
      onAction(quantity);
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
      }, 1800);
    }
  };

  const handleToggleAngle = () => {
    setActiveViewIndex(prev => (prev === 0 ? 1 : 0));
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-200 text-left"
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Product Details & Inspector
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                {product.productCode}
              </span>
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                {categoryName || product.categoryId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 hidden sm:inline-block font-mono mr-1">
              Press Esc to close
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Multi-Angle Visual Inspection (Left) + Rich Details (Right) */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: Large Interactive Image & Angle Switching    */}
          {/* ========================================================= */}
          <div className="lg:col-span-6 flex flex-col space-y-3.5">
            {/* Viewport Stage */}
            <div className="relative h-72 sm:h-84 md:h-96 w-full bg-gradient-to-b from-slate-50 via-white to-slate-50/80 rounded-2xl border border-slate-200 flex items-center justify-center p-4 overflow-hidden group select-none">
              
              {currentView.url ? (
                <img
                  src={currentView.url}
                  alt={`${product.productName} - ${currentView.label}`}
                  className={`max-h-full max-w-full object-contain drop-shadow-md transition-all duration-300 ${
                    isZoomed ? 'scale-135 cursor-zoom-out' : 'cursor-zoom-in group-hover:scale-105'
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <ProductIcon categoryId={product.categoryId} size={72} className="w-20 h-20 shadow-xs mb-2" />
                  <span className="text-xs text-slate-400 font-medium">Standard Clinical Packaging</span>
                </div>
              )}

              {/* Angle Badge Pill (Top-Left) */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                <span className={`text-[11px] font-bold font-mono px-3 py-1 rounded-full shadow-2xs border backdrop-blur-xs ${
                  isBackView
                    ? 'bg-indigo-950/90 text-indigo-100 border-indigo-700'
                    : 'bg-teal-950/90 text-teal-100 border-teal-700'
                }`}>
                  {isBackView ? '✓ Back View (Clinical Label)' : '✓ Front View (Packaging)'}
                </span>
              </div>

              {/* Interactive Zoom Toggle & Flip Button (Top-Right) */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleAngle}
                  className="bg-white/95 hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Flip angle (Front / Back)"
                >
                  <RotateCw className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-[11px]">{isBackView ? 'Front' : 'Back'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="bg-white/95 hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs p-1.5 rounded-full transition-all"
                  title={isZoomed ? 'Zoom Out' : 'Zoom In'}
                >
                  {isZoomed ? <ZoomOut className="w-3.5 h-3.5 text-teal-600" /> : <ZoomIn className="w-3.5 h-3.5 text-teal-600" />}
                </button>
              </div>

            </div>

            {/* Angle Selection Thumbnails (Front / Back / Any other views) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Product Multi-Angle Views ({views.length})</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                {views.map((view, idx) => {
                  const isActive = idx === activeViewIndex;
                  const isBack = view.viewType === 'back';

                  return (
                    <button
                      key={`${view.viewType}-${idx}`}
                      type="button"
                      onClick={() => setActiveViewIndex(idx)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'border-teal-600 bg-teal-50/80 text-teal-950 font-bold shadow-2xs ring-1 ring-teal-500'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white shrink-0 overflow-hidden flex items-center justify-center p-1">
                        <img src={view.url} alt={view.label} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate flex items-center justify-between">
                          <span>{isBack ? 'Back View' : 'Front View'}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {isBack ? 'Ingredients & Directions' : 'Branding & Bottle'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Full Product Information, Specs & Actions   */}
          {/* ========================================================= */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              {/* Product Title & Code */}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {product.productName}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                  <span>SKU: <strong className="text-slate-700">{product.productCode}</strong></span>
                  <span>·</span>
                  <span>Volume: <strong className="text-slate-700">{product.volumeSize}</strong></span>
                  <span>·</span>
                  <span>HSN: <strong className="text-slate-700">{product.hsnCode || '33049900'}</strong></span>
                </div>
              </div>

              {/* Commercial Price & Stock Card */}
              <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/90 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-bold flex items-center gap-1.5">
                    <span>{contextMode === 'store' ? 'Patient Clinic Price' : 'Active Selling Price'}</span>
                    {contextMode === 'store' ? (
                      <span className="text-[9px] bg-teal-50 text-teal-700 font-mono px-1.5 py-0.2 rounded font-semibold border border-teal-200">
                        100% Genuine Clinical Stock
                      </span>
                    ) : priceResolution.pricingSource === 'active_batch' && activeBatch ? (
                      <span className="text-[9px] bg-teal-100 text-teal-800 font-mono px-1.5 py-0.2 rounded font-semibold">
                        Batch: {activeBatch.batchNumber}
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.2 rounded font-semibold">
                        Product Master Price
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                      ₹{effectivePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-400 line-through font-mono">
                      ₹{originalMrp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      15% Off
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {contextMode === 'store'
                      ? 'Dispatched directly from Clinic Dispensary'
                      : priceResolution.pricingSource === 'active_batch'
                        ? 'Automatically calculated from active FEFO batch'
                        : 'Product Master default price'}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                    {contextMode === 'store' ? 'Availability' : 'Clinic Inventory'}
                  </div>
                  <div className={`text-xs font-bold font-mono flex items-center gap-1 justify-end ${
                    effectiveStock > 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${effectiveStock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span>{effectiveStock > 0 ? `${effectiveStock} units available` : 'Out of stock'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {contextMode === 'store' ? 'Ready for Dispatch' : 'FEFO automated rotation'}
                  </span>
                </div>
              </div>

              {/* Requirement 9: Batch Detail Specification Card (Customer view hides Next Batch and Mode tag) */}
              <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tags className="w-3.5 h-3.5 text-teal-700" />
                    <span className="text-xs font-bold text-slate-900 tracking-tight font-sans">
                      {contextMode === 'store' ? 'Authenticity & Batch Details' : 'Batch-Wise Inventory & FEFO Queue'}
                    </span>
                  </div>
                  {contextMode !== 'store' && (
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Mode: {batchPricingMode === 'ACTIVE_BATCH' ? 'Active Batch Price' : 'Product Master'}
                    </span>
                  )}
                </div>

                <div className={`grid grid-cols-1 ${contextMode !== 'store' ? 'sm:grid-cols-2' : ''} gap-3 text-xs`}>
                  {/* Current Selling Batch */}
                  <div className="bg-white rounded-xl border-2 border-teal-500/80 p-3 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900 font-mono">
                          {contextMode === 'store' ? 'Dispensing Batch' : 'Current Selling Batch'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-teal-50 text-teal-700 px-1.5 py-0.2 rounded border border-teal-200">
                        ACTIVE
                      </span>
                    </div>

                    {activeBatch ? (
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-sans text-[11px]">Batch No:</span>
                          <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            {activeBatch.batchNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-sans text-[11px]">Available Qty:</span>
                          <span className="font-bold text-teal-700">
                            {activeBatch.currentQuantity} units
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-sans text-[11px]">Selling Price:</span>
                          <span className="font-bold text-slate-900 text-sm">
                            ₹{activeBatch.sellingPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-sans text-[11px]">Expiry Date:</span>
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 inline" />
                            {activeBatch.expiryDate}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 text-center text-slate-400 italic text-[11px]">
                        No active batch in stock.
                        <div className="text-[10px] text-slate-500 font-mono not-italic mt-0.5">
                          Product Master default applies
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Next Batch - Hidden for customers, only shown for internal staff/catalog */}
                  {contextMode !== 'store' && (
                    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono">
                          Next Batch
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          QUEUED
                        </span>
                      </div>

                      {nextBatch ? (
                        <div className="space-y-1.5 font-mono text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Batch No:</span>
                            <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              {nextBatch.batchNumber}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Available Qty:</span>
                            <span className="font-bold text-slate-700">
                              {nextBatch.currentQuantity} units
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Selling Price:</span>
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{nextBatch.sellingPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Expiry Date:</span>
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 inline" />
                              {nextBatch.expiryDate}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2.5 text-center text-slate-400 italic text-[11px] space-y-0.5">
                          <p>No secondary batch queued in stock.</p>
                          <p className="text-[10px] text-slate-500 font-mono not-italic">
                            Default Master: ₹{product.sellingPrice.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Clinical Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-1">
                  Product Overview
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Interactive Specifications Selector Tabs */}
              <div className="space-y-2">
                <div className="flex border-b border-slate-200 text-xs font-semibold gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('clinical')}
                    className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'clinical'
                        ? 'border-teal-700 text-teal-900 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Back Label & INCI Ingredients</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'overview'
                        ? 'border-teal-700 text-teal-900 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Clinical Verification & Directions</span>
                  </button>
                </div>

                {/* Tab 1: Clinical Back Label & Ingredients */}
                {activeTab === 'clinical' && (
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/90 rounded-2xl text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Back Label Formulation & Active Ingredients</span>
                    </div>
                    <p className="text-indigo-950/90 leading-relaxed text-xs">
                      {product.ingredients || 'Medical grade formulation with pure active agents. Paraben-free, non-comedogenic, clinically tested under dermatological control.'}
                    </p>
                    
                    {product.directions && (
                      <div className="pt-2 border-t border-indigo-200/60 text-indigo-950/85 text-[11px]">
                        <strong>Usage & Application:</strong> {product.directions}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Clinical Verification & Storage */}
                {activeTab === 'overview' && (
                  <div className="p-3.5 bg-teal-50/70 border border-teal-200/90 rounded-2xl text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="font-bold flex items-center gap-1.5 text-teal-950">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span>Dermatology Clinic Packaging Standards</span>
                    </div>
                    <ul className="text-teal-950/90 text-xs space-y-1 list-disc list-inside">
                      <li>Tamper-evident clinic dispenser with UV-protective bottle/packaging.</li>
                      <li>Batch numbered with individual expiry dates and quality control verification.</li>
                      <li>Storage instructions: Store below 25°C in a dry place away from direct sunlight.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar (Add to Bill / Add to Cart / WhatsApp) */}
            <div className="pt-3 border-t border-slate-200/90 space-y-2.5">
              <div className="flex items-center gap-3">
                {/* Quantity Controller for POS or Store */}
                {onAction && (
                  <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-2.5 py-2 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-mono font-bold text-slate-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-2.5 py-2 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Primary Action Button */}
                {onAction ? (
                  <button
                    type="button"
                    disabled={!hasStock}
                    onClick={handleActionClick}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                      !hasStock
                        ? 'bg-rose-50 border border-rose-200 text-rose-700 cursor-not-allowed font-extrabold'
                        : addedSuccess
                        ? 'bg-emerald-600 text-white cursor-pointer'
                        : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                    }`}
                  >
                    {!hasStock ? (
                      <span className="tracking-wider uppercase">
                        Sold Out · Unavailable
                      </span>
                    ) : addedSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added Successfully!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          {actionLabel || (contextMode === 'pos' ? 'Add to Bill' : 'Add to Cart')} · ₹{(effectivePrice * quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Close Details
                  </button>
                )}

                {/* Secondary Action Button (e.g. WhatsApp or Close) */}
                {onSecondaryAction && (
                  <button
                    type="button"
                    onClick={() => {
                      onSecondaryAction();
                    }}
                    className="p-2.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200/80 shrink-0"
                    title={secondaryActionLabel || 'Order via WhatsApp'}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
              </div>

              {addedSuccess && (
                <p className="text-[11px] text-center text-emerald-600 font-semibold font-mono animate-in fade-in">
                  ✓ {quantity} × {product.productName} added to current {contextMode === 'pos' ? 'bill' : 'cart'}
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export interface ProductImageHoverPreviewProps {
  product: Product;
  className?: string;
  imageClassName?: string;
  categoryName?: string;
  stockQty?: number;
  locationId?: string;
  availableBatchesCount?: number;
  contextMode?: 'pos' | 'store' | 'catalog';
  actionLabel?: string;
  onAction?: (quantity?: number) => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  showQuickFlipBadge?: boolean;
  showClickHintBadge?: boolean;
  disableInternalModal?: boolean;
  onThumbnailClick?: (e: React.MouseEvent) => void;
}

/**
 * Product Image Component with Multi-Angle Flip & Click-to-View Details
 * 
 * - Hover simply provides clean visual affordance without any disruptive floating pop-up.
 * - Clicking on the product opens the rich Product Details Modal with high-res Front & Back angles,
 *   full clinical specifications, INCI ingredients, and direct action.
 */
export const ProductImageHoverPreview: React.FC<ProductImageHoverPreviewProps> = ({
  product,
  className = 'h-48 sm:h-52 w-full',
  imageClassName = 'h-full w-full object-contain',
  categoryName,
  stockQty,
  locationId,
  contextMode = 'pos',
  actionLabel,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  showQuickFlipBadge = true,
  showClickHintBadge = false,
  disableInternalModal = false,
  onThumbnailClick
}) => {
  const views = useMemo(() => getProductImageViews(product), [product]);
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // In catalog view or product master screens, always strictly prioritize the Front View
  const frontView = views.find(v => v.viewType === 'front') || views[0] || { url: '', viewType: 'front' as const, label: 'Front View' };
  const currentView = (contextMode === 'catalog' || !views[activeViewIndex]) ? frontView : (views[activeViewIndex] || frontView);
  const isBackView = currentView?.viewType === 'back';

  // Toggle Front vs Back directly on thumbnail without opening modal
  const handleToggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveViewIndex(prev => (prev === 0 ? 1 : 0));
  };

  // Open details modal on click
  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onThumbnailClick) {
      onThumbnailClick(e);
      return;
    }
    if (!disableInternalModal) {
      setIsDetailsModalOpen(true);
    }
  };

  const hasExplicitPadding = className.includes('p-');

  return (
    <>
      {/* Thumbnail Container: Click to View Details */}
      <div
        onClick={handleOpenDetails}
        className={`relative flex items-center justify-center ${hasExplicitPadding ? '' : 'p-3'} overflow-hidden select-none cursor-pointer group ${className}`}
        title="Click to view product details & multi-angle images"
      >
        {/* Main Product Image (Front or Back) */}
        {currentView.url && !imageError ? (
          <img
            src={currentView.url}
            alt={`${product.productName} - ${currentView.label}`}
            onError={() => setImageError(true)}
            className={`${imageClassName} transition-all duration-300 drop-shadow-xs group-hover:scale-105 ${
              isBackView ? 'brightness-95 contrast-105' : ''
            }`}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-slate-50">
            <ProductIcon categoryId={product.categoryId} size={40} className="w-8 h-8 shadow-xs opacity-75" />
          </div>
        )}

        {/* Quick Multi-View Switcher Badge (Top Left of thumbnail) */}
        {showQuickFlipBadge && views.length > 1 && contextMode !== 'catalog' && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleFlip}
              className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-all backdrop-blur-xs shadow-xs border ${
                isBackView
                  ? 'bg-indigo-900/90 text-white border-indigo-700'
                  : 'bg-white/95 text-slate-800 border-slate-200/90 hover:bg-teal-50 hover:text-teal-900'
              }`}
              title="Click to toggle Front / Back view"
            >
              <RotateCw className="w-2.5 h-2.5" />
              <span>{isBackView ? 'Back' : 'Front'}</span>
              <span className="text-[9px] opacity-70">({views.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Rich Product Details Modal Opened on Click */}
      {!disableInternalModal && product && product.productId && (
        <ProductDetailsModal
          product={product}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          categoryName={categoryName}
          stockQty={stockQty}
          locationId={locationId}
          contextMode={contextMode}
          actionLabel={actionLabel}
          onAction={onAction}
          onSecondaryAction={onSecondaryAction}
          secondaryActionLabel={secondaryActionLabel}
          initialViewIndex={activeViewIndex}
        />
      )}
    </>
  );
};

// Backwards compatibility alias
export const ProductImageViewer = ProductImageHoverPreview;
