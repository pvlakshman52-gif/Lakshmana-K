import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  TrendingUp, 
  Building2, 
  Calendar, 
  Filter, 
  IndianRupee, 
  FileSpreadsheet, 
  Printer, 
  ArrowRight, 
  PieChart, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ConsolidatedSalesViewProps {
  onNavigateToEmailSync?: () => void;
  onNavigateToImport?: () => void;
}

export const ConsolidatedSalesView: React.FC<ConsolidatedSalesViewProps> = ({
  onNavigateToEmailSync,
  onNavigateToImport
}) => {
  const { sales, locations, currentUser } = useClinic();

  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [periodPreset, setPeriodPreset] = useState<'ALL_TIME' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_15_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL_TIME');

  const todayStr = new Date().toISOString().substring(0, 10);
  const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
  const [customFrom, setCustomFrom] = useState<string>(monthStartStr);
  const [customTo, setCustomTo] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Date boundaries
  const dateRange = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const now = new Date();
    switch (periodPreset) {
      case 'TODAY':
        return { from: todayStr, to: todayStr };
      case 'LAST_7_DAYS': {
        const d = new Date(now);
        d.setDate(now.getDate() - 6);
        return { from: toYmd(d), to: todayStr };
      }
      case 'LAST_15_DAYS': {
        const d = new Date(now);
        d.setDate(now.getDate() - 14);
        return { from: toYmd(d), to: todayStr };
      }
      case 'THIS_MONTH':
        return { from: monthStartStr, to: todayStr };
      case 'CUSTOM':
        return { from: customFrom, to: customTo };
      case 'ALL_TIME':
      default:
        return { from: '2020-01-01', to: '2030-12-31' };
    }
  }, [periodPreset, todayStr, monthStartStr, customFrom, customTo]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Branch filter
      if (branchFilter !== 'ALL' && s.locationId !== branchFilter) {
        return false;
      }
      // Date filter
      const sDate = s.saleDate.substring(0, 10);
      if (sDate < dateRange.from || sDate > dateRange.to) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = s.invoiceNo.toLowerCase().includes(q);
        const matchCust = s.customerName.toLowerCase().includes(q) || s.customerPhone.includes(q);
        if (!matchInvoice && !matchCust) return false;
      }
      return true;
    });
  }, [sales, branchFilter, dateRange, searchQuery]);

  // Branch summaries
  const branchBreakdown = useMemo(() => {
    const map = new Map<string, {
      locationId: string;
      code: string;
      name: string;
      bills: number;
      gross: number;
      discount: number;
      net: number;
      cash: number;
      upi: number;
    }>();

    // Initialize all existing locations
    locations.forEach(loc => {
      map.set(loc.locationId, {
        locationId: loc.locationId,
        code: loc.locationCode,
        name: loc.locationName,
        bills: 0,
        gross: 0,
        discount: 0,
        net: 0,
        cash: 0,
        upi: 0
      });
    });

    sales.forEach(s => {
      const sDate = s.saleDate.substring(0, 10);
      if (sDate < dateRange.from || sDate > dateRange.to) return;

      const locId = s.locationId || locations[0].locationId;
      const cur = map.get(locId) || {
        locationId: locId,
        code: (s as any).sourceBranchCode || 'BR',
        name: 'Branch ' + locId,
        bills: 0,
        gross: 0,
        discount: 0,
        net: 0,
        cash: 0,
        upi: 0
      };

      cur.bills += 1;
      cur.gross += s.grossAmount || 0;
      cur.discount += s.discountAmount || 0;
      cur.net += s.netAmount || 0;
      if (s.paymentMode === 'Cash') cur.cash += s.netAmount;
      else if (s.paymentMode === 'UPI') cur.upi += s.netAmount;

      map.set(locId, cur);
    });

    return Array.from(map.values()).filter(b => b.bills > 0 || b.locationId === 'LOC-HOS' || b.locationId === 'LOC-HUB');
  }, [sales, locations, dateRange]);

  // Overall totals
  const totalNet = useMemo(() => {
    return branchBreakdown.reduce((sum, b) => sum + b.net, 0);
  }, [branchBreakdown]);

  const totalBills = useMemo(() => {
    return branchBreakdown.reduce((sum, b) => sum + b.bills, 0);
  }, [branchBreakdown]);

  const totalCash = useMemo(() => {
    return branchBreakdown.reduce((sum, b) => sum + b.cash, 0);
  }, [branchBreakdown]);

  const totalUpi = useMemo(() => {
    return branchBreakdown.reduce((sum, b) => sum + b.upi, 0);
  }, [branchBreakdown]);

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Branch Summary
    const branchRows = [
      ['MEDICLINIC COMMERCE ERP - CONSOLIDATED MULTI-BRANCH SALES REPORT'],
      ['Generated On', new Date().toLocaleString()],
      ['Filter Period', periodPreset === 'ALL_TIME' ? 'All Time' : `${dateRange.from} to ${dateRange.to}`],
      [],
      ['Branch Code', 'Branch Name', 'Invoices', 'Gross Sales (₹)', 'Discount (₹)', 'Net Revenue (₹)', 'Contribution %', 'Cash (₹)', 'UPI (₹)']
    ];

    branchBreakdown.forEach(b => {
      const share = totalNet > 0 ? ((b.net / totalNet) * 100).toFixed(1) + '%' : '0%';
      branchRows.push([
        b.code,
        b.name,
        b.bills as any,
        b.gross as any,
        b.discount as any,
        b.net as any,
        share,
        b.cash as any,
        b.upi as any
      ]);
    });

    branchRows.push([]);
    branchRows.push([
      'CONSOLIDATED TOTAL',
      'All Branches Combined',
      totalBills as any,
      branchBreakdown.reduce((s, b) => s + b.gross, 0) as any,
      branchBreakdown.reduce((s, b) => s + b.discount, 0) as any,
      totalNet as any,
      '100%',
      totalCash as any,
      totalUpi as any
    ]);

    const wsBranch = XLSX.utils.aoa_to_sheet(branchRows);
    XLSX.utils.book_append_sheet(wb, wsBranch, 'Branch Comparison');

    // Sheet 2: All Bills Register
    const billHeaders = ['Invoice No', 'Source Branch', 'Date', 'Customer', 'Phone', 'Payment Mode', 'Gross (₹)', 'Net (₹)'];
    const billRows = filteredSales.map(s => {
      const loc = locations.find(l => l.locationId === s.locationId);
      return [
        s.invoiceNo,
        loc ? `${loc.locationName} (${loc.locationCode})` : (s.sourceBranchCode || s.locationId),
        s.saleDate,
        s.customerName,
        s.customerPhone,
        s.paymentMode,
        s.grossAmount,
        s.netAmount
      ];
    });

    const wsBills = XLSX.utils.aoa_to_sheet([billHeaders, ...billRows]);
    XLSX.utils.book_append_sheet(wb, wsBills, 'Invoices Register');

    XLSX.writeFile(wb, `MediClinic_Consolidated_Sales_${todayStr}.xlsx`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white">
                Consolidated Multi-Branch Sales Reporting
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Enterprise Central Ledger
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Consolidated revenue intelligence across Hospete, Hubballi, and synchronized remote clinic branches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Consolidated (.xlsx)</span>
          </button>
          {onNavigateToEmailSync && (
            <button
              onClick={onNavigateToEmailSync}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <span>Branch Sync &rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          
          {/* Branch Filter Tabs (Requirement 23: All Branches, Hospete, Hubballi) */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Branch:</span>
            </span>

            <button
              onClick={() => setBranchFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                branchFilter === 'ALL'
                  ? 'bg-teal-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Branches
            </button>

            {locations.map(loc => (
              <button
                key={loc.locationId}
                onClick={() => setBranchFilter(loc.locationId)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  branchFilter === loc.locationId
                    ? 'bg-teal-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {loc.locationCode} &middot; {loc.locationName.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Period Presets */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px] font-bold mr-1">Period:</span>
            {[
              { id: 'ALL_TIME', label: 'All Time' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_15_DAYS', label: '15 Days' },
              { id: 'LAST_7_DAYS', label: '7 Days' },
              { id: 'TODAY', label: 'Today' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodPreset(p.id as any)}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  periodPreset === p.id 
                    ? 'bg-slate-900 text-teal-300' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

        </div>

        {/* Search Input */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search invoice number, patient name, phone..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
            />
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Showing <strong className="text-slate-900">{filteredSales.length}</strong> sales invoices
          </div>
        </div>
      </div>

      {/* 3. MULTI-BRANCH COMPARISON CARDS (Requirement 23 & 43) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Hospete Local Server */}
        {(() => {
          const hos = branchBreakdown.find(b => b.code === 'HOS') || { bills: 0, net: 0, cash: 0, upi: 0 };
          const share = totalNet > 0 ? ((hos.net / totalNet) * 100).toFixed(1) : '0';
          return (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-blue-100 text-blue-900">HOS</span>
                  <span>Hospete Clinic &amp; Derma Care</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500">{share}% share</span>
              </div>
              <div className="font-mono font-black text-xl text-slate-900">
                ₹{hos.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>{hos.bills} Invoices</span>
                <span>Cash: ₹{hos.cash.toLocaleString('en-IN')} &middot; UPI: ₹{hos.upi.toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })()}

        {/* Card 2: Hubballi Local Server (Synchronized) */}
        {(() => {
          const hub = branchBreakdown.find(b => b.code === 'HUB') || { bills: 0, net: 0, cash: 0, upi: 0 };
          const share = totalNet > 0 ? ((hub.net / totalNet) * 100).toFixed(1) : '0';
          return (
            <div className="p-4 bg-white rounded-2xl border border-teal-300 shadow-2xs space-y-2 bg-teal-50/30">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-teal-950 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-teal-600 text-white">HUB</span>
                  <span>Hubballi Skin &amp; Hair Center</span>
                </span>
                <span className="text-[10px] font-bold text-teal-700">{share}% share</span>
              </div>
              <div className="font-mono font-black text-xl text-teal-950">
                ₹{hub.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-teal-800 flex items-center justify-between pt-1 border-t border-teal-100">
                <span>{hub.bills} Invoices (Imported)</span>
                <span>Cash: ₹{hub.cash.toLocaleString('en-IN')} &middot; UPI: ₹{hub.upi.toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })()}

        {/* Card 3: Consolidated Total (Hospete + Hubballi) */}
        <div className="p-4 bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-teal-300">
            <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Consolidated Revenue Total</span>
            </span>
            <span className="text-[10px] font-bold font-mono bg-teal-800/80 px-2 py-0.5 rounded">100%</span>
          </div>
          <div className="font-mono font-black text-2xl text-teal-300">
            ₹{totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>{totalBills} Combined Invoices</span>
            <span className="font-mono">Cash ₹{totalCash.toLocaleString('en-IN')} &middot; UPI ₹{totalUpi.toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* 4. Branch Contribution Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">Branch Revenue Distribution Ratio</span>
          <span className="text-slate-500 font-mono text-[11px]">Total: ₹{totalNet.toLocaleString('en-IN')}</span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {branchBreakdown.map((b, idx) => {
            const pct = totalNet > 0 ? (b.net / totalNet) * 100 : 0;
            const bgClass = b.code === 'HOS' ? 'bg-blue-600' : b.code === 'HUB' ? 'bg-teal-500' : 'bg-amber-500';
            return (
              <div
                key={b.locationId}
                style={{ width: `${pct}%` }}
                className={`${bgClass} h-full transition-all`}
                title={`${b.name}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-[11px] pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="font-bold text-slate-700">Hospete (HOS)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <span className="font-bold text-slate-700">Hubballi (HUB)</span>
          </div>
        </div>
      </div>

      {/* 5. Invoices Table with Branch Badges */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-teal-800" />
            <span>Consolidated Sales Register ({filteredSales.length} items)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Source Branch Preserved</span>
        </div>

        <div className="overflow-x-auto max-h-96 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Source Branch</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Patient / Customer</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                <th className="py-2.5 px-3 text-right">Discount (₹)</th>
                <th className="py-2.5 px-3 text-right font-bold text-teal-900">Net Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                    No sales invoices found matching current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredSales.map(s => {
                  const loc = locations.find(l => l.locationId === s.locationId);
                  const isHub = loc?.locationCode === 'HUB' || s.sourceBranchCode === 'HUB' || s.invoiceNo.startsWith('HUB');
                  return (
                    <tr key={s.saleId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900">{s.invoiceNo}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isHub ? 'bg-teal-100 text-teal-900 border border-teal-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}>
                          {isHub ? 'HUB &middot; Hubballi' : 'HOS &middot; Hospete'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-sans">{s.saleDate}</td>
                      <td className="py-2 px-3 font-sans font-bold text-slate-800">{s.customerName}</td>
                      <td className="py-2 px-3 text-slate-500">{s.customerPhone}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                          {s.paymentMode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">₹{s.grossAmount.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-amber-700">₹{s.discountAmount.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-teal-900">₹{s.netAmount.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
