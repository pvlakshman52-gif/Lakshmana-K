import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Laptop, 
  Smartphone, 
  CheckCircle2, 
  ExternalLink, 
  X, 
  ArrowRight, 
  FileCode, 
  ShieldCheck,
  Zap,
  Terminal,
  Play,
  Database,
  Server,
  RefreshCw
} from 'lucide-react';
import { 
  downloadWindowsDesktopInstaller, 
  downloadStandaloneSqlBridgeInstaller,
  downloadWindowsDesktopShortcut, 
  isRunningInIframe 
} from '../../utils/pwaInstallHelper';
import { localSqlServerService, SqlServerStatus, SqlServerConfig } from '../../services/localSqlService';

interface LocalSystemInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstallPrompt?: () => Promise<boolean>;
  isInstallable?: boolean;
}

export const LocalSystemInstallModal: React.FC<LocalSystemInstallModalProps> = ({
  isOpen,
  onClose,
  onNativeInstallPrompt,
  isInstallable = false
}) => {
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [status, setStatus] = useState<SqlServerStatus>(() => localSqlServerService.getStatus());
  const [config, setConfig] = useState<SqlServerConfig>(() => localSqlServerService.getConfig());
  const inIframe = isRunningInIframe();

  useEffect(() => {
    const unsub = localSqlServerService.subscribe(newStatus => {
      setStatus(newStatus);
      setConfig(localSqlServerService.getConfig());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleDownloadBatch = () => {
    downloadWindowsDesktopInstaller(undefined, config);
    setDownloadTriggered(true);
  };

  const handleDownloadBridge = () => {
    downloadStandaloneSqlBridgeInstaller(config);
  };

  const handleDownloadUrl = () => {
    downloadWindowsDesktopShortcut();
    setDownloadTriggered(true);
  };

  const handleOpenTopLevel = () => {
    const targetUrl = window.location.href;
    window.open(targetUrl, '_blank');
  };

  const handleRunNativePrompt = async () => {
    if (onNativeInstallPrompt) {
      await onNativeInstallPrompt();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Install MediClinic ERP to Local System
                </h3>
                <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
                  Windows / PC
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                Creates Desktop shortcut and integrates with your local SQL Server database.
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
          
          {/* Target Database & Server Indicator Card */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-300 font-bold text-xs">
                <Database className="w-4 h-4 text-teal-400" />
                <span>Configured Local SQL Database Server</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                status.connected ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'
              }`}>
                {status.connected ? 'Connected' : 'Configured'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Server Instance:</span>
                <span className="font-mono font-bold text-white break-all">{status.server || 'localhost\\SQLEXPRESS'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Database Name:</span>
                <span className="font-mono font-bold text-teal-300 break-all">{status.database || 'MediClinic_ERP'}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-300 pt-1 border-t border-slate-800 leading-relaxed">
              When installed, this setup uses your local SQL database server above so that all sales, products, and inventory read and write directly to your database.
            </div>
          </div>

          {/* Automatic Progress Status Card */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="font-bold text-emerald-950 text-xs">
                  {downloadTriggered ? 'Setup Package Ready in Downloads' : 'Automatic Installation Triggered'}
                </div>
                <div className="text-[11px] text-emerald-800">
                  {downloadTriggered 
                    ? 'Check your browser downloads bar for Install-MediClinic-ERP.bat' 
                    : 'Download the 1-click installer to register desktop app and SQL server bridge.'}
                </div>
              </div>
            </div>

            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>

          {/* Quick Primary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Action 1: Windows 1-Click Batch Installer */}
            <div className="p-4 rounded-xl border-2 border-teal-600 bg-teal-50/40 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Terminal className="w-4 h-4 text-teal-800" />
                  <span>1-Click Windows Desktop Installer</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Creates <strong>Desktop Shortcut</strong>, <strong>Start Menu entry</strong>, and configures the <strong>Local SQL Server Bridge</strong> in <code>%USERPROFILE%\MediClinic-SQL-Bridge</code>.
                </p>
              </div>

              <button
                onClick={handleDownloadBatch}
                className="w-full py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Run / Download Setup (.bat)</span>
              </button>
            </div>

            {/* Action 2: Standalone SQL Bridge Connector */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Server className="w-4 h-4 text-teal-800" />
                  <span>Standalone SQL Bridge Setup</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Downloads a dedicated batch script to start the local Node.js SQL connector on port 5001 if you already have the PWA installed.
                </p>
              </div>

              <button
                onClick={handleDownloadBridge}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-xs"
              >
                <Download className="w-3.5 h-3.5 text-teal-800" />
                <span>Download Bridge Setup (.bat)</span>
              </button>
            </div>

          </div>

          {/* Browser PWA Native Action */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900 text-xs">Native Browser PWA App</div>
              <p className="text-[11px] text-slate-600">
                Install directly via Chrome or Edge browser address bar.
              </p>
            </div>

            {isInstallable ? (
              <button
                onClick={handleRunNativePrompt}
                className="py-1.5 px-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Install in Browser</span>
              </button>
            ) : (
              <button
                onClick={handleOpenTopLevel}
                className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-800" />
                <span>Open in Tab</span>
              </button>
            )}
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2 pt-1">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>How the Installation Works</span>
              <span className="text-[10px] text-slate-400 font-normal">Automated in 2 steps</span>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <div className="font-bold text-slate-900">Run Install-MediClinic-ERP.bat</div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Double-click <strong>Install-MediClinic-ERP.bat</strong> in your <em>Downloads</em> folder. It creates desktop shortcuts and configures the SQL bridge to <strong>{status.server}</strong> &rarr; <strong>{status.database}</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="font-bold text-slate-900">Live Read &amp; Write to SQL Server</div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Once launched, the app immediately reads all existing products, batches, and sales from your SQL database, and automatically writes every new sale and stock receipt into your SQL Server in real time!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative: Instant Internet Shortcut (.url) */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Need a simple lightweight desktop icon?</span>
            <button
              onClick={handleDownloadUrl}
              className="text-teal-800 hover:text-teal-900 font-bold underline cursor-pointer"
            >
              Download MediClinic-ERP.url shortcut
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-800" />
            <span>Target: {status.server} &middot; {status.database}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
