import React, { useState } from 'react';
import { SalesHeader, Location } from '../../types/erp';
import { Printer, Share2, X, CheckCircle, FileText } from 'lucide-react';

interface PrintReceiptModalProps {
  sale: SalesHeader | null;
  location: Location | undefined;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ sale, location, onClose }) => {
  const [printLayout, setPrintLayout] = useState<'thermal' | 'a4'>('thermal');

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const phone = sale.customerPhone.replace(/[^0-9]/g, '');
    const itemsText = sale.details
      .map(d => `• ${d.productName} (Qty: ${d.quantity}) - ₹${d.amount}`)
      .join('%0A');

    const message = 
      `*${location?.locationName || 'MediClinic'}*%0A` +
      `*Tax Invoice: ${sale.invoiceNo}*%0A` +
      `Date: ${sale.saleDate}%0A` +
      `Customer: ${sale.customerName}%0A%0A` +
      `*Items:*%0A${itemsText}%0A%0A` +
      `Gross Total: ₹${sale.grossAmount}%0A` +
      (sale.courierCharges && sale.courierCharges > 0 ? `Courier / Delivery: ₹${sale.courierCharges}%0A` : '') +
      `Discount: ₹${sale.discountAmount}%0A` +
      `*Net Payable: ₹${sale.netAmount}*%0A` +
      `Paid via: ${sale.paymentMode} ${sale.upiReferenceNo ? `(Ref: ${sale.upiReferenceNo})` : ''}%0A%0A` +
      `Thank you for visiting! For consultations or refills, call ${location?.phone || ''}`;

    window.open(`https://wa.me/${phone ? `91${phone}` : ''}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Controls Bar (hidden during print) */}
        <div className="no-print p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 text-sm">Invoice Generated: {sale.invoiceNo}</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded text-xs">
              <button
                onClick={() => setPrintLayout('thermal')}
                className={`px-2 py-1 rounded transition-colors ${printLayout === 'thermal' ? 'bg-white shadow-xs font-medium text-slate-900' : 'text-slate-600'}`}
              >
                80mm Thermal
              </button>
              <button
                onClick={() => setPrintLayout('a4')}
                className={`px-2 py-1 rounded transition-colors ${printLayout === 'a4' ? 'bg-white shadow-xs font-medium text-slate-900' : 'text-slate-600'}`}
              >
                A4 Clinic
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              aria-label="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
          
          {printLayout === 'thermal' ? (
            /* 80mm POS Thermal Receipt */
            <div className="bg-white p-5 shadow-xs border border-slate-300 w-[340px] text-slate-900 text-xs font-mono leading-relaxed">
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                <div className="font-bold text-sm tracking-wider uppercase font-sans">
                  {location?.locationName || 'MediClinic Derma Care'}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">{location?.address}</div>
                <div className="text-[11px] text-slate-600">Ph: {location?.phone}</div>
                {location?.gstin && <div className="text-[10px] text-slate-500 mt-0.5">GSTIN: {location.gstin}</div>}
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>INVOICE: <strong>{sale.invoiceNo}</strong></span>
                  <span>{sale.saleDate}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span>Customer: {sale.customerName}</span>
                  <span>{sale.customerPhone}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Billed By: {sale.createdBy}
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2.5 border-b border-dashed border-slate-400">
                <div className="grid grid-cols-12 font-bold pb-1 text-[11px]">
                  <div className="col-span-6">ITEM</div>
                  <div className="col-span-2 text-right">QTY</div>
                  <div className="col-span-4 text-right">AMT</div>
                </div>

                <div className="space-y-1.5 mt-1">
                  {sale.details.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-[11px]">
                      <div className="col-span-6 pr-1">
                        <div className="font-sans font-medium line-clamp-1">{item.productName}</div>
                        <div className="text-[9px] text-slate-500">Batch: {item.batchNumber}</div>
                      </div>
                      <div className="col-span-2 text-right tabular-nums">{item.quantity}</div>
                      <div className="col-span-4 text-right tabular-nums">₹{item.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Total</span>
                  <span className="tabular-nums">₹{sale.grossAmount.toFixed(2)}</span>
                </div>
                {sale.courierCharges !== undefined && sale.courierCharges > 0 && (
                  <div className="flex justify-between text-teal-800 font-semibold">
                    <span>Courier Charges</span>
                    <span className="tabular-nums">+₹{sale.courierCharges.toFixed(2)}</span>
                  </div>
                )}
                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span className="tabular-nums">-₹{sale.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
                  <span>NET PAYABLE</span>
                  <span className="tabular-nums">₹{sale.netAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
                  <span>Payment Mode</span>
                  <span className="font-semibold">{sale.paymentMode}</span>
                </div>
                {sale.upiReferenceNo && (
                  <div className="text-[10px] text-slate-500">
                    UPI Ref: {sale.upiReferenceNo}
                  </div>
                )}
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500">
                <p>Thank you for choosing {location?.locationName?.split(' ')[0]}!</p>
                <p className="mt-0.5 text-[9px]">Medicines/Cosmetics once sold are non-refundable.</p>
              </div>
            </div>
          ) : (
            /* A4 Clinic Tax Invoice */
            <div className="bg-white p-8 shadow-xs border border-slate-300 w-full text-slate-900 text-xs">
              <div className="flex justify-between items-start pb-4 border-b border-slate-300">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{location?.locationName}</h2>
                  <p className="text-slate-600">{location?.address}</p>
                  <p className="text-slate-600">Phone: {location?.phone}</p>
                  {location?.gstin && <p className="text-slate-500">GSTIN: {location.gstin}</p>}
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-[11px] font-semibold rounded">
                    TAX INVOICE
                  </span>
                  <p className="mt-2 font-mono font-bold text-sm">{sale.invoiceNo}</p>
                  <p className="text-slate-600">Date: {sale.saleDate}</p>
                </div>
              </div>

              <div className="py-4 border-b border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Bill To Patient</span>
                  <p className="font-semibold text-slate-800">{sale.customerName}</p>
                  <p className="text-slate-600">Phone: {sale.customerPhone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Information</span>
                  <p className="font-semibold text-slate-800">Mode: {sale.paymentMode}</p>
                  {sale.upiReferenceNo && <p className="text-slate-600 text-[11px]">UPI Ref: {sale.upiReferenceNo}</p>}
                  <p className="text-slate-500 text-[11px]">Billed by: {sale.createdBy}</p>
                </div>
              </div>

              <table className="w-full my-4 text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 text-[11px]">
                    <th className="py-2">#</th>
                    <th className="py-2">Item Description</th>
                    <th className="py-2">Batch No</th>
                    <th className="py-2 text-right">Rate (₹)</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {sale.details.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-slate-400">{idx + 1}</td>
                      <td className="py-2 font-sans font-medium text-slate-900">{item.productName}</td>
                      <td className="py-2 text-slate-600">{item.batchNumber}</td>
                      <td className="py-2 text-right tabular-nums">₹{item.rate.toFixed(2)}</td>
                      <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                      <td className="py-2 text-right tabular-nums font-semibold">₹{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-4 border-t border-slate-300 flex justify-end">
                <div className="w-64 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Total:</span>
                    <span>₹{sale.grossAmount.toFixed(2)}</span>
                  </div>
                  {sale.courierCharges !== undefined && sale.courierCharges > 0 && (
                    <div className="flex justify-between text-teal-800 font-semibold">
                      <span>Courier Charges:</span>
                      <span>+₹{sale.courierCharges.toFixed(2)}</span>
                    </div>
                  )}
                  {sale.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-₹{sale.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Net Amount:</span>
                    <span>₹{sale.netAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-slate-500 text-[10px]">
                <div>
                  <p>Prescribed clinic products are non-returnable once opened.</p>
                  <p>Computer generated invoice, requires no physical signature.</p>
                </div>
                <div className="text-right">
                  <div className="h-10"></div>
                  <p className="border-t border-slate-300 pt-1">Authorized Pharmacist / Staff</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions Footer (hidden during print) */}
        <div className="no-print p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp Bill</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill (Ctrl+P)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              Done / Next Sale
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
