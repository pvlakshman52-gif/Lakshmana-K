import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ArrowRightLeft, X, AlertCircle } from 'lucide-react';

interface StockTransferModalProps {
  onClose: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({ onClose }) => {
  const { locations, batches, products, executeStockTransfer } = useClinic();

  const [fromLocId, setFromLocId] = useState<string>('LOC-HOS');
  const [toLocId, setToLocId] = useState<string>('LOC-HUB');
  const [remarks, setRemarks] = useState<string>('Regular stock balancing between clinic branches');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferItems, setTransferItems] = useState<{ batchId: string; productId: string; quantity: number }[]>([]);

  // Batches available at source location
  const sourceBatches = batches.filter(b => b.locationId === fromLocId && b.currentQuantity > 0);

  const handleAddItem = () => {
    if (!selectedBatchId || transferQty <= 0) return;
    const batch = sourceBatches.find(b => b.batchId === selectedBatchId);
    if (!batch) return;

    if (transferQty > batch.currentQuantity) {
      alert(`Cannot transfer more than available stock (${batch.currentQuantity})`);
      return;
    }

    setTransferItems(prev => [
      ...prev,
      {
        batchId: batch.batchId,
        productId: batch.productId,
        quantity: transferQty
      }
    ]);
    setSelectedBatchId('');
    setTransferQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromLocId === toLocId) {
      alert('Source and destination clinics must be different.');
      return;
    }
    if (transferItems.length === 0) {
      alert('Please add at least one product batch to transfer.');
      return;
    }

    executeStockTransfer({
      fromLocationId: fromLocId,
      toLocationId: toLocId,
      remarks,
      items: transferItems
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-lg w-full">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">Inter-Branch Stock Transfer</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          
          {/* Branch Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">From Clinic (Source)</label>
              <select
                value={fromLocId}
                onChange={e => {
                  setFromLocId(e.target.value);
                  setTransferItems([]); // Reset if source changes
                }}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
              >
                {locations.map(l => (
                  <option key={l.locationId} value={l.locationId}>
                    {l.locationCode} - {l.locationName.split(' ')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">To Clinic (Destination)</label>
              <select
                value={toLocId}
                onChange={e => setToLocId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50"
              >
                {locations.map(l => (
                  <option key={l.locationId} value={l.locationId}>
                    {l.locationCode} - {l.locationName.split(' ')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Batch Line */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-800">Select Batch & Quantity to Send</label>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8">
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                >
                  <option value="">-- Choose Stock Batch --</option>
                  {sourceBatches.map(b => {
                    const prod = products.find(p => p.productId === b.productId);
                    return (
                      <option key={b.batchId} value={b.batchId}>
                        {prod?.productName.slice(0, 24)}... | {b.batchNumber} (Stock: {b.currentQuantity})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={e => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono text-center"
                />
              </div>

              <div className="col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Selected Items List */}
          <div>
            <div className="text-[11px] font-semibold text-slate-600 mb-1">
              Items to Transfer ({transferItems.length})
            </div>
            {transferItems.length === 0 ? (
              <p className="text-slate-400 italic text-[11px] py-2">No batches added yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {transferItems.map((item, idx) => {
                  const b = batches.find(x => x.batchId === item.batchId);
                  const p = products.find(x => x.productId === item.productId);
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-xs font-mono">
                      <div>
                        <span className="font-sans font-medium text-slate-800">{p?.productName}</span>
                        <div className="text-[10px] text-slate-500">Batch: {b?.batchNumber}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-teal-700">Qty: {item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-700 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Remarks / Note</label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              placeholder="e.g. Urgent requisition for outpatient clinic"
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
              disabled={transferItems.length === 0}
              className="px-5 py-2 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 disabled:opacity-50"
            >
              Execute Transfer
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
