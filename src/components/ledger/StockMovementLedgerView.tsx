import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { StockMovementType } from '../../types/erp';
import { Search, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, FileSpreadsheet } from 'lucide-react';

export const StockMovementLedgerView: React.FC = () => {
  const { ledger, products, locations, selectedLocationId } = useClinic();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [openingBatchFilter, setOpeningBatchFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique opening batch reference numbers
  const openingBatchNumbers = useMemo(() => {
    const refs = new Set<string>();
    ledger.forEach(item => {
      if (item.movementType === 'Opening Stock' && item.referenceNo) {
        refs.add(item.referenceNo);
      }
    });
    return Array.from(refs).sort();
  }, [ledger]);

  const filteredLedger = useMemo(() => {
    return ledger.filter(item => {
      if (selectedLocationId !== 'ALL' && item.locationId !== selectedLocationId) {
        return false;
      }
      if (typeFilter !== 'ALL' && item.movementType !== typeFilter) {
        return false;
      }
      if (openingBatchFilter !== 'ALL' && item.referenceNo !== openingBatchFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prod = products.find(p => p && p.productId === item.productId);
        const matchProd = prod && (prod.productName.toLowerCase().includes(q) || prod.productCode.toLowerCase().includes(q));
        const matchRef = (item.referenceNo || '').toLowerCase().includes(q);
        const matchUser = (item.createdBy || '').toLowerCase().includes(q);
        return Boolean(matchProd || matchRef || matchUser);
      }
      return true;
    });
  }, [ledger, products, selectedLocationId, typeFilter, openingBatchFilter, searchQuery]);

  // Aggregate stats
  const totals = useMemo(() => {
    let qtyIn = 0;
    let qtyOut = 0;
    filteredLedger.forEach(row => {
      qtyIn += row.qtyIn;
      qtyOut += row.qtyOut;
    });
    return { qtyIn, qtyOut, count: filteredLedger.length };
  }, [filteredLedger]);

  const exportCSV = () => {
    const headers = ['MovementId', 'Date', 'Location', 'ProductCode', 'ProductName', 'MovementType', 'ReferenceNo', 'QtyIn', 'QtyOut', 'BalanceQty', 'CreatedBy'];
    const rows = filteredLedger.map(item => {
      const prod = products.find(p => p && p.productId === item.productId);
      const loc = locations.find(l => l.locationId === item.locationId);
      return [
        item.movementId,
        item.createdDate,
        loc?.locationCode || item.locationId,
        prod?.productCode || '',
        `"${prod?.productName || ''}"`,
        item.movementType,
        item.referenceNo,
        item.qtyIn,
        item.qtyOut,
        item.balanceQty,
        `"${item.createdBy}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Movement_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Architectural Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Stock Movement Ledger
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
              Master Audit Log
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable perpetual inventory journal — every purchase, dispensing sale, clinic transfer, and expiry write-off.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* KPI Ledger Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-500 text-[11px]">Filtered Ledger Events</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {totals.count} <span className="text-xs font-sans text-slate-400 font-normal">entries</span>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cumulative Inflow (Qty In)</span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-800 mt-1 tabular-nums">
            +{totals.qtyIn} <span className="text-xs font-sans text-emerald-600 font-normal">units</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-600 text-[11px] font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
            <span>Cumulative Outflow (Qty Out)</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-800 mt-1 tabular-nums">
            -{totals.qtyOut} <span className="text-xs font-sans text-slate-500 font-normal">units</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search & Opening Batch Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ref #, invoice #, product or staff..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {openingBatchNumbers.length > 0 && (
            <select
              value={openingBatchFilter}
              onChange={e => setOpeningBatchFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              title="Filter by Opening Batch Number"
            >
              <option value="ALL">All Reference Numbers</option>
              <optgroup label="Opening Stock Batches">
                {openingBatchNumbers.map(batchNo => (
                  <option key={batchNo} value={batchNo}>
                    {batchNo}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
        </div>

        {/* Movement Type Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto overflow-x-auto text-xs">
          {['ALL', 'Opening Stock', 'Sale', 'Purchase', 'Transfer In', 'Transfer Out', 'Adjustment', 'Expiry'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                typeFilter === type ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 font-mono">Reference No</th>
                <th className="py-3 px-4 text-right">In (+)</th>
                <th className="py-3 px-4 text-right">Out (-)</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLedger.map((item, idx) => {
                const prod = products.find(p => p && p.productId === item.productId);
                const loc = locations.find(l => l.locationId === item.locationId);

                // Movement styling
                const isPositive = item.qtyIn > 0;
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (item.movementType === 'Opening Stock') badgeClass = 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80';
                else if (item.movementType === 'Sale') badgeClass = 'bg-teal-50 text-teal-800';
                else if (item.movementType === 'Purchase') badgeClass = 'bg-emerald-50 text-emerald-800';
                else if (item.movementType === 'Expiry') badgeClass = 'bg-rose-50 text-rose-800';
                else if (item.movementType.includes('Transfer')) badgeClass = 'bg-sky-50 text-sky-800';
                else if (item.movementType === 'Adjustment') badgeClass = 'bg-amber-50 text-amber-800';

                return (
                  <tr key={`${item.movementId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                      <div>{item.createdDate.split('T')[0]}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.createdDate.includes('T') ? item.createdDate.split('T')[1].slice(0, 5) : '10:00'}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {loc?.locationCode}
                      </span>
                    </td>

                    {/* Movement Type */}
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass}`}>
                        {item.movementType}
                      </span>
                    </td>

                    {/* Product */}
                    <td className="py-2.5 px-4 font-sans">
                      <div className="font-medium text-slate-900 line-clamp-1">{prod?.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{prod?.productCode}</div>
                    </td>

                    {/* Reference # */}
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">
                      {item.referenceNo}
                    </td>

                    {/* In */}
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {item.qtyIn > 0 ? (
                        <span className="text-emerald-700 font-bold">+{item.qtyIn}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Out */}
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {item.qtyOut > 0 ? (
                        <span className="text-rose-600 font-bold">-{item.qtyOut}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {item.balanceQty}
                    </td>

                    {/* User */}
                    <td className="py-2.5 px-4 font-sans text-slate-600 text-[11px]">
                      {item.createdBy}
                    </td>

                  </tr>
                );
              })}

              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    <p className="text-xs">No ledger movements match the current filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
