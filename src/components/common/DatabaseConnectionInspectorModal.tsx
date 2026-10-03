import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Settings, 
  Terminal, 
  ShieldCheck, 
  Layers, 
  Zap, 
  HardDrive,
  Download
} from 'lucide-react';
import { localSqlServerService, SqlServerStatus, SqlServerConfig } from '../../services/localSqlService';
import { downloadStandaloneSqlBridgeInstaller, downloadWindowsDesktopInstaller } from '../../utils/pwaInstallHelper';

interface DatabaseConnectionInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSqlServerManager?: (tab?: 'schema' | 'connection' | 'migrations' | 'notifications' | 'sync' | 'cloud') => void;
}

export const DatabaseConnectionInspectorModal: React.FC<DatabaseConnectionInspectorModalProps> = ({
  isOpen,
  onClose,
  onOpenSqlServerManager
}) => {
  const [status, setStatus] = useState<SqlServerStatus>(() => localSqlServerService.getStatus());
  const [config, setConfig] = useState<SqlServerConfig>(() => localSqlServerService.getConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editServer, setEditServer] = useState(config.server);
  const [editDatabase, setEditDatabase] = useState(config.database);
  const [editPort, setEditPort] = useState(config.port);
  const [editBridgeUrl, setEditBridgeUrl] = useState(config.bridgeUrl);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = localSqlServerService.subscribe(newStatus => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await localSqlServerService.probeConnection();
      setStatus(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    localSqlServerService.saveConfig({
      server: editServer.trim() || 'localhost\\SQLEXPRESS',
      database: editDatabase.trim() || 'MediClinic_ERP',
      port: Number(editPort) || 1433,
      bridgeUrl: editBridgeUrl.trim() || 'http://localhost:5001'
    });
    setConfig(localSqlServerService.getConfig());
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    handleTestConnection();
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs font-bold ${
              status.connected ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Database &amp; SQL Server Connection
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  status.connected 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {status.connected ? 'Live Read / Write' : 'Local Resilient Cache'}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                Inspect which database and server are connected to this MediClinic application.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto">
          
          {/* Answer to Question: Which Database Name and Server Name is Connected */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Server Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl relative group">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-teal-700" />
                  Connected Server Name
                </span>
                <button
                  onClick={() => copyToClipboard(status.server, 'server')}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  title="Copy Server Name"
                >
                  {copiedField === 'server' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="font-mono font-bold text-sm sm:text-base text-slate-900 break-all select-all">
                {status.server || 'localhost\\SQLEXPRESS'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                Port: {status.port || 1433} &middot; Bridge: {status.bridgeUrl || 'http://localhost:5001'}
              </div>
            </div>

            {/* Database Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl relative group">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-teal-700" />
                  Connected Database Name
                </span>
                <button
                  onClick={() => copyToClipboard(status.database, 'database')}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  title="Copy Database Name"
                >
                  {copiedField === 'database' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="font-mono font-bold text-sm sm:text-base text-teal-900 break-all select-all">
                {status.database || 'MediClinic_ERP'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                Catalog: master &middot; Schema: dbo
              </div>
            </div>

          </div>

          {/* Connection Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
            status.connected 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-3">
              {status.connected ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                  <span>
                    {status.connected 
                      ? 'Live SQL Server Connection Active (Read & Write)' 
                      : 'Local SQL Server Bridge Offline (Resilient Browser Storage)'}
                  </span>
                  {status.latencyMs !== undefined && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold">
                      {status.latencyMs} ms
                    </span>
                  )}
                </div>
                <div className="text-[11px] mt-1 opacity-90 leading-relaxed">
                  {status.connected ? (
                    <>
                      All operations (creating POS invoices, dispensing medication, adding products, and registering patients) 
                      are <strong>read from and written directly</strong> to your local database <strong>[{status.database}]</strong> on <strong>[{status.server}]</strong> in real time.
                    </>
                  ) : (
                    <>
                      The application is storing all records in resilient client storage. 
                      To read and write directly to your local SQL Server, run the <strong>MediClinic Local SQL Bridge</strong> on your PC at <code>{status.bridgeUrl}</code>.
                    </>
                  )}
                </div>
                <div className="text-[10px] opacity-75 mt-1.5 font-mono">
                  Engine: {status.version || 'Microsoft SQL Server 2022 Express Edition'} &middot; Verified at {status.lastChecked}
                </div>
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Test connection to local SQL server now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-teal-600' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Now'}</span>
            </button>
          </div>

          {/* Quick Edit Config / Switch Database & Server Form */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span>Configure Server &amp; Database Target</span>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[11px] font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer"
              >
                {isEditing ? 'Cancel Edit' : 'Edit Connection Target'}
              </button>
            </div>

            {savedSuccess && (
              <div className="p-2 mb-2 bg-emerald-100 text-emerald-900 text-[11px] rounded-lg font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Connection target saved and re-probed!
              </div>
            )}

            {isEditing ? (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      SQL Server Instance Name or IP
                    </label>
                    <input
                      type="text"
                      value={editServer}
                      onChange={e => setEditServer(e.target.value)}
                      placeholder="e.g. localhost\SQLEXPRESS or 192.168.1.10"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-teal-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Database Name
                    </label>
                    <input
                      type="text"
                      value={editDatabase}
                      onChange={e => setEditDatabase(e.target.value)}
                      placeholder="e.g. MediClinic_ERP"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-teal-600 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      SQL Port
                    </label>
                    <input
                      type="number"
                      value={editPort}
                      onChange={e => setEditPort(Number(e.target.value))}
                      placeholder="1433"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-teal-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Local SQL Bridge URL
                    </label>
                    <input
                      type="text"
                      value={editBridgeUrl}
                      onChange={e => setEditBridgeUrl(e.target.value)}
                      placeholder="http://localhost:5001"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-teal-600 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs cursor-pointer"
                  >
                    Save &amp; Reconnect
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-600">
                Current target: <strong>{config.server}</strong> &rarr; Database: <strong>{config.database}</strong> (Port: {config.port}, Bridge: {config.bridgeUrl}).
              </p>
            )}
          </div>

          {/* Tables Linked in SQL Server */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
            <div className="font-bold text-xs text-slate-900 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-700" />
                Connected Database Tables &amp; Read/Write Capabilities
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Schema: dbo</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-slate-800">dbo.Products</div>
                <div className="text-[10px] text-emerald-700 font-medium">Live Read &amp; Write</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-slate-800">dbo.StockBatches</div>
                <div className="text-[10px] text-emerald-700 font-medium">FEFO Read &amp; Write</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-slate-800">dbo.SalesHeader</div>
                <div className="text-[10px] text-emerald-700 font-medium">Direct Invoicing Write</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-slate-800">dbo.SalesDetails</div>
                <div className="text-[10px] text-emerald-700 font-medium">Transactional Lines</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-slate-800">dbo.Customers</div>
                <div className="text-[10px] text-emerald-700 font-medium">Patients &amp; Balance</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-slate-800">dbo.StockMovementLedger</div>
                <div className="text-[10px] text-emerald-700 font-medium">Immutable Audit Trail</div>
              </div>
            </div>
          </div>

          {/* How PWA Setup Connects to Local SQL Database */}
          <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl space-y-2">
            <div className="font-bold text-xs text-teal-950 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-teal-700" />
              How the PWA Setup Reads &amp; Writes from Your Local SQL Server
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-teal-900 leading-relaxed">
              <li>
                <strong>PWA Standalone App:</strong> When installed on your Windows PC, MediClinic ERP runs as a native desktop application with offline resilience.
              </li>
              <li>
                <strong>Local SQL Bridge Connector:</strong> The companion script (running on <code>http://localhost:5001</code>) connects securely to your local Microsoft SQL Server (TCP port 1433) using your credentials.
              </li>
              <li>
                <strong>Automatic Two-Way Synchronization:</strong> Whenever the app opens, it reads products, batches, and sales from <code>[{status.database}]</code>. When you bill an invoice or receive stock, it immediately executes SQL write transactions.
              </li>
            </ol>
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => downloadStandaloneSqlBridgeInstaller(config)}
                className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download SQL Server Connector Setup (.bat)</span>
              </button>
              {onOpenSqlServerManager && (
                <button
                  onClick={() => {
                    onOpenSqlServerManager('schema');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-teal-300 hover:bg-teal-100 text-teal-900 font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open Full SQL Server Manager &amp; DDL Scripts</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Active: {status.server} &middot; {status.database}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
