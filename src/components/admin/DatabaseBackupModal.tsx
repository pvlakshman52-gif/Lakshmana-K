import React, { useRef, useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Download, Upload, RefreshCw, Database, Server, ShieldCheck, X, CheckCircle, AlertTriangle, Tags, Sliders, Check, Rocket, Code2 } from 'lucide-react';
import { BatchPricingMode } from '../../types/erp';

interface DatabaseBackupModalProps {
  onClose: () => void;
  defaultTab?: 'pricing' | 'backup' | 'architecture';
  onNavigateToGoLive?: () => void;
  onOpenSqlServerManager?: (tab?: 'schema' | 'connection' | 'migrations' | 'notifications' | 'sync' | 'cloud') => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({ onClose, defaultTab = 'pricing', onNavigateToGoLive, onOpenSqlServerManager }) => {
  const { 
    exportDatabaseJSON, 
    importDatabaseJSON, 
    resetDatabase, 
    currentUser, 
    batchPricingMode, 
    setBatchPricingMode,
    batches,
    products
  } = useClinic();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pricing' | 'backup' | 'architecture'>(defaultTab);

  const handlePricingModeChange = (mode: BatchPricingMode) => {
    setBatchPricingMode(mode);
    setStatusMessage(
      mode === 'ACTIVE_BATCH'
        ? 'Batch Pricing Mode updated: Selling using Active FEFO Batch Price (Option A - Recommended).'
        : 'Batch Pricing Mode updated: Selling using Latest Product Master Price (Option B).'
    );
  };

  const handleExport = () => {
    const jsonStr = exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MediClinic_ERP_Backup_${new Date().toISOString().replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Database backup successfully exported and downloaded.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = importDatabaseJSON(content);
      if (success) {
        setStatusMessage('Database restored successfully from backup file!');
      } else {
        alert('Invalid or corrupted backup file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('Reset all demo clinic records to default seed data? This clears local changes.')) {
      resetDatabase();
      setStatusMessage('Database restored to default demo state.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-700" />
            <h3 className="font-bold text-sm text-slate-900">
              System Administration & Architecture
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 p-0.5 rounded text-xs">
              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-3 py-1 rounded transition-colors ${activeTab === 'pricing' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                Batch Pricing Policy
              </button>
              <button
                onClick={() => setActiveTab('backup')}
                className={`px-3 py-1 rounded transition-colors ${activeTab === 'backup' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                Backup & Restore
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className={`px-3 py-1 rounded transition-colors ${activeTab === 'architecture' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                Architecture Spec
              </button>
            </div>

            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: BATCH PRICING MODE (ADMIN SETTING - REQUIREMENT 11)  */}
          {/* ========================================================= */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-teal-700" />
                      <h4 className="font-bold text-slate-900 text-sm">
                        Batch Pricing Mode
                      </h4>
                    </div>
                    <p className="text-slate-600 text-xs mt-1">
                      Determine how POS Billing Counter and the Online Store resolve retail selling prices when multiple stock batches exist.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                    Default = Active Batch Price
                  </span>
                </div>
              </div>

              {/* Option Cards */}
              <div className="grid grid-cols-1 gap-3.5">
                {/* Option A */}
                <div
                  onClick={() => handlePricingModeChange('ACTIVE_BATCH')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    batchPricingMode === 'ACTIVE_BATCH'
                      ? 'border-teal-600 bg-teal-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                        batchPricingMode === 'ACTIVE_BATCH'
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {batchPricingMode === 'ACTIVE_BATCH' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            Option A: Sell using Active Batch Price
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                            Recommended · Default
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          POS Billing and Online Store always charge the selling price linked directly to the batch that will actually be sold next (FEFO priority).
                        </p>
                        <div className="text-[11px] text-teal-800 font-medium bg-teal-100/60 rounded-md p-2 mt-2">
                          ✓ <strong>Automated Zero-Stock Transition:</strong> The system automatically switches to the next batch selling price when the current batch stock reaches zero without any manual intervention.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option B */}
                <div
                  onClick={() => handlePricingModeChange('PRODUCT_MASTER')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    batchPricingMode === 'PRODUCT_MASTER'
                      ? 'border-teal-600 bg-teal-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                        batchPricingMode === 'PRODUCT_MASTER'
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {batchPricingMode === 'PRODUCT_MASTER' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            Option B: Sell using Latest Product Master Price
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          POS Billing and Online Store ignore active batch selling prices and sell all units at the latest catalog master price. Batches still deduct on FEFO and record true cost prices.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specification Example Explainer */}
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-teal-400 font-sans font-bold text-xs uppercase tracking-wide">
                    Live FEFO Price Simulation (User Specification Example)
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Product: PRD-001 (Trichology Peptide Serum)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 font-sans">
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
                    <div className="flex justify-between items-center font-bold text-teal-300">
                      <span>Batch A: OPEN-HOS-0001</span>
                      <span className="text-[10px] bg-teal-900/60 px-1.5 py-0.5 rounded text-teal-200">FEFO #1</span>
                    </div>
                    <div className="text-xs font-mono">Qty: 10 units</div>
                    <div className="text-xs font-mono font-bold text-white">Selling Price: ₹899</div>
                    <div className="text-[10px] text-slate-400 font-mono">Cost: ₹450 | Exp: 2027-03-31</div>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
                    <div className="flex justify-between items-center font-bold text-amber-300">
                      <span>Batch B: SUP-INV-3536</span>
                      <span className="text-[10px] bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-200">FEFO #2</span>
                    </div>
                    <div className="text-xs font-mono">Qty: 3 units</div>
                    <div className="text-xs font-mono font-bold text-white">Selling Price: ₹950</div>
                    <div className="text-[10px] text-slate-400 font-mono">Cost: ₹480 | Exp: 2027-08-31</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700 text-xs font-sans text-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>1. Current POS & Online Display Price (while Batch A has qty):</span>
                    <strong className="text-teal-400 font-mono text-sm">
                      {batchPricingMode === 'ACTIVE_BATCH' ? '₹899.00 (Batch A)' : '₹999.00 (Master)'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>2. When Batch A quantity reaches zero:</span>
                    <strong className="text-amber-400 font-mono">
                      {batchPricingMode === 'ACTIVE_BATCH' ? 'Automatically changes to ₹950.00' : 'Remains ₹999.00'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>3. Product Master Price (₹999):</span>
                    <span className="text-slate-300 italic">Treated as default price for future stock purchases only</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Export Complete ERP Database Backup</h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Exports all locations, products, batches, sales, ledger entries, and online orders into a portable JSON snapshot.
                    </p>
                  </div>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 shadow-xs shrink-0 ml-4"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Backup</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Restore Database from File</h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Upload a previously exported backup file to restore complete clinic database state.
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 shadow-xs shrink-0 ml-4"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Restore</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Super Admin Go Live Setup Portal Access */}
              {currentUser.role === 'Admin' && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                      <Rocket className="w-4 h-4 text-amber-600" />
                      <span>System Reset & Go Live Management</span>
                      <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold uppercase">Super Admin</span>
                    </div>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      Wipe demo sales, initialize live opening stock, reset invoice sequences to 000001, and enforce mandatory pre-reset backups.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToGoLive?.();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs shrink-0 cursor-pointer text-xs"
                  >
                    <span>Open Go Live Setup →</span>
                  </button>
                </div>
              )}

              {/* Admin SQL Server & Cloud Database Management Suite */}
              {currentUser.role === 'Admin' && onOpenSqlServerManager && (
                <div className="bg-gradient-to-r from-teal-50 to-slate-50 border-2 border-teal-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-teal-950 text-xs">
                      <Server className="w-4 h-4 text-teal-700" />
                      <span>Microsoft SQL Server & Cloud Migration Suite</span>
                      <span className="text-[10px] font-mono bg-teal-200 text-teal-900 px-1.5 py-0.2 rounded font-bold uppercase">Admin Only</span>
                    </div>
                    <p className="text-teal-900 text-[11px] leading-relaxed">
                      Connect to your location SQL Server, download complete T-SQL setup DDL scripts, store live data, and plan future Azure/Cloud migration.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSqlServerManager('schema');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-xs shrink-0 cursor-pointer text-xs"
                      title="Fetch and view latest SQL Server DDL Script"
                    >
                      <Code2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Create SQL Database (DDL)</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSqlServerManager();
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-xs shrink-0 cursor-pointer text-xs"
                    >
                      <span>Open SQL Server Suite →</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-rose-900 text-xs">Reset Demo Database</h4>
                    <p className="text-rose-700 text-[11px] mt-0.5">
                      Restores all seed data for Hospete and Hubballi clinics, including batches, sales, and initial orders.
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-rose-700 border border-rose-300 rounded-lg font-medium hover:bg-rose-100 shadow-xs shrink-0 ml-4"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Database</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4 leading-relaxed font-mono">
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 text-[11px]">
                <div className="text-teal-400 font-bold uppercase font-sans tracking-wider">
                  Target Enterprise Architecture Blueprint
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700 text-slate-300 font-sans">
                  <div><strong>Backend:</strong> ASP.NET Core 8 Web API</div>
                  <div><strong>ORM:</strong> Entity Framework Core 8</div>
                  <div><strong>Database:</strong> SQL Server Express / Azure SQL</div>
                  <div><strong>Auth:</strong> JWT Bearer + BCrypt Password Hash</div>
                  <div><strong>Sequences:</strong> HOS-000001, HUB-000001 per branch</div>
                  <div><strong>Cloud Target:</strong> Azure App Service & Blob Storage</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[11px]">
                <strong className="text-slate-900 block font-sans mb-1">Core Relational Tables Implemented:</strong>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code>Locations</code>: Hospete (HOS), Hubballi (HUB) with separate running sequences.</li>
                  <li><code>StockBatch</code>: Granular FIFO batches with expiration dates, purchase POs, and suppliers.</li>
                  <li><code>StockMovementLedger</code>: The immutable ledger updating on Purchase, Sale, Transfer In/Out, Adjustment, and Expiry.</li>
                  <li><code>StockTransfer</code> & <code>StockAdjustment</code>: Multi-clinic transfer routing and audit write-offs.</li>
                  <li><code>SalesHeader</code> & <code>SalesDetail</code>: POS transactions with Cash/UPI tracking and profit margins.</li>
                  <li><code>OnlineOrders</code>: Home delivery dispatch tracking (Pending, Packed, Shipped, Delivered).</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
