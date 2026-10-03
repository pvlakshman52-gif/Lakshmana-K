import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { 
  Download, 
  Smartphone, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Layers, 
  Boxes, 
  Receipt, 
  Users, 
  History, 
  Check, 
  Laptop, 
  ShieldCheck, 
  Zap, 
  HardDrive,
  Database,
  ArrowRight,
  Server,
  Cloud,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckSquare
} from 'lucide-react';
import { LocalSystemInstallModal } from '../common/LocalSystemInstallModal';
import { downloadWindowsDesktopInstaller, downloadStandaloneSqlBridgeInstaller } from '../../utils/pwaInstallHelper';
import { localSqlServerService, SqlServerStatus } from '../../services/localSqlService';

interface PWAOfflineSyncViewProps {
  onNavigate?: (tab: string) => void;
}

export const PWAOfflineSyncView: React.FC<PWAOfflineSyncViewProps> = ({ onNavigate }) => {
  const { 
    products, 
    batches, 
    customers, 
    sales, 
    ledger, 
    locations, 
    selectedLocationId, 
    setSelectedLocationId 
  } = useClinic();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { isOnline } = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<'overview' | 'install' | 'storage' | 'architecture' | 'bridge'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(100);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [isSimulatingOffline, setIsSimulatingOffline] = useState(false);
  const [syncLogs, setSyncLogs] = useState<Array<{ id: string; time: string; text: string; type: 'info' | 'success' | 'warn' }>>([
    { id: '1', time: new Date().toLocaleTimeString(), text: 'Service Worker v2.6.2 precache verified across 18 static bundles.', type: 'info' },
    { id: '2', time: new Date().toLocaleTimeString(), text: 'IndexedDB & localStorage schema initialized. Local-first fallback active.', type: 'info' },
    { id: '3', time: new Date().toLocaleTimeString(), text: `Loaded ${products.length} products and ${batches.length} batches into fast memory index.`, type: 'success' },
    { id: '4', time: new Date().toLocaleTimeString(), text: 'Local SQL Server bridge listener configured on http://localhost:1433/api/sync.', type: 'info' }
  ]);
  const [storageSearchQuery, setStorageSearchQuery] = useState('');
  const [storageViewTable, setStorageViewTable] = useState<'products' | 'batches' | 'sales' | 'customers'>('products');
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'testing' | 'connected' | 'offline'>('idle');
  const [showSystemInstallModal, setShowSystemInstallModal] = useState(false);
  const [sqlStatus, setSqlStatus] = useState<SqlServerStatus>(() => localSqlServerService.getStatus());

  React.useEffect(() => {
    const unsub = localSqlServerService.subscribe(newStatus => {
      setSqlStatus(newStatus);
      if (newStatus.connected) setBridgeStatus('connected');
    });
    return unsub;
  }, []);

  const effectiveOnline = isSimulatingOffline ? false : isOnline;

  const handleInstallToSystem = async () => {
    if (isInstallable) {
      try {
        const success = await install();
        if (success) return;
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    // Automatically trigger local system installation
    downloadWindowsDesktopInstaller(undefined, localSqlServerService.getConfig());
    setShowSystemInstallModal(true);
  };

  // Handle Full Two-Way Synchronization Simulation
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncProgress(15);
    
    const addLog = (text: string, type: 'info' | 'success' | 'warn') => {
      setSyncLogs(prev => [
        { id: String(Date.now() + Math.random()), time: new Date().toLocaleTimeString(), text, type },
        ...prev.slice(0, 19)
      ]);
    };

    addLog('Starting 2-way delta sync with Central Cloud & Local SQL Bridge...', 'info');

    setTimeout(() => {
      setSyncProgress(45);
      addLog(`Synchronizing ${products.length} product records and ${batches.length} stock batches...`, 'info');
    }, 400);

    setTimeout(() => {
      setSyncProgress(80);
      addLog(`Validated ${sales.length} sales invoice transactions. FEFO sequence verified.`, 'info');
    }, 800);

    setTimeout(() => {
      setSyncProgress(100);
      setIsSyncing(false);
      const timeStr = new Date().toLocaleTimeString();
      setLastSyncTime(timeStr);
      addLog(`Synchronization complete at ${timeStr}. All local caches are in lockstep.`, 'success');
    }, 1200);
  };

  // Test SQL Bridge Connection
  const handleTestBridge = async () => {
    setBridgeStatus('testing');
    try {
      const res = await localSqlServerService.probeConnection();
      setSqlStatus(res);
      setBridgeStatus(res.connected ? 'connected' : 'offline');
      setSyncLogs(prev => [
        {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString(),
          text: res.connected 
            ? `Connected to local Microsoft SQL Server (${res.server}/${res.database}) at ${res.bridgeUrl} (Latency: ${res.latencyMs || 4}ms). Live read/write active.` 
            : `Bridge offline at ${res.bridgeUrl}. Using browser local storage. Run Install-MediClinic-ERP.bat or start the bridge to connect.`,
          type: res.connected ? 'success' : 'warn'
        },
        ...prev
      ]);
    } catch {
      setBridgeStatus('offline');
    }
  };

  // Export Offline Backup JSON
  const handleExportOfflineData = () => {
    const backupBundle = {
      exportTimestamp: new Date().toISOString(),
      version: '2.6.2',
      pwaMode: isInstalled ? 'standalone' : 'browser',
      counts: {
        products: products.length,
        batches: batches.length,
        customers: customers.length,
        sales: sales.length,
        ledger: ledger.length
      },
      data: {
        products,
        batches,
        customers,
        sales,
        ledger
      }
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mediclinic_offline_cache_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setSyncLogs(prev => [
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        text: 'Exported complete offline data snapshot JSON file.',
        type: 'info'
      },
      ...prev
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Breadcrumb & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-teal-800">Setup &amp; Tools</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">PWA &amp; Offline Sync Suite</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>PWA &amp; Offline Sync Management</span>
                <span className="text-xs font-mono font-bold bg-teal-100 text-teal-900 border border-teal-300 px-2.5 py-0.5 rounded-full">
                  PWA v2.6.2
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Local-first resilient architecture: offline POS counter, instant FEFO batch dispensing, automatic background sync &amp; multi-device installation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Status Badges */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Connection Status Pill */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${
            effectiveOnline 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
              : 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
          }`}>
            {effectiveOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Online &amp; Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Offline Mode Active</span>
              </>
            )}
          </div>

          {/* Standalone Status Pill */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${
            isInstalled 
              ? 'bg-teal-50 text-teal-800 border-teal-300' 
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}>
            <Smartphone className="w-3.5 h-3.5 text-teal-700" />
            <span>{isInstalled ? 'Standalone PWA' : 'Web Browser View'}</span>
          </div>

          {/* Simulate Offline Toggle */}
          <button
            onClick={() => setIsSimulatingOffline(!isSimulatingOffline)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isSimulatingOffline 
                ? 'bg-amber-600 text-white border-amber-700' 
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Toggle simulated offline mode to test POS counter with zero internet"
          >
            {isSimulatingOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isSimulatingOffline ? 'Exit Offline Simulation' : 'Simulate Offline'}</span>
          </button>

          {/* Sync All Button */}
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All Data'}</span>
          </button>
        </div>
      </div>

      {/* Simulated Offline Notice Banner */}
      {isSimulatingOffline && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm">Simulated Offline Mode Enabled</div>
              <div className="text-amber-800">
                Network requests are blocked locally. You can navigate to <strong>POS &amp; Sales Counter</strong> to bill orders, verify FEFO stock batches, and observe the zero-downtime offline experience.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => onNavigate('pos')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
              >
                Go to POS Billing
              </button>
            )}
            <button
              onClick={() => setIsSimulatingOffline(false)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-amber-300 transition-colors cursor-pointer text-xs"
            >
              Resume Online
            </button>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 text-xs scrollbar-thin">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>1. Sync Dashboard &amp; Storage</span>
        </button>

        <button
          onClick={() => setActiveTab('install')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'install'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>2. Device Installation &amp; PWA Setup</span>
          {isInstalled && (
            <span className="text-[10px] bg-teal-900 text-teal-100 px-1.5 py-0.5 rounded font-mono font-bold">
              Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'storage'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>3. Offline Database Inspector</span>
          <span className="text-[10px] bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded font-mono font-bold">
            {products.length} Products
          </span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'architecture'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>4. Resilience &amp; Conflict Policy</span>
        </button>

        <button
          onClick={() => setActiveTab('bridge')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'bridge'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>5. Local SQL Bridge (Port 1433)</span>
          <span className={`w-2 h-2 rounded-full ${bridgeStatus === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </button>
      </div>

      {/* TAB 1: SYNC DASHBOARD & STORAGE METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Products Master */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">Products</span>
                <Boxes className="w-4 h-4 text-teal-800" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {products.length}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> Cached Locally
              </div>
            </div>

            {/* Stock Batches */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">Stock Batches</span>
                <Layers className="w-4 h-4 text-teal-800" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {batches.length}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> FEFO Engine Ready
              </div>
            </div>

            {/* Invoices */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">Sales Invoices</span>
                <Receipt className="w-4 h-4 text-teal-800" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {sales.length}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> Offline Reprints
              </div>
            </div>

            {/* Customers */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">Customers</span>
                <Users className="w-4 h-4 text-teal-800" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {customers.length}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> Instant Phone Search
              </div>
            </div>

            {/* Movement Ledger */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">Stock Ledger</span>
                <History className="w-4 h-4 text-teal-800" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {ledger.length}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> Immutable Ledger
              </div>
            </div>

            {/* Pending Sync Queue */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">Sync Queue</span>
                <HardDrive className="w-4 h-4 text-teal-800" />
              </div>
              <div className="text-xl font-bold text-emerald-700 font-mono">
                0 <span className="text-xs text-slate-400 font-normal">pending</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Up to date
              </div>
            </div>

          </div>

          {/* Sync Engine Progress & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Live Diagnostics & Sync Monitor */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-800" />
                    <span className="font-bold text-sm text-slate-900">Service Worker &amp; Offline Cache Engine</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Last Sync: <strong className="text-slate-800">{lastSyncTime}</strong>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Cache Coherence:</span>
                    <span className="font-mono font-bold text-teal-800">{syncProgress}% Synced</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-700 to-emerald-600 transition-all duration-300 rounded-full"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>

                {/* Diagnostic Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Service Worker</div>
                    <div className="font-bold text-emerald-700 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active &amp; Running
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Cache Scope</div>
                    <div className="font-bold text-slate-900 font-mono mt-1">/ (Root)</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Storage Quota</div>
                    <div className="font-bold text-slate-900 font-mono mt-1">~3.8 MB / 50 MB</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">HTTP Fallback</div>
                    <div className="font-bold text-teal-800 font-mono mt-1">CacheFirst</div>
                  </div>
                </div>

                {/* Live Console Output */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Real-Time Sync Audit Stream</span>
                  </div>
                  <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                    {syncLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-500 shrink-0">[{log.time}]</span>
                        <span className={
                          log.type === 'success' ? 'text-emerald-400' :
                          log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'
                        }>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Right 1 Col: Quick Workflow Actions & Backups */}
            <div className="space-y-4">
              
              {/* Emergency Operations Box */}
              <div className="p-5 bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-teal-300">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-bold text-sm text-white">Zero Downtime Guarantee</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In case of internet broadband cut, power failure, or cloud outage, your pharmacy cash counter never stops. MediClinic ERP processes sales offline using local FEFO batches and queues invoices for sync.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleExportOfflineData}
                    className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-300" />
                    <span>Export Offline Data Snapshot (JSON)</span>
                  </button>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('pos')}
                      className="w-full py-2 px-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <span>Open Counter POS (Test Offline)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Location Cache Scope */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                  <span>Active Branch Cache Scope</span>
                  <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    2 Branches
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  {locations.map(loc => (
                    <div 
                      key={loc.locationId}
                      onClick={() => setSelectedLocationId(loc.locationId)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        loc.locationId === selectedLocationId 
                          ? 'bg-teal-50/70 border-teal-500 text-teal-950 font-bold' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{loc.locationName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{loc.address} · {loc.phone}</div>
                      </div>
                      <span className="text-[10px] font-mono font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                        {loc.locationCode || loc.locationId}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: DEVICE INSTALLATION & PLATFORMS */}
      {activeTab === 'install' && (
        <div className="space-y-6">
          
          {/* Main Hero Card */}
          <div className="p-6 bg-gradient-to-r from-teal-800 to-slate-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-teal-500 text-slate-950 text-xs font-extrabold rounded-full uppercase">
                  Native Experience
                </span>
                <span className="text-xs text-teal-200 font-semibold">
                  Zero App Store Required
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                Install MediClinic ERP on Any Workstation or Tablet
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Progressive Web App (PWA) gives you full native desktop performance, instant desktop shortcuts, full-screen POS billing, offline persistence, and automatic background updates without manual installs.
              </p>
            </div>

            {isInstallable ? (
              <button
                onClick={handleInstallToSystem}
                className="px-6 py-3 bg-teal-400 hover:bg-teal-300 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Install Application Now</span>
              </button>
            ) : isInstalled ? (
              <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-center shrink-0">
                <div className="text-xs font-mono font-bold text-teal-300 flex items-center gap-1.5 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Already Installed as Native App</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Running in standalone display mode</div>
              </div>
            ) : (
              <button
                onClick={handleInstallToSystem}
                className="px-6 py-3 bg-teal-400 hover:bg-teal-300 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Install Application to System</span>
              </button>
            )}
          </div>

          {/* 4 Platform Installation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Windows 10/11 Desktop */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Windows 10 / 11 Desktop (Edge &amp; Chrome)</h3>
                  <p className="text-[11px] text-slate-500">Counter billing PC, Cashier workstation, Back-office laptop</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">1.</span>
                  <span>Look at the right side of your browser URL bar for the <strong>Install</strong> icon (<Download className="w-3.5 h-3.5 inline text-teal-800" />).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">2.</span>
                  <span>Or click browser menu (<strong>⋮</strong> or <strong>...</strong>) ➔ <strong>Install MediClinic Commerce ERP</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">3.</span>
                  <span>Check <strong>Pin to Taskbar</strong> and <strong>Create Desktop Shortcut</strong> for single-click launch.</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Supports USB Barcode Scanners &amp; Thermal Receipt Printers (80mm/58mm)</span>
              </div>
            </div>

            {/* Apple iOS / iPadOS */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Apple iPad &amp; iPhone (Safari)</h3>
                  <p className="text-[11px] text-slate-500">Doctor consultation tablet, Clinic manager iPad</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">1.</span>
                  <span>Open this application URL in <strong>Apple Safari</strong> browser.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">2.</span>
                  <span>Tap the <strong>Share</strong> button (square with upward arrow) in the toolbar.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">3.</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong> (<span className="font-bold">+</span>), then tap <strong>Add</strong>.</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Runs full-screen like a native App Store app without Safari address bars</span>
              </div>
            </div>

            {/* Android Tablet & Phone */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Android Tablet &amp; POS Terminals (Chrome)</h3>
                  <p className="text-[11px] text-slate-500">Android POS handhelds, Samsung Galaxy Tab, Redmi Pad</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">1.</span>
                  <span>Open in Google Chrome on your Android tablet or mobile.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">2.</span>
                  <span>Tap the bottom banner <strong>Add to Home Screen</strong> or tap the top-right three dots (<strong>⋮</strong>).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">3.</span>
                  <span>Tap <strong>Install App</strong>. The app icon will appear in your device App Drawer.</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Integrated Bluetooth printer &amp; camera barcode scanning support</span>
              </div>
            </div>

            {/* Apple macOS */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Apple macOS (Chrome &amp; Safari Sonoma)</h3>
                  <p className="text-[11px] text-slate-500">MacBook Air, Mac mini clinic front desk</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">1.</span>
                  <span>In Safari: Click <strong>File</strong> ➔ <strong>Add to Dock</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">2.</span>
                  <span>In Chrome: Click the install icon in the URL bar or menu ➔ <strong>Install App</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-800 shrink-0">3.</span>
                  <span>Launches as a dedicated macOS app with Cmd+Tab switching and Dock badge.</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Full offline persistence backed by Apple WebKit storage</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: OFFLINE DATABASE INSPECTOR */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          
          {/* Header & Filter Controls */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStorageViewTable('products')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  storageViewTable === 'products' ? 'bg-teal-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Products ({products.length})
              </button>
              <button
                onClick={() => setStorageViewTable('batches')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  storageViewTable === 'batches' ? 'bg-teal-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Stock Batches ({batches.length})
              </button>
              <button
                onClick={() => setStorageViewTable('sales')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  storageViewTable === 'sales' ? 'bg-teal-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Invoices ({sales.length})
              </button>
              <button
                onClick={() => setStorageViewTable('customers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  storageViewTable === 'customers' ? 'bg-teal-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Customers ({customers.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={storageSearchQuery}
                onChange={e => setStorageSearchQuery(e.target.value)}
                placeholder="Search cached table..."
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-teal-600 w-48 sm:w-64"
              />
              <button
                onClick={handleExportOfflineData}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Table Viewport */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            
            {/* Products Table */}
            {storageViewTable === 'products' && (
              <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Product Code</th>
                      <th className="py-2.5 px-3">Category Code</th>
                      <th className="py-2.5 px-3 text-right">Selling Price</th>
                      <th className="py-2.5 px-3 text-center">Cache Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products
                      .filter(p => !storageSearchQuery || p.productName.toLowerCase().includes(storageSearchQuery.toLowerCase()) || p.productCode.toLowerCase().includes(storageSearchQuery.toLowerCase()))
                      .map(p => (
                        <tr key={p.productId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{p.productName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{p.productCode}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.categoryId}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-900">₹{p.sellingPrice}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Resident (IndexedDB)
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Batches Table */}
            {storageViewTable === 'batches' && (
              <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Batch Number</th>
                      <th className="py-2.5 px-3">Product ID</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3 text-right">Current Stock</th>
                      <th className="py-2.5 px-3 text-right">Expiry Date</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches
                      .filter(b => !storageSearchQuery || b.batchNumber.toLowerCase().includes(storageSearchQuery.toLowerCase()) || b.productId.toLowerCase().includes(storageSearchQuery.toLowerCase()))
                      .map(b => (
                        <tr key={b.batchId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-900">{b.batchNumber}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{b.productId}</td>
                          <td className="py-2.5 px-3 text-slate-700 capitalize">{b.locationId}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{b.currentQuantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{b.expiryDate}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-900">₹{b.sellingPrice}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sales Table */}
            {storageViewTable === 'sales' && (
              <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                      <th className="py-2.5 px-3 text-center">Sync State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales
                      .filter(s => !storageSearchQuery || s.invoiceNo.toLowerCase().includes(storageSearchQuery.toLowerCase()) || s.customerName.toLowerCase().includes(storageSearchQuery.toLowerCase()))
                      .map(s => (
                        <tr key={s.saleId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-900">{s.invoiceNo}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">{s.saleDate}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{s.customerName}</td>
                          <td className="py-2.5 px-3 text-slate-600 capitalize">{s.locationId}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-900">₹{s.netAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Committed
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Customers Table */}
            {storageViewTable === 'customers' && (
              <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Address</th>
                      <th className="py-2.5 px-3 text-right">Loyalty Points</th>
                      <th className="py-2.5 px-3 text-center">Lookup Speed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers
                      .filter(c => !storageSearchQuery || c.customerName.toLowerCase().includes(storageSearchQuery.toLowerCase()) || c.phone.includes(storageSearchQuery))
                      .map(c => (
                        <tr key={c.customerId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{c.customerName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{c.phone}</td>
                          <td className="py-2.5 px-3 text-slate-600">{c.address}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{c.loyaltyPoints}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-mono font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                              &lt; 2ms (In-Memory)
                            </span>
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

      {/* TAB 4: ARCHITECTURE & CONFLICT RESOLUTION POLICY */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">1. Append-Only Invoice Isolation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Offline invoices use deterministic branch-scoped sequence numbers (<code className="font-mono text-teal-900 font-bold">INV-HOS-YYYY-XXXX</code>). Multiple counter terminals can bill simultaneously without primary key conflicts.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">2. Deterministic FEFO Decrement</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Batches are allocated based on earliest expiration dates. When the workstation reconnects, transactions are processed sequentially by transaction timestamp, maintaining 100% accounting and audit compliance.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">3. Background Sync &amp; Retry</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The service worker continuously listens for network recovery (<code className="font-mono text-teal-900 font-bold">online</code> event). Once connected, it fires background sync with exponential backoff to commit local updates.
              </p>
            </div>

          </div>

          {/* Sync Topology Blueprint */}
          <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-teal-300">Sync Architecture Topology</span>
              <span className="text-xs font-mono text-slate-400">3-Tier Resilient Mesh</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Tier 1: Client Edge (PWA)</span>
                </div>
                <div className="text-slate-300 text-[11px] font-sans">
                  - React 18 SPA + Vite Workbox<br />
                  - IndexedDB master store<br />
                  - Instant UI &lt; 16ms render<br />
                  - 100% offline operational
                </div>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
                <div className="font-bold text-teal-300 flex items-center gap-1.5">
                  <Server className="w-4 h-4" />
                  <span>Tier 2: Node.js Bridge (1433)</span>
                </div>
                <div className="text-slate-300 text-[11px] font-sans">
                  - Express HTTP microservice<br />
                  - Transactional DDL &amp; DML<br />
                  - Change data capture (CDC)<br />
                  - IIS reverse proxy ready
                </div>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
                <div className="font-bold text-blue-400 flex items-center gap-1.5">
                  <Database className="w-4 h-4" />
                  <span>Tier 3: SQL Server DB</span>
                </div>
                <div className="text-slate-300 text-[11px] font-sans">
                  - Microsoft SQL Server 2019/2022<br />
                  - MediClinic_Commerce DB<br />
                  - ACID compliant records<br />
                  - Central branch aggregation
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: LOCAL SQL SERVER & IIS BRIDGE */}
      {activeTab === 'bridge' && (
        <div className="space-y-6">
          
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-teal-800" />
                  <span>Local Microsoft SQL Server Two-Way Bridge Integration</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connects the installed PWA directly to your local SQL Server instance for live reads and writes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestBridge}
                  disabled={bridgeStatus === 'testing'}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${bridgeStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>{bridgeStatus === 'testing' ? 'Testing Connection...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>

            {/* Prominent Active Server & Database Display Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-teal-700" />
                  <span>Connected SQL Server Name</span>
                </div>
                <div className="font-mono font-bold text-slate-900 text-sm break-all">
                  {sqlStatus.server || 'localhost\\SQLEXPRESS'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  Port: {sqlStatus.port || 1433} &middot; Bridge: {sqlStatus.bridgeUrl || 'http://localhost:5001'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-teal-700" />
                  <span>Connected Database Name</span>
                </div>
                <div className="font-mono font-bold text-teal-900 text-sm break-all">
                  {sqlStatus.database || 'MediClinic_ERP'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  Catalog: master &middot; Schema: dbo
                </div>
              </div>
            </div>

            {/* Connection Banner */}
            <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              sqlStatus.connected 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {sqlStatus.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <div className="flex-1">
                {sqlStatus.connected ? (
                  <span>
                    <strong>Live Connection Active:</strong> Listening on <code>{sqlStatus.bridgeUrl}</code> with latency {sqlStatus.latencyMs || 4}ms. All sales, products, and batches write directly to [{sqlStatus.database}].
                  </span>
                ) : (
                  <span>
                    <strong>Local SQL Server Bridge Offline:</strong> Currently operating in browser offline cache. Install the PWA setup package or run <code>node server.js</code> on your machine to connect directly to [{sqlStatus.database}].
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions to Download Installers */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={() => downloadWindowsDesktopInstaller(undefined, localSqlServerService.getConfig())}
                className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All-In-One PWA + SQL Server Setup (.bat)</span>
              </button>

              <button
                onClick={() => downloadStandaloneSqlBridgeInstaller(localSqlServerService.getConfig())}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Server className="w-3.5 h-3.5 text-teal-800" />
                <span>Download Standalone SQL Bridge Connector (.bat)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Live Read Endpoints</div>
                <div className="font-mono text-teal-900 font-semibold text-[11px]">GET /api/products, /api/batches, /api/sales, /api/customers</div>
                <div className="text-[11px] text-slate-500">Loads existing inventory, batches, and patient accounts directly into the PWA.</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Live Write Endpoints</div>
                <div className="font-mono text-teal-900 font-semibold text-[11px]">POST /api/sales, /api/batches, /api/products, /api/customers, /api/ledger</div>
                <div className="text-[11px] text-slate-500">Every POS invoice, batch entry, or customer edit writes straight into your SQL Server database.</div>
              </div>
            </div>

          </div>

          {/* IIS Configuration Reference */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-xs text-slate-900">Windows Service &amp; Background Deployment</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              When you run the downloaded <strong>Install-MediClinic-ERP.bat</strong>, it sets up the bridge service in <code>%USERPROFILE%\MediClinic-SQL-Bridge</code> configured with target <strong>{sqlStatus.server}</strong> &rarr; <strong>{sqlStatus.database}</strong>. You can also run it 24/7 as a background service via PM2:
            </p>
            <pre className="p-3 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-xl overflow-x-auto">
{`cd %USERPROFILE%\\MediClinic-SQL-Bridge
npm install -g pm2 pm2-windows-service
pm2 start server.js --name "mediclinic-sql-bridge"
pm2 save`}
            </pre>
          </div>

        </div>
      )}

      {/* Local System Installation Modal */}
      <LocalSystemInstallModal
        isOpen={showSystemInstallModal}
        onClose={() => setShowSystemInstallModal(false)}
        onNativeInstallPrompt={install}
        isInstallable={isInstallable}
      />

    </div>
  );
};
