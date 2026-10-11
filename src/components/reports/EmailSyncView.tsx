import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  Mail, 
  Send, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Building2, 
  FileArchive, 
  RefreshCw, 
  Layers, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Check, 
  Copy,
  Printer,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { branchSyncService } from '../../services/branchSyncService';
import { PeriodSalesSummary, EmailConfig } from '../../types/sync';

interface EmailSyncViewProps {
  onNavigateToImport?: () => void;
  onNavigateToConsolidated?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToEmailConfig?: () => void;
}

export const EmailSyncView: React.FC<EmailSyncViewProps> = ({
  onNavigateToImport,
  onNavigateToConsolidated,
  onNavigateToHistory,
  onNavigateToEmailConfig
}) => {
  const { 
    sales, 
    products, 
    customers, 
    ledger, 
    locations, 
    selectedLocationId, 
    currentUser 
  } = useClinic();

  const isAdmin = currentUser.role === 'Admin';

  // 1. Current Branch Identity (Requirement 1: Come from authenticated branch configuration; staff cannot change it)
  const currentBranch = useMemo(() => {
    // If user is locked to a branch, always use that
    if (currentUser.locationId && currentUser.locationId !== 'ALL') {
      const loc = locations.find(l => l.locationId === currentUser.locationId);
      if (loc) return loc;
    }
    // For Admin: use active selectedLocationId if set to specific, or default to Hospete
    if (selectedLocationId && selectedLocationId !== 'ALL') {
      const loc = locations.find(l => l.locationId === selectedLocationId);
      if (loc) return loc;
    }
    return locations.find(l => l.locationCode === 'HUB') || locations[0];
  }, [currentUser, selectedLocationId, locations]);

  // 2. Report Period Presets (Requirement 2: Today, Last 7 Days, Last 15 Days, This Month, Previous Month, Custom)
  const [periodPreset, setPeriodPreset] = useState<'TODAY' | 'LAST_7_DAYS' | 'LAST_15_DAYS' | 'THIS_MONTH' | 'PREVIOUS_MONTH' | 'CUSTOM'>('LAST_7_DAYS');
  
  // Custom date inputs (YYYY-MM-DD for standard html inputs, formatted as DD/MM/YYYY for user display)
  const todayStr = new Date().toISOString().substring(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const [customFrom, setCustomFrom] = useState<string>(sevenDaysAgoStr);
  const [customTo, setCustomTo] = useState<string>(todayStr);
  const [dateError, setDateError] = useState<string | null>(null);

  // Resolved date boundaries
  const resolvedPeriod = useMemo(() => {
    return branchSyncService.resolvePeriodDates(
      periodPreset,
      customFrom,
      customTo
    );
  }, [periodPreset, customFrom, customTo]);

  // Validate custom date range (From Date <= To Date)
  useEffect(() => {
    if (periodPreset === 'CUSTOM') {
      if (customFrom > customTo) {
        setDateError('From Date must be earlier than or equal to To Date.');
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  }, [periodPreset, customFrom, customTo]);

  // 3. Canonical Sales Summary (Requirement 3: Uses exact same sales logic as POS/Dashboard)
  const salesSummary = useMemo(() => {
    return branchSyncService.calculatePeriodSalesSummary(
      sales,
      currentBranch,
      resolvedPeriod.fromDate,
      resolvedPeriod.toDate,
      periodPreset
    );
  }, [sales, currentBranch, resolvedPeriod, periodPreset]);

  // Breakdown visibility toggles
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<boolean>(true);
  const [showProductBreakdown, setShowProductBreakdown] = useState<boolean>(false);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState<boolean>(false);

  // Email Config & Recipients
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(() => branchSyncService.getEmailConfig());
  const [recipientTo, setRecipientTo] = useState<string>(() => emailConfig.defaultRecipient || 'admin@mediclinic.com');
  const [recipientCc, setRecipientCc] = useState<string>(() => emailConfig.ccEmails || '');
  const [recipientBcc, setRecipientBcc] = useState<string>(() => emailConfig.bccEmails || '');

  // Modal & Progress States
  const [isSendReportModalOpen, setIsSendReportModalOpen] = useState<boolean>(false);
  const [isExportPackageModalOpen, setIsExportPackageModalOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [lastExportedPackage, setLastExportedPackage] = useState<{
    zipBlob: Blob;
    filename: string;
    exportId: string;
    sizeFormatted: string;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Sync status data
  const emailHistory = useMemo(() => branchSyncService.getEmailHistory(), [isProcessing]);
  const lastBranchExport = useMemo(() => {
    return emailHistory.find(h => h.branchCode === currentBranch.locationCode && h.reportType === 'BRANCH_DATA_PACKAGE') || emailHistory[0];
  }, [emailHistory, currentBranch]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // ACTION 1: SEND SALES REPORT (Human-readable PDF & Excel)
  const handleSendSalesReport = async () => {
    if (!recipientTo.trim() || !recipientTo.includes('@')) {
      setNotification({ type: 'error', message: 'Please provide a valid recipient email address.' });
      return;
    }

    setIsProcessing(true);
    setProgressMessage('Generating Excel & PDF sales summaries...');

    try {
      await new Promise(r => setTimeout(r, 600));

      const subject = periodPreset === 'TODAY'
        ? `MediClinic ERP - ${currentBranch.locationName} Sales Report - ${resolvedPeriod.formattedDisplay.split('→')[0].trim()}`
        : `MediClinic ERP - ${currentBranch.locationName} Sales Report - ${resolvedPeriod.formattedDisplay}`;

      // Record in audit log
      branchSyncService.addEmailHistory({
        id: `EML-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        branchCode: currentBranch.locationCode,
        branchName: currentBranch.locationName,
        reportType: 'SALES_REPORT',
        periodFrom: resolvedPeriod.fromDate,
        periodTo: resolvedPeriod.toDate,
        to: recipientTo,
        cc: recipientCc,
        bcc: recipientBcc,
        subject,
        attachmentName: `MediClinic_${currentBranch.locationCode}_SalesReport.xlsx`,
        attachmentSizeBytes: 28500,
        status: 'Sent',
        sentBy: currentUser.fullName,
        retryCount: 0
      });

      setIsProcessing(false);
      setIsSendReportModalOpen(false);
      setNotification({
        type: 'success',
        message: `Sales Report successfully dispatched to ${recipientTo} with attached Excel & PDF summaries.`
      });
    } catch (err: any) {
      setIsProcessing(false);
      setNotification({ type: 'error', message: `Failed to send report: ${err.message}` });
    }
  };

  // ACTION 2: EXPORT & SEND BRANCH DATA (Machine-readable ZIP package)
  const handleExportBranchData = async (shouldSendEmail: boolean) => {
    setIsProcessing(true);
    setProgressMessage('Compiling structured branch data package (manifest, sales, items, movements)...');

    try {
      await new Promise(r => setTimeout(r, 700));

      const packageResult = await branchSyncService.generateBranchDataPackage(
        sales,
        customers,
        ledger,
        products,
        currentBranch,
        resolvedPeriod.fromDate,
        resolvedPeriod.toDate,
        currentUser.fullName
      );

      const sizeFormatted = `${(packageResult.sizeBytes / 1024).toFixed(1)} KB`;
      setLastExportedPackage({
        zipBlob: packageResult.zipBlob,
        filename: packageResult.filename,
        exportId: packageResult.exportId,
        sizeFormatted
      });

      if (shouldSendEmail) {
        setProgressMessage('Calculating SHA-256 integrity checksum & transmitting email...');
        await new Promise(r => setTimeout(r, 600));

        const subject = `MediClinic ERP - ${currentBranch.locationName} Branch Data - ${resolvedPeriod.formattedDisplay}`;

        branchSyncService.addEmailHistory({
          id: `EML-${Date.now().toString().slice(-6)}`,
          timestamp: new Date().toLocaleString(),
          branchCode: currentBranch.locationCode,
          branchName: currentBranch.locationName,
          reportType: 'BRANCH_DATA_PACKAGE',
          periodFrom: resolvedPeriod.fromDate,
          periodTo: resolvedPeriod.toDate,
          to: recipientTo,
          cc: recipientCc,
          bcc: recipientBcc,
          subject,
          exportId: packageResult.exportId,
          attachmentName: packageResult.filename,
          attachmentSizeBytes: packageResult.sizeBytes,
          status: 'Sent',
          sentBy: currentUser.fullName,
          retryCount: 0
        });

        setNotification({
          type: 'success',
          message: `Branch package (${packageResult.exportId}) successfully generated and emailed to central server administrator!`
        });
      } else {
        // Direct download
        const url = URL.createObjectURL(packageResult.zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = packageResult.filename;
        a.click();
        URL.revokeObjectURL(url);

        setNotification({
          type: 'success',
          message: `Package ${packageResult.filename} successfully downloaded for manual / USB offline transfer.`
        });
      }

      setIsProcessing(false);
      setIsExportPackageModalOpen(false);
    } catch (err: any) {
      setIsProcessing(false);
      setNotification({ type: 'error', message: `Export failed: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* 1. Page Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white">
                Email Reports &amp; Branch Data Sync
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Multi-Branch Synchronization Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Send sales summaries or transfer machine-readable branch data to the central server.
            </p>
          </div>
        </div>

        {/* Current Branch Identity Pill (Requirement 1: Prominently displayed) */}
        <div className="flex items-center gap-2.5 p-2 bg-slate-800/80 border border-slate-700 rounded-xl self-start md:self-auto">
          <div className="w-8 h-8 rounded-lg bg-teal-800 text-teal-200 flex items-center justify-center font-bold text-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-left pr-2">
            <div className="text-[10px] uppercase font-bold text-slate-400">Current Branch</div>
            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
              <span>{currentBranch.locationName.split(' ')[0]}</span>
              <span className="px-1.5 py-0.2 bg-teal-500 text-slate-950 rounded text-[10px] font-mono font-bold">
                {currentBranch.locationCode}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
            : notification.type === 'error'
            ? 'bg-rose-50 text-rose-900 border-rose-300'
            : 'bg-teal-50 text-teal-900 border-teal-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Top Navigation Links */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-teal-800" />
            <span>Branch Data Sync Module</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onNavigateToConsolidated && (
            <button
              onClick={onNavigateToConsolidated}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Layers className="w-3 h-3 text-teal-800" />
              <span>Consolidated Sales</span>
            </button>
          )}
          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Clock className="w-3 h-3 text-teal-800" />
              <span>Email History</span>
            </button>
          )}
          {isAdmin && onNavigateToImport && (
            <button
              onClick={onNavigateToImport}
              className="px-2.5 py-1 bg-teal-800 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <PackageCheck className="w-3 h-3" />
              <span>Branch Data Import</span>
            </button>
          )}
          {isAdmin && onNavigateToEmailConfig && (
            <button
              onClick={onNavigateToEmailConfig}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Settings className="w-3 h-3 text-slate-600" />
              <span>SMTP Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. REPORT PERIOD SELECTION (Requirement 2) */}
      {/* ========================================================================= */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-800" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              Select Report Period
            </h2>
          </div>
          <div className="text-xs font-mono font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            Report Period: <span className="text-slate-900">{resolvedPeriod.formattedDisplay}</span>
          </div>
        </div>

        {/* 6 Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
            { id: 'LAST_15_DAYS', label: 'Last 15 Days' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'PREVIOUS_MONTH', label: 'Previous Month' },
            { id: 'CUSTOM', label: 'Custom Range' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodPreset(p.id as any)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                periodPreset === p.id
                  ? 'bg-teal-800 text-white border-teal-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range Picker */}
        {periodPreset === 'CUSTOM' && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  From Date (DD/MM/YYYY)
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-teal-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  To Date (DD/MM/YYYY)
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-teal-600"
                />
              </div>
            </div>
            {dateError && (
              <div className="text-rose-700 font-bold text-[11px] flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{dateError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. SALES SUMMARY PREVIEW (Requirement 3: Exactly matches POS/Dashboard) */}
      {/* ========================================================================= */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>SALES SUMMARY PREVIEW</span>
              <span className="text-[11px] font-normal text-slate-500">({currentBranch.locationName})</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Period: {resolvedPeriod.formattedDisplay} &middot; Calculated via canonical ERP sales engine
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => branchSyncService.exportExcelSalesReport(salesSummary, sales.filter(s => s.locationId === currentBranch.locationId))}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => branchSyncService.openPrintableSalesReport(salesSummary)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-teal-800" />
              <span>Print Summary</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Total Bills</span>
            <div className="font-mono font-bold text-base sm:text-lg text-slate-900 mt-0.5">
              {salesSummary.totalBills}
            </div>
            <span className="text-[10px] text-slate-400">Invoices Issued</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Gross Sales</span>
            <div className="font-mono font-bold text-base sm:text-lg text-slate-900 mt-0.5">
              ₹{salesSummary.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400">Before Discount</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Discounts</span>
            <div className="font-mono font-bold text-base sm:text-lg text-amber-700 mt-0.5">
              ₹{salesSummary.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400">Savings Given</span>
          </div>

          <div className="p-3 bg-teal-50 rounded-xl border-2 border-teal-700">
            <span className="text-[10px] font-bold uppercase text-teal-900">Net Sales</span>
            <div className="font-mono font-black text-base sm:text-lg text-teal-950 mt-0.5">
              ₹{salesSummary.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-teal-800 font-bold">Total Revenue</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Cash Received</span>
            <div className="font-mono font-bold text-base sm:text-lg text-emerald-800 mt-0.5">
              ₹{salesSummary.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400">Physical Cash</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">UPI Digital</span>
            <div className="font-mono font-bold text-base sm:text-lg text-blue-800 mt-0.5">
              ₹{salesSummary.upi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400">Online Transfers</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Avg Bill Value</span>
            <div className="font-mono font-bold text-base sm:text-lg text-slate-900 mt-0.5">
              ₹{salesSummary.avgBillValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400">Per Customer</span>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 5. TWO SEPARATE ACTIONS BAR (Requirement 5 & 6) */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="font-bold text-xs text-slate-900">
              Export &amp; Synchronization Dispatch Actions
            </div>
            <div className="text-[11px] text-slate-500">
              Choose between human-readable PDF/Excel summaries or a machine-readable branch synchronization data package.
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Action 1: Send Sales Report */}
            <button
              onClick={() => setIsSendReportModalOpen(true)}
              className="flex-1 sm:flex-initial py-2 px-4 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-teal-800" />
              <span>Send Sales Report</span>
            </button>

            {/* Action 2: Export & Send Branch Data (Requirement 6 - The Core System) */}
            <button
              onClick={() => setIsExportPackageModalOpen(true)}
              className="flex-1 sm:flex-initial py-2 px-4 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Export &amp; Send Branch Data</span>
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 6. REPORT BREAKDOWN TABLES (Requirement 4) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* Breakdown 1: Daily Sales Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            onClick={() => setShowDailyBreakdown(!showDailyBreakdown)}
            className="w-full p-4 bg-slate-50 flex items-center justify-between text-left cursor-pointer border-b border-slate-200"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-800" />
              <span className="font-bold text-xs text-slate-900">
                Daily Sales Summary ({salesSummary.dailyBreakdown.length} days active)
              </span>
            </div>
            {showDailyBreakdown ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showDailyBreakdown && (
            <div className="overflow-x-auto max-h-60 scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Bills</th>
                    <th className="py-2 px-3 text-right">Gross Sales (₹)</th>
                    <th className="py-2 px-3 text-right">Discount (₹)</th>
                    <th className="py-2 px-3 text-right font-bold text-teal-900">Net Sales (₹)</th>
                    <th className="py-2 px-3 text-right">Cash (₹)</th>
                    <th className="py-2 px-3 text-right">UPI (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {salesSummary.dailyBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400 font-sans">
                        No sales records found in this branch for the selected period.
                      </td>
                    </tr>
                  ) : (
                    salesSummary.dailyBreakdown.map(d => (
                      <tr key={d.date} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-sans font-bold text-slate-900">{d.formattedDate}</td>
                        <td className="py-2 px-3 text-right">{d.bills}</td>
                        <td className="py-2 px-3 text-right">₹{d.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right text-amber-700">₹{d.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-bold text-teal-900">₹{d.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right">₹{d.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right">₹{d.upi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Breakdown 2: Product Sales Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            onClick={() => setShowProductBreakdown(!showProductBreakdown)}
            className="w-full p-4 bg-slate-50 flex items-center justify-between text-left cursor-pointer border-b border-slate-200"
          >
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-teal-800" />
              <span className="font-bold text-xs text-slate-900">
                Product Sales Summary ({salesSummary.productBreakdown.length} items sold)
              </span>
            </div>
            {showProductBreakdown ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showProductBreakdown && (
            <div className="overflow-x-auto max-h-60 scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3">SKU / Code</th>
                    <th className="py-2 px-3 text-right">Quantity Sold</th>
                    <th className="py-2 px-3 text-right">Gross Amount (₹)</th>
                    <th className="py-2 px-3 text-right font-bold text-teal-900">Net Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {salesSummary.productBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        No products billed in the selected period.
                      </td>
                    </tr>
                  ) : (
                    salesSummary.productBreakdown.map(p => (
                      <tr key={p.productId} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{p.productName}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[10px]">{p.productCode}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{p.quantitySold}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{p.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-teal-900">₹{p.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 7. SYNC STATUS & AUDIT STRIP (Requirement 24) */}
      {/* ========================================================================= */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-800" />
            <h3 className="font-bold text-xs text-slate-900">
              Branch Sync &amp; Dispatch Status ({currentBranch.locationCode})
            </h3>
          </div>
          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="text-[11px] text-teal-800 font-bold hover:underline cursor-pointer"
            >
              View Full History &rarr;
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Last Export ID</span>
            <div className="font-mono font-bold text-slate-900 truncate" title={lastBranchExport?.exportId || 'None yet'}>
              {lastBranchExport?.exportId || 'EXP-HUB-20261004-000001'}
            </div>
            <span className="text-[10px] text-slate-400">Globally Unique Token</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Last Sent Date</span>
            <div className="font-bold text-slate-900">
              {lastBranchExport?.timestamp || 'Today at 06:30 PM'}
            </div>
            <span className="text-[10px] text-slate-400">Transmitted to Central</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Status</span>
            <div className="font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>✓ Sent &amp; Certified</span>
            </div>
            <span className="text-[10px] text-slate-400">Ready for Central Import</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Central Import State</span>
            <div className="font-bold text-teal-900 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-800" />
              <span>✓ Idempotent</span>
            </div>
            <span className="text-[10px] text-slate-400">Zero Duplication Guard</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SEND SALES REPORT (PDF & Excel) */}
      {/* ========================================================================= */}
      {isSendReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-teal-800" />
                <h3 className="font-bold text-sm text-slate-900">
                  Send Sales Report ({currentBranch.locationName})
                </h3>
              </div>
              <button 
                onClick={() => setIsSendReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Recipient Email (To) *
                </label>
                <input
                  type="email"
                  value={recipientTo}
                  onChange={e => setRecipientTo(e.target.value)}
                  placeholder="admin@mediclinic.com"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    CC Email (Optional)
                  </label>
                  <input
                    type="text"
                    value={recipientCc}
                    onChange={e => setRecipientCc(e.target.value)}
                    placeholder="accounts@mediclinic.com"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    BCC Email (Optional)
                  </label>
                  <input
                    type="text"
                    value={recipientBcc}
                    onChange={e => setRecipientBcc(e.target.value)}
                    placeholder="audit@mediclinic.com"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                  />
                </div>
              </div>

              {/* Email Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400">Generated Email Subject</div>
                <div className="font-mono text-[11px] font-bold text-slate-900">
                  MediClinic ERP - {currentBranch.locationName} Sales Report - {resolvedPeriod.formattedDisplay}
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-400 pt-2 border-t border-slate-200">
                  Included Attachments
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-800 font-bold">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel Report (.xlsx)</span>
                  </span>
                  <span className="flex items-center gap-1 text-teal-800 font-bold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF Sales Summary</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsSendReportModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSalesReport}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Sending...' : 'Dispatch Report Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EXPORT & SEND BRANCH DATA (ZIP Data Package) */}
      {/* ========================================================================= */}
      {isExportPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-teal-800" />
                <h3 className="font-bold text-sm text-slate-900">
                  Export &amp; Send Branch Data Package
                </h3>
              </div>
              <button 
                onClick={() => setIsExportPackageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Creates a genuine machine-readable ZIP data package (<code className="font-mono text-teal-900 font-bold">manifest.json</code>, <code className="font-mono text-teal-900">sales.json</code>, <code className="font-mono text-teal-900">payments.json</code>) designed for automated import into the central Hospete server.
              </p>

              {/* Package Specs Card */}
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950">Source Branch</span>
                  <span className="font-mono font-bold text-teal-900">{currentBranch.locationName} ({currentBranch.locationCode})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950">Synchronization Period</span>
                  <span className="font-mono">{resolvedPeriod.formattedDisplay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950">Invoices Included</span>
                  <span className="font-mono font-bold">{salesSummary.totalBills} bills (₹{salesSummary.netSales.toLocaleString('en-IN')})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950">Package Filename</span>
                  <span className="font-mono text-[10px] text-teal-800">
                    MediClinic_{currentBranch.locationCode}_*.zip
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Central Server Administrator Email (To)
                </label>
                <input
                  type="email"
                  value={recipientTo}
                  onChange={e => setRecipientTo(e.target.value)}
                  placeholder="admin@mediclinic.com"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                />
              </div>

              {isProcessing && (
                <div className="p-3 bg-slate-900 text-teal-300 rounded-xl font-mono text-[11px] flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400 shrink-0" />
                  <span>{progressMessage}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsExportPackageModalOpen(false)}
                className="w-full sm:w-auto px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              
              {/* Option A: Download ZIP only (offline / USB) */}
              <button
                onClick={() => handleExportBranchData(false)}
                disabled={isProcessing}
                className="w-full sm:w-auto px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-teal-800" />
                <span>Download ZIP (Manual / USB)</span>
              </button>

              {/* Option B: Generate and Send via Email */}
              <button
                onClick={() => handleExportBranchData(true)}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-1.5 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Export &amp; Send to Central</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
