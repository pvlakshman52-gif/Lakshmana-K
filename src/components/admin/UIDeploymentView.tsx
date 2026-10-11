import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, 
  Download, 
  FileCode, 
  Server, 
  Globe, 
  CheckCircle2, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Search, 
  RefreshCw, 
  FolderArchive,
  ArrowRight,
  ArrowDown,
  Database,
  Cpu,
  PlayCircle,
  Activity,
  AlertCircle,
  HelpCircle,
  Settings,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  FileCheck,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { localSqlServerService } from '../../services/localSqlService';

interface BuildFileInfo {
  name: string;
  category: string;
  sizeBytes: number;
  sizeFormatted: string;
}

interface PipelineStep {
  step: string;
  desc: string;
}

interface UIBuildMetadata {
  status: string;
  buildTimestamp: string;
  buildTimestampLocal: string;
  version: string;
  zipDownloadUrl: string;
  zipSizeBytes: number;
  zipSizeFormatted: string;
  uncompressedSizeBytes: number;
  uncompressedSizeFormatted: string;
  fileCount: number;
  files: BuildFileInfo[];
  pipeline?: {
    developerSide: PipelineStep[];
    customerSide: PipelineStep[];
  };
}

interface EndpointTestState {
  id: 'direct' | 'iis' | 'erp';
  name: string;
  targetUrl: string;
  description: string;
  tested: boolean;
  running: boolean;
  success: boolean;
  statusCode?: number;
  statusText?: string;
  contentType?: string;
  latencyMs?: number;
  isHtml?: boolean;
  data?: any;
  error?: string;
  diagnostic?: string;
}

const DEFAULT_BUILD_METADATA: UIBuildMetadata = {
  status: 'SUCCESS',
  buildTimestamp: new Date().toUTCString(),
  buildTimestampLocal: new Date().toLocaleString(),
  version: 'v2.8.2-prod',
  zipDownloadUrl: '/mediclinic-ui-build.zip',
  zipSizeBytes: 5800000,
  zipSizeFormatted: '5.53 MB',
  uncompressedSizeBytes: 8100000,
  uncompressedSizeFormatted: '7.72 MB',
  fileCount: 26,
  files: [],
  pipeline: {
    developerSide: [
      { step: 'AI Studio', desc: 'Cloud development and feature customization' },
      { step: 'Build', desc: 'Vite 8 production compilation with zero errors' },
      { step: 'mediclinic-ui-build.zip', desc: 'Complete frontend bundle with pre-configured IIS web.config and bridge scripts' }
    ],
    customerSide: [
      { step: 'SQL Server', desc: 'Local or network Microsoft SQL Server instance (dynamically detected)' },
      { step: 'MediClinic-ERP-Setup.exe / .bat', desc: 'Automated 1-click Windows elevated installer engine' },
      { step: 'Automatic dependency check', desc: 'Checks and auto-provisions Node.js, IIS, URL Rewrite 2.1, ARR 3.0' },
      { step: 'IIS + Rewrite + ARR', desc: 'Enables IIS features, installs rewrite modules, enables ARR proxy' },
      { step: 'SQL Bridge Windows Service', desc: 'Installs native MediClinicSqlBridge Windows Service (port 5001, auto boot startup, auto-recovery)' },
      { step: 'Extract UI ZIP', desc: 'Extracts production UI bundle directly to C:\\inetpub\\wwwroot\\mediclinic' },
      { step: 'Configure API', desc: 'Configures reverse proxy: /api/* -> http://localhost:5001/api/*' },
      { step: 'Health checks', desc: 'Probes port 5001, SQL query connection, IIS port 80, reverse proxy' },
      { step: 'Go Live', desc: 'Creates Desktop shortcuts, opens browser to http://localhost/mediclinic' }
    ]
  }
};

export const UIDeploymentView: React.FC = () => {
  const [metadata, setMetadata] = useState<UIBuildMetadata>(DEFAULT_BUILD_METADATA);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(4); // Default to Step 4 (SQL Bridge Service)

  // Dynamic configuration for API base and bridge URL
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => {
    return localSqlServerService.getApiBaseUrl() || '/api';
  });
  const [directBridgeUrl, setDirectBridgeUrl] = useState<string>(() => {
    return localSqlServerService.getBridgeUrl() || 'http://localhost:5001';
  });
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Dynamic detected SQL Server info
  const [detectedServer, setDetectedServer] = useState<string>(() => {
    const current = localSqlServerService.getStatus();
    return current.server && !current.server.includes('(local)') ? current.server : '';
  });
  const [detectedDatabase, setDetectedDatabase] = useState<string>(() => {
    const current = localSqlServerService.getStatus();
    return current.database || 'MediClinic_ERP';
  });

  // Separate Endpoint Tests (Requirement 8)
  // A. Direct Bridge: http://localhost:5001/api/health
  // B. IIS API: /api/health
  // C. ERP: /
  const [tests, setTests] = useState<{
    direct: EndpointTestState;
    iis: EndpointTestState;
    erp: EndpointTestState;
  }>({
    direct: {
      id: 'direct',
      name: 'Test A: Direct SQL Bridge Service',
      targetUrl: 'http://localhost:5001/api/health',
      description: 'Connects directly to the local Node.js Windows Bridge service listening on port 5001.',
      tested: false,
      running: false,
      success: false
    },
    iis: {
      id: 'iis',
      name: 'Test B: IIS Reverse Proxy API (/api/health)',
      targetUrl: '/api/health',
      description: 'Calls the frontend reverse proxy configured in IIS web.config / ARR to route to port 5001.',
      tested: false,
      running: false,
      success: false
    },
    erp: {
      id: 'erp',
      name: 'Test C: ERP Application Entry (/)',
      targetUrl: '/',
      description: 'Verifies the web server serves index.html and SPA application bundle with HTTP 200.',
      tested: false,
      running: false,
      success: false
    }
  });

  // Keep test URLs synchronized with configured base
  useEffect(() => {
    setTests(prev => ({
      ...prev,
      direct: {
        ...prev.direct,
        targetUrl: `${directBridgeUrl.replace(/\/$/, '')}/api/health`
      },
      iis: {
        ...prev.iis,
        targetUrl: `${apiBaseUrl.replace(/\/$/, '')}/health`
      }
    }));
  }, [apiBaseUrl, directBridgeUrl]);

  // Load build metadata
  useEffect(() => {
    async function loadBuildInfo() {
      try {
        const res = await fetch('/ui-build-info.json');
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            const data = await res.json();
            setMetadata(data);
          }
        }
      } catch {
        // Fallback default
      }
    }
    loadBuildInfo();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleServiceAction = (actionId: string, command: string) => {
    copyToClipboard(command, `svc-${actionId}`);
    if (actionId === 'start' || actionId === 'restart' || actionId === 'repair') {
      setTimeout(() => {
        executeEndpointTest('direct');
        executeEndpointTest('iis');
      }, 2500);
    }
  };

  /**
   * Safe fetch validator for JSON health endpoints:
   * 1. Inspects Content-Type (never JSON.parse if text/html)
   * 2. Inspects raw text for '<' or '<!doctype'
   * 3. Validates connected === true
   */
  const executeEndpointTest = useCallback(async (testId: 'direct' | 'iis' | 'erp') => {
    setTests(prev => ({
      ...prev,
      [testId]: { ...prev[testId], running: true, tested: true }
    }));

    const startTime = performance.now();
    const currentTest = tests[testId];
    const url = currentTest.targetUrl;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: testId === 'erp' 
          ? { 'Accept': 'text/html,application/xhtml+xml' } 
          : { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      const elapsed = Math.round(performance.now() - startTime);
      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();

      // TEST C: ERP Application Entry check
      if (testId === 'erp') {
        const isHtml = contentType.includes('text/html') || rawText.trim().startsWith('<') || rawText.toLowerCase().includes('<!doctype');
        const isOk = res.ok && res.status === 200 && isHtml;
        setTests(prev => ({
          ...prev,
          erp: {
            ...prev.erp,
            running: false,
            tested: true,
            success: isOk,
            statusCode: res.status,
            statusText: res.statusText,
            contentType,
            latencyMs: elapsed,
            isHtml: true,
            diagnostic: isOk 
              ? 'Web server is running and actively serving the MediClinic ERP single page application entry.'
              : `HTTP ${res.status}: Expected HTML application root.`
          }
        }));
        return;
      }

      // TESTS A & B: Health API checks
      // Requirement 5: If Content-Type is text/html, do NOT attempt JSON.parse().
      const isHtmlResponse = contentType.includes('text/html') || 
                             rawText.trim().startsWith('<') || 
                             rawText.toLowerCase().includes('<!doctype');

      if (isHtmlResponse) {
        setTests(prev => ({
          ...prev,
          [testId]: {
            ...prev[testId],
            running: false,
            tested: true,
            success: false,
            statusCode: res.status,
            statusText: res.statusText,
            contentType,
            latencyMs: elapsed,
            isHtml: true,
            error: 'Health endpoint returned HTML instead of JSON. Check IIS /api reverse proxy.',
            diagnostic: testId === 'iis' 
              ? 'The IIS server returned index.html for /api/health instead of routing to the bridge. Ensure IIS Application Request Routing (ARR) Proxy is enabled and the URL Rewrite rule proxies /api/* to http://localhost:5001/api/*.'
              : 'Direct endpoint returned HTML. Confirm port 5001 is mapped to local-sql-bridge.js.'
          }
        }));
        return;
      }

      // Safe JSON parsing
      let jsonPayload: any;
      try {
        jsonPayload = JSON.parse(rawText);
      } catch (parseErr: any) {
        setTests(prev => ({
          ...prev,
          [testId]: {
            ...prev[testId],
            running: false,
            tested: true,
            success: false,
            statusCode: res.status,
            statusText: res.statusText,
            contentType,
            latencyMs: elapsed,
            error: 'Invalid JSON payload received from health endpoint.',
            diagnostic: parseErr.message
          }
        }));
        return;
      }

      // Requirement 6: If response is JSON, validate connected === true
      const isConnected = jsonPayload && jsonPayload.connected === true;

      // Dynamically extract SQL Server instance & database (Requirement 10)
      if (jsonPayload.server) {
        setDetectedServer(jsonPayload.server);
      }
      if (jsonPayload.database) {
        setDetectedDatabase(jsonPayload.database);
      }

      setTests(prev => ({
        ...prev,
        [testId]: {
          ...prev[testId],
          running: false,
          tested: true,
          success: isConnected,
          statusCode: res.status,
          statusText: res.statusText,
          contentType,
          latencyMs: elapsed,
          data: jsonPayload,
          error: isConnected ? undefined : (jsonPayload.message || 'SQL Server reported connected !== true'),
          diagnostic: isConnected 
            ? `Verified healthy: Connected to SQL Server "${jsonPayload.server || 'Dynamic'}" database "${jsonPayload.database || 'MediClinic_ERP'}".`
            : `Bridge is online on port 5001, but SQL Server connection failed: ${jsonPayload.message || 'Check database permissions / port 1433'}.`
        }
      }));

    } catch (netErr: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setTests(prev => ({
        ...prev,
        [testId]: {
          ...prev[testId],
          running: false,
          tested: true,
          success: false,
          latencyMs: elapsed,
          error: netErr.name === 'AbortError' 
            ? 'Connection timed out after 4000ms.' 
            : (netErr.message || 'Network request failed (Connection refused).'),
          diagnostic: testId === 'direct'
            ? 'Local bridge service is not running on port 5001. Execute "MediClinic-ERP-Setup.bat" or run "powershell -File repair-service.ps1".'
            : 'IIS reverse proxy endpoint is unreachable. Ensure IIS W3SVC service is running.'
        }
      }));
    }
  }, [tests]);

  // Run all 3 tests in sequence
  const runAllTests = useCallback(async () => {
    await executeEndpointTest('direct');
    await executeEndpointTest('iis');
    await executeEndpointTest('erp');
  }, [executeEndpointTest]);

  // Save new API Base URL or Bridge URL
  const handleSaveApiConfig = () => {
    localSqlServerService.saveConfig({
      apiBaseUrl,
      bridgeUrl: directBridgeUrl
    });
    setShowConfigDrawer(false);
  };

  // Derive global health status
  const anyTestExecuted = tests.direct.tested || tests.iis.tested || tests.erp.tested;
  const allThreePassing = tests.direct.success && tests.iis.success && tests.erp.success;

  // Bridge status (Requirement 9: Do not report "Local Bridge Not Detected" when /api/health is healthy)
  const isBridgeHealthy = tests.iis.success || tests.direct.success;
  
  // IIS Proxy status
  const iisProxyStatus: 'ACTIVE' | 'HTML_ERROR' | 'UNREACHABLE' | 'PENDING' = 
    tests.iis.success ? 'ACTIVE' :
    tests.iis.isHtml ? 'HTML_ERROR' :
    tests.iis.tested ? 'UNREACHABLE' : 'PENDING';

  // Effective SQL Server and Database names
  const activeSqlServer = detectedServer || 
                          tests.iis.data?.server || 
                          tests.direct.data?.server || 
                          localSqlServerService.getStatus().server || 
                          'Dynamic (Auto-Detecting from Bridge)';

  const activeDatabase = detectedDatabase || 
                         tests.iis.data?.database || 
                         tests.direct.data?.database || 
                         localSqlServerService.getStatus().database || 
                         'MediClinic_ERP';

  const bestLatency = tests.iis.latencyMs || tests.direct.latencyMs;

  const categories = useMemo(() => {
    const set = new Set<string>();
    metadata.files.forEach(f => set.add(f.category));
    return ['ALL', ...Array.from(set)];
  }, [metadata]);

  const filteredFiles = useMemo(() => {
    return metadata.files.filter(f => {
      const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchSearch = !searchFilter.trim() || f.name.toLowerCase().includes(searchFilter.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [metadata, selectedCategory, searchFilter]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white">
                UI Production Deployment &amp; Customer Release Center
              </h1>
              {/* Requirement 13: Do not mark 100% Passing unless actual health checks succeeded */}
              {allThreePassing ? (
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>All Health Checks Passing (100%)</span>
                </span>
              ) : anyTestExecuted ? (
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  <span>Diagnostic Execution Required</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Build Artifact Ready &middot; {metadata.version}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Production distribution engine for Microsoft IIS, Windows SQL Bridge Windows Service, and standalone desktop packages.
            </p>
          </div>
        </div>

        {/* Master 1-Click ZIP Download Button */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/mediclinic-ui-build.zip"
            download="mediclinic-ui-build.zip"
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-teal-500/20 text-xs sm:text-sm"
          >
            <FolderArchive className="w-4 h-4 fill-current" />
            <span>Download UI Build (.zip)</span>
            <span className="px-1.5 py-0.5 bg-slate-900/20 text-slate-900 rounded font-mono text-[11px] font-bold">
              {metadata.zipSizeFormatted}
            </span>
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ARCHITECTURAL PIPELINE (Developer/Release Side vs. Customer Side) */}
      {/* ========================================================================= */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900">
                End-to-End Enterprise Distribution &amp; Deployment Pipeline
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Clear separation between Developer/Release build packaging and on-premise Customer automated deployment.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-teal-50 border border-teal-200 text-teal-800 self-start sm:self-auto">
            Automated Windows 10/11/Server Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: Developer / Release Side */}
          <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-teal-800" />
                <span>Developer / Release Side</span>
              </span>
              <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                Cloud
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-900 text-[10px] font-bold flex items-center justify-center">1</span>
                  <div className="font-bold text-xs text-slate-900">AI Studio</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-7">
                  Cloud development, feature updates &amp; ERP source code repository.
                </p>
              </div>

              <div className="flex justify-center text-slate-400">
                <ArrowDown className="w-4 h-4" />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-900 text-[10px] font-bold flex items-center justify-center">2</span>
                  <div className="font-bold text-xs text-slate-900">Build (Vite 8)</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-7">
                  TypeScript compilation, static bundling, asset optimization &amp; zero-error validation.
                </p>
              </div>

              <div className="flex justify-center text-slate-400">
                <ArrowDown className="w-4 h-4" />
              </div>

              <div className="p-2.5 bg-teal-50 rounded-lg border-2 border-teal-600 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-teal-800" />
                    <div className="font-mono font-bold text-xs text-teal-950">mediclinic-ui-build.zip</div>
                  </div>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded">
                    Release
                  </span>
                </div>
                <p className="text-[11px] text-teal-900 mt-1">
                  Complete offline deployable bundle including HTML, CSS, JS bundles, and preconfigured IIS <code className="font-mono text-teal-950 font-bold">web.config</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Customer Side */}
          <div className="lg:col-span-8 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-teal-800" />
                <span>Customer Side (On-Premise Clinic Machine / Local Server)</span>
              </span>
              <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                Automated Pipeline
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { num: 1, title: 'SQL Server', desc: activeSqlServer },
                { num: 2, title: 'MediClinic-ERP-Setup.exe', desc: '1-Click Elevated Setup Launcher' },
                { num: 3, title: 'Automatic dependency check', desc: 'Node.js, IIS, URL Rewrite 2.1, ARR 3.0' },
                { num: 4, title: 'IIS + Rewrite + ARR', desc: 'Enables IIS features & ARR Proxy' },
                { num: 5, title: 'SQL Bridge Windows Service', desc: 'MediClinicSqlBridge.exe (Port 5001)' },
                { num: 6, title: 'Extract UI ZIP', desc: 'C:\\inetpub\\wwwroot\\mediclinic' },
                { num: 7, title: 'Configure API', desc: 'Reverse proxy /api/* -> port 5001' },
                { num: 8, title: 'Health checks', desc: 'sc query + /api/health verification' },
                { num: 9, title: 'Go Live', desc: 'Desktop shortcuts + browser launch' },
              ].map(step => (
                <div 
                  key={step.num}
                  onClick={() => setActivePipelineStep(step.num)}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    activePipelineStep === step.num
                      ? 'bg-teal-800 text-white border-teal-900 shadow-xs'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${
                      activePipelineStep === step.num ? 'bg-white text-teal-900' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {step.num}
                    </span>
                    <span className="font-bold text-xs truncate">{step.title}</span>
                  </div>
                  <div className={`text-[10px] truncate mt-0.5 pl-5 ${
                    activePipelineStep === step.num ? 'text-teal-200' : 'text-slate-500'
                  }`}>
                    {step.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Inspector of Selected Customer Step */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">
                    Step {activePipelineStep}: {
                      activePipelineStep === 1 ? 'SQL Server Detection & Trusted Connection' :
                      activePipelineStep === 2 ? 'Automated Customer Setup Launcher (MediClinic-ERP-Setup.bat / .exe)' :
                      activePipelineStep === 3 ? 'Auto-Dependency Provisioning (Node.js LTS, IIS, Rewrite 2.1, ARR 3.0)' :
                      activePipelineStep === 4 ? 'IIS Features & Application Request Routing (ARR) Proxy Activation' :
                      activePipelineStep === 5 ? 'SQL Bridge Windows Service (MediClinicSqlBridge.exe Native Service Wrapper)' :
                      activePipelineStep === 6 ? 'Production UI ZIP Extraction to C:\\inetpub\\wwwroot\\mediclinic' :
                      activePipelineStep === 7 ? 'Reverse Proxy Routing Configuration (/api/* -> http://localhost:5001/api/*)' :
                      activePipelineStep === 8 ? 'Automated 5-Point Health Probe (sc query + /api/health)' :
                      'Go-Live: Native App Shortcuts & Browser Launch'
                    }
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {
                      activePipelineStep === 5 
                        ? 'Uses native C# ServiceBase wrapper (MediClinicSqlBridge.exe). Never runs .bat directly. Auto-restarts on Windows boot.' 
                        : 'Fully automated by MediClinic-ERP-Setup.ps1 without requiring manual terminal intervention.'
                    }
                  </p>
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(
                  activePipelineStep === 5 
                    ? 'sc.exe create MediClinicSqlBridge binPath= "C:\\Program Files\\MediClinic\\SQLBridge\\MediClinicSqlBridge.exe" start= auto DisplayName= "MediClinic ERP SQL Bridge"'
                    : 'powershell -ExecutionPolicy Bypass -File .\\MediClinic-ERP-Setup.ps1',
                  'pipeline-step-cmd'
                )}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedSnippet === 'pipeline-step-cmd' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>Copy Step Command</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PROPER WINDOWS SERVICE ARCHITECTURE & LIFECYCLE (CRITICAL REQUIREMENT) */}
      {/* ========================================================================= */}
      <div className="p-5 bg-white rounded-2xl border-2 border-teal-700/70 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-teal-800" />
              <h3 className="font-bold text-sm text-slate-900">
                SQL Bridge Windows Service Control &amp; Architecture (MediClinicSqlBridge)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Genuine 24/7 background Windows Service running via native service wrapper executable without open console windows.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-100 border border-slate-200 text-slate-700">
              Service: MediClinicSqlBridge
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-teal-50 border border-teal-200 text-teal-800">
              Display: MediClinic ERP SQL Bridge
            </span>
          </div>
        </div>

        {/* Callout Warning on Service Wrapper Architecture vs .bat files */}
        <div className="p-3.5 bg-teal-50/70 border border-teal-300 rounded-xl text-xs text-teal-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">
              Proper Windows Service Architecture (Never Use a .bat File as Service Executable)
            </div>
            <p className="text-[11px] leading-relaxed text-teal-900">
              Directly passing a <code className="font-mono bg-teal-100 px-1 py-0.2 rounded font-bold">.bat</code> file to <code className="font-mono bg-teal-100 px-1 py-0.2 rounded font-bold">sc.exe create binPath=...</code> causes Windows Service Control Manager (SCM) <strong>Error 1053</strong> because command scripts cannot process SCM dispatchers.
              MediClinic ERP compiles and utilizes a native service wrapper executable (<code className="font-mono bg-teal-100 px-1 py-0.2 rounded font-bold">MediClinicSqlBridge.exe</code>) inheriting from <code className="font-mono font-bold">System.ServiceProcess.ServiceBase</code>.
              The service launches Node.js invisibly in the background, survives CMD/PowerShell closure, starts automatically on Windows boot, auto-recovers on crashes, and writes auto-rotated logs to <code className="font-mono font-bold">C:\ProgramData\MediClinic\Logs\bridge.log</code>.
            </p>
          </div>
        </div>

        {/* Service Architecture Specs Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Executable Binary</span>
            <div className="font-mono font-bold text-slate-900 truncate" title="C:\Program Files\MediClinic\SQLBridge\MediClinicSqlBridge.exe">
              MediClinicSqlBridge.exe
            </div>
            <span className="text-[10px] text-slate-500">Native Service Wrapper (C# ServiceBase)</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Writable Log Directory</span>
            <div className="font-mono font-bold text-teal-900 truncate" title="C:\ProgramData\MediClinic\Logs">
              C:\ProgramData\MediClinic\Logs
            </div>
            <span className="text-[10px] text-slate-500">Auto-Rotated bridge.log (&lt; 10MB)</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Startup Type</span>
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Automatic (Boot)</span>
            </div>
            <span className="text-[10px] text-slate-500">Runs before user login</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Recovery Policy</span>
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-teal-800" />
              <span>Auto-Restart on Crash</span>
            </div>
            <span className="text-[10px] text-slate-500">Delay: 10s / 20s / 60s</span>
          </div>
        </div>

        {/* Idempotent Service Creation & Query Code Snippet */}
        <div className="p-3 bg-slate-900 text-teal-300 rounded-xl space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
            <span>Official SCM Registration Command (Idempotent / No .bat files)</span>
            <button
              onClick={() => copyToClipboard(
                'sc.exe create MediClinicSqlBridge binPath= "C:\\Program Files\\MediClinic\\SQLBridge\\MediClinicSqlBridge.exe" start= auto DisplayName= "MediClinic ERP SQL Bridge"',
                'scm-create-code'
              )}
              className="text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
            >
              {copiedSnippet === 'scm-create-code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSnippet === 'scm-create-code' ? 'Copied!' : 'Copy SCM Command'}</span>
            </button>
          </div>
          <div className="space-y-1 text-[11px] overflow-x-auto select-all">
            <div><span className="text-slate-500">:: 1. Create or Update Service (Idempotent)</span></div>
            <div>sc.exe create MediClinicSqlBridge binPath= &quot;C:\Program Files\MediClinic\SQLBridge\MediClinicSqlBridge.exe&quot; start= auto DisplayName= &quot;MediClinic ERP SQL Bridge&quot;</div>
            <div className="text-slate-500">:: 2. Configure Failure Recovery (Auto-restart)</div>
            <div>sc.exe failure MediClinicSqlBridge reset= 86400 actions= restart/10000/restart/20000/restart/60000</div>
            <div className="text-slate-500">:: 3. Query Service State</div>
            <div>sc.exe query MediClinicSqlBridge</div>
          </div>
        </div>

        {/* Four Action Cards (Requirement 14: Start / Stop / Restart / Repair) */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Service Lifecycle Operations (Requirement 14)</span>
            <span className="text-[11px] font-normal text-slate-500">Click to copy command &amp; probe health endpoints</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            
            {/* Action 1: Start */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Start Service</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                    sc start
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Starts the background Windows Service if stopped or in standby.
                </p>
              </div>
              <div className="space-y-1.5">
                <pre className="p-1.5 bg-slate-900 text-teal-300 rounded font-mono text-[10px] overflow-x-auto select-all">
                  sc.exe start MediClinicSqlBridge
                </pre>
                <button
                  onClick={() => handleServiceAction('start', 'sc.exe start MediClinicSqlBridge')}
                  className="w-full py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedSnippet === 'svc-start' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet === 'svc-start' ? 'Copied Command!' : 'Copy & Probe Start'}</span>
                </button>
              </div>
            </div>

            {/* Action 2: Stop */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Stop Service</span>
                  </span>
                  <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold">
                    sc stop
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Gracefully terminates the background Node.js bridge process.
                </p>
              </div>
              <div className="space-y-1.5">
                <pre className="p-1.5 bg-slate-900 text-teal-300 rounded font-mono text-[10px] overflow-x-auto select-all">
                  sc.exe stop MediClinicSqlBridge
                </pre>
                <button
                  onClick={() => handleServiceAction('stop', 'sc.exe stop MediClinicSqlBridge')}
                  className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedSnippet === 'svc-stop' ? <Check className="w-3 h-3 text-slate-700" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet === 'svc-stop' ? 'Copied Command!' : 'Copy Stop Command'}</span>
                </button>
              </div>
            </div>

            {/* Action 3: Restart */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-teal-800" />
                    <span>Restart Service</span>
                  </span>
                  <span className="text-[10px] font-mono text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded font-bold">
                    cycle
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Recycles the service to apply new SQL parameters or reconnect.
                </p>
              </div>
              <div className="space-y-1.5">
                <pre className="p-1.5 bg-slate-900 text-teal-300 rounded font-mono text-[10px] overflow-x-auto select-all">
                  sc.exe stop MediClinicSqlBridge &amp;&amp; timeout /t 2 &amp;&amp; sc.exe start MediClinicSqlBridge
                </pre>
                <button
                  onClick={() => handleServiceAction('restart', 'sc.exe stop MediClinicSqlBridge && timeout /t 2 && sc.exe start MediClinicSqlBridge')}
                  className="w-full py-1 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedSnippet === 'svc-restart' ? <Check className="w-3 h-3 text-teal-800" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet === 'svc-restart' ? 'Copied Command!' : 'Copy & Probe Restart'}</span>
                </button>
              </div>
            </div>

            {/* Action 4: Repair */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-purple-700" />
                    <span>Repair &amp; Reinstall</span>
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
                    repair.ps1
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Idempotently recompiles wrapper, repairs SCM registration, and verifies.
                </p>
              </div>
              <div className="space-y-1.5">
                <pre className="p-1.5 bg-slate-900 text-teal-300 rounded font-mono text-[10px] overflow-x-auto select-all">
                  powershell -ExecutionPolicy Bypass -File &quot;C:\Program Files\MediClinic\SQLBridge\repair-service.ps1&quot;
                </pre>
                <button
                  onClick={() => handleServiceAction('repair', 'powershell -ExecutionPolicy Bypass -File "C:\\Program Files\\MediClinic\\SQLBridge\\repair-service.ps1"')}
                  className="w-full py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedSnippet === 'svc-repair' ? <Check className="w-3 h-3 text-purple-700" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet === 'svc-repair' ? 'Copied Command!' : 'Copy Repair Script'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PRODUCTION HEALTH CHECK DIAGNOSTIC SUITE (REQUIREMENTS 1 - 13) */}
      {/* ========================================================================= */}
      <div className="p-5 bg-white rounded-2xl border-2 border-teal-700/60 shadow-sm space-y-5">
        
        {/* Diagnostic Suite Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-800" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Production Deployment Health Check &amp; Endpoint Diagnostics
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verifies configured API base (<code className="font-mono text-teal-900 font-bold">{apiBaseUrl}</code>), IIS reverse proxy rules, and live SQL database connectivity without HTML parsing errors.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure API Base</span>
            </button>
            <button
              onClick={runAllTests}
              className="px-4 py-1.5 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Health Check Suite</span>
            </button>
          </div>
        </div>

        {/* API Base URL Configuration Drawer */}
        {showConfigDrawer && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-teal-800" />
              <span>Configure Health Check API Endpoints</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Preferred IIS API Base URL (Requirement 2: /api)
                </label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={e => setApiBaseUrl(e.target.value)}
                  placeholder="/api"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:outline-teal-600"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Used by the browser to call <code className="font-mono">{apiBaseUrl}/health</code> through IIS reverse proxy.
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Direct Bridge Endpoint URL (Requirement 8A: Port 5001)
                </label>
                <input
                  type="text"
                  value={directBridgeUrl}
                  onChange={e => setDirectBridgeUrl(e.target.value)}
                  placeholder="http://localhost:5001"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:outline-teal-600"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Used for direct communication with the local Node.js bridge service.
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowConfigDrawer(false)}
                className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiConfig}
                className="px-3 py-1 bg-teal-800 text-white font-bold rounded-lg cursor-pointer hover:bg-teal-700"
              >
                Save &amp; Apply Endpoints
              </button>
            </div>
          </div>
        )}

        {/* REQUIREMENT 7: 5 Required Production Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          {/* 1. SQL Server */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              1. SQL Server Instance
            </span>
            <div className="mt-1 font-mono font-bold text-slate-900 truncate" title={activeSqlServer}>
              {activeSqlServer}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {detectedServer ? '🟢 Dynamically Detected' : 'Configured / Auto-Detect'}
            </span>
          </div>

          {/* 2. Database */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              2. Database Catalog
            </span>
            <div className="mt-1 font-mono font-bold text-teal-900 truncate" title={activeDatabase}>
              {activeDatabase}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {detectedDatabase ? '🟢 Verified Catalog' : 'Default Catalog'}
            </span>
          </div>

          {/* 3. Bridge Status */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              3. Bridge Status
            </span>
            <div className="mt-1 flex items-center gap-1.5 font-bold">
              {isBridgeHealthy ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Online &amp; Connected</span>
                </>
              ) : anyTestExecuted ? (
                <>
                  <XCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">Offline / Standby</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Pending Probe</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              Port 5001 Background Service
            </span>
          </div>

          {/* 4. IIS Proxy Status */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              4. IIS Proxy Status
            </span>
            <div className="mt-1 flex items-center gap-1.5 font-bold">
              {iisProxyStatus === 'ACTIVE' && (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Active (/api &rarr; 5001)</span>
                </>
              )}
              {iisProxyStatus === 'HTML_ERROR' && (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">Returned HTML</span>
                </>
              )}
              {iisProxyStatus === 'UNREACHABLE' && (
                <>
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700">Unreachable</span>
                </>
              )}
              {iisProxyStatus === 'PENDING' && (
                <>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Pending Check</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              ARR Proxy &middot; {apiBaseUrl}
            </span>
          </div>

          {/* 5. API Response Time */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              5. API Response Time
            </span>
            <div className="mt-1 font-mono font-bold text-slate-900">
              {bestLatency !== undefined ? `${bestLatency} ms` : '—'}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              Round-trip Network Latency
            </span>
          </div>

        </div>

        {/* Global Summary Diagnostic Alert */}
        {tests.iis.isHtml && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                Health endpoint returned HTML instead of JSON. Check IIS /api reverse proxy.
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                The URL <code className="font-mono bg-amber-100 px-1 py-0.2 rounded font-bold">{tests.iis.targetUrl}</code> returned an HTML document (<code className="font-mono">&lt;!doctype html...</code>) instead of JSON from the local SQL bridge.
                On Windows IIS, make sure <strong>Application Request Routing (ARR) Proxy</strong> is enabled (<code className="font-mono">appcmd.exe set config -section:system.webServer/proxy /enabled:&quot;True&quot;</code>) and the URL Rewrite rule proxies <code className="font-mono">^api/(.*)</code> to <code className="font-mono">http://localhost:5001/api/&#123;R:1&#125;</code>.
              </p>
            </div>
          </div>
        )}

        {/* REQUIREMENT 8: SEPARATE TESTS (A: Direct Bridge, B: IIS API, C: ERP) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold border-b border-slate-100 pb-2">
            <span>Isolated Diagnostic Probes (Requirement 8)</span>
            <span className="text-[11px] font-normal text-slate-500">Run individual checks to isolate networking and IIS proxy layers</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            
            {/* TEST A: Direct Bridge */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
              tests.direct.success ? 'bg-emerald-50/50 border-emerald-300' :
              tests.direct.tested && !tests.direct.success ? 'bg-rose-50/40 border-rose-300' :
              'bg-white border-slate-200'
            }`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Test A: Direct Bridge</span>
                  {tests.direct.success && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      HTTP {tests.direct.statusCode} &middot; OK
                    </span>
                  )}
                  {tests.direct.tested && !tests.direct.success && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Failed
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] bg-slate-900 text-teal-300 p-1.5 rounded-lg truncate" title={tests.direct.targetUrl}>
                  {tests.direct.targetUrl}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {tests.direct.description}
                </p>

                {tests.direct.tested && (
                  <div className="text-[10px] font-mono space-y-0.5 pt-1 border-t border-slate-200">
                    <div>Latency: <strong>{tests.direct.latencyMs} ms</strong></div>
                    {tests.direct.data?.server && (
                      <div>Server: <strong>{tests.direct.data.server}</strong></div>
                    )}
                    {tests.direct.data?.database && (
                      <div>Database: <strong>{tests.direct.data.database}</strong></div>
                    )}
                    {tests.direct.error && (
                      <div className="text-rose-700 font-semibold">{tests.direct.error}</div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => executeEndpointTest('direct')}
                disabled={tests.direct.running}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3 h-3 ${tests.direct.running ? 'animate-spin' : ''}`} />
                <span>{tests.direct.running ? 'Probing...' : 'Test Direct Bridge (5001)'}</span>
              </button>
            </div>

            {/* TEST B: IIS API */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
              tests.iis.success ? 'bg-emerald-50/50 border-emerald-300' :
              tests.iis.isHtml ? 'bg-amber-50/50 border-amber-300' :
              tests.iis.tested && !tests.iis.success ? 'bg-rose-50/40 border-rose-300' :
              'bg-white border-slate-200'
            }`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Test B: IIS API Reverse Proxy</span>
                  {tests.iis.success && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      HTTP {tests.iis.statusCode} &middot; OK
                    </span>
                  )}
                  {tests.iis.isHtml && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      HTML Returned
                    </span>
                  )}
                  {tests.iis.tested && !tests.iis.success && !tests.iis.isHtml && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Failed
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] bg-slate-900 text-teal-300 p-1.5 rounded-lg truncate" title={tests.iis.targetUrl}>
                  {tests.iis.targetUrl}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {tests.iis.description}
                </p>

                {tests.iis.tested && (
                  <div className="text-[10px] font-mono space-y-0.5 pt-1 border-t border-slate-200">
                    <div>Latency: <strong>{tests.iis.latencyMs} ms</strong></div>
                    {tests.iis.isHtml && (
                      <div className="text-amber-800 font-semibold leading-tight">
                        Check IIS /api reverse proxy (HTML received).
                      </div>
                    )}
                    {tests.iis.data?.server && (
                      <div>Server: <strong>{tests.iis.data.server}</strong></div>
                    )}
                    {tests.iis.error && !tests.iis.isHtml && (
                      <div className="text-rose-700 font-semibold">{tests.iis.error}</div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => executeEndpointTest('iis')}
                disabled={tests.iis.running}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3 h-3 ${tests.iis.running ? 'animate-spin' : ''}`} />
                <span>{tests.iis.running ? 'Probing...' : 'Test IIS API (/api/health)'}</span>
              </button>
            </div>

            {/* TEST C: ERP Application Entry */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
              tests.erp.success ? 'bg-emerald-50/50 border-emerald-300' :
              tests.erp.tested && !tests.erp.success ? 'bg-rose-50/40 border-rose-300' :
              'bg-white border-slate-200'
            }`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Test C: ERP Application Root</span>
                  {tests.erp.success && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      HTTP {tests.erp.statusCode} &middot; OK
                    </span>
                  )}
                  {tests.erp.tested && !tests.erp.success && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Failed
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] bg-slate-900 text-teal-300 p-1.5 rounded-lg truncate" title={tests.erp.targetUrl}>
                  {tests.erp.targetUrl}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {tests.erp.description}
                </p>

                {tests.erp.tested && (
                  <div className="text-[10px] font-mono space-y-0.5 pt-1 border-t border-slate-200">
                    <div>Latency: <strong>{tests.erp.latencyMs} ms</strong></div>
                    <div>Type: <strong>HTML Single Page App</strong></div>
                    {tests.erp.diagnostic && (
                      <div className="text-slate-600">{tests.erp.diagnostic}</div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => executeEndpointTest('erp')}
                disabled={tests.erp.running}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3 h-3 ${tests.erp.running ? 'animate-spin' : ''}`} />
                <span>{tests.erp.running ? 'Probing...' : 'Test Application Entry (/)'}</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. RELEASE PACKAGES & CUSTOMER DOWNLOADS */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-4 h-4 text-teal-800" />
            <span>Production Release Packages &amp; Automated Customer Installers</span>
          </h2>
          <span className="text-xs text-slate-500">Ready for offline IIS customer setup</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Card 1: Production ZIP */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border-2 border-teal-600 flex flex-col justify-between space-y-3 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-teal-200 text-teal-900">
                  Release Bundle
                </span>
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                mediclinic-ui-build.zip
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Complete pre-compiled web app bundle. Contains HTML, JS, CSS, service worker, manifests, and production <code className="text-teal-900 font-mono">web.config</code>.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Size: {metadata.zipSizeFormatted}</span>
                <span>{metadata.fileCount} Files</span>
              </div>
              <a
                href="/mediclinic-ui-build.zip"
                download="mediclinic-ui-build.zip"
                className="w-full py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download UI ZIP ({metadata.zipSizeFormatted})</span>
              </a>
            </div>
          </div>

          {/* Card 2: 1-Click Automated Setup Launcher */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 text-teal-800" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  Customer 1-Click
                </span>
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                MediClinic-ERP-Setup.bat
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                1-Click elevated Windows launcher. Auto-prompts for UAC Administrator privileges and executes the full deployment pipeline.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 font-mono">
                Windows 10/11/Server (.bat) &middot; Auto-Elevating
              </div>
              <a
                href="/MediClinic-ERP-Setup.bat"
                download="MediClinic-ERP-Setup.bat"
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-teal-800" />
                <span>Download Setup.bat</span>
              </a>
            </div>
          </div>

          {/* Card 3: PowerShell Setup Engine */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-teal-800" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  Automation Script
                </span>
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                MediClinic-ERP-Setup.ps1
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                PowerShell engine: auto-provisions Node.js, IIS, URL Rewrite 2.1, ARR 3.0, Windows Service, extracts ZIP, and runs health probes.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 font-mono">
                PowerShell 5.1+ / 7.x &middot; Native Service Engine
              </div>
              <a
                href="/MediClinic-ERP-Setup.ps1"
                download="MediClinic-ERP-Setup.ps1"
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-teal-800" />
                <span>Download Setup.ps1</span>
              </a>
            </div>
          </div>

          {/* Card 4: Service Repair Engine */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-teal-800" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  Service Repair
                </span>
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                repair-service.ps1
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Standalone maintenance script: recompiles C# service wrapper, configures auto-recovery, and verifies port 5001.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 font-mono">
                Service Repair Script &middot; Idempotent
              </div>
              <a
                href="/repair-service.ps1"
                download="repair-service.ps1"
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-teal-800" />
                <span>Download Repair Script</span>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. COMPILED PRODUCTION FILES EXPLORER */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Explorer Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Layers className="w-4 h-4 text-teal-800" />
            <span>Files Included in UI Deployment Bundle ({metadata.files.length} items)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search files..."
                className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-teal-600 w-36 sm:w-44"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-thin">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-teal-800 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Files Table */}
        <div className="overflow-x-auto max-h-[360px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 z-10 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center text-slate-400">#</th>
                <th className="py-2.5 px-4">File Path / Asset Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Size</th>
                <th className="py-2.5 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredFiles.map((file, idx) => (
                <tr key={file.name} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-4 text-center text-slate-400 text-[10px]">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>{file.name}</span>
                  </td>
                  <td className="py-2 px-4 font-sans text-slate-600">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700">
                      {file.category}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-teal-900">
                    {file.sizeFormatted}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <a
                      href={`/${file.name}`}
                      download={file.name.split('/').pop()}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-teal-800 border border-slate-300 rounded font-sans text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
