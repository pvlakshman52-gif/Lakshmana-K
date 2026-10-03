import React, { useState, useEffect, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  Terminal, 
  Play, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Server, 
  Database, 
  Search, 
  Table, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileCode, 
  Clock, 
  ArrowRight,
  ExternalLink,
  Code2,
  Sliders,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { 
  localSqlServerService, 
  SqlServerStatus, 
  SqlServerConfig, 
  QueryExecutionResult,
  DEFAULT_USER_CONN_STRING,
  parseSqlServerConnectionString
} from '../../services/localSqlService';
import { downloadStandaloneSqlBridgeInstaller } from '../../utils/pwaInstallHelper';

interface SqlQueryStudioViewProps {
  onNavigate?: (tab: string) => void;
}

const PRESET_QUERIES = [
  {
    id: 'server_info',
    title: 'Server & DB Info',
    icon: Server,
    description: 'Fetch Microsoft SQL Server version, catalog name, and server time',
    sql: 'SELECT @@VERSION AS SqlVersion, DB_NAME() AS CurrentDatabase, GETDATE() AS ServerTime;'
  },
  {
    id: 'all_databases',
    title: 'List All Databases',
    icon: Database,
    description: 'Fetch all databases installed on DESKTOP-JN61NSF\\SQLEXPRESS',
    sql: 'SELECT database_id, name, state_desc, recovery_model_desc, create_date FROM sys.databases ORDER BY name ASC;'
  },
  {
    id: 'all_tables',
    title: 'List All Tables',
    icon: Table,
    description: 'Fetch all user tables and schemas in the connected database',
    sql: "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME ASC;"
  },
  {
    id: 'products',
    title: 'Fetch Products',
    icon: FileCode,
    description: 'Fetch active medicines, SKUs, cost prices, and selling rates',
    sql: 'SELECT TOP 50 ProductId, ProductCode, ProductName, CategoryId, CostPrice, SellingPrice, ReorderLevel, VolumeSize FROM dbo.Products WHERE IsActive = 1 ORDER BY ProductName ASC;'
  },
  {
    id: 'stock_batches',
    title: 'Fetch Stock Batches',
    icon: Sliders,
    description: 'Fetch active stock batches sorted by earliest expiry (FEFO)',
    sql: 'SELECT TOP 50 BatchId, ProductId, LocationId, BatchNumber, ExpiryDate, CurrentQuantity, CostPrice, SellingPrice FROM dbo.StockBatches WHERE CurrentQuantity > 0 ORDER BY ExpiryDate ASC;'
  },
  {
    id: 'sales_invoices',
    title: 'Fetch Sales Invoices',
    icon: Sparkles,
    description: 'Fetch recent billing transactions, payment modes, and amounts',
    sql: 'SELECT TOP 50 SaleId, InvoiceNo, CustomerName, CustomerPhone, PaymentMode, GrossAmount, NetAmount, SaleDate, CreatedBy FROM dbo.SalesHeader ORDER BY CreatedDate DESC;'
  },
  {
    id: 'customers',
    title: 'Fetch Patients / Customers',
    icon: Table,
    description: 'Fetch registered patient profiles, contact numbers, and balances',
    sql: 'SELECT TOP 50 CustomerId, FullName, Phone, Email, Balance, CreatedDate FROM dbo.Customers ORDER BY FullName ASC;'
  },
  {
    id: 'movement_ledger',
    title: 'Fetch Stock Movement Ledger',
    icon: Clock,
    description: 'Fetch chronological inventory audit entries and stock deltas',
    sql: 'SELECT TOP 50 LedgerId, ProductId, BatchId, MovementType, QuantityDelta, BalanceAfter, ReferenceDocId, Timestamp FROM dbo.StockMovementLedger ORDER BY Timestamp DESC;'
  }
];

export const SqlQueryStudioView: React.FC<SqlQueryStudioViewProps> = ({ onNavigate }) => {
  const { products, batches, sales, customers, ledger } = useClinic();
  
  const [status, setStatus] = useState<SqlServerStatus>(() => localSqlServerService.getStatus());
  const [config, setConfig] = useState<SqlServerConfig>(() => localSqlServerService.getConfig());
  
  const [queryText, setQueryText] = useState<string>(PRESET_QUERIES[3].sql); // Default: Fetch Products
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryExecutionResult | null>(null);
  const [resultFilter, setResultFilter] = useState<string>('');
  const [copiedData, setCopiedData] = useState<string | null>(null);
  
  const [showConnStringModal, setShowConnStringModal] = useState<boolean>(false);
  const [connStringInput, setConnStringInput] = useState<string>(config.rawConnectionString || DEFAULT_USER_CONN_STRING);
  const [queryHistory, setQueryHistory] = useState<string[]>([
    PRESET_QUERIES[3].sql,
    PRESET_QUERIES[0].sql,
    PRESET_QUERIES[4].sql
  ]);

  useEffect(() => {
    const unsub = localSqlServerService.subscribe(newStatus => {
      setStatus(newStatus);
      setConfig(localSqlServerService.getConfig());
    });
    return unsub;
  }, []);

  // Auto-execute default query on initial load so the screen immediately displays live data
  useEffect(() => {
    handleRunQuery(PRESET_QUERIES[3].sql);
  }, []);

  const handleRunQuery = async (sqlToRun?: string) => {
    const sql = (sqlToRun !== undefined ? sqlToRun : queryText).trim();
    if (!sql) return;

    setIsExecuting(true);
    try {
      const result = await localSqlServerService.executeQuery(sql, {
        products,
        batches,
        sales,
        customers,
        ledger
      });
      setQueryResult(result);

      // Record to history if new
      setQueryHistory(prev => {
        const filtered = prev.filter(q => q !== sql);
        return [sql, ...filtered].slice(0, 10);
      });
    } catch (err: any) {
      setQueryResult({
        success: false,
        query: sql,
        error: err?.message || 'Query execution failed.',
        latencyMs: 5,
        timestamp: new Date().toLocaleTimeString(),
        targetServer: status.server,
        targetDatabase: status.database,
        isSimulated: true
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectPreset = (sql: string) => {
    setQueryText(sql);
    handleRunQuery(sql);
  };

  const handleApplyConnectionString = () => {
    const trimmed = connStringInput.trim();
    if (!trimmed) return;
    localSqlServerService.applyConnectionString(trimmed);
    setConfig(localSqlServerService.getConfig());
    setShowConnStringModal(false);
    handleRunQuery();
  };

  // Filtered rows in results
  const filteredRecords = useMemo(() => {
    if (!queryResult || !queryResult.recordset) return [];
    if (!resultFilter.trim()) return queryResult.recordset;
    const q = resultFilter.toLowerCase();
    return queryResult.recordset.filter(row => {
      return Object.values(row).some(val => 
        String(val ?? '').toLowerCase().includes(q)
      );
    });
  }, [queryResult, resultFilter]);

  // Export to CSV
  const handleExportCsv = () => {
    if (!queryResult || !queryResult.recordset || queryResult.recordset.length === 0) return;
    const cols = queryResult.columns || Object.keys(queryResult.recordset[0] || {});
    const header = cols.join(',');
    const rows = queryResult.recordset.map(r => 
      cols.map(c => {
        const val = r[c];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );
    const csvContent = [header, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SQL_Query_Results_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy as JSON
  const handleCopyJson = () => {
    if (!queryResult || !queryResult.recordset) return;
    navigator.clipboard.writeText(JSON.stringify(queryResult.recordset, null, 2));
    setCopiedData('json');
    setTimeout(() => setCopiedData(null), 2000);
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* Top Banner & Context */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>SQL Query Studio &amp; Data Fetcher</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  status.connected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                }`}>
                  {status.connected ? 'Live SQL Server' : 'Local Data Engine'}
                </span>
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Execute any custom T-SQL query on the screen and fetch real-time records from your database.
              </p>
            </div>
          </div>
        </div>

        {/* Server & Database Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center gap-1.5 font-mono">
            <Server className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">Server:</span>
            <span className="font-bold text-white">{status.server || 'DESKTOP-JN61NSF\\SQLEXPRESS'}</span>
          </div>

          <div className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center gap-1.5 font-mono">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">DB:</span>
            <span className="font-bold text-teal-300">{status.database || 'MediClinic_ERP'}</span>
          </div>

          <button
            onClick={() => setShowConnStringModal(true)}
            className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Inspect or change active connection string"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Connection String</span>
          </button>
        </div>
      </div>

      {/* Active Connection String Strip */}
      <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="px-2 py-0.5 bg-teal-800 text-white rounded-md font-mono text-[10px] font-bold shrink-0">
            ACTIVE CONNECTION
          </span>
          <code className="text-slate-700 font-mono text-[11px] truncate select-all">
            {config.rawConnectionString || DEFAULT_USER_CONN_STRING}
          </code>
        </div>
        <button
          onClick={() => setShowConnStringModal(true)}
          className="text-teal-800 hover:text-teal-950 font-bold text-[11px] underline shrink-0 cursor-pointer text-left"
        >
          Edit / Paste String
        </button>
      </div>

      {/* Preset Queries Quick-Select Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            Quick Query Presets (Click any to run immediately)
          </span>
          <span className="text-[11px] text-slate-500 font-normal">
            Or write your own SQL statement below
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_QUERIES.map(preset => {
            const Icon = preset.icon;
            const isSelected = queryText.trim() === preset.sql.trim();
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.sql)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                  isSelected
                    ? 'bg-teal-50 border-teal-500 text-teal-950 shadow-xs ring-1 ring-teal-500'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  isSelected ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-xs truncate">{preset.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{preset.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SQL Query Editor Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Editor Toolbar */}
        <div className="p-3 bg-slate-900 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-teal-400" />
            <span className="font-mono font-bold text-slate-200">T-SQL Query Console</span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              (Press Ctrl + Enter to Execute)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Query History Dropdown */}
            {queryHistory.length > 0 && (
              <select
                onChange={e => {
                  if (e.target.value) {
                    setQueryText(e.target.value);
                  }
                }}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono cursor-pointer"
                title="Recent queries"
              >
                <option value="">Recent Queries ({queryHistory.length})</option>
                {queryHistory.map((q, idx) => (
                  <option key={idx} value={q}>
                    {q.slice(0, 45)}...
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setQueryText('')}
              className="px-2.5 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-[11px]"
            >
              Clear
            </button>

            {/* Execute Button */}
            <button
              onClick={() => handleRunQuery()}
              disabled={isExecuting || !queryText.trim()}
              className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 text-xs"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-spin' : ''}`} />
              <span>{isExecuting ? 'Executing...' : 'Execute Query'}</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRunQuery();
              }
            }}
            placeholder="Type any T-SQL statement, e.g. SELECT TOP 50 * FROM dbo.Products WHERE CostPrice > 20 ORDER BY SellingPrice DESC;"
            rows={4}
            className="w-full p-4 font-mono text-xs sm:text-sm bg-slate-950 text-emerald-400 focus:outline-none resize-y selection:bg-teal-800 selection:text-white"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        
        {/* Results Header Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Table className="w-4 h-4 text-teal-800" />
              <span>Query Execution Output</span>
            </div>

            {queryResult && (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                  queryResult.success
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {queryResult.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {queryResult.success ? 'SUCCESS (200 OK)' : 'QUERY ERROR'}
                </span>

                <span className="text-[11px] text-slate-500 font-mono">
                  {filteredRecords.length} of {queryResult.recordset?.length || 0} rows &middot; {queryResult.latencyMs}ms
                </span>

                {queryResult.isSimulated && (
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-[10px] font-bold">
                    Local Cache Mirror
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Search in Results & Export */}
          {queryResult?.success && queryResult.recordset && queryResult.recordset.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={resultFilter}
                  onChange={e => setResultFilter(e.target.value)}
                  placeholder="Filter rows..."
                  className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-teal-600 w-36 sm:w-44"
                />
              </div>

              <button
                onClick={handleExportCsv}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Export results table to CSV spreadsheet"
              >
                <Download className="w-3.5 h-3.5 text-teal-800" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                onClick={handleCopyJson}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Copy all results as formatted JSON"
              >
                {copiedData === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Copy JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Informative Note when using simulated bridge */}
        {queryResult?.isSimulated && (
          <div className="px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-200 text-teal-950 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                Query executed on local database mirror for <strong>{status.server}</strong>. To stream raw queries directly from your SQL Server disk, run the 1-click connector bridge.
              </span>
            </div>
            <button
              onClick={() => downloadStandaloneSqlBridgeInstaller(config)}
              className="px-2.5 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer shadow-xs"
            >
              Download Connector (.bat)
            </button>
          </div>
        )}

        {/* Results Body: Data Table / Error Display / Empty State */}
        <div className="overflow-x-auto max-h-[520px] scrollbar-thin">
          {queryResult?.error ? (
            <div className="p-6 bg-rose-50 text-rose-900 space-y-2">
              <div className="font-bold flex items-center gap-2 text-sm text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>SQL Server Execution Error</span>
              </div>
              <pre className="p-3 bg-white border border-rose-200 rounded-xl font-mono text-xs overflow-x-auto text-rose-950">
                {queryResult.error}
              </pre>
              <div className="text-xs text-rose-700">
                Check column and table names in your query. You can click on any preset above to load a verified valid query.
              </div>
            </div>
          ) : filteredRecords.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-bold text-slate-400 w-12 text-center">#</th>
                  {(queryResult?.columns || Object.keys(filteredRecords[0] || {})).map(col => (
                    <th key={col} className="py-2.5 px-3 font-bold text-slate-800 uppercase tracking-wider text-[11px] whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredRecords.map((row, idx) => (
                  <tr key={idx} className="hover:bg-teal-50/50 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 select-none text-[10px]">
                      {idx + 1}
                    </td>
                    {(queryResult?.columns || Object.keys(row)).map(col => {
                      const val = row[col];
                      const isNumber = typeof val === 'number';
                      const isNull = val === null || val === undefined;
                      return (
                        <td key={col} className={`py-2 px-3 whitespace-nowrap ${isNumber ? 'text-teal-900 font-bold' : 'text-slate-800'}`}>
                          {isNull ? (
                            <span className="text-slate-300 italic">NULL</span>
                          ) : typeof val === 'boolean' ? (
                            <span className={val ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>{val ? 'TRUE' : 'FALSE'}</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Table className="w-8 h-8 mx-auto text-slate-300" />
              <div className="font-bold text-sm text-slate-600">No Records Found</div>
              <div className="text-xs text-slate-500">
                The query returned 0 rows or your filter matched no records. Click "Execute Query" or choose a preset above.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Edit / Paste Connection String Modal */}
      {showConnStringModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
            
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Configure SQL Server Connection String
                </h3>
              </div>
              <button
                onClick={() => setShowConnStringModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="text-slate-600">
                Paste your connection string from SQL Server Management Studio (SSMS), ADO.NET, or config. The app will auto-parse the server instance, database, and authentication mode:
              </p>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Full Connection String:
                </label>
                <textarea
                  value={connStringInput}
                  onChange={e => setConnStringInput(e.target.value)}
                  rows={4}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-teal-600"
                  placeholder="Data Source=DESKTOP-JN61NSF\SQLEXPRESS;Integrated Security=True;..."
                />
              </div>

              {/* Parsed Preview */}
              {connStringInput && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="font-bold text-slate-800 font-sans text-xs mb-1">Parsed Parameters:</div>
                  <div>Server: <strong className="text-slate-900">{parseSqlServerConnectionString(connStringInput).server || 'DESKTOP-JN61NSF\\SQLEXPRESS'}</strong></div>
                  <div>Database: <strong className="text-teal-900">{parseSqlServerConnectionString(connStringInput).database || 'MediClinic_ERP'}</strong></div>
                  <div>Auth: <strong className="text-slate-900">{parseSqlServerConnectionString(connStringInput).authType || 'WINDOWS_AUTH'}</strong></div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowConnStringModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyConnectionString}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-xs cursor-pointer"
                >
                  Save &amp; Apply Connection
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
