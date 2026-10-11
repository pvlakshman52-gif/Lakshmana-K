import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  Boxes, 
  TrendingUp, 
  Upload, 
  Download, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  FileArchive, 
  RefreshCw, 
  Search, 
  Filter, 
  ArrowRight, 
  Database, 
  Check, 
  Layers, 
  CreditCard, 
  Banknote, 
  QrCode, 
  PackageCheck, 
  ShieldCheck, 
  History, 
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { branchSyncService } from '../../services/branchSyncService';
import { 
  BranchOpenStockRecord, 
  ProductSalesPeriodReport,
  PackageValidationResult,
  BranchImportRecord
} from '../../types/sync';
import { ProductIcon } from '../common/ProductIcon';

interface BranchDataSyncCenterProps {
  onNavigateToReports?: () => void;
  onNavigateToOpeningStock?: () => void;
  onNavigateToPos?: () => void;
}

export const BranchDataSyncCenter: React.FC<BranchDataSyncCenterProps> = ({
  onNavigateToReports,
  onNavigateToOpeningStock,
  onNavigateToPos
}) => {
  const { 
    sales, 
    products, 
    batches, 
    customers, 
    ledger, 
    locations, 
    selectedLocationId, 
    currentUser,
    importBranchOpenStock,
    importBranchProductSales,
    importBranchDataPackage,
    createDatabaseBackup
  } = useClinic();

  const isAdmin = currentUser.role === 'Admin';

  // Active module tab
  const [activeTab, setActiveTab] = useState<'open-stock' | 'product-sales' | 'upload-package' | 'audit-trail'>('open-stock');

  // Branch selector (Source Branch)
  const [sourceBranchId, setSourceBranchId] = useState<string>(() => {
    // Default to a secondary branch if user is in Hospete, or vice versa
    const other = locations.find(l => l.locationId !== selectedLocationId && l.locationId !== 'ALL');
    return other ? other.locationId : (locations[0]?.locationId || 'LOC-HOS');
  });

  const sourceBranch = useMemo(() => {
    return locations.find(l => l.locationId === sourceBranchId) || locations[0];
  }, [locations, sourceBranchId]);

  // Target Location for Import (where data lands in My System)
  const [targetLocationId, setTargetLocationId] = useState<string>(() => {
    if (selectedLocationId && selectedLocationId !== 'ALL') return selectedLocationId;
    return currentUser.locationId && currentUser.locationId !== 'ALL' ? currentUser.locationId : 'LOC-HOS';
  });

  const targetLocation = useMemo(() => {
    return locations.find(l => l.locationId === targetLocationId) || locations[0];
  }, [locations, targetLocationId]);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // -------------------------------------------------------------------------
  // TAB 1: OPEN STOCK REPORT & SYNC STATES
  // -------------------------------------------------------------------------
  const [stockFilterMode, setStockFilterMode] = useState<'NEWLY_ADDED' | 'DATE_RANGE' | 'FULL_SNAPSHOT'>('NEWLY_ADDED');
  
  const todayYmd = new Date().toISOString().substring(0, 10);
  const fourteenDaysAgoYmd = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const [stockDateFrom, setStockDateFrom] = useState<string>(fourteenDaysAgoYmd);
  const [stockDateTo, setStockDateTo] = useState<string>(todayYmd);
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('ALL');

  // Generate Open Stock Report
  const openStockReport = useMemo(() => {
    return branchSyncService.generateOpenStockReport(batches, products, locations, {
      branchLocation: sourceBranch,
      filterMode: stockFilterMode,
      fromDate: stockFilterMode === 'DATE_RANGE' ? stockDateFrom : undefined,
      toDate: stockFilterMode === 'DATE_RANGE' ? stockDateTo : undefined,
      newlyAddedDaysThreshold: 14
    });
  }, [batches, products, locations, sourceBranch, stockFilterMode, stockDateFrom, stockDateTo]);

  // Filtered rows for UI
  const filteredStockRecords = useMemo(() => {
    return openStockReport.records.filter(r => {
      if (stockCategoryFilter !== 'ALL' && !r.categoryName.toLowerCase().includes(stockCategoryFilter.toLowerCase())) {
        return false;
      }
      if (stockSearchQuery.trim()) {
        const q = stockSearchQuery.toLowerCase();
        return (
          r.productCode.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.batchNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [openStockReport.records, stockCategoryFilter, stockSearchQuery]);

  // Modal for Importing Open Stock into My System
  const [isOpenStockImportModalOpen, setIsOpenStockImportModalOpen] = useState<boolean>(false);
  const [autoRegisterProducts, setAutoRegisterProducts] = useState<boolean>(true);
  const [overwriteExistingBatches, setOverwriteExistingBatches] = useState<boolean>(false);
  const [isSyncingStock, setIsSyncingStock] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // TAB 2: PRODUCT TOTAL SALES & PERIOD SYNC STATES
  // -------------------------------------------------------------------------
  const [salesPeriodPreset, setSalesPeriodPreset] = useState<'TODAY' | 'LAST_7_DAYS' | 'LAST_15_DAYS' | 'CUSTOM'>('LAST_7_DAYS');
  const [salesCustomFrom, setSalesCustomFrom] = useState<string>(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [salesCustomTo, setSalesCustomTo] = useState<string>(todayYmd);
  const [salesViewSubtab, setSalesViewSubtab] = useState<'products' | 'invoices'>('products');
  const [salesProductSearch, setSalesProductSearch] = useState<string>('');

  // Calculate Product Sales Period Report
  const productSalesReport = useMemo(() => {
    return branchSyncService.calculateProductSalesForPeriod(
      sales,
      sourceBranch,
      salesPeriodPreset,
      salesCustomFrom,
      salesCustomTo,
      products
    );
  }, [sales, sourceBranch, salesPeriodPreset, salesCustomFrom, salesCustomTo, products]);

  // Filtered products for sales table
  const filteredSalesProducts = useMemo(() => {
    if (!salesProductSearch.trim()) return productSalesReport.productBreakdown;
    const q = salesProductSearch.toLowerCase();
    return productSalesReport.productBreakdown.filter(p => 
      p.productCode.toLowerCase().includes(q) || 
      p.productName.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q)
    );
  }, [productSalesReport.productBreakdown, salesProductSearch]);

  // Modal for Importing Sales into My System
  const [isSalesImportModalOpen, setIsSalesImportModalOpen] = useState<boolean>(false);
  const [isSyncingSales, setIsSyncingSales] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // TAB 3: UPLOAD PACKAGE & SYNC TO TABLES
  // -------------------------------------------------------------------------
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isValidatingPackage, setIsValidatingPackage] = useState<boolean>(false);
  const [packageValidation, setPackageValidation] = useState<PackageValidationResult | null>(null);
  const [isImportingPackage, setIsImportingPackage] = useState<boolean>(false);

  // Audit history
  const importHistory = useMemo(() => branchSyncService.getImportHistory(), [isSyncingStock, isSyncingSales, isImportingPackage]);

  // -------------------------------------------------------------------------
  // HANDLERS: OPEN STOCK EXPORT & IMPORT
  // -------------------------------------------------------------------------
  const handleExportOpenStockExcel = () => {
    const desc = stockFilterMode === 'NEWLY_ADDED' 
      ? 'Newly Added Products & Batches (14-Day Window)' 
      : stockFilterMode === 'DATE_RANGE' 
        ? `Date Range (${stockDateFrom} to ${stockDateTo})` 
        : 'Full Open Stock Snapshot';
    branchSyncService.exportExcelOpenStockReport(filteredStockRecords, openStockReport.summary, desc);
    setNotification({
      type: 'success',
      message: `Open Stock Report exported successfully (${filteredStockRecords.length} records).`
    });
  };

  const handleExportOpenStockZip = async () => {
    try {
      const res = await branchSyncService.exportOpenStockPackageZip(
        filteredStockRecords,
        sourceBranch,
        products,
        stockFilterMode,
        stockDateFrom,
        stockDateTo
      );
      const url = URL.createObjectURL(res.zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setNotification({
        type: 'success',
        message: `Generated portable Open Stock Sync Package: ${res.filename} (${(res.sizeBytes / 1024).toFixed(1)} KB)`
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: `Export failed: ${err.message}` });
    }
  };

  const handleExecuteOpenStockSync = () => {
    setIsSyncingStock(true);
    try {
      const result = importBranchOpenStock(filteredStockRecords, targetLocationId, {
        autoCreateProducts: autoRegisterProducts,
        overwriteExisting: overwriteExistingBatches
      });

      // Record in audit log
      branchSyncService.addImportHistory({
        importId: `IMP-STOCK-${Date.now().toString().slice(-6)}`,
        exportId: `EXP-STOCK-${sourceBranch.locationCode}-${Date.now().toString().slice(-4)}`,
        sourceBranchCode: sourceBranch.locationCode,
        sourceBranchName: sourceBranch.locationName,
        periodFrom: stockFilterMode === 'DATE_RANGE' ? stockDateFrom : todayYmd,
        periodTo: stockFilterMode === 'DATE_RANGE' ? stockDateTo : todayYmd,
        recordCountSummary: {
          sales: 0,
          saleItems: 0,
          payments: 0,
          stockMovements: result.importedBatches,
          customers: 0
        },
        totalNetAmount: openStockReport.summary.totalValuation,
        importedAt: new Date().toLocaleString(),
        importedBy: currentUser.fullName,
        status: 'Imported'
      });

      setIsSyncingStock(false);
      setIsOpenStockImportModalOpen(false);
      setNotification({
        type: 'success',
        message: `${result.message} Data tables updated: ProductMaster, StockBatch, StockMovementLedger.`
      });
    } catch (err: any) {
      setIsSyncingStock(false);
      setNotification({ type: 'error', message: `Sync failed: ${err.message}` });
    }
  };

  // -------------------------------------------------------------------------
  // HANDLERS: PRODUCT SALES EXPORT & IMPORT
  // -------------------------------------------------------------------------
  const handleExportSalesExcel = () => {
    branchSyncService.exportExcelProductSalesReport(productSalesReport);
    setNotification({
      type: 'success',
      message: `Product Sales Period Report exported (${productSalesReport.productBreakdown.length} products, ${productSalesReport.totalBills} invoices).`
    });
  };

  const handleExportSalesZip = async () => {
    try {
      const res = await branchSyncService.exportProductSalesPackageZip(productSalesReport, sourceBranch);
      const url = URL.createObjectURL(res.zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setNotification({
        type: 'success',
        message: `Generated Sales Sync Package: ${res.filename} (${(res.sizeBytes / 1024).toFixed(1)} KB)`
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: `Export failed: ${err.message}` });
    }
  };

  const handleExecuteSalesSync = () => {
    setIsSyncingSales(true);
    try {
      const result = importBranchProductSales({
        sales: productSalesReport.sales,
        saleItems: productSalesReport.saleItems,
        customers: customers.map(c => ({
          customerId: c.customerId,
          customerName: c.customerName,
          phone: c.phone,
          address: c.address || '',
          email: c.email,
          createdDate: c.createdDate || new Date().toISOString().split('T')[0],
          sourceBranchCode: sourceBranch.locationCode
        })),
        branchCode: sourceBranch.locationCode,
        branchName: sourceBranch.locationName
      }, targetLocationId);

      // Record in audit log
      branchSyncService.addImportHistory({
        importId: `IMP-SALES-${Date.now().toString().slice(-6)}`,
        exportId: `EXP-SALES-${sourceBranch.locationCode}-${Date.now().toString().slice(-4)}`,
        sourceBranchCode: sourceBranch.locationCode,
        sourceBranchName: sourceBranch.locationName,
        periodFrom: productSalesReport.fromDate,
        periodTo: productSalesReport.toDate,
        recordCountSummary: {
          sales: result.importedSales,
          saleItems: result.importedItems,
          payments: result.importedSales,
          stockMovements: 0,
          customers: 0
        },
        totalNetAmount: productSalesReport.netSales,
        importedAt: new Date().toLocaleString(),
        importedBy: currentUser.fullName,
        status: 'Imported'
      });

      setIsSyncingSales(false);
      setIsSalesImportModalOpen(false);
      setNotification({
        type: 'success',
        message: `${result.message} Data tables updated: SalesHeader, SalesDetail, CustomerMaster.`
      });
    } catch (err: any) {
      setIsSyncingSales(false);
      setNotification({ type: 'error', message: `Sales sync failed: ${err.message}` });
    }
  };

  // -------------------------------------------------------------------------
  // HANDLERS: UPLOAD PACKAGE VALIDATION & IMPORT
  // -------------------------------------------------------------------------
  const handlePackageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedUploadFile(file);
      setIsValidatingPackage(true);
      try {
        const result = await branchSyncService.validateBranchDataPackage(
          file,
          sales,
          products,
          importHistory
        );
        setPackageValidation(result);
        setIsValidatingPackage(false);
      } catch (err: any) {
        setIsValidatingPackage(false);
        setNotification({ type: 'error', message: `Package validation failed: ${err.message}` });
      }
    }
  };

  const handleExecutePackageImport = () => {
    if (!packageValidation || !packageValidation.packageData) return;
    setIsImportingPackage(true);
    try {
      createDatabaseBackup('ALL', `Pre-Import Backup (${packageValidation.manifest?.branchCode})`);
      const result = importBranchDataPackage(packageValidation.packageData);
      setIsImportingPackage(false);
      setNotification({
        type: 'success',
        message: `${result.message} All data tables synchronized.`
      });
      setSelectedUploadFile(null);
      setPackageValidation(null);
    } catch (err: any) {
      setIsImportingPackage(false);
      setNotification({ type: 'error', message: `Import error: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white">
                Multi-Branch Data Import &amp; Table Structure Sync Center
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                ERP Schema Synchronizer
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Import &amp; export newly added items, open stock reports, and product sales totals (Today, 7D, 15D, Custom Range) synced directly into your ERP data tables.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToOpeningStock && (
            <button
              onClick={onNavigateToOpeningStock}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Boxes className="w-3.5 h-3.5 text-teal-400" />
              <span>Opening Stock View</span>
            </button>
          )}
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Reports Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Notification Alert */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : notification.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-200'
              : 'bg-teal-50 text-teal-900 border border-teal-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* 3. Global Branch & Sync Target Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-700">Source Branch to Fetch / Export:</span>
          </div>
          <select
            value={sourceBranchId}
            onChange={e => setSourceBranchId(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            {locations.filter(l => l.locationId !== 'ALL').map(loc => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.locationName} ({loc.locationCode})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">Target Import Branch (My System):</span>
          </div>
          <select
            value={targetLocationId}
            onChange={e => setTargetLocationId(e.target.value)}
            className="text-xs font-bold bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {locations.filter(l => l.locationId !== 'ALL').map(loc => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.locationName} ({loc.locationCode}) {loc.locationId === selectedLocationId ? '★ Current' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Main Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('open-stock')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'open-stock'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Open Stock Report &amp; Sync</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 text-white">
            {openStockReport.records.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('product-sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'product-sales'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Total Sales of Product &amp; Period Sync</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 text-white">
            {productSalesReport.totalBills} Bills
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upload-package')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'upload-package'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Package &amp; Table Sync</span>
        </button>

        <button
          onClick={() => setActiveTab('audit-trail')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit-trail'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Sync Audit History</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200 text-slate-700">
            {importHistory.length}
          </span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: OPEN STOCK REPORT & BATCH SYNC
      ====================================================================== */}
      {activeTab === 'open-stock' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          
          {/* Controls & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Filter Mode Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setStockFilterMode('NEWLY_ADDED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    stockFilterMode === 'NEWLY_ADDED'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✨ Newly Added Only (14 Days)
                </button>
                <button
                  onClick={() => setStockFilterMode('DATE_RANGE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    stockFilterMode === 'DATE_RANGE'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📅 Date Range Filter
                </button>
                <button
                  onClick={() => setStockFilterMode('FULL_SNAPSHOT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    stockFilterMode === 'FULL_SNAPSHOT'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📦 Full Branch Snapshot
                </button>
              </div>

              {/* Date pickers when in DATE_RANGE mode */}
              {stockFilterMode === 'DATE_RANGE' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-semibold">From:</span>
                    <input
                      type="date"
                      value={stockDateFrom}
                      onChange={e => setStockDateFrom(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-semibold">To:</span>
                    <input
                      type="date"
                      value={stockDateTo}
                      onChange={e => setStockDateTo(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Export & Import Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportOpenStockExcel}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Excel</span>
                </button>

                <button
                  onClick={handleExportOpenStockZip}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <FileArchive className="w-3.5 h-3.5 text-teal-400" />
                  <span>Export ZIP</span>
                </button>

                <button
                  onClick={() => setIsOpenStockImportModalOpen(true)}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <Database className="w-3.5 h-3.5 text-teal-200" />
                  <span>Import into My System</span>
                </button>
              </div>

            </div>

            {/* Sub-search & Category filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Product Code, Name, or Batch #..."
                  value={stockSearchQuery}
                  onChange={e => setStockSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
                <span>Showing <strong>{filteredStockRecords.length}</strong> of {openStockReport.records.length} records</span>
              </div>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Batches</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">{openStockReport.summary.totalBatches}</span>
              <span className="text-[10px] text-slate-400">In {sourceBranch.locationName}</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Stock Units</span>
              <span className="text-lg font-black text-teal-800 mt-1 block">{openStockReport.summary.totalUnits.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-teal-600 font-semibold">Available Quantity</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Valuation (Cost)</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">₹{openStockReport.summary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-slate-400">Inventory Value</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Newly Added Items</span>
              <span className="text-lg font-black text-amber-700 mt-1 block">{openStockReport.summary.newlyAddedCount}</span>
              <span className="text-[10px] text-amber-600 font-semibold">Added in &le;14 days</span>
            </div>
          </div>

          {/* Open Stock Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800">
                  Open Stock Register &bull; {sourceBranch.locationName} ({sourceBranch.locationCode})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Schema: ProductMaster &bull; StockBatch &bull; StockMovementLedger
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-right">Opening Qty</th>
                    <th className="py-2.5 px-3 text-right">Current Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost Price (₹)</th>
                    <th className="py-2.5 px-3 text-right">MRP (₹)</th>
                    <th className="py-2.5 px-3 text-right">Stock Value (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStockRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No open stock records found for the selected filter mode and branch.
                      </td>
                    </tr>
                  ) : (
                    filteredStockRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 leading-tight">{r.productName}</div>
                          <span className="font-mono text-[10px] text-slate-400">{r.productCode}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">{r.categoryName}</span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {r.batchNumber}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                          {r.expiryDate}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {r.quantityReceived}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-teal-800">
                          {r.currentQuantity}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          ₹{r.costPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          ₹{r.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{r.totalStockValue.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.isNewlyAdded ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ✨ Newly Added
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* =====================================================================
          TAB 2: TOTAL SALES OF PRODUCT & PERIOD SYNC
      ====================================================================== */}
      {activeTab === 'product-sales' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Presets: Today, Last 7 Days, Last 15 Days, Custom Range */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
                <button
                  onClick={() => setSalesPeriodPreset('TODAY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                    salesPeriodPreset === 'TODAY'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Current Day (Today)
                </button>
                <button
                  onClick={() => setSalesPeriodPreset('LAST_7_DAYS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                    salesPeriodPreset === 'LAST_7_DAYS'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setSalesPeriodPreset('LAST_15_DAYS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                    salesPeriodPreset === 'LAST_15_DAYS'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Last 15 Days
                </button>
                <button
                  onClick={() => setSalesPeriodPreset('CUSTOM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                    salesPeriodPreset === 'CUSTOM'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📅 Date Range Selector
                </button>
              </div>

              {/* Date pickers when CUSTOM is active */}
              {salesPeriodPreset === 'CUSTOM' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-semibold">From:</span>
                    <input
                      type="date"
                      value={salesCustomFrom}
                      onChange={e => setSalesCustomFrom(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-semibold">To:</span>
                    <input
                      type="date"
                      value={salesCustomTo}
                      onChange={e => setSalesCustomTo(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Export & Import Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportSalesExcel}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Excel</span>
                </button>

                <button
                  onClick={handleExportSalesZip}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <FileArchive className="w-3.5 h-3.5 text-teal-400" />
                  <span>Export ZIP</span>
                </button>

                <button
                  onClick={() => setIsSalesImportModalOpen(true)}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <Database className="w-3.5 h-3.5 text-teal-200" />
                  <span>Import Sales into My System</span>
                </button>
              </div>

            </div>

            {/* Sub-search & Subtab toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSalesViewSubtab('products')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    salesViewSubtab === 'products'
                      ? 'bg-teal-50 text-teal-900 border border-teal-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Product Total Sales ({productSalesReport.productBreakdown.length})
                </button>
                <button
                  onClick={() => setSalesViewSubtab('invoices')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    salesViewSubtab === 'invoices'
                      ? 'bg-teal-50 text-teal-900 border border-teal-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Invoices Register ({productSalesReport.totalBills})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product code or name..."
                  value={salesProductSearch}
                  onChange={e => setSalesProductSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Sales KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Invoices</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">{productSalesReport.totalBills}</span>
              <span className="text-[10px] text-slate-400">{productSalesReport.formattedPeriodDisplay}</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Units Sold</span>
              <span className="text-lg font-black text-teal-800 mt-1 block">{productSalesReport.totalUnitsSold}</span>
              <span className="text-[10px] text-teal-600 font-semibold">Total Quantity</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross Sales</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">₹{productSalesReport.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-slate-400">Before Discounts</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Discount</span>
              <span className="text-lg font-black text-rose-800 mt-1 block">₹{productSalesReport.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-rose-600 font-semibold">Saved by Patients</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Net Revenue</span>
              <span className="text-lg font-black text-teal-900 mt-1 block">₹{productSalesReport.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-teal-700 font-bold">Cash ₹{productSalesReport.cash.toFixed(0)} &bull; UPI ₹{productSalesReport.upi.toFixed(0)}</span>
            </div>
          </div>

          {/* Subtab View A: Product-wise Total Sales */}
          {salesViewSubtab === 'products' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold text-slate-800">
                    Product Total Sales &bull; {productSalesReport.formattedPeriodDisplay} &bull; {sourceBranch.locationName}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Aggregated from {productSalesReport.totalBills} Bills
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Units Sold</th>
                      <th className="py-2.5 px-3 text-right">Gross Sales (₹)</th>
                      <th className="py-2.5 px-3 text-right">Discount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Net Sales (₹)</th>
                      <th className="py-2.5 px-3 text-right">Avg Selling Rate (₹)</th>
                      <th className="py-2.5 px-3 text-center">Invoices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSalesProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No sales recorded for this period in {sourceBranch.locationName}.
                        </td>
                      </tr>
                    ) : (
                      filteredSalesProducts.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 leading-tight">{p.productName}</div>
                            <span className="font-mono text-[10px] text-slate-400">{p.productCode}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                              {p.categoryName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-800">
                            {p.quantitySold}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            ₹{p.grossAmount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                            ₹{p.discount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            ₹{p.netAmount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            ₹{p.averageRate.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {p.invoiceCount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab View B: Invoices Register */}
          {salesViewSubtab === 'invoices' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold text-slate-800">
                    Sales Invoices Register ({productSalesReport.sales.length} Invoices)
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                      <th className="py-2.5 px-3 text-right">Discount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Net Amount (₹)</th>
                      <th className="py-2.5 px-3 text-center">Items</th>
                      <th className="py-2.5 px-3">Billed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productSalesReport.sales.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{s.invoiceNo}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{s.saleDate}</td>
                        <td className="py-2 px-3 text-slate-800">{s.customerName}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.paymentMode === 'UPI' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {s.paymentMode}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">₹{s.grossAmount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">₹{s.discountAmount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900">₹{s.netAmount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">{s.itemsCount}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{s.createdBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =====================================================================
          TAB 3: UPLOAD PACKAGE & TABLE SYNC
      ====================================================================== */}
      {activeTab === 'upload-package' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-600" />
              Upload MediClinic Sync Package (.zip)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select or drop any MediClinic offline package exported from another branch. All records will be verified and mapped to your ERP data table structure.
            </p>

            <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-teal-50/30 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".zip"
                onChange={handlePackageFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileArchive className="w-12 h-12 text-teal-600 mx-auto mb-3" />
              <div className="text-sm font-bold text-slate-800">
                {selectedUploadFile ? selectedUploadFile.name : 'Click to select or drop .zip sync bundle'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedUploadFile ? `${(selectedUploadFile.size / 1024).toFixed(1)} KB` : 'Supports MediClinic Branch Packages & Open Stock bundles'}
              </p>
            </div>
          </div>

          {/* Validation Report */}
          {isValidatingPackage && (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Validating 18 cryptographic and schema integrity checks...</p>
            </div>
          )}

          {packageValidation && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h4 className="text-sm font-bold text-slate-900">Package Verification Report</h4>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  packageValidation.canImport ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {packageValidation.canImport ? 'Ready to Sync' : 'Verification Issue'}
                </span>
              </div>

              {/* Data Table Mapping Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Table: SalesHeader</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">{packageValidation.summary.salesCount} Invoices</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Table: SalesDetail</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">{packageValidation.summary.saleItemsCount} Line Items</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Table: StockMovements</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">{packageValidation.summary.stockMovementsCount} Records</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Table: CustomerMaster</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">{packageValidation.summary.customersCount} Customers</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setSelectedUploadFile(null); setPackageValidation(null); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecutePackageImport}
                  disabled={!packageValidation.canImport || isImportingPackage}
                  className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all ${
                    packageValidation.canImport && !isImportingPackage
                      ? 'bg-teal-700 hover:bg-teal-800 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isImportingPackage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  <span>Execute Sync to ERP Data Tables</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =====================================================================
          TAB 4: SYNC AUDIT TRAIL
      ====================================================================== */}
      {activeTab === 'audit-trail' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800">Branch Import &amp; Export Audit Log</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Preserved across all sessions
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Import ID</th>
                    <th className="py-2.5 px-3">Source Branch</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Sales Synced</th>
                    <th className="py-2.5 px-3 text-right">Items Synced</th>
                    <th className="py-2.5 px-3 text-right">Net Value (₹)</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Imported By</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No branch sync operations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    importHistory.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{h.importId}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{h.sourceBranchName} ({h.sourceBranchCode})</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{h.periodFrom} &rarr; {h.periodTo}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-teal-800">{h.recordCountSummary.sales}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{h.recordCountSummary.saleItems}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₹{h.totalNetAmount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{h.importedAt}</td>
                        <td className="py-2 px-3 text-slate-700">{h.importedBy}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONFIRM IMPORT OPEN STOCK INTO DATA TABLES
      ====================================================================== */}
      {isOpenStockImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Sync Open Stock into ERP Data Tables
                </h3>
                <p className="text-xs text-slate-500">
                  Target Branch: <strong>{targetLocation.locationName} ({targetLocation.locationCode})</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Batches to Sync:</span>
                <span className="font-bold text-slate-900">{filteredStockRecords.length} batches</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Stock Units:</span>
                <span className="font-bold text-teal-800">{openStockReport.summary.totalUnits} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Valuation:</span>
                <span className="font-bold text-slate-900">₹{openStockReport.summary.totalValuation.toFixed(2)}</span>
              </div>
            </div>

            {/* Table Structure Mapping Highlights */}
            <div className="p-3 bg-teal-50/50 rounded-2xl border border-teal-100 text-xs space-y-1.5">
              <span className="font-bold text-teal-950 block">Schema Alignment:</span>
              <div className="flex items-center gap-2 text-teal-900 text-[11px]">
                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span><strong>ProductMaster:</strong> Auto-registers new product codes &amp; prices</span>
              </div>
              <div className="flex items-center gap-2 text-teal-900 text-[11px]">
                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span><strong>StockBatch:</strong> Inserts batches with opening stock quantities &amp; expiry dates</span>
              </div>
              <div className="flex items-center gap-2 text-teal-900 text-[11px]">
                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span><strong>StockMovementLedger:</strong> Creates 'OPENING' balance audit entries</span>
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRegisterProducts}
                  onChange={e => setAutoRegisterProducts(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Auto-register any missing products in Product Catalog</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteExistingBatches}
                  onChange={e => setOverwriteExistingBatches(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Update balances if identical batch already exists in target location</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsOpenStockImportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteOpenStockSync}
                disabled={isSyncingStock}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                {isSyncingStock ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Execute Table Sync</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONFIRM IMPORT SALES INTO DATA TABLES
      ====================================================================== */}
      {isSalesImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Sync Sales Data into ERP Tables
                </h3>
                <p className="text-xs text-slate-500">
                  From: <strong>{sourceBranch.locationName}</strong> &bull; Period: <strong>{productSalesReport.formattedPeriodDisplay}</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Invoices to Sync:</span>
                <span className="font-bold text-slate-900">{productSalesReport.totalBills} bills</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Units Sold:</span>
                <span className="font-bold text-teal-800">{productSalesReport.totalUnitsSold} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Net Sales Collection:</span>
                <span className="font-bold text-slate-900">₹{productSalesReport.netSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Table Structure Mapping Highlights */}
            <div className="p-3 bg-teal-50/50 rounded-2xl border border-teal-100 text-xs space-y-1.5">
              <span className="font-bold text-teal-950 block">Schema Alignment:</span>
              <div className="flex items-center gap-2 text-teal-900 text-[11px]">
                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span><strong>SalesHeader:</strong> Records invoiceNo, customer, paymentMode, netAmount</span>
              </div>
              <div className="flex items-center gap-2 text-teal-900 text-[11px]">
                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span><strong>SalesDetail:</strong> Records product line items, quantities, rates, amounts</span>
              </div>
              <div className="flex items-center gap-2 text-teal-900 text-[11px]">
                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span><strong>CustomerMaster:</strong> Syncs customer contact directory</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsSalesImportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSalesSync}
                disabled={isSyncingSales}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                {isSyncingSales ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Execute Sales Table Sync</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
