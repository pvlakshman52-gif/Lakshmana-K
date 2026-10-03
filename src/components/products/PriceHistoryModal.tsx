import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ProductPriceHistory } from '../../types/erp';
import { 
  History, 
  X, 
  Download, 
  Filter, 
  Search, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  Boxes,
  Lock,
  Calendar,
  UserCheck,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterProductId?: string;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  filterProductId
}) => {
  const { priceHistory, products, clearPriceHistory } = useClinic();

  const [selectedProdId, setSelectedProdId] = useState<string>(filterProductId || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState<string | null>(null);

  // Update selectedProdId if prop changes
  React.useEffect(() => {
    if (filterProductId) {
      setSelectedProdId(filterProductId);
    }
  }, [filterProductId]);

  const filteredHistory = useMemo(() => {
    return priceHistory.filter(h => {
      if (selectedProdId !== 'ALL' && h.productId !== selectedProdId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          h.productName.toLowerCase().includes(q) ||
          h.productCode.toLowerCase().includes(q) ||
          (h.reason && h.reason.toLowerCase().includes(q)) ||
          h.changedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [priceHistory, selectedProdId, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalChanges = priceHistory.length;
    const uniqueProducts = new Set(priceHistory.map(h => h.productId)).size;
    const totalPreservedBatches = priceHistory.reduce((sum, h) => sum + (h.batchesPreservedCount || 0), 0);
    return { totalChanges, uniqueProducts, totalPreservedBatches };
  }, [priceHistory]);

  const exportCSV = () => {
    const headers = [
      'History ID',
      'Date & Time',
      'Product Code',
      'Product Name',
      'Old Cost Price',
      'New Cost Price',
      'Cost Diff',
      'Old Selling Price',
      'New Selling Price',
      'Selling Diff',
      'Preserved Batches',
      'Changed By',
      'Reason'
    ];

    const rows = filteredHistory.map(h => [
      h.historyId,
      new Date(h.changedDate).toLocaleString('en-IN'),
      h.productCode,
      `"${h.productName}"`,
      h.oldCostPrice,
      h.newCostPrice,
      h.newCostPrice - h.oldCostPrice,
      h.oldSellingPrice,
      h.newSellingPrice,
      h.newSellingPrice - h.oldSellingPrice,
      h.batchesPreservedCount || 0,
      `"${h.changedBy}"`,
      `"${h.reason || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Product_Price_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <History className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Product Price History & Batch Costing Audit Table
                </h2>
                <span className="text-[10px] bg-teal-500/30 text-teal-200 border border-teal-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  {filteredHistory.length} Revisions
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Batch-wise costing audit trail. Historical inventory batches strictly keep their original cost & selling prices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {priceHistory.length > 0 && (
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Clear Price Revision History & Batch Costing Audit Trail"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear History</span>
              </button>
            )}
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Export Price History Log as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top KPI Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-sans">Total Price Revisions</div>
              <div className="text-base font-bold text-slate-900 font-mono">{stats.totalChanges}</div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-sans">Formulary Products Revised</div>
              <div className="text-base font-bold text-slate-900 font-mono">{stats.uniqueProducts} Products</div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-sans">Historical Batches Preserved</div>
              <div className="text-base font-bold text-emerald-800 font-mono">{stats.totalPreservedBatches} Batches Locked</div>
            </div>
          </div>
        </div>

        {/* Success Alert Banner if Cleared */}
        {clearSuccessMsg && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{clearSuccessMsg}</span>
            </div>
            <button
              onClick={() => setClearSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by product, reason, user..."
              className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:bg-white text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedProdId}
                onChange={e => setSelectedProdId(e.target.value)}
                className="w-full sm:w-64 p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 text-xs focus:outline-hidden"
              >
                <option value="ALL">All Products Formulary ({priceHistory.length} logs)</option>
                {products.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.productCode} - {p.productName}
                  </option>
                ))}
              </select>
            </div>

            {(selectedProdId !== 'ALL' || searchQuery.trim() !== '') && (
              <button
                onClick={() => {
                  setSelectedProdId('ALL');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 text-[11px] text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors"
                title="Clear all filters and show all revision records"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700">No price revision history found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || selectedProdId !== 'ALL' 
                  ? 'No revision records match your active search filters. Try clearing your filters.'
                  : 'Whenever a product price is updated in Product Master, an audit entry will be recorded here automatically.'}
              </p>
              {(searchQuery || selectedProdId !== 'ALL') && (
                <button
                  onClick={() => {
                    setSelectedProdId('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Product Formulary</th>
                    <th className="py-2.5 px-3 text-right">Cost Price (Old → New)</th>
                    <th className="py-2.5 px-3 text-right">Selling Price (Old → New)</th>
                    <th className="py-2.5 px-3 text-center">Batch Impact</th>
                    <th className="py-2.5 px-3">Reason / Justification</th>
                    <th className="py-2.5 px-3">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredHistory.map(item => {
                    const costDiff = item.newCostPrice - item.oldCostPrice;
                    const sellingDiff = item.newSellingPrice - item.oldSellingPrice;

                    const oldMargin = item.oldSellingPrice > 0 
                      ? (((item.oldSellingPrice - item.oldCostPrice) / item.oldSellingPrice) * 100).toFixed(1)
                      : '0.0';
                    const newMargin = item.newSellingPrice > 0 
                      ? (((item.newSellingPrice - item.newCostPrice) / item.newSellingPrice) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <tr key={item.historyId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(item.changedDate).toLocaleDateString('en-IN')}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block pl-4.5">
                            {new Date(item.changedDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          <div className="text-[10px] font-mono text-teal-700 font-medium">{item.productCode}</div>
                        </td>

                        <td className="py-3 px-3 text-right font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 line-through">₹{item.oldCostPrice}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-slate-900">₹{item.newCostPrice}</span>
                          </div>
                          {costDiff !== 0 && (
                            <span className={`inline-flex items-center text-[10px] font-bold ${
                              costDiff > 0 ? 'text-amber-700' : 'text-emerald-700'
                            }`}>
                              {costDiff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {costDiff > 0 ? `+₹${costDiff}` : `-₹${Math.abs(costDiff)}`}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 line-through">₹{item.oldSellingPrice}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-teal-800">₹{item.newSellingPrice}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            Margin: {oldMargin}% → <strong className="text-teal-800 font-mono">{newMargin}%</strong>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                            <Lock className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{item.batchesPreservedCount ?? 0} batches locked</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <p className="text-slate-700 text-xs leading-relaxed">
                            {item.reason || 'Product Master price update'}
                          </p>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-[11px]">{item.changedBy}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-teal-700" />
            <span>Strict batch-wise costing guarantee: Product Master changes do not overwrite historical batch prices.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Confirmation Modal to Clear Price History */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-300 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700 pb-2 border-b border-rose-100">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-rose-950">Clear Price History & Batch Costing Audit?</h3>
                <p className="text-[11px] text-rose-700">Permanent Audit Log Deletion</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear the audit history records? This removes the chronological price revision log.
              Historical inventory stock batches will still retain their locked cost and selling prices.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              {selectedProdId !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    clearPriceHistory(selectedProdId);
                    const prodName = products.find(p => p.productId === selectedProdId)?.productName || 'Selected Product';
                    setClearSuccessMsg(`Cleared price revision history for ${prodName}.`);
                    setIsClearConfirmOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Only Selected Product History ({filteredHistory.length} logs)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  clearPriceHistory();
                  setClearSuccessMsg('All product price revision & batch costing audit logs cleared.');
                  setIsClearConfirmOpen(false);
                  setSelectedProdId('ALL');
                  setSearchQuery('');
                }}
                className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Audit Records ({priceHistory.length} logs)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel & Keep History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
