import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { StockBatch } from '../../types/erp';
import { Edit3, X, AlertTriangle, Trash2, Check } from 'lucide-react';

interface EditBatchModalProps {
  batch: StockBatch;
  onClose: () => void;
}

export const EditBatchModal: React.FC<EditBatchModalProps> = ({ batch, onClose }) => {
  const { products, locations, updateStockBatch, deleteStockBatch } = useClinic();

  const product = products.find(p => p.productId === batch.productId);
  const location = locations.find(l => l.locationId === batch.locationId);

  const [batchNumber, setBatchNumber] = useState(batch.batchNumber);
  const [expiryDate, setExpiryDate] = useState(batch.expiryDate);
  const [costPrice, setCostPrice] = useState(batch.costPrice);
  const [sellingPrice, setSellingPrice] = useState(batch.sellingPrice || product?.sellingPrice || Math.round(batch.costPrice * 1.5));
  const [currentQuantity, setCurrentQuantity] = useState(batch.currentQuantity);
  const [quantityReceived, setQuantityReceived] = useState(batch.quantityReceived);
  const [supplierName, setSupplierName] = useState(batch.supplierName);
  const [reason, setReason] = useState('Typo correction in quantity / cost price');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (costPrice <= 0 || sellingPrice <= 0 || currentQuantity < 0) {
      alert('Please enter valid positive values for cost price, selling price, and quantity.');
      return;
    }

    updateStockBatch(
      batch.batchId,
      {
        batchNumber: batchNumber.trim(),
        expiryDate,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        currentQuantity: Number(currentQuantity),
        quantityReceived: Number(quantityReceived),
        supplierName: supplierName.trim()
      },
      reason.trim() || 'Inventory & Price Correction'
    );

    onClose();
  };

  const handleDelete = () => {
    deleteStockBatch(batch.batchId, 'Batch voided by user');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Edit Batch & Correct Quantity / Price</h3>
              <p className="text-[11px] text-slate-500">Correct typographical errors in inward stock, cost or expiry</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product summary banner */}
        <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-slate-900">{product?.productName || 'Product'}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Code: {product?.productCode} · Clinic: {location?.locationName} ({location?.locationCode})
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded bg-teal-100 text-teal-800">
            Batch ID: {batch.batchId.slice(-6)}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Batch Number</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Expiry Date</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-100">
              <label className="block text-teal-900 font-semibold mb-1">Stock on Hand</label>
              <input
                type="number"
                min="0"
                required
                value={currentQuantity}
                onChange={e => setCurrentQuantity(Number(e.target.value))}
                className="w-full p-2 bg-white border border-teal-300 rounded-lg font-mono font-bold text-teal-900 text-sm focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-[10px] text-teal-700 mt-1 block">
                Original: {batch.currentQuantity} units
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-slate-700 font-semibold mb-1">Batch Cost (₹)</label>
              <input
                type="number"
                min="1"
                required
                value={costPrice}
                onChange={e => setCostPrice(Number(e.target.value))}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-sm focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Original: ₹{batch.costPrice}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-slate-700 font-semibold mb-1">Batch Selling (₹)</label>
              <input
                type="number"
                min="1"
                required
                value={sellingPrice}
                onChange={e => setSellingPrice(Number(e.target.value))}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-teal-800 text-sm focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-[10px] text-teal-700 mt-1 block font-medium">
                Margin: {sellingPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Total Inward Qty (Received)</label>
              <input
                type="number"
                min="1"
                required
                value={quantityReceived}
                onChange={e => setQuantityReceived(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Supplier / Distributor</label>
              <input
                type="text"
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Reason for Editing / Correction</label>
            <input
              type="text"
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Typo in quantity or purchase cost"
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Quantity and valuation differences will automatically be reconciled in the Stock Movement Ledger.
            </p>
          </div>

          {/* Delete confirmation section */}
          {showDeleteConfirm ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Confirm Void Batch</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Are you sure you want to void this batch entirely? Its remaining {batch.currentQuantity} units will be written off from clinic inventory.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
                >
                  Yes, Void Batch
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 flex items-center justify-between border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-rose-600 hover:text-rose-700 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Void / Delete Batch</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};
