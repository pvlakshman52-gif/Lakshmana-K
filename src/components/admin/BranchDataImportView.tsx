import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  PackageCheck, 
  Upload, 
  FileArchive, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Building2, 
  Database, 
  Check, 
  RefreshCw, 
  History, 
  FileText, 
  TrendingUp, 
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Layers,
  Sparkles,
  Lock
} from 'lucide-react';
import { branchSyncService } from '../../services/branchSyncService';
import { PackageValidationResult, BranchImportRecord } from '../../types/sync';

interface BranchDataImportViewProps {
  onNavigateToConsolidated?: () => void;
  onNavigateToEmailSync?: () => void;
}

export const BranchDataImportView: React.FC<BranchDataImportViewProps> = ({
  onNavigateToConsolidated,
  onNavigateToEmailSync
}) => {
  const { 
    sales, 
    products, 
    currentUser, 
    importBranchDataPackage, 
    createDatabaseBackup 
  } = useClinic();

  const isAdmin = currentUser.role === 'Admin';

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<PackageValidationResult | null>(null);
  const [backupBeforeImport, setBackupBeforeImport] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedSales: number;
    importedItems: number;
    importedCustomers: number;
    skippedDuplicates: number;
    message: string;
  } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Import audit records
  const importHistory = useMemo(() => branchSyncService.getImportHistory(), [importResult]);

  // Handle file drop / selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processSelectedFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processSelectedFile(file);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setNotification({ type: 'error', message: 'Invalid file format. Please select a MediClinic .zip branch data package.' });
      return;
    }

    setSelectedFile(file);
    setCurrentStep(2); // Step 2: Validate
    setIsValidating(true);

    try {
      const result = await branchSyncService.validateBranchDataPackage(
        file,
        sales,
        products,
        importHistory
      );
      setValidationResult(result);
      setIsValidating(false);

      if (result.isValid) {
        setCurrentStep(3); // Step 3: Preview
      }
    } catch (err: any) {
      setIsValidating(false);
      setNotification({ type: 'error', message: `Validation failed: ${err.message}` });
    }
  };

  // Execute Transactional Import (Requirement 13)
  const handleExecuteImport = async () => {
    if (!validationResult || !validationResult.packageData) {
      setNotification({ type: 'error', message: 'No valid package loaded for import.' });
      return;
    }

    setIsImporting(true);

    try {
      // 1. Optional Database Backup Before Import (Requirement 39)
      if (backupBeforeImport) {
        try {
          createDatabaseBackup('ALL', `Pre-Import Backup (${validationResult.manifest?.branchCode})`);
        } catch (backupErr) {
          console.warn('Backup warning:', backupErr);
        }
      }

      await new Promise(r => setTimeout(r, 600));

      // 2. Perform Atomic Import
      const result = importBranchDataPackage(validationResult.packageData);
      setImportResult(result);

      setIsImporting(false);
      setCurrentStep(5); // Step 5: Complete
      setNotification({
        type: 'success',
        message: result.message
      });
    } catch (err: any) {
      setIsImporting(false);
      setNotification({
        type: 'error',
        message: `Import failed: ${err.message}. No data was changed (atomic rollback).`
      });
    }
  };

  // Reset to Step 1
  const handleReset = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setCurrentStep(1);
    setNotification(null);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white">
                Branch Data Import &amp; Consolidation Center
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin Central Server
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Inspect, validate, and atomically import offline branch packages into the central ERP database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToEmailSync && (
            <button
              onClick={onNavigateToEmailSync}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>&larr; Branch Export &amp; Sync</span>
            </button>
          )}
          {onNavigateToConsolidated && (
            <button
              onClick={onNavigateToConsolidated}
              className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Consolidated Sales</span>
            </button>
          )}
        </div>
      </div>

      {/* Access Guard (Requirement 31: Admin only) */}
      {!isAdmin && (
        <div className="p-6 bg-amber-50 border border-amber-300 rounded-2xl text-center space-y-2">
          <Lock className="w-8 h-8 text-amber-600 mx-auto" />
          <h2 className="font-bold text-sm text-amber-900">Administrator Access Required</h2>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            Only designated ERP Administrators can import branch synchronization packages to prevent accidental data modification.
          </p>
        </div>
      )}

      {isAdmin && (
        <>
          {/* Notification */}
          {notification && (
            <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span className="font-semibold">{notification.message}</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>
          )}

          {/* 2. 5-Step Process Bar (Requirement 36) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {[
                { step: 1, title: 'Select Package' },
                { step: 2, title: 'Validate' },
                { step: 3, title: 'Preview' },
                { step: 4, title: 'Import' },
                { step: 5, title: 'Complete' }
              ].map(s => (
                <div 
                  key={s.step} 
                  className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    currentStep === s.step
                      ? 'bg-teal-800 text-white font-bold shadow-xs'
                      : currentStep > s.step
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold'
                      : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono">STEP {s.step}</span>
                    {currentStep > s.step && <Check className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <span className="text-xs truncate">{s.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 1: SELECT PACKAGE (Drag & Drop or File Browser) */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="p-8 bg-white rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-4 shadow-xs"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto shadow-2xs">
                <FileArchive className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Select MediClinic Branch Data Package
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Drag and drop the downloaded branch data package ZIP (<code className="font-mono text-teal-900">MediClinic_HUB_*.zip</code>) here, or browse from your computer.
                </p>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Browse Branch ZIP Package</span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Supports verified MediClinic branch packages (.zip) with cryptographic SHA-256 integrity
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: VALIDATING SPINNER */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
              <RefreshCw className="w-10 h-10 animate-spin text-teal-800 mx-auto" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Executing 18-Point Import Validation...
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Verifying package signature, checksum, idempotency, duplicate GlobalSaleIds, and product catalogs.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3 & 4: PREVIEW & IMPORT (Requirements 12 & 13) */}
          {/* ========================================================================= */}
          {(currentStep === 3 || currentStep === 4) && validationResult && (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
              
              {/* Header with Branch & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span>Source Branch: {validationResult.summary.branchName}</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-teal-100 text-teal-900">
                        {validationResult.summary.branchCode}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Export ID: <code className="font-mono text-slate-800 font-bold">{validationResult.manifest?.exportId}</code> &middot; Period: {validationResult.summary.periodFrom} &rarr; {validationResult.summary.periodTo}
                    </p>
                  </div>
                </div>

                <div>
                  {validationResult.isAlreadyImported ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Already Imported (Duplicate Guard)</span>
                    </span>
                  ) : validationResult.canImport ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Package Valid &amp; Ready to Import</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Validation Issues Found</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Already Imported Duplicate Alert (Requirement 10) */}
              {validationResult.isAlreadyImported && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>This export package has already been imported.</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    The central server enforces strict idempotency. Export ID <code className="font-mono font-bold bg-rose-100 px-1 py-0.2 rounded">{validationResult.manifest?.exportId}</code> was previously imported. Re-importing is blocked to prevent duplicate billing records and double revenue counting.
                  </p>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Sales Invoices</span>
                  <div className="font-mono font-bold text-base text-slate-900 mt-0.5">
                    {validationResult.summary.salesCount}
                  </div>
                  <span className="text-[10px] text-slate-400">Bills to Import</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Sale Items</span>
                  <div className="font-mono font-bold text-base text-slate-900 mt-0.5">
                    {validationResult.summary.saleItemsCount}
                  </div>
                  <span className="text-[10px] text-slate-400">Line Items</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Customers</span>
                  <div className="font-mono font-bold text-base text-slate-900 mt-0.5">
                    {validationResult.summary.customersCount}
                  </div>
                  <span className="text-[10px] text-slate-400">Patients / Clients</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Stock Movements</span>
                  <div className="font-mono font-bold text-base text-slate-900 mt-0.5">
                    {validationResult.summary.stockMovementsCount}
                  </div>
                  <span className="text-[10px] text-slate-400">Audit Ledger</span>
                </div>

                <div className="p-3 bg-teal-50 rounded-xl border-2 border-teal-700">
                  <span className="text-[10px] font-bold uppercase text-teal-900">Total Net Sales</span>
                  <div className="font-mono font-black text-base text-teal-950 mt-0.5">
                    ₹{validationResult.summary.totalNetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-teal-800 font-bold">Branch Revenue</span>
                </div>
              </div>

              {/* 18-Point Checks Breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Cryptographic &amp; Schema Integrity Probes</span>
                  <span className="text-[11px] font-normal text-slate-500 font-mono">
                    {validationResult.checks.filter(c => c.passed).length} / {validationResult.checks.length} Passed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {validationResult.checks.map((chk, i) => (
                    <div 
                      key={i} 
                      className={`p-2 rounded-lg border flex items-start gap-2 ${
                        chk.passed 
                          ? 'bg-white border-slate-200 text-slate-700' 
                          : chk.severity === 'error'
                          ? 'bg-rose-50 border-rose-300 text-rose-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}
                    >
                      {chk.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{chk.name}</div>
                        <div className="text-[10px] leading-tight mt-0.5 text-slate-500">{chk.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Option: Backup Before Import (Requirement 39) */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={backupBeforeImport}
                    onChange={e => setBackupBeforeImport(e.target.checked)}
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  <span>Create automated database backup snapshot before applying import (Recommended)</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Atomic Rollback Enabled</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel &amp; Select Another Package
                </button>

                <button
                  onClick={handleExecuteImport}
                  disabled={!validationResult.canImport || isImporting}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                    validationResult.canImport && !isImporting
                      ? 'bg-teal-800 hover:bg-teal-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                  <span>{isImporting ? 'Executing Atomic Transaction...' : 'IMPORT BRANCH DATA'}</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: SUCCESS / COMPLETE (Requirement 22 & 23) */}
          {/* ========================================================================= */}
          {currentStep === 5 && importResult && (
            <div className="p-8 bg-white rounded-2xl border-2 border-emerald-300 text-center space-y-5 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900">
                  Branch Data Imported Successfully!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {importResult.message} Source branch identity ({validationResult?.summary.branchCode}) has been preserved permanently without overwriting existing central data.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Imported Sales</span>
                  <div className="font-mono font-bold text-base text-emerald-700">{importResult.importedSales}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Line Items</span>
                  <div className="font-mono font-bold text-base text-teal-800">{importResult.importedItems}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">New Patients</span>
                  <div className="font-mono font-bold text-base text-blue-800">{importResult.importedCustomers}</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Import Another Package
                </button>
                {onNavigateToConsolidated && (
                  <button
                    onClick={onNavigateToConsolidated}
                    className="px-5 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>View Consolidated Sales Report &rarr;</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. IMPORT AUDIT HISTORY TABLE (Requirement 14) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-800" />
                <h3 className="font-bold text-slate-900">
                  Branch Import Audit Trail ({importHistory.length} records)
                </h3>
              </div>
              <span className="text-[10px] text-slate-500">Immutable ledger of central server imports</span>
            </div>

            <div className="overflow-x-auto max-h-72 scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Import ID</th>
                    <th className="py-2 px-3">Export ID</th>
                    <th className="py-2 px-3">Source Branch</th>
                    <th className="py-2 px-3">Period</th>
                    <th className="py-2 px-3 text-right">Sales / Items</th>
                    <th className="py-2 px-3 text-right">Revenue (₹)</th>
                    <th className="py-2 px-3">Imported At</th>
                    <th className="py-2 px-3">Imported By</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {importHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400 font-sans">
                        No branch synchronization packages imported yet.
                      </td>
                    </tr>
                  ) : (
                    importHistory.map(h => (
                      <tr key={h.importId} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-teal-900">{h.importId}</td>
                        <td className="py-2 px-3 text-slate-600">{h.exportId}</td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-900">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-50 border border-teal-200 text-teal-800 mr-1.5">
                            {h.sourceBranchCode}
                          </span>
                          <span>{h.sourceBranchName}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500">{h.periodFrom} &rarr; {h.periodTo}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="font-bold text-slate-900">{h.recordCountSummary.sales}</span> / <span className="text-slate-500">{h.recordCountSummary.saleItems}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-teal-900">
                          ₹{h.totalNetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-sans">{h.importedAt}</td>
                        <td className="py-2 px-3 font-sans text-slate-700">{h.importedBy}</td>
                        <td className="py-2 px-3 text-center font-sans">
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
        </>
      )}

    </div>
  );
};
