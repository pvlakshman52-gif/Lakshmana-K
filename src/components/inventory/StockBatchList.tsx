import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { StockTransferModal } from './StockTransferModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { AddBatchModal } from './AddBatchModal';
import { EditBatchModal } from './EditBatchModal';
import { OpeningStockModal } from './OpeningStockModal';
import { ProductIcon } from '../common/ProductIcon';
import { StockBatch } from '../../types/erp';
import { getCategoryDisplayName } from '../../utils/categoryUtils';
import { 
  Plus, 
  ArrowRightLeft, 
  Sliders, 
  Search, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Calendar,
  AlertCircle,
  Edit2,
  Layers
} from 'lucide-react';

interface StockBatchListProps {
  onNavigateToOpeningStock?: () => void;
}

export const StockBatchList: React.FC<StockBatchListProps> = ({ onNavigateToOpeningStock }) => {
  const { batches, products, categories, locations, selectedLocationId } = useClinic();

  const [searchQuery, setSearchQuery] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'EXPIRED' | '30DAYS' | '60DAYS' | 'HEALTHY'>('ALL');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<StockBatch | null>(null);
  const [targetBatchId, setTargetBatchId] = useState<string | undefined>(undefined);

  const today = new Date('2026-09-26');

  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      // Location filter
      if (selectedLocationId !== 'ALL' && batch.locationId !== selectedLocationId) {
        return false;
      }

      // Expiry calculation
      const exp = new Date(batch.expiryDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

      if (expiryFilter === 'EXPIRED' && diffDays >= 0) return false;
      if (expiryFilter === '30DAYS' && (diffDays < 0 || diffDays > 30)) return false;
      if (expiryFilter === '60DAYS' && (diffDays <= 30 || diffDays > 60)) return false;
      if (expiryFilter === 'HEALTHY' && diffDays <= 60) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prod = products.find(p => p && p.productId === batch.productId);
        const matchProd = prod && (prod.productName.toLowerCase().includes(q) || prod.productCode.toLowerCase().includes(q));
        const matchBatch = (batch.batchNumber || '').toLowerCase().includes(q) || (batch.supplierName || '').toLowerCase().includes(q);
        return Boolean(matchProd || matchBatch);
      }

      return true;
    });
  }, [batches, products, selectedLocationId, expiryFilter, searchQuery]);

  // Overall batch statistics
  const stats = useMemo(() => {
    const locBatches = batches.filter(b => selectedLocationId === 'ALL' || b.locationId === selectedLocationId);
    let expired = 0;
    let within30 = 0;
    let within60 = 0;
    let totalStockQty = 0;
    let totalValuation = 0;

    locBatches.forEach(b => {
      totalStockQty += b.currentQuantity;
      totalValuation += b.currentQuantity * b.costPrice;

      const exp = new Date(b.expiryDate);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diff < 0) expired++;
      else if (diff <= 30) within30++;
      else if (diff <= 60) within60++;
    });

    return { expired, within30, within60, totalStockQty, totalValuation };
  }, [batches, selectedLocationId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Stock Batches & Expiry Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time batch tracking, shelf-life alerts, inter-clinic transfers and audit adjustments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateToOpeningStock ? onNavigateToOpeningStock() : setIsOpeningStockModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-800 border border-indigo-200/90 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer min-h-[44px]"
            title="Add opening stock for multiple products with a common Opening Batch Number"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>+ Opening Stock</span>
          </button>

          <button
            onClick={() => setIsAddBatchModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 text-white rounded-xl text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Inward Batch</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[44px]"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
            <span>Stock Transfer</span>
          </button>

          <button
            onClick={() => {
              setTargetBatchId(undefined);
              setIsAdjustmentModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[44px]"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* Expiry Risk KPI Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-500 text-[11px]">Total Stock In Batches</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {stats.totalStockQty} <span className="text-xs font-sans text-slate-400 font-normal">units</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            Valuation: ₹{stats.totalValuation.toLocaleString()}
          </div>
        </div>

        <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 shadow-2xs">
          <div className="text-rose-700 text-[11px] font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Expired Batches</span>
          </div>
          <div className="text-lg font-bold font-mono text-rose-700 mt-1 tabular-nums">
            {stats.expired} <span className="text-xs font-sans text-rose-600/80 font-normal">quarantine</span>
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">Requires disposal write-off</div>
        </div>

        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 shadow-2xs">
          <div className="text-amber-800 text-[11px] font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Expiring in ≤30 Days</span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-800 mt-1 tabular-nums">
            {stats.within30} <span className="text-xs font-sans text-amber-700 font-normal">urgent</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">Prioritize via FIFO billing</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-600 text-[11px] font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Expiring in 31–60 Days</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-800 mt-1 tabular-nums">
            {stats.within60} <span className="text-xs font-sans text-slate-500 font-normal">warning</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Plan clinic dispensing</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product name or batch #..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        {/* Expiry Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => setExpiryFilter('ALL')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              expiryFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Batches
          </button>
          <button
            onClick={() => setExpiryFilter('EXPIRED')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              expiryFilter === 'EXPIRED' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expired ({stats.expired})
          </button>
          <button
            onClick={() => setExpiryFilter('30DAYS')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              expiryFilter === '30DAYS' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ≤ 30 Days ({stats.within30})
          </button>
          <button
            onClick={() => setExpiryFilter('60DAYS')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              expiryFilter === '60DAYS' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            31–60 Days ({stats.within60})
          </button>
          <button
            onClick={() => setExpiryFilter('HEALTHY')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              expiryFilter === 'HEALTHY' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Healthy Stock
          </button>
        </div>
      </div>

      {/* Batches Table & Mobile Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Desktop & Tablet Table (Hidden on small mobile) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-right">Inward / Left</th>
                <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                <th className="py-3 px-4 text-right">Selling Price (₹)</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-4 text-right">Batch Value</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.map(batch => {
                const prod = products.find(p => p && p.productId === batch.productId);
                const loc = locations.find(l => l.locationId === batch.locationId);
                const cat = categories.find(c => c.categoryId === prod?.categoryId);

                // Expiry math
                const exp = new Date(batch.expiryDate);
                const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
                const isExpired = diffDays < 0;
                const isUrgent = diffDays >= 0 && diffDays <= 30;
                const isWarning = diffDays > 30 && diffDays <= 60;

                const valuation = batch.currentQuantity * batch.costPrice;

                return (
                  <tr key={batch.batchId} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Product */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <ProductIcon 
                          categoryId={prod?.categoryId || 'CAT-SKIN'} 
                          imagePath={prod?.imagePath}
                          productName={prod?.productName}
                          size={28} 
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{prod?.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {prod?.productCode} · {getCategoryDisplayName(prod, categories)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                        {loc?.locationCode}
                      </span>
                    </td>

                    {/* Batch No & Supplier */}
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-slate-900">{batch.batchNumber}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{batch.supplierName}</div>
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3 px-4 font-mono">
                      <div className="text-slate-800">{batch.expiryDate}</div>
                      <div className="mt-0.5">
                        {isExpired ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            EXPIRED ({Math.abs(diffDays)}d ago)
                          </span>
                        ) : isUrgent ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {diffDays} days left (FIFO Alert)
                          </span>
                        ) : isWarning ? (
                          <span className="text-[10px] text-amber-600">
                            {diffDays} days left
                          </span>
                        ) : (
                          <span className="text-[10px] text-teal-700">
                            Healthy ({diffDays}d)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stock Counts */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="font-bold text-slate-900 text-sm">{batch.currentQuantity}</div>
                      <div className="text-[10px] text-slate-400 font-normal">of {batch.quantityReceived} units</div>
                    </td>

                    {/* Cost Price */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      ₹{batch.costPrice}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ₹{batch.sellingPrice || prod?.sellingPrice || Math.round(batch.costPrice * 1.5)}
                    </td>

                    {/* Margin % */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {(() => {
                        const sp = batch.sellingPrice || prod?.sellingPrice || Math.round(batch.costPrice * 1.5);
                        const margin = sp > 0 ? (((sp - batch.costPrice) / sp) * 100) : 0;
                        return (
                          <span className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-bold text-[11px]">
                            {margin.toFixed(1)}%
                          </span>
                        );
                      })()}
                    </td>

                    {/* Valuation */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 tabular-nums">
                      ₹{valuation.toLocaleString()}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingBatch(batch)}
                          className="px-2 py-1 text-[11px] text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit batch quantity, price, expiry or supplier"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setTargetBatchId(batch.batchId);
                            setIsAdjustmentModalOpen(true);
                          }}
                          className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                          title="Adjust or Write-off"
                        >
                          Adjust
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="text-xs">No batches match the current filter and location criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Card-based batch list for phones */}
        <div className="sm:hidden divide-y divide-slate-100 p-3 space-y-3">
          {filteredBatches.map(batch => {
            const prod = products.find(p => p && p.productId === batch.productId);
            const loc = locations.find(l => l.locationId === batch.locationId);
            const exp = new Date(batch.expiryDate);
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            const isExpired = diffDays < 0;
            const isUrgent = diffDays >= 0 && diffDays <= 30;
            const sp = batch.sellingPrice || prod?.sellingPrice || Math.round(batch.costPrice * 1.5);
            const valuation = batch.currentQuantity * batch.costPrice;

            return (
              <div key={`m-${batch.batchId}`} className="bg-slate-50/60 rounded-xl p-3 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ProductIcon 
                      categoryId={prod?.categoryId || 'CAT-SKIN'} 
                      imagePath={prod?.imagePath}
                      productName={prod?.productName}
                      size={28} 
                    />
                    <div>
                      <div className="font-bold text-slate-900 leading-snug">{prod?.productName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {batch.batchNumber} · {loc?.locationCode} Branch
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm text-teal-800 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    {batch.currentQuantity} units
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400">Exp: </span>
                    <strong className={isExpired ? 'text-rose-600' : isUrgent ? 'text-amber-600' : 'text-slate-800'}>
                      {batch.expiryDate}
                    </strong>
                    {isExpired ? ' (Expired)' : isUrgent ? ` (${diffDays}d)` : ''}
                  </div>
                  <div>
                    <span className="text-slate-400">Selling: </span>
                    <strong className="text-slate-900">₹{sp}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Val: </span>
                    <strong className="text-slate-700">₹{valuation}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setEditingBatch(batch)}
                    className="min-h-[44px] px-3.5 py-2 bg-white text-teal-700 hover:bg-teal-50 rounded-xl border border-teal-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Batch</span>
                  </button>
                  <button
                    onClick={() => {
                      setTargetBatchId(batch.batchId);
                      setIsAdjustmentModalOpen(true);
                    }}
                    className="min-h-[44px] px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span>Adjust Stock</span>
                  </button>
                </div>
              </div>
            );
          })}
          {filteredBatches.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No batches match the current filter and location criteria.
            </div>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      {isTransferModalOpen && (
        <StockTransferModal onClose={() => setIsTransferModalOpen(false)} />
      )}

      {isAdjustmentModalOpen && (
        <StockAdjustmentModal
          initialBatchId={targetBatchId}
          onClose={() => {
            setIsAdjustmentModalOpen(false);
            setTargetBatchId(undefined);
          }}
        />
      )}

      {isAddBatchModalOpen && (
        <AddBatchModal onClose={() => setIsAddBatchModalOpen(false)} />
      )}

      {isOpeningStockModalOpen && (
        <OpeningStockModal onClose={() => setIsOpeningStockModalOpen(false)} />
      )}

      {editingBatch && (
        <EditBatchModal batch={editingBatch} onClose={() => setEditingBatch(null)} />
      )}

    </div>
  );
};
