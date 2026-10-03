import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Category, Subcategory } from '../../types/erp';
import { 
  FolderPlus, 
  X, 
  Check, 
  Layers, 
  Package, 
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Plus,
  FolderTree,
  ListTree
} from 'lucide-react';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (newCategory: Category) => void;
  initialSelectedCategoryId?: string | null;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  onCategoryCreated,
  initialSelectedCategoryId = null
}) => {
  const { 
    categories, 
    subcategories,
    products, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    toggleCategoryActive,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    toggleSubcategoryActive
  } = useClinic();

  // Active view: drill-down into a specific category or top-level overview
  const [drillDownCategoryId, setDrillDownCategoryId] = useState<string | null>(initialSelectedCategoryId);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Category Create / Edit State ---
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIsActive, setNewCatIsActive] = useState(true);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatIsActive, setEditCatIsActive] = useState(true);

  // Category Delete Confirmation
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [catDeleteBlocked, setCatDeleteBlocked] = useState<{
    cat: Category;
    reason: string;
    productCount: number;
    subcatCount: number;
    sampleProducts: string[];
  } | null>(null);

  // --- Subcategory Create / Edit State ---
  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatCode, setNewSubcatCode] = useState('');
  const [newSubcatDesc, setNewSubcatDesc] = useState('');
  const [newSubcatIsActive, setNewSubcatIsActive] = useState(true);

  const [editingSubcatId, setEditingSubcatId] = useState<string | null>(null);
  const [editSubcatName, setEditSubcatName] = useState('');
  const [editSubcatCode, setEditSubcatCode] = useState('');
  const [editSubcatDesc, setEditSubcatDesc] = useState('');
  const [editSubcatIsActive, setEditSubcatIsActive] = useState(true);

  // Subcategory Delete Confirmation
  const [subcatToDelete, setSubcatToDelete] = useState<Subcategory | null>(null);
  const [subcatDeleteBlocked, setSubcatDeleteBlocked] = useState<{
    subcat: Subcategory;
    productCount: number;
    sampleProducts: string[];
  } | null>(null);

  if (!isOpen) return null;

  const currentCategory = categories.find(c => c.categoryId === drillDownCategoryId);

  // Active/Inactive counts for main categories
  const activeCategoriesCount = categories.filter(c => c.isActive !== false).length;
  const inactiveCategoriesCount = categories.filter(c => c.isActive === false).length;

  // Filtered categories
  const filteredCategories = categories.filter(c => {
    if (statusFilter === 'ACTIVE' && c.isActive === false) return false;
    if (statusFilter === 'INACTIVE' && c.isActive !== false) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.categoryName.toLowerCase().includes(q) ||
        c.categoryId.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Current category's subcategories
  const currentCategorySubcategories = subcategories.filter(s => s.categoryId === drillDownCategoryId);
  const filteredSubcategories = currentCategorySubcategories.filter(s => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.subcategoryName.toLowerCase().includes(q) ||
        s.subcategoryId.toLowerCase().includes(q) ||
        s.subcategoryCode.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // --- Handlers: Category ---
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg('Category name is required.');
      return;
    }

    const existing = categories.find(
      c => c.categoryName.toLowerCase() === trimmed.toLowerCase() ||
           c.categoryId.toLowerCase() === `cat-${trimmed.toLowerCase()}`
    );
    if (existing) {
      setErrorMsg(`Category "${existing.categoryName}" already exists.`);
      return;
    }

    try {
      const created = addCategory(trimmed, newCatDesc.trim());
      if (!newCatIsActive) {
        updateCategory(created.categoryId, { isActive: false });
      }
      setSuccessMsg(`Category "${created.categoryName}" created successfully!`);
      setNewCatName('');
      setNewCatCode('');
      setNewCatDesc('');
      setNewCatIsActive(true);
      setIsAddingCategory(false);

      if (onCategoryCreated) {
        onCategoryCreated(created);
      }
    } catch {
      setErrorMsg('Failed to create category.');
    }
  };

  const handleStartEditCat = (cat: Category) => {
    setEditingCatId(cat.categoryId);
    setEditCatName(cat.categoryName);
    setEditCatDesc(cat.description || '');
    setEditCatIsActive(cat.isActive !== false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveEditCat = (catId: string) => {
    const trimmed = editCatName.trim();
    if (!trimmed) {
      setErrorMsg('Category name cannot be empty.');
      return;
    }

    const duplicate = categories.find(
      c => c.categoryId !== catId && c.categoryName.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(`Another category named "${trimmed}" already exists.`);
      return;
    }

    updateCategory(catId, {
      categoryName: trimmed,
      description: editCatDesc.trim(),
      isActive: editCatIsActive
    });

    setSuccessMsg(`Category "${trimmed}" updated successfully!`);
    setEditingCatId(null);
  };

  const handleInitiateDeleteCat = (cat: Category) => {
    const linkedProducts = products.filter(p => p.categoryId === cat.categoryId);
    const linkedSubcats = subcategories.filter(s => s.categoryId === cat.categoryId);

    if (linkedProducts.length > 0 || linkedSubcats.length > 0) {
      setCatDeleteBlocked({
        cat,
        reason: linkedProducts.length > 0 
          ? `${linkedProducts.length} product(s) are assigned to this category.` 
          : `${linkedSubcats.length} subcategories exist under this category.`,
        productCount: linkedProducts.length,
        subcatCount: linkedSubcats.length,
        sampleProducts: linkedProducts.slice(0, 3).map(p => p.productName)
      });
      return;
    }

    setCatToDelete(cat);
  };

  const handleConfirmDeleteCat = () => {
    if (!catToDelete) return;
    const res = deleteCategory(catToDelete.categoryId);
    if (res.success) {
      setSuccessMsg(`Category "${catToDelete.categoryName}" deleted successfully.`);
      if (editingCatId === catToDelete.categoryId) setEditingCatId(null);
      if (drillDownCategoryId === catToDelete.categoryId) setDrillDownCategoryId(null);
    } else {
      setErrorMsg(res.message);
    }
    setCatToDelete(null);
  };

  // --- Handlers: Subcategory ---
  const handleAddSubcatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drillDownCategoryId) return;
    setErrorMsg(null);

    const trimmed = newSubcatName.trim();
    if (!trimmed) {
      setErrorMsg('Subcategory name is required.');
      return;
    }

    const existing = subcategories.find(
      s => s.categoryId === drillDownCategoryId && s.subcategoryName.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setErrorMsg(`Subcategory "${existing.subcategoryName}" already exists in this category.`);
      return;
    }

    try {
      const created = addSubcategory({
        categoryId: drillDownCategoryId,
        subcategoryName: trimmed,
        subcategoryCode: newSubcatCode.trim() || trimmed.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase(),
        description: newSubcatDesc.trim() || undefined,
        isActive: newSubcatIsActive
      });

      setSuccessMsg(`Subcategory "${created.subcategoryName}" added successfully!`);
      setNewSubcatName('');
      setNewSubcatCode('');
      setNewSubcatDesc('');
      setNewSubcatIsActive(true);
      setIsAddingSubcat(false);
    } catch {
      setErrorMsg('Failed to add subcategory.');
    }
  };

  const handleStartEditSubcat = (subcat: Subcategory) => {
    setEditingSubcatId(subcat.subcategoryId);
    setEditSubcatName(subcat.subcategoryName);
    setEditSubcatCode(subcat.subcategoryCode);
    setEditSubcatDesc(subcat.description || '');
    setEditSubcatIsActive(subcat.isActive !== false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveEditSubcat = (subcatId: string) => {
    const trimmed = editSubcatName.trim();
    if (!trimmed) {
      setErrorMsg('Subcategory name cannot be empty.');
      return;
    }

    const duplicate = subcategories.find(
      s => s.categoryId === drillDownCategoryId && s.subcategoryId !== subcatId && s.subcategoryName.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(`Another subcategory named "${trimmed}" already exists in this category.`);
      return;
    }

    updateSubcategory(subcatId, {
      subcategoryName: trimmed,
      subcategoryCode: editSubcatCode.trim() || undefined,
      description: editSubcatDesc.trim() || undefined,
      isActive: editSubcatIsActive
    });

    setSuccessMsg(`Subcategory "${trimmed}" updated successfully!`);
    setEditingSubcatId(null);
  };

  const handleInitiateDeleteSubcat = (subcat: Subcategory) => {
    const linked = products.filter(p => p.subcategoryId === subcat.subcategoryId);
    if (linked.length > 0) {
      setSubcatDeleteBlocked({
        subcat,
        productCount: linked.length,
        sampleProducts: linked.slice(0, 3).map(p => p.productName)
      });
      return;
    }
    setSubcatToDelete(subcat);
  };

  const handleConfirmDeleteSubcat = () => {
    if (!subcatToDelete) return;
    const res = deleteSubcategory(subcatToDelete.subcategoryId);
    if (res.success) {
      setSuccessMsg(`Subcategory "${subcatToDelete.subcategoryName}" deleted successfully.`);
      if (editingSubcatId === subcatToDelete.subcategoryId) setEditingSubcatId(null);
    } else {
      setErrorMsg(res.message);
    }
    setSubcatToDelete(null);
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            {drillDownCategoryId ? (
              <button
                type="button"
                onClick={() => {
                  setDrillDownCategoryId(null);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setSearchQuery('');
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="Back to All Categories"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-semibold">Categories</span>
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
                <FolderTree className="w-5 h-5 text-teal-400" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {currentCategory ? currentCategory.categoryName : 'Category & Subcategory Management'}
                </h2>
                {currentCategory && (
                  <span className="font-mono text-xs bg-teal-900/80 text-teal-200 border border-teal-600/40 px-2 py-0.5 rounded">
                    {currentCategory.categoryId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentCategory 
                  ? `Manage subcategories under ${currentCategory.categoryName} (${currentCategorySubcategories.length} subcategories, ${products.filter(p => p.categoryId === currentCategory.categoryId).length} products)`
                  : 'Hierarchical organization: Main Category → Subcategory → Product'}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-700 hover:text-rose-900 text-[11px] font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Category Delete Blocked Warning */}
          {catDeleteBlocked && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-950 text-sm">
                    Cannot Delete Category "{catDeleteBlocked.cat.categoryName}"
                  </h4>
                  <p className="text-rose-800 mt-1">
                    {catDeleteBlocked.reason}
                  </p>
                  {catDeleteBlocked.sampleProducts.length > 0 && (
                    <p className="text-[11px] text-rose-700 mt-1">
                      Sample linked products: <em>{catDeleteBlocked.sampleProducts.join(', ')}</em>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
                <button
                  type="button"
                  onClick={() => setCatDeleteBlocked(null)}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleCategoryActive(catDeleteBlocked.cat.categoryId);
                    setSuccessMsg(`Category "${catDeleteBlocked.cat.categoryName}" marked as Inactive instead of deleting.`);
                    setCatDeleteBlocked(null);
                  }}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Mark as Inactive Instead
                </button>
              </div>
            </div>
          )}

          {/* Category Delete Confirm */}
          {catToDelete && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    Confirm Deleting Category
                  </h4>
                  <p className="text-amber-900 mt-1">
                    Permanently delete category <strong>"{catToDelete.categoryName}"</strong> ({catToDelete.categoryId})?
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    This category has 0 linked subcategories and 0 products.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setCatToDelete(null)}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCat}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          )}

          {/* Subcategory Delete Blocked */}
          {subcatDeleteBlocked && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-950 text-sm">
                    Cannot Delete Subcategory "{subcatDeleteBlocked.subcat.subcategoryName}"
                  </h4>
                  <p className="text-rose-800 mt-1">
                    There are <strong>{subcatDeleteBlocked.productCount} product(s)</strong> assigned to this subcategory.
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1">
                    Sample products: <em>{subcatDeleteBlocked.sampleProducts.join(', ')}</em>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
                <button
                  type="button"
                  onClick={() => setSubcatDeleteBlocked(null)}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleSubcategoryActive(subcatDeleteBlocked.subcat.subcategoryId);
                    setSuccessMsg(`Subcategory "${subcatDeleteBlocked.subcat.subcategoryName}" marked as Inactive.`);
                    setSubcatDeleteBlocked(null);
                  }}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Mark as Inactive Instead
                </button>
              </div>
            </div>
          )}

          {/* Subcategory Delete Confirm */}
          {subcatToDelete && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    Confirm Deleting Subcategory
                  </h4>
                  <p className="text-amber-900 mt-1">
                    Permanently delete subcategory <strong>"{subcatToDelete.subcategoryName}"</strong> ({subcatToDelete.subcategoryId})?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setSubcatToDelete(null)}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSubcat}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 1: TOP-LEVEL CATEGORIES LIST */}
          {!drillDownCategoryId && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search categories..."
                      className="pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-teal-500 w-52"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        statusFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({categories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ACTIVE')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        statusFilter === 'ACTIVE'
                          ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      Active ({activeCategoriesCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('INACTIVE')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        statusFilter === 'INACTIVE'
                          ? 'bg-slate-700 text-white shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Inactive ({inactiveCategoriesCount})
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Main Category</span>
                </button>
              </div>

              {/* Add Main Category Form (Collapsible) */}
              {isAddingCategory && (
                <form onSubmit={handleAddCategorySubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Create New Main Category
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Category Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        placeholder="e.g. Skin Care, Hair Care"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={newCatDesc}
                        onChange={e => setNewCatDesc(e.target.value)}
                        placeholder="e.g. Dermatological skincare and sunscreens"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={newCatIsActive}
                        onChange={e => setNewCatIsActive(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                      />
                      <span className="font-semibold text-slate-700">Initial Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        newCatIsActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {newCatIsActive ? 'Active' : 'Inactive'}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Save Category
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Main Categories Cards / Grid as requested in Requirement 10 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCategories.map(cat => {
                  const catSubcats = subcategories.filter(s => s.categoryId === cat.categoryId);
                  const catProducts = products.filter(p => p.categoryId === cat.categoryId);
                  const isEditing = editingCatId === cat.categoryId;
                  const isActive = cat.isActive !== false;

                  if (isEditing) {
                    return (
                      <div key={cat.categoryId} className="p-4 bg-teal-50/70 border-2 border-teal-500 rounded-xl space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-teal-900">
                          <span>{cat.categoryId}</span>
                          <span className="text-slate-400 font-normal">Editing</span>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 font-semibold mb-1">Category Name</label>
                          <input
                            type="text"
                            value={editCatName}
                            onChange={e => setEditCatName(e.target.value)}
                            className="w-full p-2 bg-white border border-teal-300 rounded-lg text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 font-semibold mb-1">Description</label>
                          <input
                            type="text"
                            value={editCatDesc}
                            onChange={e => setEditCatDesc(e.target.value)}
                            className="w-full p-2 bg-white border border-teal-300 rounded-lg text-xs text-slate-700"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setEditCatIsActive(!editCatIsActive)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              editCatIsActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                          >
                            {editCatIsActive ? 'Active' : 'Inactive'}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCatId(null)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditCat(cat.categoryId)}
                              className="px-3.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={cat.categoryId}
                      className={`p-4 rounded-xl border transition-all duration-150 relative group ${
                        isActive
                          ? 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-md'
                          : 'bg-slate-50/60 border-slate-200 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setDrillDownCategoryId(cat.categoryId);
                            setSearchQuery('');
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                              {cat.categoryName}
                            </h3>
                            <span className="font-mono text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-semibold">
                              {cat.categoryId}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {cat.description || 'Clinical formulary category'}
                          </p>

                          {/* Stats Badge */}
                          <div className="flex items-center gap-3 mt-3 text-xs">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              <ListTree className="w-3.5 h-3.5 text-teal-600" />
                              <span>{catSubcats.length} Subcategories</span>
                            </span>

                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              <Package className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{catProducts.length} Products</span>
                            </span>
                          </div>
                        </div>

                        {/* Status Switch & Actions */}
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              toggleCategoryActive(cat.categoryId);
                              setSuccessMsg(`Category "${cat.categoryName}" is now ${isActive ? 'Inactive' : 'Active'}.`);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={`Click to set ${isActive ? 'Inactive' : 'Active'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{isActive ? 'Active' : 'Inactive'}</span>
                          </button>

                          <div className="flex items-center gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditCat(cat)}
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInitiateDeleteCat(cat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Drill down footer banner */}
                      <button
                        type="button"
                        onClick={() => {
                          setDrillDownCategoryId(cat.categoryId);
                          setSearchQuery('');
                        }}
                        className="mt-3 pt-2.5 border-t border-slate-100 w-full flex items-center justify-between text-xs text-teal-700 group-hover:text-teal-800 font-semibold cursor-pointer"
                      >
                        <span>View & Configure Subcategories</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: SUBCATEGORIES MANAGEMENT DRILL DOWN */}
          {drillDownCategoryId && currentCategory && (
            <div className="space-y-4">
              
              {/* Category Breadcrumb & Details Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Category:</span>
                    <strong className="text-slate-900 text-sm font-bold">{currentCategory.categoryName}</strong>
                    <span className="font-mono text-teal-800 bg-teal-100/70 px-1.5 py-0.2 rounded font-semibold text-[11px]">
                      {currentCategory.categoryId}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      currentCategory.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {currentCategory.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-1 text-[11px]">
                    {currentCategory.description || 'Clinical formulary category'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsAddingSubcat(!isAddingSubcat)}
                    className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Subcategory</span>
                  </button>
                </div>
              </div>

              {/* Add Subcategory Form (Collapsible) */}
              {isAddingSubcat && (
                <form onSubmit={handleAddSubcatSubmit} className="bg-teal-50/60 border border-teal-200 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1 border-b border-teal-200/80">
                    <span className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                      Add Subcategory to {currentCategory.categoryName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingSubcat(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Subcategory Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newSubcatName}
                        onChange={e => setNewSubcatName(e.target.value)}
                        placeholder="e.g. Shampoo, Hair Serum, Scalp Oil"
                        className="w-full p-2 bg-white border border-teal-200 rounded-lg text-slate-900 font-medium focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Subcategory Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={newSubcatCode}
                        onChange={e => setNewSubcatCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SHAM, SERUM, OIL"
                        className="w-full p-2 bg-white border border-teal-200 rounded-lg text-slate-900 font-mono focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold text-xs">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={newSubcatDesc}
                      onChange={e => setNewSubcatDesc(e.target.value)}
                      placeholder="e.g. Clinical trichology formulations"
                      className="w-full p-2 bg-white border border-teal-200 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={newSubcatIsActive}
                        onChange={e => setNewSubcatIsActive(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                      />
                      <span className="font-semibold text-slate-700">Initial Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        newSubcatIsActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {newSubcatIsActive ? 'Active' : 'Inactive'}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingSubcat(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Save Subcategory
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Subcategories Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold text-slate-800">
                    Configured Subcategories ({filteredSubcategories.length})
                  </span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search subcategories..."
                      className="pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-teal-500 w-44"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Subcategory Code</th>
                        <th className="py-2.5 px-3">Subcategory Name</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-center">Linked Products</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubcategories.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No subcategories configured for {currentCategory.categoryName}. Click "+ Add Subcategory" to create one.
                          </td>
                        </tr>
                      )}

                      {filteredSubcategories.map(subcat => {
                        const linkedProducts = products.filter(p => p.subcategoryId === subcat.subcategoryId);
                        const isEditing = editingSubcatId === subcat.subcategoryId;
                        const isActive = subcat.isActive !== false;

                        if (isEditing) {
                          return (
                            <tr key={subcat.subcategoryId} className="bg-teal-50/50 border-y-2 border-teal-500">
                              <td className="py-3 px-3 font-mono text-[11px] font-bold text-teal-900 align-top">
                                {subcat.subcategoryId}
                              </td>
                              <td className="py-3 px-3 align-top">
                                <input
                                  type="text"
                                  value={editSubcatName}
                                  onChange={e => setEditSubcatName(e.target.value)}
                                  className="w-full p-1.5 bg-white border border-teal-300 rounded-md font-bold text-slate-900 text-xs"
                                  placeholder="Subcategory Name"
                                />
                              </td>
                              <td className="py-3 px-3 align-top">
                                <input
                                  type="text"
                                  value={editSubcatDesc}
                                  onChange={e => setEditSubcatDesc(e.target.value)}
                                  className="w-full p-1.5 bg-white border border-teal-300 rounded-md text-slate-700 text-xs"
                                  placeholder="Description"
                                />
                              </td>
                              <td className="py-3 px-3 text-center align-top pt-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                                  <Package className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{linkedProducts.length}</span>
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center align-top pt-3">
                                <button
                                  type="button"
                                  onClick={() => setEditSubcatIsActive(!editSubcatIsActive)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                    editSubcatIsActive
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-slate-100 text-slate-600 border-slate-300'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${editSubcatIsActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  <span>{editSubcatIsActive ? 'Active' : 'Inactive'}</span>
                                </button>
                              </td>
                              <td className="py-3 px-3 text-right align-top pt-3">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditSubcat(subcat.subcategoryId)}
                                    className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSubcatId(null)}
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
                            key={subcat.subcategoryId}
                            className={`transition-colors ${!isActive ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50/70'}`}
                          >
                            <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-teal-800">
                              {subcat.subcategoryId}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{subcat.subcategoryName}</span>
                                {!isActive && (
                                  <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded font-sans uppercase">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                              {subcat.description || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[11px]">
                                <Package className="w-2.5 h-2.5 text-teal-600" />
                                <span>{linkedProducts.length} products</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  toggleSubcategoryActive(subcat.subcategoryId);
                                  setSuccessMsg(`Subcategory "${subcat.subcategoryName}" is now ${isActive ? 'Inactive' : 'Active'}.`);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                <span>{isActive ? 'Active' : 'Inactive'}</span>
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSubcat(subcat)}
                                  className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                  title={`Edit subcategory "${subcat.subcategoryName}"`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInitiateDeleteSubcat(subcat)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    linkedProducts.length > 0
                                      ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'
                                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title={
                                    linkedProducts.length > 0
                                      ? `Has ${linkedProducts.length} linked products. Click for options.`
                                      : `Delete subcategory "${subcat.subcategoryName}"`
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active categories and subcategories appear in POS, Storefront & Product Creation.</span>
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
