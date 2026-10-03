import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Brand } from '../../types/erp';
import { 
  Building2, 
  X, 
  Check, 
  Search, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  Plus,
  Sparkles
} from 'lucide-react';

interface BrandManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandCreated?: (newBrand: Brand) => void;
}

export const BrandManagementModal: React.FC<BrandManagementModalProps> = ({
  isOpen,
  onClose,
  onBrandCreated
}) => {
  const { 
    brands, 
    products, 
    addBrand, 
    updateBrand, 
    deleteBrand, 
    toggleBrandActive 
  } = useClinic();

  // Create Form State
  const [brandName, setBrandName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [isNewBrandActive, setIsNewBrandActive] = useState(true);

  // Edit State
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete State
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [deleteBlockedWarning, setDeleteBlockedWarning] = useState<{
    brand: Brand;
    productCount: number;
    sampleProducts: string[];
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filtered brands
  const filteredBrands = brands.filter(b => {
    if (statusFilter === 'ACTIVE' && b.isActive === false) return false;
    if (statusFilter === 'INACTIVE' && b.isActive !== false) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.brandName.toLowerCase().includes(q) ||
        b.brandId.toLowerCase().includes(q) ||
        (b.manufacturer || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = brands.filter(b => b.isActive !== false).length;
  const inactiveCount = brands.filter(b => b.isActive === false).length;

  // Handle Add Brand
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = brandName.trim();
    if (!trimmedName) {
      setErrorMsg('Brand name is required.');
      return;
    }

    const existing = brands.find(b => b.brandName.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      setErrorMsg(`Brand "${existing.brandName}" already exists.`);
      return;
    }

    try {
      const created = addBrand(trimmedName, manufacturer.trim() || undefined);
      if (!isNewBrandActive) {
        updateBrand(created.brandId, { isActive: false });
      }
      setSuccessMsg(`Brand "${created.brandName}" created successfully!`);
      setBrandName('');
      setManufacturer('');
      setIsNewBrandActive(true);

      if (onBrandCreated) {
        onBrandCreated(created);
      }
    } catch {
      setErrorMsg('Failed to create brand. Please try again.');
    }
  };

  // Start Edit
  const handleStartEdit = (brand: Brand) => {
    setEditingBrandId(brand.brandId);
    setEditBrandName(brand.brandName);
    setEditManufacturer(brand.manufacturer || '');
    setEditIsActive(brand.isActive !== false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Save Edit
  const handleSaveEdit = (brandId: string) => {
    const trimmed = editBrandName.trim();
    if (!trimmed) {
      setErrorMsg('Brand name cannot be empty.');
      return;
    }

    const duplicate = brands.find(
      b => b.brandId !== brandId && b.brandName.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(`Another brand named "${trimmed}" already exists.`);
      return;
    }

    updateBrand(brandId, {
      brandName: trimmed,
      manufacturer: editManufacturer.trim() || undefined,
      isActive: editIsActive
    });

    setSuccessMsg(`Brand "${trimmed}" updated successfully!`);
    setEditingBrandId(null);
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingBrandId(null);
    setEditBrandName('');
    setEditManufacturer('');
  };

  // Initiate Delete
  const handleInitiateDelete = (brand: Brand) => {
    const linked = products.filter(p => p.brandId === brand.brandId);
    if (linked.length > 0) {
      setDeleteBlockedWarning({
        brand,
        productCount: linked.length,
        sampleProducts: linked.slice(0, 3).map(p => p.productName)
      });
      return;
    }
    setBrandToDelete(brand);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!brandToDelete) return;
    const res = deleteBrand(brandToDelete.brandId);
    if (res.success) {
      setSuccessMsg(`Brand "${brandToDelete.brandName}" deleted successfully.`);
      if (editingBrandId === brandToDelete.brandId) {
        setEditingBrandId(null);
      }
    } else {
      setErrorMsg(res.message);
    }
    setBrandToDelete(null);
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Brand Master
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Maintain clinical brands, manufacturers, and active status separately from categories
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

          {/* Notifications */}
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

          {/* Delete Blocked Dialog */}
          {deleteBlockedWarning && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-950 text-sm">
                    Cannot Delete Brand "{deleteBlockedWarning.brand.brandName}"
                  </h4>
                  <p className="text-rose-800 mt-1">
                    There are <strong>{deleteBlockedWarning.productCount} product(s)</strong> assigned to this brand. Please reassign them first or set the brand to Inactive.
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1">
                    Sample linked SKUs: <em>{deleteBlockedWarning.sampleProducts.join(', ')}</em>{deleteBlockedWarning.productCount > 3 ? '...' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
                <button
                  type="button"
                  onClick={() => setDeleteBlockedWarning(null)}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleBrandActive(deleteBlockedWarning.brand.brandId);
                    setSuccessMsg(`Brand "${deleteBlockedWarning.brand.brandName}" marked as Inactive instead.`);
                    setDeleteBlockedWarning(null);
                  }}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Mark as Inactive Instead
                </button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {brandToDelete && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    Confirm Deleting Brand
                  </h4>
                  <p className="text-amber-900 mt-1">
                    Are you sure you want to permanently delete brand <strong>"{brandToDelete.brandName}"</strong> ({brandToDelete.brandId})?
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    This brand has 0 linked products and will be removed permanently.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setBrandToDelete(null)}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          )}

          {/* Create Brand Form */}
          <form onSubmit={handleCreateSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Add New Brand
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Brands categorize formulations by manufacturer/distributor
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={e => {
                    setBrandName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. Trichology Pro, DermaClinix"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Manufacturer / Distributor (Optional)
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={e => setManufacturer(e.target.value)}
                  placeholder="e.g. Apex Pharma Laboratories, Clinix Formulations"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={isNewBrandActive}
                  onChange={e => setIsNewBrandActive(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span className="font-semibold text-slate-700">Initial Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isNewBrandActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isNewBrandActive ? 'Active' : 'Inactive'}
                </span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Brand</span>
              </button>
            </div>
          </form>

          {/* Existing Brands Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-700" />
                <span>Configured Brands ({brands.length})</span>
              </h3>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search brands..."
                    className="pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500 w-44"
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

                {/* Status Tabs */}
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
                    All ({brands.length})
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
                    Active ({activeCount})
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
                    Inactive ({inactiveCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Brand ID</th>
                    <th className="py-2.5 px-3">Brand Name</th>
                    <th className="py-2.5 px-3">Manufacturer</th>
                    <th className="py-2.5 px-3 text-center">Products</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBrands.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No brands found matching filter.
                      </td>
                    </tr>
                  )}

                  {filteredBrands.map(brand => {
                    const linked = products.filter(p => p.brandId === brand.brandId);
                    const isEditing = editingBrandId === brand.brandId;
                    const isActive = brand.isActive !== false;

                    if (isEditing) {
                      return (
                        <tr key={brand.brandId} className="bg-teal-50/50 border-y-2 border-teal-500">
                          <td className="py-3 px-3 font-mono text-[11px] font-bold text-teal-900 align-top">
                            {brand.brandId}
                          </td>
                          <td className="py-3 px-3 align-top">
                            <input
                              type="text"
                              value={editBrandName}
                              onChange={e => setEditBrandName(e.target.value)}
                              className="w-full p-1.5 bg-white border border-teal-300 rounded-md font-semibold text-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                              placeholder="Brand Name"
                            />
                          </td>
                          <td className="py-3 px-3 align-top">
                            <input
                              type="text"
                              value={editManufacturer}
                              onChange={e => setEditManufacturer(e.target.value)}
                              className="w-full p-1.5 bg-white border border-teal-300 rounded-md text-slate-700 text-xs focus:ring-1 focus:ring-teal-500"
                              placeholder="Manufacturer"
                            />
                          </td>
                          <td className="py-3 px-3 text-center align-top pt-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                              <Package className="w-2.5 h-2.5 text-slate-400" />
                              <span>{linked.length}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center align-top pt-3">
                            <button
                              type="button"
                              onClick={() => setEditIsActive(!editIsActive)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                editIsActive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-300'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${editIsActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{editIsActive ? 'Active' : 'Inactive'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right align-top pt-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(brand.brandId)}
                                className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
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
                        key={brand.brandId} 
                        className={`transition-colors ${!isActive ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-teal-800">
                          {brand.brandId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{brand.brandName}</span>
                            {!isActive && (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded font-sans uppercase">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                          {brand.manufacturer || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                            <Package className="w-2.5 h-2.5 text-slate-400" />
                            <span>{linked.length}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              toggleBrandActive(brand.brandId);
                              setSuccessMsg(`Brand "${brand.brandName}" is now ${isActive ? 'Inactive' : 'Active'}.`);
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
                              onClick={() => handleStartEdit(brand)}
                              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title={`Edit brand "${brand.brandName}"`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInitiateDelete(brand)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                linked.length > 0
                                  ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={
                                linked.length > 0
                                  ? `Has ${linked.length} linked products. Click for options.`
                                  : `Delete brand "${brand.brandName}"`
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

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active brands are available in product creation and filtering.</span>
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
