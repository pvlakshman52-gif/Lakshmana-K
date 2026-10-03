import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { PackagePlus, X, CheckCircle2, Lock } from 'lucide-react';
import { ProductIcon } from '../common/ProductIcon';

interface AddBatchModalProps {
  onClose: () => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({ onClose }) => {
  const { locations, products, selectedLocationId, addStockBatch } = useClinic();

  const defaultLoc = selectedLocationId === 'ALL' ? 'LOC-HOS' : selectedLocationId;
  const [productId, setProductId] = useState<string>(products[0]?.productId || '');
  const [locationId, setLocationId] = useState<string>(defaultLoc);
  const [batchNumber, setBatchNumber] = useState<string>(
    `${locations.find(l => l.locationId === defaultLoc)?.locationCode || 'HOS'}-B${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`
  );
  const [expiryDate, setExpiryDate] = useState<string>('2027-12-31');
  const [purchaseDate, setPurchaseDate] = useState<string>('2026-09-26');
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState<string>('SUP-INV-' + Math.floor(1000 + Math.random() * 9000));
  const [supplierName, setSupplierName] = useState<string>('Apex Pharma Distributors');
  const [quantityReceived, setQuantityReceived] = useState<number>(30);
  const [costPrice, setCostPrice] = useState<number>(products[0]?.costPrice || 250);
  const [sellingPrice, setSellingPrice] = useState<number>(products[0]?.sellingPrice || 500);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.productId === id);
    if (prod) {
      setCostPrice(prod.costPrice);
      setSellingPrice(prod.sellingPrice);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !batchNumber || quantityReceived <= 0 || costPrice <= 0 || sellingPrice <= 0) {
      alert('Please fill all required batch fields with valid positive values.');
      return;
    }

    addStockBatch({
      productId,
      locationId,
      batchNumber,
      expiryDate,
      purchaseDate,
      purchaseInvoiceNo,
      supplierName,
      quantityReceived,
      currentQuantity: quantityReceived,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice)
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-lg w-full">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">Goods Receipt / Inward Stock Batch</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Receiving Clinic</label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
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
              <label className="block text-slate-600 mb-1 font-semibold">Product Master</label>
              <select
                value={productId}
                onChange={e => handleProductChange(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 bg-white"
              >
                {products.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} ({p.productCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linked Product Code (Auto-populated & non-editable) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 font-semibold flex items-center gap-1">
                  <span>Product Code</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <span className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-mono font-medium">
                  Auto · Locked
                </span>
              </div>
              <input
                type="text"
                disabled
                readOnly
                value={products.find(p => p.productId === productId)?.productCode || ''}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-700 bg-slate-100 cursor-not-allowed select-none font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Category Code</label>
              <input
                type="text"
                disabled
                readOnly
                value={products.find(p => p.productId === productId)?.categoryId || ''}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-600 bg-slate-100 cursor-not-allowed select-none"
              />
            </div>
          </div>

          {/* Product Auto-Image Linked Banner */}
          {(() => {
            const prod = products.find(p => p.productId === productId);
            if (!prod) return null;
            return (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ProductIcon 
                    categoryId={prod.categoryId} 
                    imagePath={prod.imagePath} 
                    productName={prod.productName} 
                    size={32} 
                  />
                  <div>
                    <span className="font-semibold text-slate-800 text-[11px] block">{prod.productName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Catalog MRP: ₹{prod.sellingPrice} · {prod.volumeSize}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-1 rounded-md font-medium">
                  <CheckCircle2 className="w-3 h-3 text-teal-600" />
                  <span>Image auto-synced</span>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Batch Number</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
                placeholder="e.g. HOS-B2026-99"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Expiry Date</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Purchase Date</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Purchase Invoice / PO #</label>
              <input
                type="text"
                required
                value={purchaseInvoiceNo}
                onChange={e => setPurchaseInvoiceNo(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
                placeholder="e.g. SUP-INV-8820"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Distributor / Supplier Name</label>
            <input
              type="text"
              required
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              placeholder="e.g. Apex Pharma Distributors"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Quantity Received (Units)</label>
            <input
              type="number"
              min="1"
              required
              value={quantityReceived}
              onChange={e => setQuantityReceived(Number(e.target.value))}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 font-semibold">Inward Cost Price (₹)</label>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-1 rounded font-mono font-medium">Master: ₹{products.find(p => p.productId === productId)?.costPrice}</span>
              </div>
              <input
                type="number"
                min="1"
                required
                value={costPrice}
                onChange={e => setCostPrice(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900 font-semibold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 font-semibold">Batch Selling Price (₹)</label>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-1 rounded font-mono font-medium">Master: ₹{products.find(p => p.productId === productId)?.sellingPrice}</span>
              </div>
              <input
                type="number"
                min="1"
                required
                value={sellingPrice}
                onChange={e => setSellingPrice(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-teal-900 font-bold bg-teal-50/40"
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between">
            <span>Prices auto-populated from Product Master for this new inward batch. Existing batches retain their historical prices.</span>
            <span className="font-mono font-semibold text-teal-800">
              Est Margin: {sellingPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : 0}%
            </span>
          </div>

          {/* Batch Margin & Costing Rule Badge */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-600 font-sans">Unit Margin:</span>
              <span className="font-bold text-teal-800">
                ₹{sellingPrice - costPrice} ({sellingPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : 0}% Gross Margin)
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-sans">
              🔒 <strong>Batch-Wise Costing:</strong> This batch will strictly retain its cost (₹{costPrice}) and selling price (₹{sellingPrice}). Future Master price revisions will not alter this batch.
            </div>
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
              className="px-5 py-2 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800"
            >
              Inward Stock & Log Purchase
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
