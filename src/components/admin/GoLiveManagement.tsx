import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  Rocket, 
  ShieldAlert, 
  ShieldCheck, 
  Database, 
  RotateCcw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  Layers, 
  FileText, 
  Users, 
  ShoppingBag, 
  Package, 
  ArrowRight, 
  Info, 
  Lock, 
  Sparkles,
  Calendar,
  Building,
  Check,
  ChevronRight,
  ExternalLink,
  Trash2,
  ListCheck
} from 'lucide-react';
import { GoLiveResetOptions, DatabaseBackupRecord } from '../../types/erp';

interface GoLiveManagementProps {
  onNavigateToOpeningStock: () => void;
  onNavigateToPos: () => void;
  onNavigateToDashboard: () => void;
}

export const GoLiveManagement: React.FC<GoLiveManagementProps> = ({
  onNavigateToOpeningStock,
  onNavigateToPos,
  onNavigateToDashboard
}) => {
  const {
    currentUser,
    products,
    batches,
    sales,
    customers,
    locations,
    categories,
    subcategories,
    brands,
    users,
    backups,
    auditLogs,
    createDatabaseBackup,
    executeGoLiveReset,
    downloadBackupFile,
    restoreFromBackupRecord,
    deleteBackupRecord,
    addStockBatch,
    generateNextOpeningBatchNumber
  } = useClinic();

  // ACCESS CONTROL: Super Admin Only
  const isSuperAdmin = currentUser.role === 'Admin';

  // Navigation tab within Go Live Management
  const [activeSection, setActiveSection] = useState<'dashboard' | 'reset-wizard' | 'opening-stock-quick' | 'audit-logs' | 'backups'>('dashboard');

  // Reset Configuration States
  const [branchScope, setBranchScope] = useState<'ALL' | 'LOC-HOS' | 'LOC-HUB'>('ALL');
  const [inventoryMode, setInventoryMode] = useState<'QUANTITIES_ONLY' | 'STOCK_AND_TRANSACTIONS' | 'FULL_DATABASE'>('STOCK_AND_TRANSACTIONS');
  const [keepProductMaster, setKeepProductMaster] = useState<boolean>(true);
  const [resetInvoiceSequences, setResetInvoiceSequences] = useState<boolean>(true);

  // Go-Live / Reset Demo Data Checkbox States (User Requirement 9)
  const [clearSales, setClearSales] = useState<boolean>(true);
  const [clearPurchases, setClearPurchases] = useState<boolean>(true);
  const [clearStockTransactions, setClearStockTransactions] = useState<boolean>(true);
  const [clearCustomers, setClearCustomers] = useState<boolean>(false);
  const [clearSuppliers, setClearSuppliers] = useState<boolean>(false);
  const [clearPayments, setClearPayments] = useState<boolean>(true);
  const [clearExpenses, setClearExpenses] = useState<boolean>(true);

  // Preserve Master Data Checkboxes (User Requirement 9: Default Checked)
  const [preserveCategories, setPreserveCategories] = useState<boolean>(true);
  const [preserveSubcategories, setPreserveSubcategories] = useState<boolean>(true);
  const [preserveBrands, setPreserveBrands] = useState<boolean>(true);
  const [preserveProductMaster, setPreserveProductMaster] = useState<boolean>(true);
  const [preserveProductPricing, setPreserveProductPricing] = useState<boolean>(true);

  // Double confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Success state after reset
  const [resetResult, setResetResult] = useState<{
    backupFileName: string;
    summary: string[];
    timestamp: string;
  } | null>(null);

  // Quick Opening Stock Wizard state
  const [quickBranch, setQuickBranch] = useState<'LOC-HOS' | 'LOC-HUB'>('LOC-HOS');
  const [quickBatchNo, setQuickBatchNo] = useState<string>(() => generateNextOpeningBatchNumber('LOC-HOS'));
  const [quickProductCode, setQuickProductCode] = useState<string>(products[0]?.productId || '');
  const [quickQuantity, setQuickQuantity] = useState<number>(25);
  const [quickCostPrice, setQuickCostPrice] = useState<number>(products[0]?.costPrice || 250);
  const [quickSellingPrice, setQuickSellingPrice] = useState<number>(products[0]?.sellingPrice || 450);
  const [quickExpiryDate, setQuickExpiryDate] = useState<string>('2028-12-31');
  const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null);

  // Compute Required Confirmation Word
  const requiredConfirmationText = 'START GO LIVE';

  // Current Database Status
  const currentTotalStock = useMemo(() => {
    return batches.reduce((acc, b) => acc + b.currentQuantity, 0);
  }, [batches]);

  const stockHospete = useMemo(() => {
    return batches.filter(b => b.locationId === 'LOC-HOS').reduce((acc, b) => acc + b.currentQuantity, 0);
  }, [batches]);

  const stockHubballi = useMemo(() => {
    return batches.filter(b => b.locationId === 'LOC-HUB').reduce((acc, b) => acc + b.currentQuantity, 0);
  }, [batches]);

  // Handle Instant Backup
  const handleInstantBackup = () => {
    const record = createDatabaseBackup('ALL', 'Manual Full Database Snapshot');
    downloadBackupFile(record);
    alert(`Database backup created successfully!\nFile Name: ${record.fileName}`);
  };

  // Execute Go Live Reset
  const handleExecuteReset = () => {
    if (confirmationInput.trim() !== requiredConfirmationText) return;

    setIsExecuting(true);
    try {
      const options: GoLiveResetOptions = {
        branchScope,
        clearSales: clearSales || clearPayments,
        clearInvoices: clearSales || clearPayments,
        clearCustomers,
        clearLedger: clearStockTransactions,
        clearPurchases,
        clearTransfers: clearStockTransactions,
        clearAdjustments: clearStockTransactions,
        clearPriceHistory: !preserveProductPricing,
        clearProductImages: !preserveProductMaster,
        clearDemoUsers: false,
        clearDemoCategories: !preserveCategories,
        clearDemoSubcategories: !preserveSubcategories,
        clearDemoBrands: !preserveBrands,
        clearDemoProducts: !preserveProductMaster,
        clearDemoSuppliers: clearSuppliers,
        inventoryMode: clearStockTransactions ? 'STOCK_AND_TRANSACTIONS' : inventoryMode,
        keepProductMaster: preserveProductMaster,
        resetInvoiceSequences
      };

      const { backupRecord, summary } = executeGoLiveReset(options);

      setResetResult({
        backupFileName: backupRecord.fileName,
        summary,
        timestamp: new Date().toLocaleTimeString()
      });

      setIsConfirmModalOpen(false);
      setConfirmationInput('');
      setActiveSection('reset-wizard');
    } finally {
      setIsExecuting(false);
    }
  };

  // Quick Opening Stock Entry Submit
  const handleQuickOpeningStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p && p.productId === quickProductCode);
    if (!prod || !prod.productId) return;

    addStockBatch({
      productId: prod.productId,
      locationId: quickBranch,
      batchNumber: quickBatchNo.trim(),
      openingBatchNumber: quickBatchNo.trim(),
      isOpeningStock: true,
      expiryDate: quickExpiryDate,
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseInvoiceNo: quickBatchNo.trim(),
      supplierName: 'Go Live Opening Stock Migration',
      quantityReceived: quickQuantity,
      currentQuantity: quickQuantity,
      costPrice: quickCostPrice,
      sellingPrice: quickSellingPrice
    });

    setQuickSuccessMsg(`Successfully registered ${quickQuantity} units of ${prod.productName} into ${quickBranch === 'LOC-HOS' ? 'Hospete Clinic' : 'Hubballi Clinic'} under batch ${quickBatchNo}.`);
    setQuickBatchNo(generateNextOpeningBatchNumber(quickBranch));
  };

  // ACCESS DENIED VIEW FOR STAFF USERS
  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-rose-950">
            Access Restricted · Super Admin Clearance Required
          </h2>
          <p className="text-sm text-rose-700 max-w-lg mx-auto leading-relaxed">
            The <strong>Go Live Management & System Reset</strong> module is strictly reserved for Super Admin users (Dr. Rajesh Rao). Clinic staff and billing cashiers are prohibited from viewing or resetting clinic databases.
          </p>
          <div className="pt-2">
            <button
              onClick={onNavigateToDashboard}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              Return to Clinical Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner: Go Live Management Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
              <Rocket className="w-3.5 h-3.5" />
              <span>Production Readiness & System Reset</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Go Live Management & System Reset
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Safely clean demo testing data, protect Master Catalogs, initialize verified opening stock, and reset invoice sequences before welcoming live clinic patients.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleInstantBackup}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 backdrop-blur-xs cursor-pointer shadow-sm"
              title="Generate full .bak snapshot immediately"
            >
              <Download className="w-4 h-4 text-teal-300" />
              <span>Backup Database</span>
            </button>

            <button
              onClick={() => {
                setActiveSection('reset-wizard');
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Demo Data</span>
            </button>

            <button
              onClick={() => {
                setActiveSection('dashboard');
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Start Go Live Setup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 pt-1 text-xs scrollbar-thin">
        <button
          onClick={() => setActiveSection('dashboard')}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'dashboard'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Go Live Dashboard</span>
        </button>

        <button
          onClick={() => setActiveSection('reset-wizard')}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'reset-wizard'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>System Reset Configurator</span>
        </button>

        <button
          onClick={() => setActiveSection('opening-stock-quick')}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'opening-stock-quick'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4 text-teal-400" />
          <span>Opening Stock Setup Wizard</span>
        </button>

        <button
          onClick={() => setActiveSection('audit-logs')}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'audit-logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4 text-indigo-400" />
          <span>Reset Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('backups')}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'backups'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Backup History ({backups.length})</span>
        </button>
      </div>

      {/* SECTION 1: GO LIVE DASHBOARD & CURRENT DATABASE STATUS (Requirement 10) */}
      {activeSection === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Current Database Status Metric Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Current Database Status</h2>
                <p className="text-xs text-slate-500">Live counts of data entities across Hospete & Hubballi clinics.</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                SQL Server / LocalStorage Synced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Products Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Products Catalog</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-1">{products.length}</div>
                  <div className="text-[11px] text-teal-700 mt-0.5">{categories.length} Categories Active</div>
                </div>
                <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>

              {/* Stock Qty Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Total Stock Qty</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-1">{currentTotalStock.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">HOS: {stockHospete} · HUB: {stockHubballi}</div>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
              </div>

              {/* Sales Records Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Sales Records</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-1">{sales.length}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    HOS: {sales.filter(s => s.locationId === 'LOC-HOS').length} · HUB: {sales.filter(s => s.locationId === 'LOC-HUB').length}
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              {/* Customers Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Customer Patients</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-1">{customers.length}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Prescription Directory</div>
                </div>
                <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: RECOMMENDED GO LIVE PROCESS (Requirement 11) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-teal-700 font-bold text-xs uppercase tracking-wider">Standard Operating Procedure</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">Recommended 6-Step Go Live Process</h3>
                <p className="text-xs text-slate-500 mt-0.5">Follow this structured protocol to ensure zero data loss during clinic opening.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mandatory Safety Backup Enforced</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">Automatic & Manual</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Backup Database</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Export an instantaneous `.bak` snapshot containing all current products, users, and transactions.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleInstantBackup}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <span>Download Backup Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold">Branch or All</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Clear Demo Data</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Safely purge demo billing bills, stock test adjustments, transfer slips, and simulation records.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveSection('reset-wizard')}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1"
                  >
                    <span>Configure Reset Options</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-bold">Protected</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Keep Product Master</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Preserve high-resolution photos, dermatological categorizations, retail prices, and reorder levels.
                </p>
                <div className="text-[11px] font-medium text-indigo-700">
                  ✓ {products.length} Products Catalog Safe
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">4</span>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-bold">Initial Physical Stock</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Enter Opening Stock</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Input actual physical medicine counts, batch numbers, and expiry dates via the Opening Stock Setup Wizard.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveSection('opening-stock-quick')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <span>Launch Stock Wizard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">5</span>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-bold">Sequence = 000001</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Reset Invoice Numbers</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Restart billing tax invoice numbering from 1: Hospete <code className="text-slate-800 font-mono">HOS-000001</code> and Hubballi <code className="text-slate-800 font-mono">HUB-000001</code>.
                </p>
                <div className="text-[11px] font-medium text-purple-700">
                  ✓ Fresh Fiscal Sequence Ready
                </div>
              </div>

              {/* Step 6 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center">6</span>
                  <span className="text-[10px] font-mono text-teal-800 bg-teal-100 px-2 py-0.5 rounded font-bold">Go Live!</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Start Live Billing</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open the POS billing counter or Online Storefront and commence live clinic customer operations.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onNavigateToPos}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 font-mono"
                  >
                    <span>Open POS Counter →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SYSTEM RESET CONFIGURATOR (Requirements 1, 2, 3, 4, 6, 8) */}
      {activeSection === 'reset-wizard' && (
        <div className="space-y-6">
          
          {/* Post-Reset Success Banner */}
          {resetResult && (
            <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>System Reset Completed Successfully · Baseline Initialized</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Mandatory pre-reset safety backup created as <strong>{resetResult.backupFileName}</strong>. Selected demo records were cleaned according to your configuration.
              </p>
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-xs font-mono space-y-1">
                <div className="font-bold text-slate-700 mb-1">Actions Executed:</div>
                {resetResult.summary.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-600">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveSection('opening-stock-quick')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Step 4: Enter Live Opening Stock →
                </button>
                <button
                  onClick={() => setResetResult(null)}
                  className="px-3 py-2 text-xs font-medium text-emerald-800 hover:text-emerald-950"
                >
                  Dismiss Banner
                </button>
              </div>
            </div>
          )}

          {/* Configurator Form Cards */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
            
            {/* Header */}
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-bold text-slate-900">System Reset Configuration</h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize precisely which branches and entities will be cleared before going live. Automatic safety backup is enforced.
              </p>
            </div>

            {/* REQUIREMENT 1: BRANCH WISE DATA RESET */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                1. Branch Scope for Reset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setBranchScope('ALL')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    branchScope === 'ALL'
                      ? 'border-teal-700 bg-teal-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">All Branches</span>
                    <input
                      type="radio"
                      checked={branchScope === 'ALL'}
                      onChange={() => setBranchScope('ALL')}
                      className="accent-teal-700"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Clears data across both Hospete Clinic & Hubballi Depot simultaneously.
                  </p>
                </div>

                <div
                  onClick={() => setBranchScope('LOC-HOS')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    branchScope === 'LOC-HOS'
                      ? 'border-teal-700 bg-teal-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Hospete Data Only</span>
                    <input
                      type="radio"
                      checked={branchScope === 'LOC-HOS'}
                      onChange={() => setBranchScope('LOC-HOS')}
                      className="accent-teal-700"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Clears only transactions and batches belonging to Hospete Clinic [LOC-HOS].
                  </p>
                </div>

                <div
                  onClick={() => setBranchScope('LOC-HUB')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    branchScope === 'LOC-HUB'
                      ? 'border-teal-700 bg-teal-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Hubballi Data Only</span>
                    <input
                      type="radio"
                      checked={branchScope === 'LOC-HUB'}
                      onChange={() => setBranchScope('LOC-HUB')}
                      className="accent-teal-700"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Clears only transactions and batches belonging to Hubballi Depot [LOC-HUB].
                  </p>
                </div>
              </div>
            </div>

            {/* REQUIREMENT 3: INVENTORY RESET OPTIONS */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                2. Inventory Reset Options
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option A */}
                <div
                  onClick={() => setInventoryMode('QUANTITIES_ONLY')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    inventoryMode === 'QUANTITIES_ONLY'
                      ? 'border-teal-700 bg-teal-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Option A: Quantities Only</span>
                    <input
                      type="radio"
                      checked={inventoryMode === 'QUANTITIES_ONLY'}
                      onChange={() => setInventoryMode('QUANTITIES_ONLY')}
                      className="accent-teal-700"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Sets stock quantities to 0 across all items. Keeps all products, categories, batches, and prices intact.
                  </p>
                </div>

                {/* Option B (RECOMMENDED) */}
                <div
                  onClick={() => setInventoryMode('STOCK_AND_TRANSACTIONS')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                    inventoryMode === 'STOCK_AND_TRANSACTIONS'
                      ? 'border-teal-700 bg-teal-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 bg-teal-700 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Recommended for Go-Live
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Option B: Stock & Transactions</span>
                    <input
                      type="radio"
                      checked={inventoryMode === 'STOCK_AND_TRANSACTIONS'}
                      onChange={() => setInventoryMode('STOCK_AND_TRANSACTIONS')}
                      className="accent-teal-700"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Wipes all demo batches and sales. Keeps the complete Product Master catalog ready for clean Opening Stock entry.
                  </p>
                </div>

                {/* Option C */}
                <div
                  onClick={() => setInventoryMode('FULL_DATABASE')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    inventoryMode === 'FULL_DATABASE'
                      ? 'border-rose-700 bg-rose-50/40 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Option C: Full Database Reset</span>
                    <input
                      type="radio"
                      checked={inventoryMode === 'FULL_DATABASE'}
                      onChange={() => setInventoryMode('FULL_DATABASE')}
                      className="accent-rose-700"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Total factory reset of clinic data (Super Admin account retained).
                  </p>
                </div>
              </div>
            </div>

            {/* REQUIREMENT 4: PRODUCT MASTER PROTECTION SETTING */}
            <div className="p-4 rounded-2xl border-2 border-teal-200 bg-teal-50/40 flex items-start gap-3">
              <input
                type="checkbox"
                id="keepProductMaster"
                checked={keepProductMaster}
                onChange={e => setKeepProductMaster(e.target.checked)}
                className="w-5 h-5 accent-teal-700 mt-0.5 rounded shrink-0 cursor-pointer"
              />
              <div className="space-y-1 flex-1">
                <label htmlFor="keepProductMaster" className="font-bold text-sm text-slate-900 cursor-pointer flex items-center gap-2">
                  <span>Keep Product Master Data (High Protection Recommended)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Active Protection</span>
                </label>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When enabled, all <strong>{products.length} products</strong>, <strong>{categories.length} categories</strong>, packaging images, clinical descriptions, selling prices, and reorder levels will remain completely preserved. Only stock counts and transactions are wiped.
                </p>
              </div>
            </div>

            {/* REQUIREMENT 6: INVOICE NUMBER RESET OPTION */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-start gap-3">
              <input
                type="checkbox"
                id="resetInvoiceSequences"
                checked={resetInvoiceSequences}
                onChange={e => setResetInvoiceSequences(e.target.checked)}
                className="w-5 h-5 accent-teal-700 mt-0.5 rounded shrink-0 cursor-pointer"
              />
              <div className="space-y-1 flex-1">
                <label htmlFor="resetInvoiceSequences" className="font-bold text-sm text-slate-900 cursor-pointer flex items-center gap-2">
                  <span>Reset Invoice Sequences to 000001</span>
                  <span className="text-[10px] font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">HOS-000001 & HUB-000001</span>
                </label>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Restart billing tax invoice counters so that live operations commence with fresh sequence numbers from 1.
                </p>
              </div>
            </div>

            {/* REQUIREMENT 9: GO-LIVE / RESET DEMO DATA OPTIONS */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    3. Go-Live / Reset Demo Data
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select demo operational transactions to wipe, and verify protected master formulary data.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setClearSales(true);
                      setClearPurchases(true);
                      setClearStockTransactions(true);
                      setClearCustomers(false);
                      setClearSuppliers(false);
                      setClearPayments(true);
                      setClearExpenses(true);
                    }}
                    className="text-teal-700 hover:text-teal-900 font-bold underline"
                  >
                    Select Operational Demo Data
                  </button>
                </div>
              </div>

              {/* Group A: Delete Demo Data */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Demo Transactions to Permanently Wipe</span>
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {/* Delete Demo Sales */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    clearSales ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-semibold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clearSales}
                      onChange={e => setClearSales(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>Delete Demo Sales</span>
                  </label>

                  {/* Delete Demo Purchase Transactions */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    clearPurchases ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-semibold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clearPurchases}
                      onChange={e => setClearPurchases(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>Delete Demo Purchase Transactions</span>
                  </label>

                  {/* Delete Demo Stock Transactions */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    clearStockTransactions ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-semibold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clearStockTransactions}
                      onChange={e => setClearStockTransactions(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>Delete Demo Stock Transactions</span>
                  </label>

                  {/* Delete Demo Customers */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    clearCustomers ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-semibold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clearCustomers}
                      onChange={e => setClearCustomers(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>Delete Demo Customers</span>
                  </label>

                  {/* Delete Demo Suppliers */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    clearSuppliers ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-semibold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clearSuppliers}
                      onChange={e => setClearSuppliers(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>Delete Demo Suppliers</span>
                  </label>

                  {/* Delete Demo Payments */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    clearPayments ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-semibold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clearPayments}
                      onChange={e => setClearPayments(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>Delete Demo Payments</span>
                  </label>

                  {/* Delete Demo Expenses */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    clearExpenses ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-semibold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clearExpenses}
                      onChange={e => setClearExpenses(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>Delete Demo Expenses</span>
                  </label>
                </div>
              </div>

              {/* Group B: Preserve Master Data */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Master Data to Preserve (Recommended: Keep Checked)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {/* Preserve Categories */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    preserveCategories ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={preserveCategories}
                      onChange={e => setPreserveCategories(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Preserve Categories ({categories.length})</span>
                  </label>

                  {/* Preserve Subcategories */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    preserveSubcategories ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={preserveSubcategories}
                      onChange={e => setPreserveSubcategories(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Preserve Subcategories ({subcategories.length})</span>
                  </label>

                  {/* Preserve Brands */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    preserveBrands ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={preserveBrands}
                      onChange={e => setPreserveBrands(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Preserve Brands ({brands.length})</span>
                  </label>

                  {/* Preserve Product Master */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    preserveProductMaster ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={preserveProductMaster}
                      onChange={e => {
                        setPreserveProductMaster(e.target.checked);
                        setKeepProductMaster(e.target.checked);
                      }}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Preserve Product Master ({products.length})</span>
                  </label>

                  {/* Preserve Product Pricing */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    preserveProductPricing ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-bold shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={preserveProductPricing}
                      onChange={e => setPreserveProductPricing(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Preserve Product Pricing & Margins</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Bar with Mandatory Double Confirmation trigger */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Double confirmation and automatic timestamped `.bak` backup will be executed prior to reset.</span>
              </div>

              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(true)}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Proceed to Double Confirmation →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: OPENING STOCK SETUP WIZARD (Requirement 5) */}
      {activeSection === 'opening-stock-quick' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 text-teal-700 font-bold text-xs uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Step 4 of Go Live Process</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Opening Stock Setup Wizard</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Establish verified starting inventory for live clinic operations. Each entry is tagged with its sequential Opening Batch Number.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onNavigateToOpeningStock}
                  className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <span>Open Full Opening Stock Register</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {quickSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs font-semibold">{quickSuccessMsg}</div>
              </div>
            )}

            {/* Quick Opening Batch Entry Form */}
            <form onSubmit={handleQuickOpeningStockSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Branch */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Fulfilling Branch</label>
                  <select
                    value={quickBranch}
                    onChange={e => {
                      const branch = e.target.value as 'LOC-HOS' | 'LOC-HUB';
                      setQuickBranch(branch);
                      setQuickBatchNo(generateNextOpeningBatchNumber(branch));
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white"
                  >
                    <option value="LOC-HOS">Hospete Clinic [LOC-HOS]</option>
                    <option value="LOC-HUB">Hubballi Depot [LOC-HUB]</option>
                  </select>
                </div>

                {/* Opening Batch Number */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Opening Batch Number</label>
                  <input
                    type="text"
                    required
                    value={quickBatchNo}
                    onChange={e => setQuickBatchNo(e.target.value)}
                    placeholder="e.g. OPEN-HOS-0001"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white"
                  />
                </div>

                {/* Product */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1.5">Dermatological Product Formulation</label>
                  <select
                    value={quickProductCode}
                    onChange={e => {
                      const selectedId = e.target.value;
                      setQuickProductCode(selectedId);
                      const prod = products.find(p => p && p.productId === selectedId);
                      if (prod) {
                        setQuickCostPrice(prod.costPrice);
                        setQuickSellingPrice(prod.sellingPrice);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white"
                  >
                    {products.filter(p => p && p.productId).map(p => (
                      <option key={p.productId} value={p.productId}>
                        {p.productCode} - {p.productName} ({p.volumeSize})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Physical Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickQuantity}
                    onChange={e => setQuickQuantity(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Cost Price (₹ per unit)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={quickCostPrice}
                    onChange={e => setQuickCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Retail Selling Price (₹ per unit)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={quickSellingPrice}
                    onChange={e => setQuickSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Batch Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={quickExpiryDate}
                    onChange={e => setQuickExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Total Batch Valuation: <strong className="text-slate-900 font-mono">₹{(quickQuantity * quickCostPrice).toLocaleString()}</strong> cost · <strong className="text-slate-900 font-mono">₹{(quickQuantity * quickSellingPrice).toLocaleString()}</strong> retail
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Register Live Opening Stock Batch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 4: AUDIT LOGS (Requirement 9) */}
      {activeSection === 'audit-logs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">System Reset Audit Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanent compliance trail recording every database wipe, operator details, and matching backup file.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                {auditLogs.length} Records Logged
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No System Resets Performed Yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Audit log entries will automatically populate whenever an Admin executes a data reset.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Authorized User</th>
                      <th className="py-3 px-4">Branch Scope</th>
                      <th className="py-3 px-4">Backup File Name</th>
                      <th className="py-3 px-4">Data Cleared Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log.logId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.date}</div>
                          <div className="text-[10px] text-slate-400">{log.time}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {log.user}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            log.branchScope === 'ALL'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}>
                            {log.branchScope === 'ALL' ? 'ALL BRANCHES' : log.branchScope}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-teal-800 whitespace-nowrap">
                          {log.backupFileName}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5 max-w-md">
                            {log.dataCleared.map((item, i) => (
                              <div key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: BACKUP HISTORY (Requirement 7) */}
      {activeSection === 'backups' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Database Backup Snapshots (.bak)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Archived backup images captured before each system reset and manual exports.
                </p>
              </div>
              <button
                onClick={handleInstantBackup}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Create New Snapshot (.bak)</span>
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Database className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No Backups Saved Yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "Create New Snapshot" or run a reset to create a backup.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Backup File Name</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Created By</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Database Summary</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.map(bak => (
                      <tr key={bak.backupId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {bak.fileName}
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div>{bak.createdDate}</div>
                          <div className="text-[10px] text-slate-400">{bak.createdTime}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {bak.createdBy}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                            {bak.branchScope}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[11px] text-slate-600">
                            {bak.recordSummary.products} Prods · {bak.recordSummary.totalStockUnits} Stock Units · {bak.recordSummary.sales} Sales
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => downloadBackupFile(bak)}
                              className="px-2.5 py-1 text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Download .bak file"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Restore database from ${bak.fileName}? Current local state will be overwritten by this snapshot.`)) {
                                  const ok = restoreFromBackupRecord(bak.backupId);
                                  if (ok) alert('Database restored successfully from snapshot!');
                                }
                              }}
                              className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              title="Restore state from this backup"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => deleteBackupRecord(bak.backupId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="Delete this snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION MODAL (Requirement 9) */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-amber-300 max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-800 pb-3 border-b border-amber-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                  ⚠️ START FRESH / GO LIVE
                </h3>
                <p className="text-xs text-amber-800 font-medium">
                  This operation will permanently remove selected demo transactions.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
              <p className="font-extrabold text-emerald-950 text-xs uppercase tracking-wide">
                The following will be preserved:
              </p>
              <ul className="space-y-1.5 text-emerald-900 font-semibold text-xs">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Categories ({categories.length} main categories)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Subcategories ({subcategories.length} subcategories)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Brands ({brands.length} brand masters)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Products ({products.length} formulary items)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Product Codes (Stable category prefixes)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Pricing (Cost price, Selling price & margins)</span>
                </li>
              </ul>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
              This operation cannot be automatically undone. A pre-reset database backup snapshot will be recorded first.
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Type: <span className="font-mono text-rose-700 font-extrabold select-all bg-rose-100 px-2 py-0.5 rounded">START GO LIVE</span>
              </label>
              <input
                type="text"
                autoFocus
                value={confirmationInput}
                onChange={e => setConfirmationInput(e.target.value)}
                placeholder="START GO LIVE"
                className="w-full p-3 border-2 border-slate-300 rounded-xl font-mono text-sm tracking-wider font-bold text-slate-900 focus:border-rose-600 uppercase focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setConfirmationInput('');
                }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={confirmationInput.trim() !== 'START GO LIVE' || isExecuting}
                onClick={handleExecuteReset}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                  confirmationInput.trim() === 'START GO LIVE'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isExecuting ? 'Starting Go Live...' : 'START GO LIVE'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
