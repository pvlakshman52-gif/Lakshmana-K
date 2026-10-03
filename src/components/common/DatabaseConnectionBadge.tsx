import React, { useState, useEffect } from 'react';
import { Database, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { localSqlServerService, SqlServerStatus } from '../../services/localSqlService';
import { DatabaseConnectionInspectorModal } from './DatabaseConnectionInspectorModal';

interface DatabaseConnectionBadgeProps {
  onOpenSqlServer?: (tab?: 'schema' | 'connection' | 'migrations' | 'notifications' | 'sync' | 'cloud') => void;
}

export const DatabaseConnectionBadge: React.FC<DatabaseConnectionBadgeProps> = ({
  onOpenSqlServer
}) => {
  const [status, setStatus] = useState<SqlServerStatus>(() => localSqlServerService.getStatus());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = localSqlServerService.subscribe(newStatus => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const shortServer = status.server.includes('\\') 
    ? status.server.split('\\')[1] 
    : status.server;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
          status.connected
            ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900'
        }`}
        title={`Connected Database: ${status.database} | Server: ${status.server} (${status.connected ? 'Live Read/Write' : 'Offline Cache'}). Click to inspect or change.`}
      >
        <span className="relative flex h-2 w-2">
          {status.connected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            status.connected ? 'bg-emerald-500' : 'bg-amber-500'
          }`} />
        </span>

        <Database className={`w-3.5 h-3.5 ${status.connected ? 'text-emerald-700' : 'text-amber-700'}`} />

        <div className="flex items-center gap-1 text-[11px] font-mono leading-none">
          <span className="hidden xl:inline text-slate-500 font-sans font-medium">SQL:</span>
          <span className="font-bold text-slate-800 hidden lg:inline max-w-[110px] truncate" title={status.server}>
            {shortServer || 'localhost'}
          </span>
          <span className="hidden lg:inline text-slate-400">/</span>
          <span className="font-bold text-teal-900 max-w-[120px] truncate" title={status.database}>
            {status.database || 'MediClinic_ERP'}
          </span>
          {!status.connected && (
            <span className="text-[10px] text-amber-700 font-sans hidden sm:inline">(Local)</span>
          )}
        </div>
      </button>

      <DatabaseConnectionInspectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onOpenSqlServerManager={onOpenSqlServer}
      />
    </>
  );
};
