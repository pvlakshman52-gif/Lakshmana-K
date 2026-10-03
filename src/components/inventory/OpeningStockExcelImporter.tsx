import React, { useState, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Product } from '../../types/erp';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  FileText, 
  RefreshCw, 
  Layers, 
  PackageCheck, 
  Info, 
  ArrowRight,
  Sparkles,
  ClipboardCopy,
  Check,
  Building2,
  Trash2
} from 'lucide-react';
import { ProductIcon } from '../common/ProductIcon';
import { 
  downloadOpeningStockExcelTemplate, 
  downloadOpeningStockCSVTemplate, 
  parseOpeningStockExcelFile, 
  ParsedOpeningStockResult,
  ParsedExcelRow 
} from '../../utils/excelImportUtils';

interface OpeningStockExcelImporterProps {
  locationId: string;
  openingBatchNumber: string;
  openingStockDate: string;
  remarks: string;
  onSuccess: (result: {
    openingBatchNumber: string;
    batchesCreated: number;
    totalQuantity: number;
    totalValuation: number;
  }) => void;
}

export const OpeningStockExcelImporter: React.FC<OpeningStockExcelImporterProps> = ({
  locationId,
  openingBatchNumber,
  openingStockDate,
  remarks,
  onSuccess
}) => {
  const { products, categories, locations, addBulkOpeningStock, currentUser } = useClinic();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedOpeningStockResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'WARNING'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetLocation = locations.find(l => l.locationId === locationId) || locations[0];
  const targetBranchCode = targetLocation?.locationCode || 'HOS';

  // Handle file reading
  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        throw new Error(`Unsupported file type: ${file.name}. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.`);
      }

      const result = await parseOpeningStockExcelFile(file, products);
      setParseResult(result);
    } catch (err: any) {
      console.error('Error processing Excel file:', err);
      setErrorMessage(err.message || 'Failed to read spreadsheet file. Please verify file format.');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Inline correction of quantity in parsed table
  const handleUpdateRowQty = (rowIndex: number, newQty: number) => {
    if (!parseResult) return;
    const updatedRows = parseResult.rows.map(r => {
      if (r.rowIndex === rowIndex) {
        const qty = Math.max(0, newQty);
        const status: ParsedExcelRow['status'] = (!r.matchedProduct) 
          ? 'UNMATCHED_PRODUCT' 
          : (qty <= 0 ? 'INVALID_QTY' : 'VALID');
        return {
          ...r,
          quantity: qty,
          status,
          message: status === 'VALID' ? 'Ready to inward' : r.message
        };
      }
      return r;
    });

    // Recalculate summary metrics
    recalculateMetrics(updatedRows);
  };

  // Inline product re-matching if an item wasn't matched automatically
  const handleManualProductMatch = (rowIndex: number, selectedProductId: string) => {
    if (!parseResult) return;
    const matched = products.find(p => p.productId === selectedProductId) || null;
    const updatedRows = parseResult.rows.map(r => {
      if (r.rowIndex === rowIndex) {
        const status: ParsedExcelRow['status'] = (!matched) 
          ? 'UNMATCHED_PRODUCT' 
          : (r.quantity <= 0 ? 'INVALID_QTY' : 'VALID');
        return {
          ...r,
          matchedProduct: matched,
          costPrice: matched ? matched.costPrice : r.costPrice,
          sellingPrice: matched ? matched.sellingPrice : r.sellingPrice,
          status,
          message: status === 'VALID' ? 'Ready to inward' : 'Product selection required.'
        };
      }
      return r;
    });

    recalculateMetrics(updatedRows);
  };

  // Remove row from parsed list
  const handleRemoveRow = (rowIndex: number) => {
    if (!parseResult) return;
    const updatedRows = parseResult.rows.filter(r => r.rowIndex !== rowIndex);
    recalculateMetrics(updatedRows);
  };

  const recalculateMetrics = (updatedRows: ParsedExcelRow[]) => {
    let validCount = 0;
    let invalidCount = 0;
    let totalUnits = 0;
    let totalCostValuation = 0;
    let totalSellValuation = 0;

    updatedRows.forEach(r => {
      if (r.status === 'VALID' && r.matchedProduct) {
        validCount++;
        totalUnits += r.quantity;
        totalCostValuation += r.quantity * r.costPrice;
        totalSellValuation += r.quantity * r.sellingPrice;
      } else {
        invalidCount++;
      }
    });

    setParseResult(prev => prev ? {
      ...prev,
      totalRows: updatedRows.length,
      validCount,
      invalidCount,
      totalUnits,
      totalCostValuation,
      totalSellValuation,
      rows: updatedRows
    } : null);
  };

  // Commit valid parsed items into the database
  const handleCommitToDatabase = () => {
    if (!parseResult || isSubmitting) return;

    const validRows = parseResult.rows.filter(r => r.status === 'VALID' && r.matchedProduct);
    if (validRows.length === 0) {
      alert('There are no valid product rows to import. Please check quantities and product matching.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = validRows.map(r => ({
        productId: r.matchedProduct!.productId,
        quantity: r.quantity,
        costPrice: r.costPrice,
        sellingPrice: r.sellingPrice,
        expiryDate: r.expiryDate || '2028-12-31'
      }));

      const res = addBulkOpeningStock({
        openingBatchNumber: openingBatchNumber.trim(),
        openingStockDate: openingStockDate.trim(),
        locationId,
        remarks: remarks.trim() || `Excel Import: ${parseResult.fileName}`,
        createdBy: currentUser.fullName,
        items: itemsPayload
      });

      onSuccess({
        openingBatchNumber: res.openingBatchNumber,
        batchesCreated: res.batchesCreated,
        totalQuantity: res.totalQuantity,
        totalValuation: res.totalValuation
      });

      // Clear imported file state
      setParseResult(null);
    } catch (err: any) {
      console.error('Failed to commit opening stock from Excel:', err);
      alert(err.message || 'Failed to save opening stock to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy sample template to clipboard
  const handleCopySampleTemplate = () => {
    const sampleText = [
      'Product Code\tProduct Name\tOpening Quantity\tCost Price\tSelling Price\tExpiry Date\tBatch Number\tBranch Code',
      'PRD-HAIR-001\tAnaphase Anti-Hair Loss Follicle Stimulating Serum 100ml\t50\t450\t650\t2028-12-31\t\t' + targetBranchCode,
      'PRD-SKIN-001\tBio-Collagen Intense Overnight Firming Facial Mask 50g\t30\t320\t480\t2028-12-31\t\t' + targetBranchCode,
      'PRD-BODY-001\tCeramide Barrier Replenishing Deep Moisture Cream 200ml\t40\t280\t420\t2028-12-31\t\t' + targetBranchCode,
      'PRD-PRO-001\tSalicylic Acid 20% Clinical BHA Exfoliating Peel 50ml\t25\t550\t850\t2028-12-31\t\t' + targetBranchCode
    ].join('\n');

    navigator.clipboard.writeText(sampleText).then(() => {
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 3000);
    });
  };

  const filteredDisplayRows = parseResult ? parseResult.rows.filter(r => {
    if (filterMode === 'VALID') return r.status === 'VALID';
    if (filterMode === 'WARNING') return r.status !== 'VALID';
    return true;
  }) : [];

  return (
    <div className="space-y-6">
      
      {/* Step 1: Download Official Excel Template Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-emerald-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-bold text-[10px] tracking-wide uppercase">
                Step 1: Download Template
              </span>
              <span className="text-xs text-emerald-200">
                Pre-populated with all {products.length} Clinic Products
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Opening Stock Excel & CSV Fillable Template
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Download the official spreadsheet template. All current active clinic SKUs, names, categories, and rates are already filled in. Simply enter your physical opening quantities and upload!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Excel (.xlsx) Download */}
            <button
              type="button"
              onClick={() => downloadOpeningStockExcelTemplate(products, categories, targetBranchCode)}
              className="min-h-[44px] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-emerald-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-950" />
              <span>Download Excel (.xlsx)</span>
            </button>

            {/* CSV (.csv) Download */}
            <button
              type="button"
              onClick={() => downloadOpeningStockCSVTemplate(products, targetBranchCode)}
              className="min-h-[44px] px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs rounded-xl border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-300" />
              <span>Download CSV</span>
            </button>

            {/* Copy Sample to Clipboard */}
            <button
              type="button"
              onClick={handleCopySampleTemplate}
              className="min-h-[44px] px-3 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy 4 sample rows to paste directly into Excel"
            >
              {copiedTemplate ? <Check className="w-4 h-4 text-emerald-300" /> : <ClipboardCopy className="w-4 h-4 text-slate-300" />}
              <span>{copiedTemplate ? 'Copied!' : 'Copy Sample'}</span>
            </button>
          </div>
        </div>

        {/* Column Format Legend Pill Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[11px] font-mono text-emerald-100">
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-emerald-300 font-bold block">1. Product Code</span>
            <span className="text-[10px] text-slate-400">e.g. PRD-HAIR-001</span>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-emerald-300 font-bold block">2. Product Name</span>
            <span className="text-[10px] text-slate-400">Formulation Name</span>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-amber-300 font-bold block">3. Quantity *</span>
            <span className="text-[10px] text-amber-200/80">Opening Count (units)</span>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-emerald-300 font-bold block">4. Cost Price</span>
            <span className="text-[10px] text-slate-400">Purchase rate (₹)</span>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-emerald-300 font-bold block">5. Selling Price</span>
            <span className="text-[10px] text-slate-400">Counter rate (₹)</span>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-emerald-300 font-bold block">6. Expiry Date</span>
            <span className="text-[10px] text-slate-400">YYYY-MM-DD</span>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-emerald-300 font-bold block">7. Batch Number</span>
            <span className="text-[10px] text-slate-400">Auto if empty</span>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-emerald-300 font-bold block">8. Branch Code</span>
            <span className="text-[10px] text-slate-400">{targetBranchCode}</span>
          </div>
        </div>
      </div>

      {/* Step 2: Drag & Drop File Upload Zone */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] tracking-wide uppercase">
              Step 2: Upload Live Stock File
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-1">
              Select or Drop Excel Workbook (.xlsx, .xls) or CSV
            </h3>
            <p className="text-xs text-slate-500">
              Target Branch: <strong className="text-slate-800">{targetLocation.locationName} [{targetBranchCode}]</strong> · Inward Batch: <strong className="font-mono text-teal-800">{openingBatchNumber}</strong>
            </p>
          </div>

          {parseResult && (
            <button
              type="button"
              onClick={() => {
                setParseResult(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear File</span>
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          className="hidden"
          id="opening-stock-file-input"
        />

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-teal-500 bg-teal-50/80 scale-[1.01]'
              : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50/70 bg-slate-50/30'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-xs">
            {isProcessing ? (
              <RefreshCw className="w-7 h-7 animate-spin text-teal-700" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900">
              {isProcessing ? 'Analyzing and validating Excel rows...' : 'Click to Browse or Drag & Drop Excel/CSV File'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports Microsoft Excel (.xlsx, .xls), Google Sheets export, and CSV format.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600">.XLSX</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600">.XLS</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600">.CSV</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <div className="font-bold">File Parsing Error</div>
              <p className="mt-0.5 text-rose-600">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Analysis, Validation Grid & Commit Action */}
      {parseResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5 animate-in fade-in duration-200">
          
          {/* Header Summary */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] tracking-wide uppercase">
                  Step 3: Verify & Commit
                </span>
                <span className="font-mono text-xs text-slate-500 font-bold">
                  File: {parseResult.fileName}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Parsed Live Stock Inventory Preview
              </h3>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMode === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Rows ({parseResult.totalRows})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('VALID')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMode === 'VALID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ready to Inward ({parseResult.validCount})
              </button>
              {parseResult.invalidCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('WARNING')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filterMode === 'WARNING' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Needs Attention ({parseResult.invalidCount})
                </button>
              )}
            </div>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[11px] font-sans text-slate-500">Valid SKUs to Stock</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {parseResult.validCount} <span className="text-xs font-normal text-slate-400">products</span>
              </div>
              <div className="text-[10px] text-teal-700 font-sans mt-0.5">
                {parseResult.invalidCount > 0 ? `${parseResult.invalidCount} rows require attention` : 'All rows matched'}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-sans text-emerald-800 font-semibold">Total Stock Units</div>
              <div className="text-xl font-bold text-emerald-800 mt-1">
                +{parseResult.totalUnits} <span className="text-xs font-normal text-emerald-600">units</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-sans mt-0.5">
                Will be added to live inventory
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[11px] font-sans text-slate-500">Total Purchase Valuation</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                ₹{parseResult.totalCostValuation.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                Landed stock inventory cost
              </div>
            </div>

            <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200">
              <div className="text-[11px] font-sans text-teal-800 font-semibold">Projected Retail Value</div>
              <div className="text-xl font-bold text-teal-800 mt-1">
                ₹{parseResult.totalSellValuation.toLocaleString()}
              </div>
              <div className="text-[10px] text-teal-700 font-sans mt-0.5">
                Realizable counter POS value
              </div>
            </div>
          </div>

          {/* Validation Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 z-10 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Product Name & Code</th>
                    <th className="py-2.5 px-3 text-right">Inward Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost Price (₹)</th>
                    <th className="py-2.5 px-3 text-right">Selling Price (₹)</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-right">Line Valuation</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDisplayRows.map((row) => {
                    const isValid = row.status === 'VALID';
                    const lineValuation = row.quantity * row.costPrice;

                    return (
                      <tr 
                        key={row.rowIndex}
                        className={`transition-colors ${
                          isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50/70'
                        }`}
                      >
                        {/* Row # */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                          {row.rowIndex}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Ready</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800" title={row.message}>
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>{row.status === 'UNMATCHED_PRODUCT' ? 'SKU Missing' : 'Qty Issue'}</span>
                            </span>
                          )}
                        </td>

                        {/* Product Code & Name */}
                        <td className="py-2.5 px-3">
                          {row.matchedProduct ? (
                            <div className="flex items-center gap-2">
                              <ProductIcon 
                                categoryId={row.matchedProduct.categoryId || 'CAT-SKIN'}
                                imagePath={row.matchedProduct.imagePath}
                                productName={row.matchedProduct.productName}
                                size={24}
                              />
                              <div className="min-w-0 max-w-xs">
                                <div className="font-semibold text-slate-900 truncate">
                                  {row.matchedProduct.productName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {row.matchedProduct.productCode} · {row.matchedProduct.volumeSize}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-rose-700 font-semibold text-[11px]">
                                Unmatched: "{row.rawProductName || row.rawProductCode}"
                              </div>
                              {/* Inline product picker to fix unmatched rows without re-uploading */}
                              <select
                                onChange={(e) => handleManualProductMatch(row.rowIndex, e.target.value)}
                                defaultValue=""
                                className="w-full text-[11px] py-1 px-2 bg-white border border-rose-300 rounded-lg text-slate-800 focus:outline-hidden"
                              >
                                <option value="" disabled>-- Select Matching Catalog SKU --</option>
                                {products.map(p => (
                                  <option key={p.productId} value={p.productId}>
                                    {p.productCode} - {p.productName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>

                        {/* Quantity (Inline editable) */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity || ''}
                            onChange={(e) => handleUpdateRowQty(row.rowIndex, parseInt(e.target.value, 10) || 0)}
                            className={`w-20 px-2 py-1 text-xs text-right font-mono font-bold rounded-lg border focus:outline-hidden ${
                              row.quantity > 0
                                ? 'bg-white border-slate-300 text-slate-900'
                                : 'bg-rose-50 border-rose-400 text-rose-700'
                            }`}
                          />
                        </td>

                        {/* Cost Price */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          ₹{row.costPrice}
                        </td>

                        {/* Selling Price */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{row.sellingPrice}
                        </td>

                        {/* Expiry Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                          {row.expiryDate}
                        </td>

                        {/* Line Valuation */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          ₹{lineValuation.toLocaleString()}
                        </td>

                        {/* Delete action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.rowIndex)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove row from import"
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
          </div>

          {/* Final Commit Button Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-xl">
            <div className="space-y-0.5 text-xs">
              <div className="font-bold flex items-center gap-2">
                <span>Target: {targetLocation.locationName}</span>
                <span className="font-mono text-teal-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Batch: {openingBatchNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ready to commit <strong>{parseResult.validCount} products</strong> ({parseResult.totalUnits} units) to live clinic inventory and stock movement ledger.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCommitToDatabase}
              disabled={parseResult.validCount === 0 || isSubmitting}
              className={`min-h-[48px] px-6 py-2.5 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                parseResult.validCount > 0 && !isSubmitting
                  ? 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing into Database...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Commit {parseResult.validCount} Items to Database (₹{parseResult.totalCostValuation.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
