import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  X, 
  Layers, 
  Calendar, 
  MapPin, 
  UserCheck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Sparkles, 
  RefreshCw, 
  ArrowRight,
  Info,
  Search,
  PackageCheck
} from 'lucide-react';
import { ProductIcon } from '../common/ProductIcon';

interface OpeningStockModalProps {
  onClose: () => void;
  onNavigateToLedger?: () => void;
  onNavigateToReports?: () => void;
}

interface ItemRow {
  productId: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  expiryDate: string;
}

export const OpeningStockModal: React.FC<OpeningStockModalProps> = ({ 
  onClose,
  onNavigateToLedger,
  onNavigateToReports
}) => {
  const { 
    products, 
    locations, 
    selectedLocationId, 
    currentUser, 
    generateNextOpeningBatchNumber, 
    addBulkOpeningStock,
    batches
  } = useClinic();

  const defaultLoc = selectedLocationId === 'ALL' ? 'LOC-HOS' : selectedLocationId;
  const [locationId, setLocationId] = useState<string>(defaultLoc);
  
  // Opening Batch Number (user can edit or auto-generate)
  const [openingBatchNumber, setOpeningBatchNumber] = useState<string>('');
  const [isManualBatchEdited, setIsManualBatchEdited] = useState<boolean>(false);
  const [openingStockDate, setOpeningStockDate] = useState<string>('2026-09-27');
  const [remarks, setRemarks] = useState<string>('Stock Migration from Physical Register');

  // Excel / CSV migration tab
  const [activeTab, setActiveTab] = useState<'table' | 'excel_paste' | 'history'>('table');
  const [excelText, setExcelText] = useState<string>('');
  const [excelParseError, setExcelParseError] = useState<string | null>(null);

  // Selected items to register in this transaction
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');

  // Success state after registration
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    openingBatchNumber: string;
    batchesCreated: number;
    totalQuantity: number;
    totalValuation: number;
  } | null>(null);

  // Initialize auto-generated batch number on mount or location change
  useEffect(() => {
    if (!isManualBatchEdited || !openingBatchNumber.trim()) {
      const autoBatch = generateNextOpeningBatchNumber(locationId);
      setOpeningBatchNumber(autoBatch);
    }
  }, [locationId, generateNextOpeningBatchNumber, isManualBatchEdited]);

  // Load User Specification Example with one click
  // Hair Color Black 130g (50), Hair Oil (30), Face Wash (25), Soap (40)
  const loadPromptExample = () => {
    if (!products || products.length === 0) return;
    const hairColor = products.find(p => p && p.productName.toLowerCase().includes('hair color')) || products[0];
    const hairOil = products.find(p => p && (p.productName.toLowerCase().includes('hair oil') || p.categoryId === 'CAT-HAIROIL')) || products[1] || hairColor;
    const faceWash = products.find(p => p && (p.productName.toLowerCase().includes('face wash') || p.categoryId === 'CAT-FACEWASH')) || products[2] || hairColor;
    const soap = products.find(p => p && (p.productName.toLowerCase().includes('soap') || p.productName.toLowerCase().includes('bar') || p.categoryId === 'CAT-SOAP')) || products[3] || hairColor;

    if (!hairColor?.productId) return;

    const defaultExpiry = '2028-12-31';

    const sampleRows: ItemRow[] = [
      {
        productId: hairColor.productId,
        quantity: 50,
        costPrice: hairColor.costPrice,
        sellingPrice: hairColor.sellingPrice,
        expiryDate: defaultExpiry
      }
    ];

    if (hairOil && hairOil.productId && hairOil.productId !== hairColor.productId) {
      sampleRows.push({
        productId: hairOil.productId,
        quantity: 30,
        costPrice: hairOil.costPrice,
        sellingPrice: hairOil.sellingPrice,
        expiryDate: defaultExpiry
      });
    }

    if (faceWash && faceWash.productId && !sampleRows.some(r => r.productId === faceWash.productId)) {
      sampleRows.push({
        productId: faceWash.productId,
        quantity: 25,
        costPrice: faceWash.costPrice,
        sellingPrice: faceWash.sellingPrice,
        expiryDate: defaultExpiry
      });
    }

    if (soap && soap.productId && !sampleRows.some(r => r.productId === soap.productId)) {
      sampleRows.push({
        productId: soap.productId,
        quantity: 40,
        costPrice: soap.costPrice,
        sellingPrice: soap.sellingPrice,
        expiryDate: defaultExpiry
      });
    }

    setItems(sampleRows);
    setActiveTab('table');
  };

  // Auto-fill all products in catalog
  const loadAllProducts = () => {
    const allRows: ItemRow[] = (products || []).filter(p => p && p.productId).map(p => ({
      productId: p.productId,
      quantity: 20,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      expiryDate: '2028-12-31'
    }));
    setItems(allRows);
    setActiveTab('table');
  };

  // Add individual product to the list
  const handleAddProduct = (pId: string) => {
    if (!pId) return;
    if (items.some(it => it.productId === pId)) {
      alert('This product is already in the opening stock list.');
      return;
    }
    const prod = products.find(p => p.productId === pId);
    if (!prod) return;

    setItems(prev => [
      ...prev,
      {
        productId: prod.productId,
        quantity: 25,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        expiryDate: '2028-12-31'
      }
    ]);
    setSelectedProductIdToAdd('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, fields: Partial<ItemRow>) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...fields };
      return copy;
    });
  };

  // Refresh or auto-generate batch number
  const handleAutoGenerateBatch = () => {
    const fresh = generateNextOpeningBatchNumber(locationId);
    setOpeningBatchNumber(fresh);
    setIsManualBatchEdited(false);
  };

  // Parse Excel / CSV pasted text
  // Supports formats:
  // Product Name/Code [Tab or ,] Qty [Tab or ,] CostPrice (opt) [Tab or ,] Expiry (opt)
  const handleParseExcel = () => {
    setExcelParseError(null);
    if (!excelText.trim()) {
      setExcelParseError('Please paste tab-delimited or comma-separated rows from Excel/Sheets.');
      return;
    }

    const lines = excelText.trim().split('\n');
    const parsedRows: ItemRow[] = [];
    const unmatchedNames: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith('product')) return; // skip empty or header lines

      // Delimited by tab or comma
      const parts = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(',');
      const rawProdName = (parts[0] || '').trim();
      const rawQty = parseInt((parts[1] || '0').trim(), 10);
      const rawCost = parts[2] ? parseFloat(parts[2].trim()) : undefined;
      const rawExpiry = (parts[3] || '2028-12-31').trim();

      if (!rawProdName) return;

      // Find best match in catalog by productCode or productName
      const pLower = rawProdName.toLowerCase();
      const match = products.find(
        p => p.productCode.toLowerCase() === pLower || 
             p.productName.toLowerCase() === pLower ||
             p.productName.toLowerCase().includes(pLower) ||
             pLower.includes(p.productName.toLowerCase())
      );

      if (match) {
        // Prevent duplicate product in same list
        if (!parsedRows.some(r => r.productId === match.productId)) {
          parsedRows.push({
            productId: match.productId,
            quantity: isNaN(rawQty) || rawQty <= 0 ? 10 : rawQty,
            costPrice: rawCost && !isNaN(rawCost) && rawCost > 0 ? rawCost : match.costPrice,
            sellingPrice: match.sellingPrice,
            expiryDate: rawExpiry || '2028-12-31'
          });
        }
      } else {
        unmatchedNames.push(`Line ${idx + 1}: "${rawProdName}"`);
      }
    });

    if (parsedRows.length === 0) {
      setExcelParseError(`No matching products found. Unmatched items:\n${unmatchedNames.slice(0, 5).join('\n')}`);
      return;
    }

    setItems(parsedRows);
    setActiveTab('table');

    if (unmatchedNames.length > 0) {
      alert(`Imported ${parsedRows.length} products. Note: ${unmatchedNames.length} lines could not be matched with catalog SKUs:\n${unmatchedNames.slice(0, 4).join('\n')}`);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    let units = 0;
    let costVal = 0;
    let sellVal = 0;
    items.forEach(it => {
      const q = Number(it.quantity) || 0;
      units += q;
      costVal += q * (Number(it.costPrice) || 0);
      sellVal += q * (Number(it.sellingPrice) || 0);
    });
    return {
      productsCount: items.length,
      totalUnits: units,
      totalCostVal: costVal,
      totalSellVal: sellVal,
      projectedMargin: sellVal > 0 ? ((sellVal - costVal) / sellVal) * 100 : 0
    };
  }, [items]);

  // Existing opening stock batches list for history view
  const existingOpeningBatches = useMemo(() => {
    const map = new Map<string, {
      batchNumber: string;
      locationId: string;
      date: string;
      createdBy: string;
      productsCount: number;
      totalUnits: number;
      currentUnits: number;
      totalValuation: number;
    }>();

    batches.forEach(b => {
      if (b.isOpeningStock || b.batchNumber.startsWith('OPEN-')) {
        const key = `${b.batchNumber}-${b.locationId}`;
        const existing = map.get(key);
        if (existing) {
          existing.productsCount += 1;
          existing.totalUnits += b.quantityReceived;
          existing.currentUnits += b.currentQuantity;
          existing.totalValuation += b.quantityReceived * b.costPrice;
        } else {
          map.set(key, {
            batchNumber: b.batchNumber,
            locationId: b.locationId,
            date: b.purchaseDate,
            createdBy: b.createdBy,
            productsCount: 1,
            totalUnits: b.quantityReceived,
            currentUnits: b.currentQuantity,
            totalValuation: b.quantityReceived * b.costPrice
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.batchNumber.localeCompare(a.batchNumber));
  }, [batches]);

  // Submit bulk opening stock
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('Please add at least one product to the opening stock transaction.');
      return;
    }

    const hasInvalidQty = items.some(it => Number(it.quantity) <= 0);
    if (hasInvalidQty) {
      alert('All products must have a quantity greater than zero.');
      return;
    }

    try {
      const result = addBulkOpeningStock({
        openingBatchNumber: openingBatchNumber.trim(),
        openingStockDate: openingStockDate.trim(),
        locationId,
        remarks: remarks.trim(),
        createdBy: currentUser.fullName,
        items: items.map(it => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          costPrice: Number(it.costPrice),
          sellingPrice: Number(it.sellingPrice),
          expiryDate: it.expiryDate
        }))
      });

      setSubmissionSuccess({
        openingBatchNumber: result.openingBatchNumber,
        batchesCreated: result.batchesCreated,
        totalQuantity: result.totalQuantity,
        totalValuation: result.totalValuation
      });
    } catch (err: any) {
      alert(err.message || 'Failed to register opening stock transaction.');
    }
  };

  const selectedLocObj = locations.find(l => l.locationId === locationId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Opening Stock Batch Management
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-100/90 text-teal-900 border border-teal-200">
                  Bulk Initialization & Migration
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign a common Opening Batch Number across multiple products during clinic setup or data migration.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'table'
                  ? 'border-teal-700 text-teal-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Product Entry ({items.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('excel_paste')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'excel_paste'
                  ? 'border-teal-700 text-teal-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Paste from Excel / CSV</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-teal-700 text-teal-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Existing Opening Batches ({existingOpeningBatches.length})</span>
            </button>
          </div>

          {/* Quick template actions */}
          {activeTab === 'table' && !submissionSuccess && (
            <div className="flex items-center gap-2 pb-2">
              <button
                type="button"
                onClick={loadPromptExample}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors shadow-2xs"
                title="Loads Hair Color (50), Hair Oil (30), Face Wash (25), Soap (40)"
              >
                <Sparkles className="w-3 h-3 text-teal-700" />
                <span>Load Demo Example (4 Products)</span>
              </button>

              <button
                type="button"
                onClick={loadAllProducts}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add All Catalog SKUs
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/40">
          
          {/* SUCCESS SCREEN */}
          {submissionSuccess ? (
            <div className="bg-white rounded-xl border border-emerald-200 p-6 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Opening Stock Batch Registered Successfully!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  Common batch number <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{submissionSuccess.openingBatchNumber}</span> was automatically assigned to all {submissionSuccess.batchesCreated} products.
                </p>
              </div>

              {/* Transaction Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono">Opening Batch #</span>
                  <p className="font-mono font-bold text-slate-900 text-sm">{submissionSuccess.openingBatchNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono">Products Initialized</span>
                  <p className="font-bold text-slate-900 text-sm">{submissionSuccess.batchesCreated} SKUs</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono">Total Units</span>
                  <p className="font-bold text-emerald-700 text-sm font-mono">+{submissionSuccess.totalQuantity} units</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono">Cost Valuation</span>
                  <p className="font-bold text-slate-900 text-sm font-mono">₹{submissionSuccess.totalValuation.toLocaleString()}</p>
                </div>
              </div>

              {/* Architectural Notice */}
              <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-lg p-3 text-xs text-indigo-900 text-left max-w-2xl mx-auto flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-indigo-950">
                    Stock Movement Ledger Audit Record Created:
                  </p>
                  <p className="text-[11px] text-indigo-800">
                    Recorded under Movement Type: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200">Opening Stock</span> and Reference No: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200">{submissionSuccess.openingBatchNumber}</span>. All stock ledger entries and batches share the exact Opening Batch #, Opening Stock Date, Location, and Creator.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onNavigateToLedger && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToLedger();
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>View in Movement Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {onNavigateToReports && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToReports();
                    }}
                    className="px-4 py-2 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>View Opening Stock Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setSubmissionSuccess(null);
                    setItems([]);
                    handleAutoGenerateBatch();
                  }}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  + Add Another Opening Stock Batch
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TRANSACTION HEADER: COMMON FIELDS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      1. Common Opening Stock Header Details
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Shared by all selected products)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Logged By:</span>
                    <span className="font-semibold text-slate-800">{currentUser.fullName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-600">
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* FIELD: Opening Batch # (CRITICAL REQUIREMENT) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <span>Opening Batch #</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateBatch}
                        className="text-[11px] text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1"
                        title="Auto-generate sequential batch number"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Auto Generate</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={openingBatchNumber}
                        onChange={e => {
                          setOpeningBatchNumber(e.target.value);
                          setIsManualBatchEdited(true);
                        }}
                        placeholder="e.g. OPEN-2026-001 or OPEN-HOS-0001"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-amber-50/50 border border-amber-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white tracking-wide"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Single batch number automatically assigned to all products in this transaction. Leave blank to auto-generate.
                    </p>
                  </div>

                  {/* FIELD: Target Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>Location / Branch</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={locationId}
                      onChange={e => {
                        const newLoc = e.target.value;
                        setLocationId(newLoc);
                        // If not manually customized, update auto batch with new location code
                        if (!isManualBatchEdited) {
                          setOpeningBatchNumber(generateNextOpeningBatchNumber(newLoc));
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-medium"
                    >
                      {locations.map(loc => (
                        <option key={loc.locationId} value={loc.locationId}>
                          {loc.locationCode} - {loc.locationName}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500">
                      All products will be stocked at this clinic depot.
                    </p>
                  </div>

                  {/* FIELD: Opening Stock Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>Opening Stock Date</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={openingStockDate}
                      onChange={e => setOpeningStockDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-500">
                      Transaction date for financial & inventory ledger.
                    </p>
                  </div>
                </div>

                {/* Optional remarks */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">Remarks / Source:</span>
                  <input
                    type="text"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="e.g. Initial Stock Register Migration, Excel Stock Count 2026..."
                    className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* TAB 1: INTERACTIVE TABLE ENTRY */}
              {activeTab === 'table' && (
                <div className="space-y-4">
                  {/* Product Search & Add Bar */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Search product from master catalog by name or code..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedProductIdToAdd}
                        onChange={e => {
                          setSelectedProductIdToAdd(e.target.value);
                          if (e.target.value) {
                            handleAddProduct(e.target.value);
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 max-w-xs truncate focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-medium"
                      >
                        <option value="">+ Select Product to Add...</option>
                        {products
                          .filter(p => !items.some(it => it.productId === p.productId))
                          .filter(p => !productSearch || p.productName.toLowerCase().includes(productSearch.toLowerCase()) || p.productCode.toLowerCase().includes(productSearch.toLowerCase()))
                          .map(p => (
                            <option key={p.productId} value={p.productId}>
                              {p.productCode} - {p.productName} ({p.volumeSize})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    {items.length === 0 ? (
                      <div className="p-8 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">No products added to this opening stock transaction yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Click below to load the user specification example or select products from the catalog.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={loadPromptExample}
                          className="px-3 py-1.5 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                          <span>Load Specification Example (Hair Color 50, Hair Oil 30, Face Wash 25, Soap 40)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Product Name & SKU</th>
                              <th className="py-2.5 px-3">Assigned Batch #</th>
                              <th className="py-2.5 px-3 w-28 text-right">Opening Qty</th>
                              <th className="py-2.5 px-3 w-28 text-right">Cost Price (₹)</th>
                              <th className="py-2.5 px-3 w-28 text-right">Selling Price (₹)</th>
                              <th className="py-2.5 px-3 w-32">Expiry Date</th>
                              <th className="py-2.5 px-3 text-right">Valuation (₹)</th>
                              <th className="py-2.5 px-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {items.map((row, idx) => {
                              const prod = products.find(p => p.productId === row.productId);
                              const lineValuation = (Number(row.quantity) || 0) * (Number(row.costPrice) || 0);

                              return (
                                <tr key={row.productId} className="hover:bg-slate-50/70">
                                  <td className="py-2 px-3 text-slate-400 text-[11px] font-sans">
                                    {idx + 1}
                                  </td>

                                  <td className="py-2 px-3 font-sans">
                                    <div className="flex items-center gap-2">
                                      <ProductIcon categoryId={prod?.categoryId || ''} className="w-6 h-6 shrink-0" />
                                      <div>
                                        <div className="font-semibold text-slate-900 line-clamp-1">{prod?.productName}</div>
                                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                          <span>{prod?.productCode}</span>
                                          <span>·</span>
                                          <span>{prod?.volumeSize}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Assigned Common Batch Number pill */}
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-50 text-amber-800 border border-amber-200">
                                      {openingBatchNumber || 'OPEN-AUTO'}
                                    </span>
                                  </td>

                                  {/* Quantity */}
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      min="1"
                                      value={row.quantity}
                                      onChange={e => handleUpdateItem(idx, { quantity: Number(e.target.value) })}
                                      className="w-20 px-2 py-1 text-xs text-right bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                    />
                                  </td>

                                  {/* Cost Price */}
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.costPrice}
                                      onChange={e => handleUpdateItem(idx, { costPrice: Number(e.target.value) })}
                                      className="w-20 px-2 py-1 text-xs text-right bg-white border border-slate-200 rounded font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                    />
                                  </td>

                                  {/* Selling Price */}
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.sellingPrice}
                                      onChange={e => handleUpdateItem(idx, { sellingPrice: Number(e.target.value) })}
                                      className="w-20 px-2 py-1 text-xs text-right bg-white border border-slate-200 rounded font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                    />
                                  </td>

                                  {/* Expiry Date */}
                                  <td className="py-2 px-3">
                                    <input
                                      type="date"
                                      value={row.expiryDate}
                                      onChange={e => handleUpdateItem(idx, { expiryDate: e.target.value })}
                                      className="w-28 px-1.5 py-1 text-[11px] bg-white border border-slate-200 rounded font-mono text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                    />
                                  </td>

                                  {/* Valuation */}
                                  <td className="py-2 px-3 text-right text-slate-900 font-bold tabular-nums">
                                    ₹{lineValuation.toLocaleString()}
                                  </td>

                                  {/* Action */}
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(idx)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                      title="Remove from this batch"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: EXCEL / CSV PASTE MIGRATION */}
              {activeTab === 'excel_paste' && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Paste Opening Stock Data from Excel or Google Sheets
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Copy rows directly from your inventory spreadsheet and paste below. The system will match product names or codes, apply the common Opening Batch Number, and initialize inventory.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 space-y-1">
                    <div className="text-[11px] font-bold text-slate-700">Expected Format (Tab or Comma separated):</div>
                    <div className="text-teal-700">Product Name or Code [Tab] Quantity [Tab] Cost Price (Optional) [Tab] Expiry (Optional)</div>
                    <div className="text-slate-400 text-[11px]">Example:</div>
                    <div className="text-slate-500">Hair Color Black 130g &nbsp;&nbsp; 50 &nbsp;&nbsp; 210 &nbsp;&nbsp; 2028-12-31</div>
                    <div className="text-slate-500">Hair Oil &nbsp;&nbsp; 30 &nbsp;&nbsp; 220 &nbsp;&nbsp; 2028-12-31</div>
                  </div>

                  <textarea
                    rows={6}
                    value={excelText}
                    onChange={e => setExcelText(e.target.value)}
                    placeholder={`Paste spreadsheet rows here...\n\nExample:\nHair Color Black 130g\t50\t210\nRosemary & Bhringraj Follicle Revitalizing Oil\t30\t220\nSalicylic Acid 2% Pore Clearing Face Wash\t25\t175\nDermacalm Syndet Cleansing Bar\t40\t95`}
                    className="w-full p-3 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />

                  {excelParseError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 whitespace-pre-line">
                      {excelParseError}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setExcelText(`Hair Color Black 130g\t50\t210\nRosemary & Bhringraj Follicle Revitalizing Oil\t30\t220\nSalicylic Acid 2% Pore Clearing Face Wash\t25\t175\nDermacalm Syndet Cleansing Bar\t40\t95`);
                      }}
                      className="text-xs text-teal-700 hover:text-teal-900 font-medium"
                    >
                      Fill Sample Excel Data
                    </button>

                    <button
                      type="button"
                      onClick={handleParseExcel}
                      className="px-4 py-2 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900 transition-colors shadow-xs"
                    >
                      Process & Match Products →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: EXISTING OPENING BATCHES */}
              {activeTab === 'history' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Previously Initialized Opening Stock Batches
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Each opening stock transaction maintains its own independent batch number without altering prior migrations.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                          <th className="py-2.5 px-4 font-mono">Opening Batch #</th>
                          <th className="py-2.5 px-4">Branch</th>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Created By</th>
                          <th className="py-2.5 px-4 text-right">Products Count</th>
                          <th className="py-2.5 px-4 text-right">Total Inward Qty</th>
                          <th className="py-2.5 px-4 text-right">Current Available</th>
                          <th className="py-2.5 px-4 text-right">Cost Valuation (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {existingOpeningBatches.map(b => {
                          const loc = locations.find(l => l.locationId === b.locationId);
                          return (
                            <tr key={`${b.batchNumber}-${b.locationId}`} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4">
                                <span className="px-2 py-0.5 rounded font-bold text-xs bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  {b.batchNumber}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-sans">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                  {loc?.locationCode} - {loc?.locationName.split(' ')[0]}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                                {b.date}
                              </td>
                              <td className="py-2.5 px-4 font-sans text-slate-700">
                                {b.createdBy}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                {b.productsCount} SKUs
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-800">
                                +{b.totalUnits}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                                {b.currentUnits}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                                ₹{b.totalValuation.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TRANSACTION SUMMARY BOTTOM KPI BAR */}
              {activeTab === 'table' && items.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-slate-400 text-[10px] uppercase font-mono">Products to Stock</div>
                      <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                        {totals.productsCount} <span className="text-xs font-sans text-slate-400 font-normal">items</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-100">
                      <div className="text-emerald-700 text-[10px] uppercase font-mono font-semibold">Total Stock Units</div>
                      <div className="text-base font-bold text-emerald-800 font-mono mt-0.5">
                        +{totals.totalUnits} <span className="text-xs font-sans text-emerald-600 font-normal">units</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-slate-400 text-[10px] uppercase font-mono">Total Cost Valuation</div>
                      <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                        ₹{totals.totalCostVal.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-2.5 bg-teal-50/70 rounded-lg border border-teal-100">
                      <div className="text-teal-700 text-[10px] uppercase font-mono font-semibold">Projected Retail Value</div>
                      <div className="text-base font-bold text-teal-800 font-mono mt-0.5">
                        ₹{totals.totalSellVal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Modal Footer */}
        {!submissionSuccess && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700">Target Batch:</span>
              <span className="font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-900 rounded border border-amber-200">
                {openingBatchNumber || 'OPEN-AUTO'}
              </span>
              <span>·</span>
              <span>Branch: <strong className="text-slate-700">{selectedLocObj?.locationCode}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={items.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors shadow-xs flex items-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Register Opening Stock ({items.length} Products)</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
