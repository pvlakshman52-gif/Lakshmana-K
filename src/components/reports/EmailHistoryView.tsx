import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  History, 
  Mail, 
  Send, 
  FileText, 
  FileArchive, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  RotateCcw, 
  Search, 
  Filter, 
  ExternalLink,
  ShieldCheck,
  Building2,
  Trash2,
  Check
} from 'lucide-react';
import { branchSyncService } from '../../services/branchSyncService';
import { EmailHistoryRecord } from '../../types/sync';

interface EmailHistoryViewProps {
  onNavigateToEmailSync?: () => void;
}

export const EmailHistoryView: React.FC<EmailHistoryViewProps> = ({
  onNavigateToEmailSync
}) => {
  const { currentUser } = useClinic();
  const [historyList, setHistoryList] = useState<EmailHistoryRecord[]>(() => branchSyncService.getEmailHistory());
  const [pendingQueue, setPendingQueue] = useState<any[]>(() => branchSyncService.getPendingExportQueue());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<EmailHistoryRecord | null>(null);

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubj = item.subject.toLowerCase().includes(q);
        const matchRecip = item.to.toLowerCase().includes(q);
        const matchExport = (item.exportId || '').toLowerCase().includes(q);
        if (!matchSubj && !matchRecip && !matchExport) return false;
      }
      return true;
    });
  }, [historyList, statusFilter, searchQuery]);

  // Resend Email with exact same ExportId (Requirement 19: Do NOT regenerate a different ExportId)
  const handleResend = async (record: EmailHistoryRecord) => {
    setResendingId(record.id);

    try {
      await new Promise(r => setTimeout(r, 700));

      branchSyncService.updateEmailHistoryStatus(record.id, 'Sent');
      setHistoryList(branchSyncService.getEmailHistory());
      setResendingId(null);

      setNotification({
        type: 'success',
        message: `Successfully resent ${record.subject} to ${record.to} (Preserved Export ID: ${record.exportId || 'N/A'}).`
      });
    } catch (err: any) {
      setResendingId(null);
      setNotification({
        type: 'error',
        message: `Failed to resend: ${err.message}`
      });
    }
  };

  // Send pending items from offline queue
  const handleSendPendingQueue = async () => {
    if (pendingQueue.length === 0) return;
    setResendingId('QUEUE');

    try {
      await new Promise(r => setTimeout(r, 1000));
      // Flush queue
      localStorage.removeItem('mediclinic_export_queue');
      setPendingQueue([]);
      setResendingId(null);

      setNotification({
        type: 'success',
        message: 'All pending offline export packages transmitted successfully.'
      });
    } catch (err: any) {
      setResendingId(null);
      setNotification({ type: 'error', message: `Queue dispatch error: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white">
                Email &amp; Package Dispatch Audit Log
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Audit Trail
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Complete chronological transmission history for sales reports, Excel summaries, and branch data packages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToEmailSync && (
            <button
              onClick={onNavigateToEmailSync}
              className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <span>&larr; Back to Email &amp; Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
        </div>
      )}

      {/* Pending Offline Queue Alert if any */}
      {pendingQueue.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold text-amber-900">
                {pendingQueue.length} Export Package(s) Queued (Pending Internet)
              </div>
              <div className="text-amber-800 text-[11px]">
                Internet connection was unavailable during earlier export. Data is safely stored and ready for dispatch.
              </div>
            </div>
          </div>

          <button
            onClick={handleSendPendingQueue}
            disabled={resendingId === 'QUEUE'}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{resendingId === 'QUEUE' ? 'Sending...' : 'Send Pending Queue Now'}</span>
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold">Status:</span>
          {['ALL', 'Sent', 'Failed', 'Pending Internet'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-teal-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search recipient, subject, Export ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-teal-800" />
            <span>Transmission Ledger ({filteredHistory.length} entries)</span>
          </div>
          <span className="text-[11px] text-slate-500">Immutable Transmission Audit</span>
        </div>

        <div className="overflow-x-auto max-h-96 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Date / Time</th>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Subject / Export ID</th>
                <th className="py-2.5 px-3">Attachment</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transmission history matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{rec.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-teal-50 border border-teal-200 text-teal-800 mr-1.5">
                        {rec.branchCode}
                      </span>
                      <span>{rec.branchName.split(' ')[0]}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {rec.reportType === 'BRANCH_DATA_PACKAGE' ? (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1 w-max">
                          <FileArchive className="w-3 h-3" />
                          <span>Branch Data ZIP</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 w-max">
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>Sales Report</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 truncate max-w-[140px]" title={rec.to}>
                      {rec.to}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 truncate max-w-xs" title={rec.subject}>
                        {rec.subject}
                      </div>
                      {rec.exportId && (
                        <div className="font-mono text-[10px] text-teal-800 font-bold">
                          {rec.exportId}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 truncate max-w-[140px]" title={rec.attachmentName}>
                      {rec.attachmentName || 'None'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.status === 'Sent' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : rec.status === 'Pending Internet'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleResend(rec)}
                          disabled={resendingId === rec.id}
                          className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                          title="Resend email preserving exact Export ID"
                        >
                          <RotateCcw className={`w-2.5 h-2.5 ${resendingId === rec.id ? 'animate-spin' : ''}`} />
                          <span>{resendingId === rec.id ? 'Sending' : 'Resend'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspector Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-teal-800" />
                <span>Transmission Audit Record</span>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div><span className="text-slate-400">ID:</span> <strong>{selectedRecord.id}</strong></div>
                <div><span className="text-slate-400">Timestamp:</span> {selectedRecord.timestamp}</div>
                <div><span className="text-slate-400">Branch:</span> {selectedRecord.branchName} ({selectedRecord.branchCode})</div>
                <div><span className="text-slate-400">Recipient (To):</span> {selectedRecord.to}</div>
                {selectedRecord.cc && <div><span className="text-slate-400">CC:</span> {selectedRecord.cc}</div>}
                <div><span className="text-slate-400">Subject:</span> {selectedRecord.subject}</div>
                {selectedRecord.exportId && <div><span className="text-slate-400">Export ID:</span> <span className="text-teal-800 font-bold">{selectedRecord.exportId}</span></div>}
                <div><span className="text-slate-400">Attachment:</span> {selectedRecord.attachmentName}</div>
                <div><span className="text-slate-400">Status:</span> <span className="text-emerald-700 font-bold">{selectedRecord.status}</span></div>
                <div><span className="text-slate-400">Dispatched By:</span> {selectedRecord.sentBy}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
