import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Boxes, 
  Download, 
  Calendar, 
  Filter, 
  IndianRupee,
  Layers,
  History,
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  UserCheck,
  PackageCheck,
  MapPin,
  Tags,
  Trash2,
  RotateCcw,
  Printer,
  X
} from 'lucide-react';
import { ProductIcon } from '../common/ProductIcon';
import { sortBatchesByFefo } from '../../utils/batchPricing';
import { isProductInCategory, resolveCategory, getCategoryDisplayName } from '../../utils/categoryUtils';

export const ReportsView: React.FC = () => {
  const { 
    sales, 
    batches, 
    products, 
    categories, 
    locations, 
    priceHistory, 
    clearPriceHistory,
    selectedLocationId, 
    batchPricingMode, 
    setBatchPricingMode,
    currentUser
  } = useClinic();

  const isAdmin = currentUser.role === 'Admin';
  const [activeReportTab, setActiveReportTab] = useState<'batch_pricing' | 'batch_stock' | 'sales' | 'profit' | 'opening_stock' | 'expiry' | 'valuation' | 'price_history'>('batch_pricing');
  const [filterLocationId, setFilterLocationId] = useState<string>(() => {
    return currentUser.role === 'Admin' ? selectedLocationId : (currentUser.locationId || 'LOC-HOS');
  });
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('ALL');
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>('');
  const [pricingStatusFilter, setPricingStatusFilter] = useState<string>('ALL');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>('ALL');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [valuationViewMode, setValuationViewMode] = useState<'batch' | 'product'>('batch');

  // Opening Stock Register specific filter states (Requirements: Opening Batch #, Opening Stock Date, Location)
  const [openingBatchFilter, setOpeningBatchFilter] = useState<string>('ALL');
  const [openingDateFilter, setOpeningDateFilter] = useState<string>('');
  const [openingSearchQuery, setOpeningSearchQuery] = useState<string>('');

  // Price History Tab Filter & Clear states
  const [priceHistorySearchQuery, setPriceHistorySearchQuery] = useState<string>('');
  const [priceHistoryProductFilter, setPriceHistoryProductFilter] = useState<string>('ALL');
  const [isPriceHistoryClearConfirmOpen, setIsPriceHistoryClearConfirmOpen] = useState<boolean>(false);
  const [priceHistoryClearSuccessMsg, setPriceHistoryClearSuccessMsg] = useState<string | null>(null);

  const today = new Date('2026-09-26');

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (filterLocationId !== 'ALL' && s.locationId !== filterLocationId) return false;
      if (paymentFilter !== 'ALL' && s.paymentMode !== paymentFilter) return false;
      return true;
    });
  }, [sales, filterLocationId, paymentFilter]);

  // Sales totals
  const salesSummary = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let net = 0;
    let profit = 0;
    let cashTotal = 0;
    let upiTotal = 0;

    filteredSales.forEach(s => {
      gross += s.grossAmount;
      discount += s.discountAmount;
      net += s.netAmount;
      profit += s.totalProfit;
      if (s.paymentMode === 'Cash') cashTotal += s.netAmount;
      if (s.paymentMode === 'UPI') upiTotal += s.netAmount;
    });

    return {
      billsCount: filteredSales.length,
      gross,
      discount,
      net,
      profit,
      cashTotal,
      upiTotal,
      marginPercent: net > 0 ? (profit / net) * 100 : 0
    };
  }, [filteredSales]);

  // Batch-wise Stock & Costing Report Rows
  const batchStockRows = useMemo(() => {
    return batches
      .filter(batch => {
        if (!batch || !batch.productId) return false;
        if (filterLocationId !== 'ALL' && batch.locationId !== filterLocationId) return false;
        
        const prod = products.find(p => p && p.productId === batch.productId);
        if (stockCategoryFilter !== 'ALL' && prod && !isProductInCategory(prod, stockCategoryFilter, categories)) return false;

        const exp = new Date(batch.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (expiryStatusFilter === 'EXPIRED' && diffDays >= 0) return false;
        if (expiryStatusFilter === '30DAYS' && (diffDays < 0 || diffDays > 30)) return false;
        if (expiryStatusFilter === '60DAYS' && (diffDays < 0 || diffDays > 60)) return false;
        if (expiryStatusFilter === 'HEALTHY' && diffDays <= 60) return false;

        if (batchSearchQuery.trim()) {
          const q = batchSearchQuery.toLowerCase();
          const matchProd = prod && (prod.productName.toLowerCase().includes(q) || prod.productCode.toLowerCase().includes(q));
          const matchBatch = batch.batchNumber.toLowerCase().includes(q) || batch.supplierName.toLowerCase().includes(q);
          if (!matchProd && !matchBatch) return false;
        }

        return true;
      })
      .map(batch => {
        const prod = products.find(p => p && p.productId === batch.productId);
        const loc = locations.find(l => l.locationId === batch.locationId);
        const cat = resolveCategory(prod, categories);
        const costPrice = batch.costPrice;
        const sellingPrice = batch.sellingPrice && batch.sellingPrice > 0 
          ? batch.sellingPrice 
          : (prod ? prod.sellingPrice : Math.round(costPrice * 1.5));
        
        const unitProfit = sellingPrice - costPrice;
        const profitMargin = sellingPrice > 0 ? ((unitProfit / sellingPrice) * 100) : 0;
        const totalCostValue = batch.currentQuantity * costPrice;
        const totalSellingValue = batch.currentQuantity * sellingPrice;
        const totalProfitValue = totalSellingValue - totalCostValue;

        const exp = new Date(batch.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));

        return {
          batch,
          prod,
          loc,
          cat,
          costPrice,
          sellingPrice,
          unitProfit,
          profitMargin,
          totalCostValue,
          totalSellingValue,
          totalProfitValue,
          diffDays,
          isExpired: diffDays < 0,
          isUrgent: diffDays >= 0 && diffDays <= 30,
          isWarning: diffDays > 30 && diffDays <= 60
        };
      });
  }, [batches, products, locations, categories, filterLocationId, stockCategoryFilter, expiryStatusFilter, batchSearchQuery, today]);

  // Batch Stock Totals
  const batchStockTotals = useMemo(() => {
    let totalUnits = 0;
    let totalCost = 0;
    let totalSelling = 0;
    let totalProfit = 0;

    batchStockRows.forEach(row => {
      totalUnits += row.batch.currentQuantity;
      totalCost += row.totalCostValue;
      totalSelling += row.totalSellingValue;
      totalProfit += row.totalProfitValue;
    });

    const avgMargin = totalSelling > 0 ? (totalProfit / totalSelling) * 100 : 0;

    return {
      batchCount: batchStockRows.length,
      totalUnits,
      totalCost,
      totalSelling,
      totalProfit,
      avgMargin
    };
  }, [batchStockRows]);

  // Expiry Report Buckets
  const expiryBuckets = useMemo(() => {
    const locBatches = batches.filter(b => filterLocationId === 'ALL' || b.locationId === filterLocationId);
    
    const expired: typeof locBatches = [];
    const days30: typeof locBatches = [];
    const days60: typeof locBatches = [];
    const days90: typeof locBatches = [];

    locBatches.forEach(b => {
      if (b.currentQuantity <= 0) return;
      const exp = new Date(b.expiryDate);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (diff < 0) expired.push(b);
      else if (diff <= 30) days30.push(b);
      else if (diff <= 60) days60.push(b);
      else if (diff <= 90) days90.push(b);
    });

    const sumValuation = (list: typeof locBatches) => list.reduce((a, b) => a + b.currentQuantity * b.costPrice, 0);

    return {
      expired: { list: expired, costVal: sumValuation(expired) },
      days30: { list: days30, costVal: sumValuation(days30) },
      days60: { list: days60, costVal: sumValuation(days60) },
      days90: { list: days90, costVal: sumValuation(days90) }
    };
  }, [batches, filterLocationId, today]);

  // Inventory Valuation per Product (Consolidated)
  const valuationRows = useMemo(() => {
    const locBatches = (batches || []).filter(b => b && b.productId && (filterLocationId === 'ALL' || b.locationId === filterLocationId));
    
    return (products || []).filter(prod => prod && prod.productId).map(prod => {
      const prodBatches = locBatches.filter(b => b.productId === prod.productId);
      const stockQty = prodBatches.reduce((a, b) => a + (b.currentQuantity || 0), 0);
      const costValue = prodBatches.reduce((a, b) => a + (b.currentQuantity || 0) * (b.costPrice || 0), 0);
      const sellingValue = prodBatches.reduce((a, b) => {
        const sp = b.sellingPrice && b.sellingPrice > 0 ? b.sellingPrice : prod.sellingPrice;
        return a + (b.currentQuantity || 0) * (sp || 0);
      }, 0);
      const profitPotential = sellingValue - costValue;
      const margin = sellingValue > 0 ? (profitPotential / sellingValue) * 100 : 0;

      return {
        product: prod,
        batchesCount: prodBatches.length,
        stockQty,
        costValue,
        sellingValue,
        profitPotential,
        margin
      };
    }).filter(r => r.stockQty > 0);
  }, [batches, products, filterLocationId]);

  const valuationTotals = useMemo(() => {
    let totalQty = 0;
    let totalCost = 0;
    let totalSelling = 0;
    valuationRows.forEach(r => {
      totalQty += r.stockQty;
      totalCost += r.costValue;
      totalSelling += r.sellingValue;
    });
    const potentialProfit = totalSelling - totalCost;
    return {
      totalQty,
      totalCost,
      totalSelling,
      potentialProfit,
      margin: totalSelling > 0 ? (potentialProfit / totalSelling) * 100 : 0
    };
  }, [valuationRows]);

  // Price History Filtered Records
  const filteredPriceHistory = useMemo(() => {
    return priceHistory.filter(h => {
      if (priceHistoryProductFilter !== 'ALL' && h.productId !== priceHistoryProductFilter) return false;
      if (priceHistorySearchQuery.trim()) {
        const q = priceHistorySearchQuery.toLowerCase();
        return (
          h.productName.toLowerCase().includes(q) ||
          h.productCode.toLowerCase().includes(q) ||
          (h.reason && h.reason.toLowerCase().includes(q)) ||
          h.changedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [priceHistory, priceHistoryProductFilter, priceHistorySearchQuery]);

  const exportPriceHistoryCSV = () => {
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
      'Batches Preserved',
      'Changed By',
      'Reason'
    ];
    const rows = filteredPriceHistory.map(h => [
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
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Product_Price_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Batch-Wise Stock & Costing Report
  const exportBatchStockCSV = () => {
    const headers = [
      'Batch Number',
      'Location',
      'Product Code',
      'Product Name',
      'Category',
      'Expiry Date',
      'Days Left',
      'Quantity On Hand',
      'Inward Received',
      'Batch Cost Price (₹)',
      'Batch Selling Price (₹)',
      'Unit Profit (₹)',
      'Profit Margin (%)',
      'Total Cost Valuation (₹)',
      'Total Retail Valuation (₹)',
      'Total Unrealized Profit (₹)',
      'Supplier Inward'
    ];

    const rows = batchStockRows.map(r => [
      r.batch.batchNumber,
      r.loc?.locationCode || '',
      r.prod?.productCode || '',
      `"${r.prod?.productName || ''}"`,
      `"${r.cat?.categoryName || ''}"`,
      r.batch.expiryDate,
      r.diffDays,
      r.batch.currentQuantity,
      r.batch.quantityReceived,
      r.costPrice,
      r.sellingPrice,
      r.unitProfit,
      r.profitMargin.toFixed(1),
      r.totalCostValue,
      r.totalSellingValue,
      r.totalProfitValue,
      `"${r.batch.supplierName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Stock_Costing_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSalesCSV = () => {
    const headers = ['InvoiceNo', 'Date', 'Location', 'Customer', 'Phone', 'PaymentMode', 'UPIRef', 'GrossAmount', 'Discount', 'CourierCharges', 'NetAmount', 'CostOfGoods', 'Profit'];
    const rows = filteredSales.map(s => {
      const cogs = s.details.reduce((sum, d) => sum + d.costPrice * d.quantity, 0);
      return [
        s.invoiceNo,
        s.saleDate,
        s.locationId,
        `"${s.customerName}"`,
        s.customerPhone,
        s.paymentMode,
        s.upiReferenceNo || '',
        s.grossAmount,
        s.discountAmount,
        s.courierCharges || 0,
        s.netAmount,
        cogs,
        s.totalProfit
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Profit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Requirement 10: Batch Pricing Report Rows
  // Product Name, Batch Number, Available Qty, Cost Price, Selling Price, Margin, Expiry Date
  const batchPricingRows = useMemo(() => {
    return (batches || [])
      .filter(batch => {
        if (!batch || !batch.productId) return false;
        if (filterLocationId !== 'ALL' && batch.locationId !== filterLocationId) return false;
        const prod = products.find(p => p && p.productId === batch.productId);
        if (stockCategoryFilter !== 'ALL' && prod?.categoryId !== stockCategoryFilter) return false;

        if (pricingStatusFilter === 'ACTIVE' && batch.currentQuantity <= 0) return false;
        if (pricingStatusFilter === 'IN_STOCK' && batch.currentQuantity <= 0) return false;
        if (pricingStatusFilter === 'EXHAUSTED' && batch.currentQuantity > 0) return false;

        if (batchSearchQuery.trim()) {
          const q = batchSearchQuery.toLowerCase();
          const matchProd = prod && (prod.productName.toLowerCase().includes(q) || prod.productCode.toLowerCase().includes(q));
          const matchBatch = batch.batchNumber.toLowerCase().includes(q) || batch.supplierName.toLowerCase().includes(q);
          if (!matchProd && !matchBatch) return false;
        }

        return true;
      })
      .map(batch => {
        const prod = products.find(p => p.productId === batch.productId);
        const loc = locations.find(l => l.locationId === batch.locationId);
        const cat = resolveCategory(prod, categories);
        const costPrice = batch.costPrice;
        const sellingPrice = batch.sellingPrice && batch.sellingPrice > 0 
          ? batch.sellingPrice 
          : (prod ? prod.sellingPrice : Math.round(costPrice * 1.5));
        const margin = sellingPrice - costPrice;
        const marginPercent = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;
        const availableQty = batch.currentQuantity;
        const expiryDate = batch.expiryDate;

        // Rank this batch among active stock for this product & location according to FEFO
        const prodLocationBatches = (batches || []).filter(
          b => b && b.productId === batch.productId && b.locationId === batch.locationId && b.currentQuantity > 0
        );
        const sortedFefo = sortBatchesByFefo(prodLocationBatches);
        const fefoRank = sortedFefo.findIndex(b => b.batchId === batch.batchId);

        let fefoStatus: 'active' | 'next' | 'reserve' | 'exhausted' = 'exhausted';
        if (availableQty > 0) {
          if (fefoRank === 0) fefoStatus = 'active';
          else if (fefoRank === 1) fefoStatus = 'next';
          else fefoStatus = 'reserve';
        }

        const exp = new Date(expiryDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));

        return {
          batch,
          prod,
          loc,
          cat,
          productName: prod?.productName || 'Unknown Product',
          productCode: prod?.productCode || '',
          batchNumber: batch.batchNumber,
          availableQty,
          costPrice,
          sellingPrice,
          margin,
          marginPercent,
          expiryDate,
          fefoStatus,
          fefoRank,
          diffDays,
          masterPrice: prod?.sellingPrice || 0,
          priceDiffFromMaster: sellingPrice - (prod?.sellingPrice || 0)
        };
      })
      .sort((a, b) => {
        const statusOrder = { active: 1, next: 2, reserve: 3, exhausted: 4 };
        if (statusOrder[a.fefoStatus] !== statusOrder[b.fefoStatus]) {
          return statusOrder[a.fefoStatus] - statusOrder[b.fefoStatus];
        }
        return a.productName.localeCompare(b.productName);
      });
  }, [batches, products, locations, categories, filterLocationId, stockCategoryFilter, pricingStatusFilter, batchSearchQuery]);

  const batchPricingSummary = useMemo(() => {
    let totalQty = 0;
    let totalCostVal = 0;
    let totalSellingVal = 0;
    let activeBatchesCount = 0;
    let varianceCount = 0;

    batchPricingRows.forEach(r => {
      totalQty += r.availableQty;
      totalCostVal += r.availableQty * r.costPrice;
      totalSellingVal += r.availableQty * r.sellingPrice;
      if (r.fefoStatus === 'active') activeBatchesCount++;
      if (r.priceDiffFromMaster !== 0 && r.availableQty > 0) varianceCount++;
    });

    const totalMarginVal = totalSellingVal - totalCostVal;
    const avgMargin = totalSellingVal > 0 ? (totalMarginVal / totalSellingVal) * 100 : 0;

    return {
      totalBatchesCount: batchPricingRows.length,
      totalQty,
      totalCostVal,
      totalSellingVal,
      totalMarginVal,
      avgMargin,
      activeBatchesCount,
      varianceCount
    };
  }, [batchPricingRows]);

  const exportBatchPricingCSV = () => {
    const headers = [
      'Product Name',
      'Product Code',
      'Batch Number',
      'Location',
      'FEFO Queue Status',
      'Available Qty',
      'Cost Price (₹)',
      'Selling Price (₹)',
      'Margin Amount (₹)',
      'Margin (%)',
      'Product Master Price (₹)',
      'Expiry Date',
      'Days to Expiry'
    ];

    const rows = batchPricingRows.map(r => [
      `"${r.productName}"`,
      r.productCode,
      r.batchNumber,
      r.loc?.locationCode || '',
      r.fefoStatus.toUpperCase(),
      r.availableQty,
      r.costPrice,
      r.sellingPrice,
      r.margin,
      r.marginPercent.toFixed(1),
      r.masterPrice,
      r.expiryDate,
      r.diffDays
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Pricing_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Distinct Opening Batch Numbers for dropdown filter
  const distinctOpeningBatches = useMemo(() => {
    const set = new Set<string>();
    batches.forEach(b => {
      if (b.isOpeningStock || b.batchNumber.startsWith('OPEN-')) {
        set.add(b.batchNumber);
      }
    });
    return Array.from(set).sort();
  }, [batches]);

  // Opening Stock Rows filtered by Opening Batch Number, Date, and Location
  const openingStockRows = useMemo(() => {
    return batches
      .filter(batch => {
        // Only opening stock batches
        if (!batch.isOpeningStock && !batch.batchNumber.startsWith('OPEN-')) return false;

        // Location filter
        if (filterLocationId !== 'ALL' && batch.locationId !== filterLocationId) return false;

        // Opening Batch Number filter
        if (openingBatchFilter !== 'ALL' && batch.batchNumber !== openingBatchFilter) return false;

        // Opening Stock Date filter
        if (openingDateFilter.trim() && batch.purchaseDate !== openingDateFilter.trim()) return false;

        // Search query
        if (openingSearchQuery.trim()) {
          const q = openingSearchQuery.toLowerCase();
          const prod = products.find(p => p && p.productId === batch.productId);
          const matchProd = prod && (prod.productName.toLowerCase().includes(q) || prod.productCode.toLowerCase().includes(q));
          const matchBatch = batch.batchNumber.toLowerCase().includes(q) || (batch.createdBy || '').toLowerCase().includes(q);
          if (!matchProd && !matchBatch) return false;
        }

        return true;
      })
      .map(batch => {
        const prod = products.find(p => p && p.productId === batch.productId);
        const loc = locations.find(l => l.locationId === batch.locationId);
        const cat = resolveCategory(prod, categories);
        const costPrice = batch.costPrice;
        const sellingPrice = batch.sellingPrice || (prod ? prod.sellingPrice : Math.round(costPrice * 1.5));
        const totalOpeningCost = batch.quantityReceived * costPrice;
        const currentCostValue = batch.currentQuantity * costPrice;
        const totalRetailValue = batch.quantityReceived * sellingPrice;

        return {
          batch,
          prod,
          loc,
          cat,
          openingBatchNumber: batch.batchNumber,
          openingDate: batch.purchaseDate,
          inwardQty: batch.quantityReceived,
          currentQty: batch.currentQuantity,
          consumedQty: batch.quantityReceived - batch.currentQuantity,
          costPrice,
          sellingPrice,
          totalOpeningCost,
          currentCostValue,
          totalRetailValue,
          createdBy: batch.createdBy
        };
      });
  }, [batches, products, locations, categories, filterLocationId, openingBatchFilter, openingDateFilter, openingSearchQuery]);

  // Opening stock summary statistics
  const openingStockSummary = useMemo(() => {
    let totalInward = 0;
    let totalCurrent = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;
    const batchSet = new Set<string>();
    const prodSet = new Set<string>();

    openingStockRows.forEach(r => {
      totalInward += r.inwardQty;
      totalCurrent += r.currentQty;
      totalCostVal += r.totalOpeningCost;
      totalRetailVal += r.totalRetailValue;
      batchSet.add(r.openingBatchNumber);
      prodSet.add(r.prod?.productId || '');
    });

    return {
      distinctBatchesCount: batchSet.size,
      productsCount: prodSet.size,
      totalInward,
      totalCurrent,
      totalCostVal,
      totalRetailVal
    };
  }, [openingStockRows]);

  // Export Opening Stock Register CSV
  const exportOpeningStockCSV = () => {
    const headers = [
      'Opening Batch #',
      'Opening Stock Date',
      'Location Code',
      'Location Name',
      'Product Code',
      'Product Name',
      'Category',
      'Inward Quantity',
      'Current Available Quantity',
      'Consumed Quantity',
      'Unit Cost Price (₹)',
      'Total Opening Valuation (₹)',
      'Current Valuation (₹)',
      'Unit Selling Price (₹)',
      'Created By'
    ];
    const rows = openingStockRows.map(r => [
      r.openingBatchNumber,
      r.openingDate,
      r.loc?.locationCode || '',
      `"${r.loc?.locationName || ''}"`,
      r.prod?.productCode || '',
      `"${r.prod?.productName || ''}"`,
      `"${r.cat?.categoryName || ''}"`,
      r.inwardQty,
      r.currentQty,
      r.consumedQty,
      r.costPrice,
      r.totalOpeningCost,
      r.currentCostValue,
      r.sellingPrice,
      `"${r.createdBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Opening_Stock_Register_${filterLocationId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Clinic Executive Reports & Inventory Costing
            </h1>
            <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 font-semibold px-2 py-0.5 rounded-full font-mono">
              Batch-Wise FIFO Costing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Batch-wise quantity, actual cost price, selling price, expiry status, profit margins, and price history audit trail.
          </p>
        </div>

        {/* Global Location Scope for Reports */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-xs">
              <Filter className="w-3.5 h-3.5 ml-1 text-slate-400" />
              <select
                value={filterLocationId}
                onChange={e => setFilterLocationId(e.target.value)}
                className="bg-transparent font-medium text-slate-800 py-1 pl-1.5 pr-2 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">🌐 All Branches (Consolidated)</option>
                {locations.map(loc => (
                  <option key={loc.locationId} value={loc.locationId}>
                    📍 {loc.locationName} [{loc.locationCode}]
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>{locations.find(l => l.locationId === currentUser.locationId)?.locationName || 'Assigned Branch'} [{locations.find(l => l.locationId === currentUser.locationId)?.locationCode || 'HOS'}]</span>
              <span className="text-[10px] text-slate-500 font-normal">(Staff Scoped)</span>
            </div>
          )}

          {activeReportTab === 'batch_pricing' ? (
            <button
              onClick={exportBatchPricingCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Batch Pricing CSV</span>
            </button>
          ) : activeReportTab === 'opening_stock' ? (
            <button
              onClick={exportOpeningStockCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Opening Stock CSV</span>
            </button>
          ) : activeReportTab === 'batch_stock' || activeReportTab === 'valuation' ? (
            <button
              onClick={exportBatchStockCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Batch Report CSV</span>
            </button>
          ) : (
            <button
              onClick={exportSalesCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-xs cursor-pointer no-print"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Category Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
        <button
          onClick={() => setActiveReportTab('batch_pricing')}
          className={`pb-3 px-3.5 font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeReportTab === 'batch_pricing'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tags className="w-4 h-4 text-teal-700" />
          <span>Batch Pricing Report</span>
          <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-mono font-bold">
            {batchPricingRows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('batch_stock')}
          className={`pb-3 px-3.5 font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeReportTab === 'batch_stock'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-teal-700" />
          <span>Batch Stock & Costing Report</span>
          <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-mono font-bold">
            {batchStockRows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('opening_stock')}
          className={`pb-3 px-3.5 font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeReportTab === 'opening_stock'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackageCheck className="w-4 h-4 text-teal-700" />
          <span>Opening Stock Register</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-mono font-bold">
            {distinctOpeningBatches.length} batches
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('sales')}
          className={`pb-3 px-3.5 font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeReportTab === 'sales'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-700" />
          <span>Sales & Profit Realization</span>
        </button>

        <button
          onClick={() => setActiveReportTab('profit')}
          className={`pb-3 px-3.5 font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeReportTab === 'profit'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-teal-700" />
          <span>COGS & Margin Analysis</span>
        </button>

        <button
          onClick={() => setActiveReportTab('expiry')}
          className={`pb-3 px-3.5 font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeReportTab === 'expiry'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Expiry Risk Analysis</span>
        </button>

        <button
          onClick={() => setActiveReportTab('valuation')}
          className={`pb-3 px-3.5 font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeReportTab === 'valuation'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4 text-teal-700" />
          <span>SKU Valuation Consolidation</span>
        </button>

        <button
          onClick={() => setActiveReportTab('price_history')}
          className={`pb-3 px-3.5 font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
            activeReportTab === 'price_history'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-teal-700" />
          <span>Product Price History</span>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
            {priceHistory.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 0: BATCH PRICING REPORT (REQUIREMENT 10)               */}
      {/* Columns: Product Name, Batch Number, Available Qty, Cost   */}
      {/* Price, Selling Price, Margin, Expiry Date                  */}
      {/* ========================================================= */}
      {activeReportTab === 'batch_pricing' && (
        <div className="space-y-5">
          {/* Policy Banner */}
          <div className="bg-gradient-to-r from-teal-50 via-white to-slate-50 border border-teal-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-600 text-white">
                <Tags className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Batch-Wise Pricing Register (FEFO Priority)
                </h3>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  POS & Online Store dispense products using historical batch-specific selling prices. When active stock reaches zero, prices transition automatically.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-sans text-xs">Batch Pricing Mode:</span>
              <select
                value={batchPricingMode}
                onChange={e => setBatchPricingMode(e.target.value as any)}
                className="bg-white border border-teal-300 text-teal-900 px-2.5 py-1.5 rounded-lg font-bold text-xs focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-2xs font-sans"
              >
                <option value="ACTIVE_BATCH">Option A: Active Batch Price (Recommended)</option>
                <option value="PRODUCT_MASTER">Option B: Latest Product Master Price</option>
              </select>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans text-[11px]">Total Batches</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {batchPricingSummary.totalBatchesCount} <span className="text-xs font-sans text-slate-400 font-normal">batches</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                {batchPricingSummary.totalQty} total units in stock
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans text-[11px]">Active FEFO Batches</div>
              <div className="text-lg font-bold text-teal-800 mt-1 tabular-nums">
                {batchPricingSummary.activeBatchesCount} <span className="text-xs font-sans text-teal-600 font-normal">in dispensing</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                Currently selling at counter & store
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans text-[11px]">Total Cost Valuation</div>
              <div className="text-lg font-bold text-slate-800 mt-1 tabular-nums">
                ₹{batchPricingSummary.totalCostVal.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                Actual batch purchase cost
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans text-[11px]">Batch Selling Valuation</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                ₹{batchPricingSummary.totalSellingVal.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                Calculated at batch selling rates
              </div>
            </div>

            <div className="p-3.5 bg-teal-50/80 rounded-xl border border-teal-200 shadow-2xs">
              <div className="text-teal-900 font-sans font-semibold text-[11px]">Average Batch Margin</div>
              <div className="text-lg font-bold text-teal-900 mt-1 tabular-nums">
                {batchPricingSummary.avgMargin.toFixed(1)}%
              </div>
              <div className="text-[10px] text-teal-700 font-sans mt-0.5">
                ₹{batchPricingSummary.totalMarginVal.toLocaleString()} unrealized profit
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={batchSearchQuery}
                  onChange={e => setBatchSearchQuery(e.target.value)}
                  placeholder="Search product name or batch #..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Category:</span>
                <select
                  value={stockCategoryFilter}
                  onChange={e => setStockCategoryFilter(e.target.value)}
                  className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Queue Status:</span>
                <select
                  value={pricingStatusFilter}
                  onChange={e => setPricingStatusFilter(e.target.value)}
                  className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden cursor-pointer font-mono"
                >
                  <option value="ALL">All Batches</option>
                  <option value="ACTIVE">Active FEFO Batches Only</option>
                  <option value="IN_STOCK">In-Stock Batches Only</option>
                  <option value="EXHAUSTED">Zero Stock Batches</option>
                </select>
              </div>
            </div>

            <div className="text-slate-500 font-mono text-[11px]">
              Showing <strong>{batchPricingRows.length}</strong> batches
            </div>
          </div>

          {/* Requirement 10: Batch Pricing Report Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">Batch Number</th>
                    <th className="py-3 px-3 text-center">FEFO Status</th>
                    <th className="py-3 px-3 text-right">Available Qty</th>
                    <th className="py-3 px-3 text-right">Cost Price (₹)</th>
                    <th className="py-3 px-3 text-right">Selling Price (₹)</th>
                    <th className="py-3 px-3 text-right">Margin</th>
                    <th className="py-3 px-4 text-center">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {batchPricingRows.map(row => {
                    const isZeroStock = row.availableQty <= 0;
                    return (
                      <tr
                        key={row.batch.batchId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          row.fefoStatus === 'active' ? 'bg-teal-50/20' : ''
                        }`}
                      >
                        {/* 1. Product Name */}
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-slate-900 leading-snug">
                            {row.productName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{row.productCode}</span>
                            <span>·</span>
                            <span>{row.cat?.categoryName}</span>
                            <span>·</span>
                            <span className="text-slate-500 font-medium">Master: ₹{row.masterPrice}</span>
                          </div>
                        </td>

                        {/* 2. Batch Number */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {row.batchNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-sans text-[10px]">
                              {row.loc?.locationCode}
                            </span>
                            {row.batch.isOpeningStock && (
                              <span className="bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded text-[10px] font-sans">
                                Opening
                              </span>
                            )}
                          </div>
                        </td>

                        {/* FEFO Queue Status */}
                        <td className="py-3 px-3 text-center">
                          {row.fefoStatus === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                              Active (FEFO #1)
                            </span>
                          ) : row.fefoStatus === 'next' ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Next (FEFO #2)
                            </span>
                          ) : row.fefoStatus === 'reserve' ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              Queued (#{row.fefoRank + 1})
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-200">
                              Exhausted (0 Qty)
                            </span>
                          )}
                        </td>

                        {/* 3. Available Qty */}
                        <td className="py-3 px-3 text-right tabular-nums">
                          <span className={`font-bold text-sm ${isZeroStock ? 'text-slate-400' : 'text-slate-900'}`}>
                            {row.availableQty}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-sans">units</span>
                        </td>

                        {/* 4. Cost Price */}
                        <td className="py-3 px-3 text-right tabular-nums text-slate-600 font-medium">
                          ₹{row.costPrice.toFixed(2)}
                        </td>

                        {/* 5. Selling Price */}
                        <td className="py-3 px-3 text-right tabular-nums">
                          <div className="font-bold text-slate-900 text-sm">
                            ₹{row.sellingPrice.toFixed(2)}
                          </div>
                          {row.priceDiffFromMaster !== 0 && (
                            <div className="text-[10px] text-teal-700 font-sans font-medium">
                              {row.priceDiffFromMaster > 0 ? `+₹${row.priceDiffFromMaster}` : `-₹${Math.abs(row.priceDiffFromMaster)}`} vs Master
                            </div>
                          )}
                        </td>

                        {/* 6. Margin */}
                        <td className="py-3 px-3 text-right tabular-nums">
                          <div className="font-bold text-teal-800">
                            ₹{row.margin.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans font-medium">
                            {row.marginPercent.toFixed(1)}% margin
                          </div>
                        </td>

                        {/* 7. Expiry Date */}
                        <td className="py-3 px-4 text-center">
                          <div className="font-semibold text-slate-800">
                            {row.expiryDate}
                          </div>
                          <div className="text-[10px] font-sans mt-0.5">
                            {row.diffDays < 0 ? (
                              <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded">Expired</span>
                            ) : row.diffDays <= 30 ? (
                              <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded">{row.diffDays}d left</span>
                            ) : row.diffDays <= 90 ? (
                              <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.2 rounded">{row.diffDays}d left</span>
                            ) : (
                              <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded">{row.diffDays}d left</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {batchPricingRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No batches match the selected filters</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or adjusting your search term.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: BATCH-WISE STOCK & COSTING REPORT (CORE REQUIREMENT) */}
      {/* ========================================================= */}
      {activeReportTab === 'batch_stock' && (
        <div className="space-y-5">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans text-[11px]">Stock Batches on Record</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {batchStockTotals.batchCount} <span className="text-xs font-sans text-slate-400 font-normal">batches</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                {batchStockTotals.totalUnits} total physical units
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans text-[11px]">Total Batch Cost (Asset)</div>
              <div className="text-lg font-bold text-slate-800 mt-1 tabular-nums">
                ₹{batchStockTotals.totalCost.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                Actual inward acquisition cost
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans text-[11px]">Total Retail Selling Value</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                ₹{batchStockTotals.totalSelling.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                Historical batch retail prices
              </div>
            </div>

            <div className="p-3.5 bg-teal-50/80 rounded-xl border border-teal-200 shadow-2xs">
              <div className="text-teal-900 font-sans font-semibold text-[11px]">Projected Batch Profit</div>
              <div className="text-lg font-bold text-teal-900 mt-1 tabular-nums">
                ₹{batchStockTotals.totalProfit.toLocaleString()}
              </div>
              <div className="text-[10px] text-teal-700 font-sans mt-0.5">
                Selling value minus actual batch cost
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-600 font-sans text-[11px]">Average Profit Margin</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {batchStockTotals.avgMargin.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                Batch-weighted profit margin
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={batchSearchQuery}
                  onChange={e => setBatchSearchQuery(e.target.value)}
                  placeholder="Search product, batch #, supplier..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white text-xs"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Category:</span>
                <select
                  value={stockCategoryFilter}
                  onChange={e => setStockCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs focus:outline-hidden"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Expiry Status:</span>
                <select
                  value={expiryStatusFilter}
                  onChange={e => setExpiryStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs focus:outline-hidden"
                >
                  <option value="ALL">All Expiry Windows</option>
                  <option value="EXPIRED">Expired Batches</option>
                  <option value="30DAYS">Expiring in ≤30 Days</option>
                  <option value="60DAYS">Expiring in ≤60 Days</option>
                  <option value="HEALTHY">Healthy Batches (&gt;60 Days)</option>
                </select>
              </div>
            </div>

            <div className="text-slate-500 text-[11px] font-mono">
              Showing <strong className="text-slate-800">{batchStockRows.length}</strong> batches
            </div>
          </div>

          {/* Batch-Wise Costing Stock Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <th className="py-3 px-3.5">Product Formulary</th>
                    <th className="py-3 px-3">Branch</th>
                    <th className="py-3 px-3">Batch Number</th>
                    <th className="py-3 px-3">Expiry Date</th>
                    <th className="py-3 px-3 text-right">Units on Hand</th>
                    <th className="py-3 px-3 text-right">Cost Price (₹)</th>
                    <th className="py-3 px-3 text-right">Selling Price (₹)</th>
                    <th className="py-3 px-3 text-right">Profit Margin</th>
                    <th className="py-3 px-3 text-right">Cost Valuation (₹)</th>
                    <th className="py-3 px-3 text-right">Retail Value (₹)</th>
                    <th className="py-3 px-3 text-right">Projected Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {batchStockRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                        <Boxes className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                        <p className="text-xs font-semibold text-slate-700">No stock batches matching criteria</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try altering the branch, category, or search filters above.</p>
                      </td>
                    </tr>
                  ) : (
                    batchStockRows.map(({ batch, prod, loc, cat, costPrice, sellingPrice, unitProfit, profitMargin, totalCostValue, totalSellingValue, totalProfitValue, diffDays, isExpired, isUrgent, isWarning }) => (
                      <tr key={batch.batchId} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Product Details */}
                        <td className="py-2.5 px-3.5 font-sans">
                          <div className="flex items-center gap-2.5">
                            <ProductIcon
                              categoryId={prod?.categoryId || 'CAT-SKIN'}
                              imagePath={prod?.imagePath}
                              productName={prod?.productName}
                              size={30}
                            />
                            <div>
                              <div className="font-semibold text-slate-900 line-clamp-1">{prod?.productName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {prod?.productCode} · {prod?.volumeSize}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {loc?.locationCode}
                          </span>
                        </td>

                        {/* Batch Number & Supplier */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{batch.batchNumber}</div>
                          <div className="text-[10px] text-slate-400 font-sans truncate max-w-[120px]">{batch.supplierName}</div>
                        </td>

                        {/* Expiry Date */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="text-slate-800">{batch.expiryDate}</div>
                          <div className="mt-0.5">
                            {isExpired ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-sans">
                                Expired ({Math.abs(diffDays)}d)
                              </span>
                            ) : isUrgent ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-sans">
                                {diffDays}d left (Alert)
                              </span>
                            ) : isWarning ? (
                              <span className="text-[10px] text-amber-700 font-sans">
                                {diffDays}d left
                              </span>
                            ) : (
                              <span className="text-[10px] text-teal-700 font-sans">
                                Healthy ({diffDays}d)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quantity On Hand */}
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <div className="font-bold text-slate-900 text-sm">{batch.currentQuantity}</div>
                          <div className="text-[10px] text-slate-400 font-normal">of {batch.quantityReceived}</div>
                        </td>

                        {/* Cost Price */}
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 font-semibold">
                          ₹{costPrice}
                        </td>

                        {/* Selling Price */}
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900">
                          ₹{sellingPrice}
                        </td>

                        {/* Profit Margin % */}
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            profitMargin >= 40 
                              ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                              : profitMargin >= 25 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {profitMargin.toFixed(1)}%
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                            +₹{unitProfit}/unit
                          </div>
                        </td>

                        {/* Cost Valuation */}
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                          ₹{totalCostValue.toLocaleString()}
                        </td>

                        {/* Retail Valuation */}
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-800">
                          ₹{totalSellingValue.toLocaleString()}
                        </td>

                        {/* Total Unrealized Profit */}
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-teal-800">
                          ₹{totalProfitValue.toLocaleString()}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>

                {/* Footer Totals */}
                {batchStockRows.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-mono text-xs font-bold text-slate-900">
                    <tr>
                      <td colSpan={4} className="py-3 px-3.5 font-sans">
                        Consolidated Totals ({batchStockTotals.batchCount} Batches)
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-sm text-teal-900">
                        {batchStockTotals.totalUnits}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-right text-slate-400 font-sans font-normal text-[11px]">
                        Weighted Avg Margin →
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-teal-800 text-sm">
                        {batchStockTotals.avgMargin.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-800">
                        ₹{batchStockTotals.totalCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-900">
                        ₹{batchStockTotals.totalSelling.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-teal-900 text-sm">
                        ₹{batchStockTotals.totalProfit.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SALES & PROFIT REALIZATION (DERIVED FROM BATCH COST) */}
      {/* ========================================================= */}
      {activeReportTab === 'sales' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-[11px] font-sans">Total Revenue</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                ₹{salesSummary.net.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                {salesSummary.billsCount} Bills Dispensed
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 text-[11px] font-sans">Cash Collection</div>
              <div className="text-lg font-bold text-slate-800 mt-1 tabular-nums">
                ₹{salesSummary.cashTotal.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Physical cash in drawer</div>
            </div>

            <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/80 shadow-2xs">
              <div className="text-teal-800 text-[11px] font-sans font-semibold">UPI Collection</div>
              <div className="text-lg font-bold text-teal-800 mt-1 tabular-nums">
                ₹{salesSummary.upiTotal.toLocaleString()}
              </div>
              <div className="text-[10px] text-teal-700 mt-0.5 font-sans">Direct bank settlement</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-600 text-[11px] font-sans font-semibold">Realized Profit (Batch COGS)</div>
              <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                ₹{salesSummary.profit.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Margin: {salesSummary.marginPercent.toFixed(1)}% of net sales
              </div>
            </div>
          </div>

          {/* Payment filter tab */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filter by Payment Mode:</span>
            {['ALL', 'Cash', 'UPI', 'Card'].map(m => (
              <button
                key={m}
                onClick={() => setPaymentFilter(m)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  paymentFilter === m ? 'bg-slate-900 text-white font-semibold' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Sales Invoices Table with Expandable Batch Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Items</th>
                  <th className="py-3 px-4 text-right">Net Bill (₹)</th>
                  <th className="py-3 px-4 text-right">Actual Profit (₹)</th>
                  <th className="py-3 px-4 text-center">Batch Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredSales.map(s => {
                  const loc = locations.find(l => l.locationId === s.locationId);
                  const isExpanded = expandedSaleId === s.saleId;
                  const profitMargin = s.netAmount > 0 ? (s.totalProfit / s.netAmount) * 100 : 0;

                  return (
                    <React.Fragment key={s.saleId}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{s.invoiceNo}</td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">{s.saleDate}</td>
                        <td className="py-3 px-4">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {loc?.locationCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="font-medium text-slate-800">{s.customerName}</div>
                          <div className="text-[10px] text-slate-400">{s.customerPhone}</div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              s.paymentMode === 'UPI' ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {s.paymentMode}
                            </span>
                          </div>
                          {s.upiReferenceNo && (
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">
                              {s.upiReferenceNo}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                          {s.details.reduce((a, b) => a + b.quantity, 0)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                          ₹{s.netAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-teal-800">
                          ₹{s.totalProfit.toFixed(2)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ({profitMargin.toFixed(0)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setExpandedSaleId(isExpanded ? null : s.saleId)}
                            className="px-2 py-1 text-[11px] text-slate-600 hover:text-teal-800 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-1 mx-auto transition-colors"
                          >
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Batch-wise line item details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={9} className="p-3 pl-8 pr-4">
                            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                              <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <span>Batch-Wise Formulation Cost & Profit Breakdown for Invoice {s.invoiceNo}</span>
                                <span className="font-mono text-teal-800">Total Profit: ₹{s.totalProfit.toFixed(2)}</span>
                              </div>
                              <table className="w-full text-left text-[11px] font-mono">
                                <thead>
                                  <tr className="text-slate-400 border-b border-slate-100">
                                    <th className="py-1">Product Formulation</th>
                                    <th className="py-1">Batch #</th>
                                    <th className="py-1 text-right">Qty</th>
                                    <th className="py-1 text-right">Rate Charged</th>
                                    <th className="py-1 text-right">Actual Batch Cost</th>
                                    <th className="py-1 text-right">Line Revenue</th>
                                    <th className="py-1 text-right">Batch Profit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {s.details.map((d, dIdx) => (
                                    <tr key={dIdx}>
                                      <td className="py-1.5 font-sans font-medium text-slate-800">{d.productName}</td>
                                      <td className="py-1.5 text-slate-600">{d.batchNumber}</td>
                                      <td className="py-1.5 text-right">{d.quantity}</td>
                                      <td className="py-1.5 text-right">₹{d.rate}</td>
                                      <td className="py-1.5 text-right text-slate-500">₹{d.costPrice}</td>
                                      <td className="py-1.5 text-right">₹{d.amount}</td>
                                      <td className="py-1.5 text-right font-bold text-teal-800">₹{d.profit}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: COGS & MARGIN ANALYSIS */}
      {/* ========================================================= */}
      {activeReportTab === 'profit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans">Total Revenue (Net)</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                ₹{salesSummary.net.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans">Cost of Goods Sold (COGS)</div>
              <div className="text-xl font-bold text-slate-700 mt-1 tabular-nums">
                ₹{(salesSummary.net - salesSummary.profit).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                Calculated strictly from sold batch costs
              </div>
            </div>
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="text-emerald-800 font-sans font-semibold">Gross Profit Realized</div>
              <div className="text-xl font-bold text-emerald-800 mt-1 tabular-nums">
                ₹{salesSummary.profit.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-600 font-sans">Profit Margin</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {salesSummary.marginPercent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Breakdown by Product Profitability */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-semibold text-xs text-slate-800 flex items-center justify-between">
              <span>Profit Generated by Product Category (Derived from Actual Inward Batch Costs)</span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4 text-right">Units Sold</th>
                  <th className="py-2.5 px-4 text-right">Revenue (₹)</th>
                  <th className="py-2.5 px-4 text-right">Batch Cost (₹)</th>
                  <th className="py-2.5 px-4 text-right">Gross Profit (₹)</th>
                  <th className="py-2.5 px-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {products.filter(p => p && p.productId).map(p => {
                  let unitsSold = 0;
                  let revenue = 0;
                  let cost = 0;
                  filteredSales.forEach(s => {
                    (s.details || []).forEach(d => {
                      if (d && d.productId === p.productId) {
                        unitsSold += d.quantity;
                        revenue += d.amount;
                        cost += (d.costPrice || 0) * d.quantity;
                      }
                    });
                  });

                  if (unitsSold === 0) return null;
                  const profit = revenue - cost;
                  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                  return (
                    <tr key={p.productId} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{p.productName}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{unitsSold}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">₹{revenue.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">₹{cost.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-bold text-teal-800">₹{profit.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-bold">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: EXPIRY RISK ANALYSIS */}
      {/* ========================================================= */}
      {activeReportTab === 'expiry' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200">
              <div className="font-semibold text-rose-700">Expired Batches</div>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                {expiryBuckets.expired.list.length} <span className="text-xs font-sans font-normal">batches</span>
              </div>
              <div className="text-xs font-mono text-rose-600 mt-1">
                Loss Value: ₹{expiryBuckets.expired.costVal.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200">
              <div className="font-semibold text-amber-800">Expiring in ≤30 Days</div>
              <div className="text-xl font-bold font-mono text-amber-800 mt-1">
                {expiryBuckets.days30.list.length} <span className="text-xs font-sans font-normal">batches</span>
              </div>
              <div className="text-xs font-mono text-amber-700 mt-1">
                At Risk: ₹{expiryBuckets.days30.costVal.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-yellow-50/80 rounded-xl border border-yellow-200">
              <div className="font-semibold text-yellow-800">Expiring in 31–60 Days</div>
              <div className="text-xl font-bold font-mono text-yellow-800 mt-1">
                {expiryBuckets.days60.list.length} <span className="text-xs font-sans font-normal">batches</span>
              </div>
              <div className="text-xs font-mono text-yellow-700 mt-1">
                At Risk: ₹{expiryBuckets.days60.costVal.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-semibold text-slate-700">Expiring in 61–90 Days</div>
              <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                {expiryBuckets.days90.list.length} <span className="text-xs font-sans font-normal">batches</span>
              </div>
              <div className="text-xs font-mono text-slate-600 mt-1">
                Value: ₹{expiryBuckets.days90.costVal.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h3 className="font-semibold text-xs text-slate-900 mb-3">Critical Batches Requiring Immediate Action</h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium pb-2">
                  <th className="py-2">Product Name</th>
                  <th className="py-2">Branch</th>
                  <th className="py-2">Batch #</th>
                  <th className="py-2">Expiry Date</th>
                  <th className="py-2 text-right">Units</th>
                  <th className="py-2 text-right">Cost Value</th>
                  <th className="py-2">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {[...expiryBuckets.expired.list, ...expiryBuckets.days30.list].filter(b => b && b.productId).map(b => {
                  const p = products.find(prod => prod && prod.productId === b.productId);
                  const loc = locations.find(l => l.locationId === b.locationId);
                  const isExp = new Date(b.expiryDate) < today;

                  return (
                    <tr key={b.batchId} className="hover:bg-slate-50">
                      <td className="py-2.5 font-sans font-medium text-slate-900">{p?.productName}</td>
                      <td className="py-2.5">{loc?.locationCode}</td>
                      <td className="py-2.5 font-bold">{b.batchNumber}</td>
                      <td className="py-2.5">{b.expiryDate}</td>
                      <td className="py-2.5 text-right tabular-nums">{b.currentQuantity}</td>
                      <td className="py-2.5 text-right tabular-nums font-semibold">
                        ₹{(b.currentQuantity * b.costPrice).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-sans">
                        {isExp ? (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            Biomedical Write-off
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                            FIFO Clearance Priority
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: SKU VALUATION CONSOLIDATION */}
      {/* ========================================================= */}
      {activeReportTab === 'valuation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans">Total Stock Units</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {valuationTotals.totalQty} <span className="text-xs font-sans font-normal text-slate-400">units</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans">Total Cost Value (Asset)</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                ₹{valuationTotals.totalCost.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-500 font-sans">Retail Selling Value</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                ₹{valuationTotals.totalSelling.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-teal-50/70 rounded-xl border border-teal-200 shadow-2xs">
              <div className="text-teal-800 font-sans font-semibold">Unrealized Profit Potential</div>
              <div className="text-xl font-bold text-teal-800 mt-1 tabular-nums">
                ₹{valuationTotals.potentialProfit.toLocaleString()}
              </div>
              <div className="text-[10px] text-teal-700 font-sans mt-0.5">
                {valuationTotals.margin.toFixed(1)}% projected gross margin
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-3 px-4">Product Code & Name</th>
                  <th className="py-3 px-4 text-center">Batches</th>
                  <th className="py-3 px-4 text-right">Units on Hand</th>
                  <th className="py-3 px-4 text-right">Catalog Cost</th>
                  <th className="py-3 px-4 text-right">Catalog Selling</th>
                  <th className="py-3 px-4 text-right">Total Cost Value</th>
                  <th className="py-3 px-4 text-right">Total Selling Value</th>
                  <th className="py-3 px-4 text-right">Potential Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {valuationRows.filter(row => row && row.product && row.product.productId).map(row => (
                  <tr key={row.product.productId} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-sans">
                      <div className="font-semibold text-slate-900">{row.product.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.product.productCode}</div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {row.batchesCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-bold text-slate-800">{row.stockQty}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">₹{row.product.costPrice}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-900">₹{row.product.sellingPrice}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">₹{row.costValue.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">₹{row.sellingValue.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-bold text-teal-800">
                      ₹{row.profitPotential.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: PRODUCT PRICE HISTORY TABLE (AUDIT TRAIL) */}
      {/* ========================================================= */}
      {activeReportTab === 'price_history' && (
        <div className="space-y-5">
          {/* Audit banner */}
          <div className="bg-teal-50/90 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-teal-950 text-sm">ProductPriceHistory Audit Ledger</h3>
                <p className="text-[11px] text-teal-800 mt-0.5">
                  Complete chronological log of price updates. Historical stock batches retain their original cost and selling prices.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white border border-teal-300 text-teal-900 font-mono font-bold px-3 py-1.5 rounded-lg text-xs">
                {filteredPriceHistory.length} Revisions Logged
              </span>
              <button
                onClick={exportPriceHistoryCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Export Price History Log as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              {priceHistory.length > 0 && (
                <button
                  onClick={() => setIsPriceHistoryClearConfirmOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  title="Clear Product Price History Audit Records"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Banner if History Cleared */}
          {priceHistoryClearSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{priceHistoryClearSuccessMsg}</span>
              </div>
              <button
                onClick={() => setPriceHistoryClearSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={priceHistorySearchQuery}
                onChange={e => setPriceHistorySearchQuery(e.target.value)}
                placeholder="Search by product, reason, user..."
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:bg-white text-xs"
              />
              {priceHistorySearchQuery && (
                <button
                  type="button"
                  onClick={() => setPriceHistorySearchQuery('')}
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
                  value={priceHistoryProductFilter}
                  onChange={e => setPriceHistoryProductFilter(e.target.value)}
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

              {(priceHistoryProductFilter !== 'ALL' || priceHistorySearchQuery.trim() !== '') && (
                <button
                  onClick={() => {
                    setPriceHistoryProductFilter('ALL');
                    setPriceHistorySearchQuery('');
                  }}
                  className="px-2.5 py-1.5 text-[11px] text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors"
                  title="Clear search query and product filter"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-3 px-3.5">Revision Date</th>
                  <th className="py-3 px-3.5">Product SKU</th>
                  <th className="py-3 px-3.5 text-right">Cost Price (Old → New)</th>
                  <th className="py-3 px-3.5 text-right">Selling Price (Old → New)</th>
                  <th className="py-3 px-3.5 text-center">Batches Preserved</th>
                  <th className="py-3 px-3.5">Revision Reason / Justification</th>
                  <th className="py-3 px-3.5">Changed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPriceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <History className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No price change records found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {priceHistorySearchQuery || priceHistoryProductFilter !== 'ALL'
                          ? 'No revision records match your active search filters.'
                          : 'Updates to Product Master cost or selling prices will be automatically recorded here.'}
                      </p>
                      {(priceHistorySearchQuery || priceHistoryProductFilter !== 'ALL') && (
                        <button
                          onClick={() => {
                            setPriceHistoryProductFilter('ALL');
                            setPriceHistorySearchQuery('');
                          }}
                          className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredPriceHistory.map(item => {
                    const costDiff = item.newCostPrice - item.oldCostPrice;
                    const sellingDiff = item.newSellingPrice - item.oldSellingPrice;

                    const oldMargin = item.oldSellingPrice > 0 
                      ? (((item.oldSellingPrice - item.oldCostPrice) / item.oldSellingPrice) * 100).toFixed(1)
                      : '0.0';
                    const newMargin = item.newSellingPrice > 0 
                      ? (((item.newSellingPrice - item.newCostPrice) / item.newSellingPrice) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <tr key={item.historyId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(item.changedDate).toLocaleDateString('en-IN')}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 pl-4.5 block">
                            {new Date(item.changedDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          <div className="text-[10px] font-mono text-teal-700">{item.productCode}</div>
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono">
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

                        <td className="py-3 px-3.5 text-right font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 line-through">₹{item.oldSellingPrice}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-teal-800">₹{item.newSellingPrice}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            Margin: {oldMargin}% → <strong className="text-teal-800 font-mono">{newMargin}%</strong>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold font-mono">
                            <Lock className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{item.batchesPreservedCount ?? 0} batches locked</span>
                          </span>
                        </td>

                        <td className="py-3 px-3.5 max-w-xs">
                          <p className="text-slate-700 text-xs leading-relaxed">
                            {item.reason || 'Product Master price update'}
                          </p>
                        </td>

                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-[11px]">{item.changedBy}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Clear Confirmation Modal for Price History in Reports */}
          {isPriceHistoryClearConfirmOpen && (
            <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-300 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center gap-3 text-rose-700 pb-2 border-b border-rose-100">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-rose-950">Clear Product Price History Records?</h3>
                    <p className="text-[11px] text-rose-700">Permanent Audit Log Deletion</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to clear the price revision audit trail? This will permanently delete the historical price revision records.
                  Existing batches in inventory will continue to preserve their individual batch cost and selling prices.
                </p>

                <div className="flex flex-col gap-2 pt-2">
                  {priceHistoryProductFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => {
                        clearPriceHistory(priceHistoryProductFilter);
                        const prodName = products.find(p => p.productId === priceHistoryProductFilter)?.productName || 'Selected Product';
                        setPriceHistoryClearSuccessMsg(`Cleared price revision history for ${prodName}.`);
                        setIsPriceHistoryClearConfirmOpen(false);
                      }}
                      className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History for Selected Product Only</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      clearPriceHistory();
                      setPriceHistoryClearSuccessMsg('All product price revision audit logs have been successfully cleared.');
                      setIsPriceHistoryClearConfirmOpen(false);
                      setPriceHistoryProductFilter('ALL');
                      setPriceHistorySearchQuery('');
                    }}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Price History ({priceHistory.length} logs)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPriceHistoryClearConfirmOpen(false)}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel & Keep History
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: OPENING STOCK REGISTER & AUDIT REPORT */}
      {activeReportTab === 'opening_stock' && (
        <div className="space-y-4">
          
          {/* Filter Bar specifically addressing requirements: Opening Batch #, Opening Stock Date, Location */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-teal-700" />
                  <span>Opening Stock Register Audit Filters</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Filter historical and current opening stock transactions by Batch Number, Date, and Branch Location.
                </p>
              </div>

              {(openingBatchFilter !== 'ALL' || openingDateFilter || openingSearchQuery || filterLocationId !== 'ALL') && (
                <button
                  onClick={() => {
                    setOpeningBatchFilter('ALL');
                    setOpeningDateFilter('');
                    setOpeningSearchQuery('');
                    setFilterLocationId('ALL');
                  }}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {/* Filter 1: Opening Batch Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span>Opening Batch #</span>
                </label>
                <select
                  value={openingBatchFilter}
                  onChange={e => setOpeningBatchFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                >
                  <option value="ALL">All Opening Batches ({distinctOpeningBatches.length})</option>
                  {distinctOpeningBatches.map(bNo => (
                    <option key={bNo} value={bNo}>
                      {bNo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Opening Stock Date */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Opening Stock Date</span>
                  </label>
                  {openingDateFilter && (
                    <button
                      onClick={() => setOpeningDateFilter('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={openingDateFilter}
                  onChange={e => setOpeningDateFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Filter 3: Location Scope */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Clinic Location</span>
                </label>
                <select
                  value={filterLocationId}
                  onChange={e => setFilterLocationId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                >
                  <option value="ALL">All Clinic Locations</option>
                  {locations.map(loc => (
                    <option key={loc.locationId} value={loc.locationId}>
                      {loc.locationCode} - {loc.locationName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search query */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>Search Product / Staff</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={openingSearchQuery}
                    onChange={e => setOpeningSearchQuery(e.target.value)}
                    placeholder="Search SKU or name..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-400 text-[10px] uppercase font-mono">Opening Batches</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                {openingStockSummary.distinctBatchesCount} <span className="text-xs font-sans text-slate-400 font-normal">transactions</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {openingStockSummary.productsCount} unique products initialized
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 shadow-2xs">
              <div className="text-emerald-700 text-[10px] uppercase font-mono font-semibold">Total Inward Units</div>
              <div className="text-xl font-bold font-mono text-emerald-800 mt-1 tabular-nums">
                +{openingStockSummary.totalInward} <span className="text-xs font-sans text-emerald-600 font-normal">units</span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">
                Current stock: {openingStockSummary.totalCurrent} units available
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-400 text-[10px] uppercase font-mono">Initial Inward Valuation</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                ₹{openingStockSummary.totalCostVal.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                At historical batch cost prices
              </div>
            </div>

            <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/80 shadow-2xs">
              <div className="text-teal-800 text-[10px] uppercase font-mono font-semibold">Projected Sales Value</div>
              <div className="text-xl font-bold font-mono text-teal-800 mt-1 tabular-nums">
                ₹{openingStockSummary.totalRetailVal.toLocaleString()}
              </div>
              <div className="text-[10px] text-teal-700 mt-0.5">
                Potential: ₹{(openingStockSummary.totalRetailVal - openingStockSummary.totalCostVal).toLocaleString()} margin
              </div>
            </div>
          </div>

          {/* Opening Stock Register Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-3 px-3.5 font-mono">Opening Batch #</th>
                    <th className="py-3 px-3.5">Stock Date</th>
                    <th className="py-3 px-3.5">Branch</th>
                    <th className="py-3 px-3.5">Product SKU & Name</th>
                    <th className="py-3 px-3.5 text-right font-mono">Inward Qty</th>
                    <th className="py-3 px-3.5 text-right font-mono">Available</th>
                    <th className="py-3 px-3.5 text-right font-mono">Cost (₹)</th>
                    <th className="py-3 px-3.5 text-right font-mono">Inward Value</th>
                    <th className="py-3 px-3.5 text-right font-mono">Current Value</th>
                    <th className="py-3 px-3.5 text-right font-mono">Selling (₹)</th>
                    <th className="py-3 px-3.5">Created By</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {openingStockRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-400 font-sans text-xs">
                        No opening stock records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    openingStockRows.map(row => {
                      const isFullyAvailable = row.currentQty === row.inwardQty;
                      const isDepleted = row.currentQty === 0;

                      return (
                        <tr key={row.batch.batchId} className="hover:bg-slate-50/80 transition-colors">
                          {/* Common Opening Batch Number */}
                          <td className="py-2.5 px-3.5">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-50 text-indigo-800 border border-indigo-200">
                              {row.openingBatchNumber}
                            </span>
                          </td>

                          {/* Opening Stock Date */}
                          <td className="py-2.5 px-3.5 text-slate-600 text-[11px]">
                            {row.openingDate}
                          </td>

                          {/* Location */}
                          <td className="py-2.5 px-3.5 font-sans">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {row.loc?.locationCode}
                            </span>
                          </td>

                          {/* Product */}
                          <td className="py-2.5 px-3.5 font-sans">
                            <div className="flex items-center gap-2">
                              <ProductIcon categoryId={row.cat?.categoryId || ''} className="w-5 h-5 shrink-0" />
                              <div>
                                <div className="font-semibold text-slate-900 line-clamp-1">{row.prod?.productName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{row.prod?.productCode} · {row.cat?.categoryName}</div>
                              </div>
                            </div>
                          </td>

                          {/* Inward Qty */}
                          <td className="py-2.5 px-3.5 text-right font-bold text-emerald-800">
                            +{row.inwardQty}
                          </td>

                          {/* Current Available Qty */}
                          <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                            {row.currentQty}
                          </td>

                          {/* Unit Cost Price */}
                          <td className="py-2.5 px-3.5 text-right text-slate-700">
                            ₹{row.costPrice}
                          </td>

                          {/* Inward Valuation */}
                          <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                            ₹{row.totalOpeningCost.toLocaleString()}
                          </td>

                          {/* Current Valuation */}
                          <td className="py-2.5 px-3.5 text-right text-slate-700">
                            ₹{row.currentCostValue.toLocaleString()}
                          </td>

                          {/* Selling Price */}
                          <td className="py-2.5 px-3.5 text-right text-teal-800 font-bold">
                            ₹{row.sellingPrice}
                          </td>

                          {/* Created By */}
                          <td className="py-2.5 px-3.5 font-sans text-slate-600 text-[11px]">
                            {row.createdBy}
                          </td>

                          {/* Stock Status Badge */}
                          <td className="py-2.5 px-3.5 text-center font-sans">
                            {isFullyAvailable ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Intact (100%)
                              </span>
                            ) : isDepleted ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                Depleted
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Active ({row.currentQty}/{row.inwardQty})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
