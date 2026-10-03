import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { AdjustmentType } from '../../types/erp';
import { Sliders, X, AlertTriangle } from 'lucide-react';

interface StockAdjustmentModalProps {
  initialBatchId?: string;
  onClose: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ initialBatchId, onClose }) => {
  const { locations, batches, products, selectedLocationId, executeStockAdjustment } = useClinic();

  const defaultLoc = selectedLocationId === 'ALL' ? 'LOC-HOS' : selectedLocationId;
  const [locationId, setLocationId] = useState<string>(defaultLoc);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId || '');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('Expired');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Quarantine expired clinic stock / seal breakage');

  const availableBatches = batches.filter(b => b.locationId === locationId);
  const currentBatch = availableBatches.find(b => b.batchId === selectedBatchId);
  const currentProduct = currentBatch ? products.find(p => p.productId === currentBatch.productId) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBatch || quantity <= 0) {
      alert('Please select a batch and enter a valid quantity.');
      return;
    }

    if ((adjustmentType === 'Negative' || adjustmentType === 'Expired' || adjustmentType === 'Damage') &&
        quantity > currentBatch.currentQuantity) {
      alert(`Cannot deduct more than current batch stock (${currentBatch.currentQuantity})`);
      return;
    }

    executeStockAdjustment(
      locationId,
      currentBatch.productId,
      currentBatch.batchId,
      adjustmentType,
      quantity,
      reason
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm text-slate-900">Stock Adjustment & Write-off</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          
          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Clinic Branch</label>
            <select
              value={locationId}
              onChange={e => {
                setLocationId(e.target.value);
                setSelectedBatchId('');
              }}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
            >
              {locations.map(l => (
                <option key={l.locationId} value={l.locationId}>
                  {l.locationCode} - {l.locationName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Select Batch</label>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              required
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-white"
            >
              <option value="">-- Choose Batch to Adjust --</option>
              {availableBatches.map(b => {
                const p = products.find(prod => prod.productId === b.productId);
                return (
                  <option key={b.batchId} value={b.batchId}>
                    {p?.productName.slice(0, 24)}... | {b.batchNumber} (Current Qty: {b.currentQuantity})
                  </option>
                );
              })}
            </select>
          </div>

          {currentBatch && (
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] font-mono">
              <div className="text-slate-600">Product: <strong className="text-slate-900">{currentProduct?.productName}</strong></div>
              <div className="text-slate-600">Batch Expiry: <strong className="text-slate-900">{currentBatch.expiryDate}</strong></div>
              <div className="text-slate-600">Current Qty: <strong className="text-teal-700">{currentBatch.currentQuantity} units</strong></div>
            </div>
          )}

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Expired', 'Damage', 'Negative', 'Positive'] as AdjustmentType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAdjustmentType(type)}
                  className={`py-2 px-3 rounded-lg border font-medium transition-colors text-left ${
                    adjustmentType === type
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {type === 'Expired' && '⏰ Expired (Write-off)'}
                  {type === 'Damage' && '💥 Damaged / Leaked'}
                  {type === 'Negative' && '📉 Stock Count Deficit'}
                  {type === 'Positive' && '📈 Surplus Found (+)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Quantity to Adjust</label>
            <input
              type="number"
              min="1"
              max={adjustmentType !== 'Positive' && currentBatch ? currentBatch.currentQuantity : 9999}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Reason / Audit Justification</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              placeholder="e.g. Expired batch disposed as biomedical waste"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedBatchId}
              className="px-5 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Confirm Adjustment
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
