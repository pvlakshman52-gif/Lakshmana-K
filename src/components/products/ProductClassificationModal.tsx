import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Product, ProductType, Category } from '../../types/erp';
import { 
  FileCheck2, 
  X, 
  Check, 
  Search, 
  Filter, 
  Edit2, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Package,
  Layers,
  Building2,
  Tag
} from 'lucide-react';
import { normalizeCategoryId } from '../../utils/categoryUtils';
import { INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES } from '../../data/initialData';

interface ProductClassificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductClassificationModal: React.FC<ProductClassificationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { products, categories, subcategories, brands, updateProduct } = useClinic();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETE' | 'NEEDS_REVIEW'>('ALL');

  // Inline Row Edit State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editSubcategoryId, setEditSubcategoryId] = useState<string>('');
  const [editBrandId, setEditBrandId] = useState<string>('');
  const [editProductType, setEditProductType] = useState<ProductType>('Retail Product');

  // Notification message
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Canonical distinct categories
  const distinctCategories = useMemo(() => {
    const map = new Map<string, Category>();
    INITIAL_CATEGORIES.forEach(c => map.set(c.categoryId, c));
    categories.forEach(c => {
      const canonicalId = normalizeCategoryId(c.categoryId);
      if (map.has(canonicalId)) {
        map.set(canonicalId, { ...map.get(canonicalId)!, isActive: c.isActive !== false });
      } else {
        map.set(canonicalId, { ...c, categoryId: canonicalId });
      }
    });
    return Array.from(map.values());
  }, [categories]);

  // Filtered subcategories for the actively edited category
  const activeCategorySubcategories = useMemo(() => {
    const targetCat = normalizeCategoryId(editCategoryId);
    const allSubs = subcategories && subcategories.length > 0 ? subcategories : INITIAL_SUBCATEGORIES;
    let filtered = allSubs.filter(s => {
      const sCatNorm = normalizeCategoryId(s.categoryId);
      return (sCatNorm === targetCat || s.categoryId === editCategoryId || s.categoryId === targetCat) &&
        (s.isActive !== false || s.subcategoryId === editSubcategoryId);
    });

    if (filtered.length === 0) {
      filtered = INITIAL_SUBCATEGORIES.filter(s => normalizeCategoryId(s.categoryId) === targetCat);
    }

    if (editSubcategoryId && !filtered.some(s => s.subcategoryId === editSubcategoryId)) {
      const existing = allSubs.find(s => s.subcategoryId === editSubcategoryId) ||
                      INITIAL_SUBCATEGORIES.find(s => s.subcategoryId === editSubcategoryId);
      if (existing) {
        filtered = [existing, ...filtered];
      }
    }

    return filtered;
  }, [editCategoryId, subcategories, editSubcategoryId]);

  if (!isOpen) return null;

  // Classification verification
  const isProductProperlyClassified = (p: Product): boolean => {
    return Boolean(
      p.categoryId && 
      p.subcategoryId && 
      categories.some(c => c.categoryId === p.categoryId) &&
      subcategories.some(s => s.subcategoryId === p.subcategoryId)
    );
  };

  // Metrics
  const properlyClassifiedCount = products.filter(isProductProperlyClassified).length;
  const needsReviewCount = products.length - properlyClassifiedCount;
  const completenessPercent = products.length > 0 ? Math.round((properlyClassifiedCount / products.length) * 100) : 100;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const isComplete = isProductProperlyClassified(p);
      if (statusFilter === 'COMPLETE' && !isComplete) return false;
      if (statusFilter === 'NEEDS_REVIEW' && isComplete) return false;

      if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.productName.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q) ||
          (p.brandName || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [products, categoryFilter, statusFilter, searchQuery, categories, subcategories]);

  // Start Edit
  const handleStartEdit = (p: Product) => {
    setEditingProductId(p.productId);
    const allSubs = subcategories && subcategories.length > 0 ? subcategories : INITIAL_SUBCATEGORIES;

    // Resolve subcategory
    let targetSubId = p.subcategoryId || '';
    if (!targetSubId) {
      const matchByName = allSubs.find(s => s.subcategoryName.toLowerCase() === (p.subcategoryId || '').toLowerCase());
      if (matchByName) targetSubId = matchByName.subcategoryId;
    }

    // Resolve parent category
    let validCat = normalizeCategoryId(p.categoryId);
    const subMatch = allSubs.find(s => s.subcategoryId === targetSubId);
    if (subMatch?.categoryId) {
      validCat = normalizeCategoryId(subMatch.categoryId);
    } else if (p.productCode?.startsWith('PRD-SKIN-') || p.productCode?.startsWith('PRD-SKN-')) {
      validCat = 'CAT-SKIN';
    } else if (p.productCode?.startsWith('PRD-HAIR-')) {
      validCat = 'CAT-HAIR';
    } else if (p.productCode?.startsWith('PRD-BODY-')) {
      validCat = 'CAT-BODY';
    } else if (p.productCode?.startsWith('PRD-TRT-')) {
      validCat = 'CAT-TREATMENT';
    } else if (p.productCode?.startsWith('PRD-SUP-')) {
      validCat = 'CAT-SUPPLEMENTS';
    } else if (p.productCode?.startsWith('PRD-ACC-')) {
      validCat = 'CAT-ACCESSORIES';
    }

    // If subcategory is still empty, auto-select first valid subcategory for this category
    if (!targetSubId) {
      const firstSub = allSubs.find(s => normalizeCategoryId(s.categoryId) === validCat && s.isActive !== false);
      targetSubId = firstSub?.subcategoryId || '';
    }

    setEditCategoryId(validCat);
    setEditSubcategoryId(targetSubId);
    setEditBrandId(p.brandId || brands[0]?.brandId || 'BRD-DERMACLINIX');
    setEditProductType(p.productType || 'Retail Product');
  };

  // When category changes in edit row, auto-select first valid subcategory
  const handleEditCategoryChange = (newCatId: string) => {
    const normalized = normalizeCategoryId(newCatId);
    setEditCategoryId(normalized);
    const allSubs = subcategories && subcategories.length > 0 ? subcategories : INITIAL_SUBCATEGORIES;
    const matchingSubs = allSubs.filter(s => {
      const sCatNorm = normalizeCategoryId(s.categoryId);
      return (sCatNorm === normalized || s.categoryId === normalized || s.categoryId === newCatId) &&
        s.isActive !== false;
    });

    const currentBelongs = matchingSubs.some(s => s.subcategoryId === editSubcategoryId);
    if (!currentBelongs) {
      if (matchingSubs.length > 0) {
        setEditSubcategoryId(matchingSubs[0].subcategoryId);
      } else {
        const fallback = INITIAL_SUBCATEGORIES.filter(s => normalizeCategoryId(s.categoryId) === normalized);
        setEditSubcategoryId(fallback[0]?.subcategoryId || '');
      }
    }
  };

  // When subcategory changes in edit row, synchronize category automatically
  const handleEditSubcategoryChange = (newSubId: string) => {
    setEditSubcategoryId(newSubId);
    if (!newSubId) return;

    const allSubs = subcategories && subcategories.length > 0 ? subcategories : INITIAL_SUBCATEGORIES;
    const subMatch = allSubs.find(s => s.subcategoryId === newSubId);
    if (subMatch?.categoryId) {
      const parentCat = normalizeCategoryId(subMatch.categoryId);
      if (parentCat && parentCat !== editCategoryId) {
        setEditCategoryId(parentCat);
      }
    }
  };

  // Save Edit
  const handleSaveEdit = (productId: string) => {
    const prod = products.find(p => p.productId === productId);
    if (!prod) return;

    const matchedBrand = brands.find(b => b.brandId === editBrandId);

    updateProduct({
      ...prod,
      categoryId: editCategoryId,
      subcategoryId: editSubcategoryId || undefined,
      brandId: editBrandId || undefined,
      brandName: matchedBrand?.brandName || prod.brandName,
      productType: editProductType
    }, 'Product Classification Hierarchy Update');

    setNotification({
      text: `Updated classification for "${prod.productName}"`,
      type: 'success'
    });
    setEditingProductId(null);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Product Classification Matrix
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review and audit Category → Subcategory → Brand assignments across all formulary products
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Notification Banner */}
          {notification && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{notification.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Metric KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-medium">Total Products</span>
                <div className="text-xl font-black text-slate-900 mt-0.5">{products.length}</div>
              </div>
              <Package className="w-6 h-6 text-slate-400" />
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-emerald-700 font-medium">Classified & Verified</span>
                <div className="text-xl font-black text-emerald-900 mt-0.5">
                  {properlyClassifiedCount} <span className="text-xs font-semibold text-emerald-700">({completenessPercent}%)</span>
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>

            <div className={`rounded-xl p-3 flex items-center justify-between border ${
              needsReviewCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className={needsReviewCount > 0 ? 'text-amber-800 font-medium' : 'text-slate-500 font-medium'}>
                  Needs Subcategory Review
                </span>
                <div className={`text-xl font-black mt-0.5 ${needsReviewCount > 0 ? 'text-amber-900' : 'text-slate-700'}`}>
                  {needsReviewCount}
                </div>
              </div>
              <AlertTriangle className={`w-6 h-6 ${needsReviewCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products by code or title..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-teal-500 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.categoryName}
                  </option>
                ))}
              </select>

              {/* Status Tabs */}
              <div className="flex items-center p-0.5 bg-white rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-900 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('COMPLETE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'COMPLETE'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  ✓ Classified ({properlyClassifiedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('NEEDS_REVIEW')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'NEEDS_REVIEW'
                      ? 'bg-amber-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  ⚠️ Review ({needsReviewCount})
                </button>
              </div>
            </div>
          </div>

          {/* Product Classification Table as recommended in Requirement 11 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Subcategory</th>
                    <th className="py-2.5 px-3">Brand</th>
                    <th className="py-2.5 px-3">Product Type</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No products match your active search or filters.
                      </td>
                    </tr>
                  )}

                  {filteredProducts.map(prod => {
                    const isEditing = editingProductId === prod.productId;
                    const isComplete = isProductProperlyClassified(prod);
                    const catObj = categories.find(c => c.categoryId === prod.categoryId);
                    const subcatObj = subcategories.find(s => s.subcategoryId === prod.subcategoryId);

                    if (isEditing) {
                      return (
                        <tr key={prod.productId} className="bg-teal-50/70 border-y-2 border-teal-500">
                          {/* Product Details (Static) */}
                          <td className="py-3 px-3 align-top">
                            <div className="font-bold text-slate-900">{prod.productName}</div>
                            <div className="font-mono text-[10px] text-teal-800">{prod.productCode}</div>
                          </td>

                          {/* Category Dropdown */}
                          <td className="py-3 px-3 align-top">
                            <select
                              value={editCategoryId}
                              onChange={e => handleEditCategoryChange(e.target.value)}
                              className="w-full p-1.5 bg-white border border-teal-300 rounded-md font-semibold text-slate-900 text-xs focus:ring-1 focus:ring-teal-500 cursor-pointer"
                            >
                              {distinctCategories.filter(c => c.isActive !== false || c.categoryId === editCategoryId).map(c => (
                                <option key={c.categoryId} value={c.categoryId}>
                                  {c.categoryName}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Subcategory Dropdown (Filtered) */}
                          <td className="py-3 px-3 align-top">
                            <select
                              value={editSubcategoryId}
                              onChange={e => handleEditSubcategoryChange(e.target.value)}
                              className="w-full p-1.5 bg-white border border-teal-300 rounded-md font-semibold text-slate-900 text-xs focus:ring-1 focus:ring-teal-500 cursor-pointer"
                            >
                              {activeCategorySubcategories.length === 0 && (
                                <option value="">No subcategories configured</option>
                              )}
                              {activeCategorySubcategories.map(s => (
                                <option key={s.subcategoryId} value={s.subcategoryId}>
                                  {s.subcategoryName}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Brand Dropdown */}
                          <td className="py-3 px-3 align-top">
                            <select
                              value={editBrandId}
                              onChange={e => setEditBrandId(e.target.value)}
                              className="w-full p-1.5 bg-white border border-teal-300 rounded-md font-semibold text-slate-900 text-xs focus:ring-1 focus:ring-teal-500 cursor-pointer"
                            >
                              {brands.filter(b => b.isActive !== false).map(b => (
                                <option key={b.brandId} value={b.brandId}>
                                  {b.brandName}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Product Type Dropdown */}
                          <td className="py-3 px-3 align-top">
                            <select
                              value={editProductType}
                              onChange={e => setEditProductType(e.target.value as ProductType)}
                              className="w-full p-1.5 bg-white border border-teal-300 rounded-md text-slate-900 text-xs focus:ring-1 focus:ring-teal-500 cursor-pointer"
                            >
                              <option value="Retail Product">Retail Product</option>
                              <option value="Professional Product">Professional Product</option>
                              <option value="Treatment Product">Treatment Product</option>
                              <option value="Supplement">Supplement</option>
                              <option value="Accessory">Accessory</option>
                            </select>
                          </td>

                          {/* Status Preview */}
                          <td className="py-3 px-3 text-center align-top pt-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Editing
                            </span>
                          </td>

                          {/* Save & Cancel */}
                          <td className="py-3 px-3 text-right align-top pt-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(prod.productId)}
                                className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProductId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs font-medium cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr 
                        key={prod.productId}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          !isComplete ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Product */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{prod.productName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{prod.productCode}</div>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-800">
                            <Layers className="w-3 h-3 text-teal-600" />
                            <span>{catObj?.categoryName || prod.categoryId}</span>
                          </span>
                        </td>

                        {/* Subcategory */}
                        <td className="py-2.5 px-3">
                          {subcatObj ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-teal-50 text-teal-900 border border-teal-200">
                              <span>{subcatObj.subcategoryName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-100 text-amber-800">
                              ⚠️ Unassigned
                            </span>
                          )}
                        </td>

                        {/* Brand */}
                        <td className="py-2.5 px-3 text-slate-700">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{prod.brandName || 'DermaClinix'}</span>
                          </span>
                        </td>

                        {/* Product Type */}
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {prod.productType || 'Retail Product'}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200" title="Valid Category and Subcategory assigned">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✓ Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200" title="Missing canonical subcategory reference">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Needs Review</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(prod)}
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit classification"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Classification changes persist immediately to Product Master and sync with reporting.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
