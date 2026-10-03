import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

interface OfflineIndicatorProps {
  onOpenPwaSync?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onOpenPwaSync }) => {
  const { isOnline, isReconnecting } = useOnlineStatus();

  if (isOnline && !isReconnecting) {
    return null;
  }

  if (isReconnecting) {
    return (
      <div 
        onClick={onOpenPwaSync}
        className="fixed bottom-16 sm:bottom-4 left-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-800 text-white text-xs font-semibold shadow-xl border border-teal-600 animate-in fade-in duration-300 cursor-pointer"
      >
        <RefreshCw className="w-4 h-4 text-teal-300 animate-spin" />
        <div>
          <span className="font-bold">Reconnected!</span>
          <span className="text-[11px] text-teal-200 ml-1.5 hidden sm:inline">Syncing clinic ledger and verifying transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onOpenPwaSync}
      className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-medium shadow-2xl border border-amber-500 animate-pulse cursor-pointer hover:bg-amber-700 transition-colors"
      title="Click to open PWA & Offline Sync Management Suite"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
        <div>
          <span className="font-bold">Offline Mode Active</span>
          <span className="text-[11px] text-amber-100 ml-1.5 block sm:inline">
            Local clinic cache active. Click to manage offline sync.
          </span>
        </div>
      </div>
      <span className="px-2 py-0.5 rounded bg-amber-700/80 text-[10px] font-mono font-bold shrink-0">
        PWA OFFLINE
      </span>
    </div>
  );
};
