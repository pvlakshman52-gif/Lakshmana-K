import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
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
  PackageCheck,
  Download,
  Filter,
  FileText
} from 'lucide-react';
import { ProductIcon } from '../common/ProductIcon';
import { OpeningStockExcelImporter } from './OpeningStockExcelImporter';
import { downloadOpeningStockExcelTemplate, downloadOpeningStockCSVTemplate } from '../../utils/excelImportUtils';

interface OpeningStockViewProps {
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

export const OpeningStockView: React.FC<OpeningStockViewProps> = ({
  onNavigateToLedger,
  onNavigateToReports
}) => {
  const { 
    products, 
    categories,
    locations, 
    selectedLocationId, 
    currentUser, 
    generateNextOpeningBatchNumber, 
    addBulkOpeningStock,
    batches
  } = useClinic();

  const defaultLoc = selectedLocationId === 'ALL' ? 'LOC-HOS' : selectedLocationId;
  const [locationId, setLocationId] = useState<string>(defaultLoc);
  
  // Opening Batch Number
  const [openingBatchNumber, setOpeningBatchNumber] = useState<string>('');
  const [isManualBatchEdited, setIsManualBatchEdited] = useState<boolean>(false);
  const [openingStockDate, setOpeningStockDate] = useState<string>('2026-09-27');
  const [remarks, setRemarks] = useState<string>('Bulk Stock Migration from Manual Register');

  // Tabs
  const [activeTab, setActiveTab] = useState<'excel_import' | 'entry' | 'excel_paste' | 'history'>('excel_import');
  const [excelText, setExcelText] = useState<string>('');
  const [excelParseError, setExcelParseError] = useState<string | null>(null);

  // Selected items to register
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');

  // Success message after registration
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    openingBatchNumber: string;
    batchesCreated: number;
    totalQuantity: number;
    totalValuation: number;
  } | null>(null);

  // Auto-generate batch number when location changes
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
    setActiveTab('entry');
  };

  const loadAllProducts = () => {
    const allRows: ItemRow[] = (products || []).filter(p => p && p.productId).map(p => ({
      productId: p.productId,
      quantity: 20,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      expiryDate: '2028-12-31'
    }));
    setItems(allRows);
    setActiveTab('entry');
  };

  const handleAddProduct = (pId: string) => {
    if (!pId) return;
    if (items.some(it => it.productId === pId)) {
      alert('This product is already in the list.');
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

  const handleAutoGenerateBatch = () => {
    const fresh = generateNextOpeningBatchNumber(locationId);
    setOpeningBatchNumber(fresh);
    setIsManualBatchEdited(false);
  };

  // Parse Excel text
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
      if (!trimmed || trimmed.toLowerCase().startsWith('product')) return;

      const parts = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(',');
      const rawProdName = (parts[0] || '').trim();
      const rawQty = parseInt((parts[1] || '0').trim(), 10);
      const rawCost = parts[2] ? parseFloat(parts[2].trim()) : undefined;
      const rawExpiry = (parts[3] || '2028-12-31').trim();

      if (!rawProdName) return;

      const pLower = rawProdName.toLowerCase();
      const match = products.find(
        p => p.productCode.toLowerCase() === pLower || 
             p.productName.toLowerCase() === pLower ||
             p.productName.toLowerCase().includes(pLower) ||
             pLower.includes(p.productName.toLowerCase())
      );

      if (match) {
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
    setActiveTab('entry');

    if (unmatchedNames.length > 0) {
      alert(`Imported ${parsedRows.length} products. Note: ${unmatchedNames.length} lines could not be matched with catalog SKUs.`);
    }
  };

  // Totals calculation
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Opening Stock & Bulk Migration
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
              Common Batch Management
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Initialize multiple warehouse products under a single Opening Batch Number. Recorded automatically into Stock Movement Ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadOpeningStockExcelTemplate(products, categories, selectedLocObj?.locationCode || 'HOS')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[40px]"
            title="Download Excel spreadsheet template pre-populated with all clinic products"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Download Excel Template (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excel_import')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[40px] ${
              activeTab === 'excel_import'
                ? 'bg-teal-900 text-white'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Upload Live Stock File</span>
          </button>

          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[40px]"
            >
              <span>Reports</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}

          {onNavigateToLedger && (
            <button
              onClick={onNavigateToLedger}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[40px]"
            >
              <span>Ledger</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-xl shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('excel_import')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'excel_import'
                ? 'border-emerald-600 text-emerald-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel File Import & Template</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              Fillable
            </span>
          </button>

          <button
            onClick={() => setActiveTab('entry')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'entry'
                ? 'border-teal-700 text-teal-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manual Grid Entry ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('excel_paste')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'excel_paste'
                ? 'border-teal-700 text-teal-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quick Paste Rows</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-teal-700 text-teal-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Batches History ({existingOpeningBatches.length})</span>
          </button>
        </div>

        {activeTab === 'entry' && !submissionSuccess && (
          <div className="flex items-center gap-2 py-2">
            <button
              type="button"
              onClick={loadPromptExample}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors"
            >
              <Sparkles className="w-3 h-3 text-teal-700" />
              <span>Load Prompt Example (4 Items)</span>
            </button>

            <button
              type="button"
              onClick={loadAllProducts}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Add All SKUs
            </button>
          </div>
        )}
      </div>

      {/* SUCCESS BANNER */}
      {submissionSuccess && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900">
                Opening Stock Batch <span className="font-mono text-emerald-800">{submissionSuccess.openingBatchNumber}</span> Created Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All {submissionSuccess.batchesCreated} products have been stocked under common batch <span className="font-mono font-bold text-slate-900">{submissionSuccess.openingBatchNumber}</span> with total of {submissionSuccess.totalQuantity} units.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-mono">
                  Valuation: ₹{submissionSuccess.totalValuation.toLocaleString()}
                </span>
                <span className="text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded font-mono">
                  Ledger Ref: {submissionSuccess.openingBatchNumber}
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded font-mono">
                  Type: Opening Stock
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSubmissionSuccess(null);
                  setItems([]);
                  handleAutoGenerateBatch();
                }}
                className="px-3 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900 transition-colors"
              >
                + New Opening Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMON OPENING STOCK HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Common Opening Stock Transaction Header
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              (All products in this transaction share these attributes)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Created By:</span>
            <span className="font-semibold text-slate-800">{currentUser.fullName}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-600">
              {currentUser.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* FIELD: Opening Batch # */}
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
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto Generate</span>
              </button>
            </div>

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
            <p className="text-[10px] text-slate-500">
              Common batch number for all products in this transaction. Leave blank to auto-generate.
            </p>
          </div>

          {/* FIELD: Branch Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>Location / Depot</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={locationId}
              onChange={e => {
                const newLoc = e.target.value;
                setLocationId(newLoc);
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
              Target branch warehouse receiving this opening stock.
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
              Audit opening date recorded in stock movement ledger.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
          <span className="text-[11px] text-slate-400 whitespace-nowrap">Remarks / Notes:</span>
          <input
            type="text"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="e.g. Migration from manual register, bulk count April 2026..."
            className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* TAB 1: PRODUCT ENTRY */}
      {activeTab === 'entry' && (
        <div className="space-y-4">
          {/* Add product bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Search catalog product by name or SKU..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <select
              value={selectedProductIdToAdd}
              onChange={e => {
                setSelectedProductIdToAdd(e.target.value);
                if (e.target.value) handleAddProduct(e.target.value);
              }}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 max-w-xs truncate focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-medium"
            >
              <option value="">+ Add Product to Batch...</option>
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

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {items.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">No products added yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Select products from catalog above, or click below to load the 4-item user prompt example (Hair Color 50, Hair Oil 30, Face Wash 25, Soap 40).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadPromptExample}
                  className="px-4 py-2 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <span>Load Specification Example</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name & Code</th>
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
                          <td className="py-2.5 px-3 text-slate-400 text-[11px] font-sans">
                            {idx + 1}
                          </td>

                          <td className="py-2.5 px-3 font-sans">
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

                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-50 text-amber-800 border border-amber-200">
                              {openingBatchNumber || 'OPEN-AUTO'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={e => handleUpdateItem(idx, { quantity: Number(e.target.value) })}
                              className="w-20 px-2 py-1 text-xs text-right bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={row.costPrice}
                              onChange={e => handleUpdateItem(idx, { costPrice: Number(e.target.value) })}
                              className="w-20 px-2 py-1 text-xs text-right bg-white border border-slate-200 rounded font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={row.sellingPrice}
                              onChange={e => handleUpdateItem(idx, { sellingPrice: Number(e.target.value) })}
                              className="w-20 px-2 py-1 text-xs text-right bg-white border border-slate-200 rounded font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                            />
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="date"
                              value={row.expiryDate}
                              onChange={e => handleUpdateItem(idx, { expiryDate: e.target.value })}
                              className="w-28 px-1.5 py-1 text-[11px] bg-white border border-slate-200 rounded font-mono text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right text-slate-900 font-bold tabular-nums">
                            ₹{lineValuation.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Remove item"
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

          {/* Bottom Summary Bar & Submit Button */}
          {items.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-mono">Products to Stock</div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    {totals.productsCount} <span className="text-xs font-sans text-slate-400 font-normal">items</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100">
                  <div className="text-emerald-700 text-[10px] uppercase font-mono font-semibold">Total Stock Units</div>
                  <div className="text-lg font-bold text-emerald-800 font-mono mt-0.5">
                    +{totals.totalUnits} <span className="text-xs font-sans text-emerald-600 font-normal">units</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-mono">Total Cost Valuation</div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    ₹{totals.totalCostVal.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-100">
                  <div className="text-teal-700 text-[10px] uppercase font-mono font-semibold">Projected Retail Value</div>
                  <div className="text-lg font-bold text-teal-800 font-mono mt-0.5">
                    ₹{totals.totalSellVal.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Transaction will be recorded in Stock Movement Ledger under Reference No: <strong className="font-mono text-slate-900">{openingBatchNumber}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Register Opening Stock Transaction ({items.length} Products)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: EXCEL / CSV FILE UPLOAD & PREVIEW */}
      {activeTab === 'excel_import' && (
        <OpeningStockExcelImporter
          locationId={locationId}
          openingBatchNumber={openingBatchNumber}
          openingStockDate={openingStockDate}
          remarks={remarks}
          onSuccess={(res) => {
            setSubmissionSuccess(res);
            handleAutoGenerateBatch();
          }}
        />
      )}

      {/* TAB 2: EXCEL PASTE */}
      {activeTab === 'excel_paste' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Bulk Stock Migration from Excel / Google Sheets
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Copy tabular inventory data directly from spreadsheets and paste below. The system automatically parses quantities, matches SKUs, and applies the common Opening Batch Number.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 space-y-1">
            <div className="text-[11px] font-bold text-slate-700">Format: Product [Tab or Comma] Quantity [Tab or Comma] Cost Price [Tab or Comma] Expiry</div>
            <div className="text-slate-500">Hair Color Black 130g &nbsp;&nbsp; 50 &nbsp;&nbsp; 210 &nbsp;&nbsp; 2028-12-31</div>
            <div className="text-slate-500">Hair Oil &nbsp;&nbsp; 30 &nbsp;&nbsp; 220 &nbsp;&nbsp; 2028-12-31</div>
            <div className="text-slate-500">Face Wash &nbsp;&nbsp; 25 &nbsp;&nbsp; 175 &nbsp;&nbsp; 2028-12-31</div>
            <div className="text-slate-500">Soap &nbsp;&nbsp; 40 &nbsp;&nbsp; 95 &nbsp;&nbsp; 2028-12-31</div>
          </div>

          <textarea
            rows={8}
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
              className="px-5 py-2 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900 transition-colors shadow-xs"
            >
              Process & Match SKUs →
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: EXISTING OPENING BATCHES HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900">
              Historical Opening Stock Batches
            </h3>
            <p className="text-[11px] text-slate-500">
              Transactions initialized under different Opening Batch Numbers without affecting previous records.
            </p>
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
                      <td className="py-2.5 px-4 text-right font-sans font-medium text-slate-800">
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

    </div>
  );
};
