import { StockBatch, Product, BatchPricingMode } from '../types/erp';

/**
 * First Expiry First Out (FEFO) Batch Sorting
 * 1. Expiry Date ascending (earliest expiry first)
 * 2. If expiry dates are equal: oldest purchase date first (purchaseDate ascending)
 * 3. If purchase dates are equal: oldest createdDate or batchId ascending
 */
export const sortBatchesByFefo = (batches: StockBatch[]): StockBatch[] => {
  return [...batches].sort((a, b) => {
    // 1. First Expiry First Out
    const timeExpA = new Date(a.expiryDate).getTime();
    const timeExpB = new Date(b.expiryDate).getTime();
    if (!isNaN(timeExpA) && !isNaN(timeExpB) && timeExpA !== timeExpB) {
      return timeExpA - timeExpB;
    }

    // 2. Tie-breaker: If expiry dates are same, use oldest batch first (by purchaseDate)
    const timePurA = new Date(a.purchaseDate).getTime();
    const timePurB = new Date(b.purchaseDate).getTime();
    if (!isNaN(timePurA) && !isNaN(timePurB) && timePurA !== timePurB) {
      return timePurA - timePurB;
    }

    // 3. Secondary tie-breaker: createdDate
    const timeCreA = new Date(a.createdDate).getTime();
    const timeCreB = new Date(b.createdDate).getTime();
    if (!isNaN(timeCreA) && !isNaN(timeCreB) && timeCreA !== timeCreB) {
      return timeCreA - timeCreB;
    }

    return a.batchId.localeCompare(b.batchId);
  });
};

/**
 * Retrieve FEFO batches for a given product and optional location.
 * Only batches with available stock (currentQuantity > 0) are considered.
 */
export const getFefoBatchesForProduct = (
  batches: StockBatch[] = [],
  productId?: string,
  locationId?: string
): StockBatch[] => {
  if (!productId || !Array.isArray(batches)) return [];
  const filtered = batches.filter(b => {
    if (!b || b.productId !== productId) return false;
    if (b.currentQuantity <= 0) return false;
    if (locationId && locationId !== 'ALL' && b.locationId !== locationId) return false;
    return true;
  });

  return sortBatchesByFefo(filtered);
};

export interface ProductPriceResolution {
  effectivePrice: number;
  activeBatch?: StockBatch;
  nextBatch?: StockBatch;
  pricingSource: 'active_batch' | 'product_master';
  totalAvailableQty: number;
  allAvailableBatches: StockBatch[];
  costPrice: number;
  marginAmount: number;
  marginPercent: number;
}

/**
 * Resolves the selling price according to the active pricing policy:
 * - Option A ('ACTIVE_BATCH'): Sell using Active Batch Price (FEFO batch currently in stock)
 * - Option B ('PRODUCT_MASTER'): Sell using Latest Product Master Price
 *
 * Automatically switches to the next batch price when the current batch stock reaches zero.
 */
export const resolveProductSellingPrice = ({
  product,
  batches = [],
  locationId,
  pricingMode = 'ACTIVE_BATCH'
}: {
  product?: Product | null;
  batches?: StockBatch[];
  locationId?: string;
  pricingMode?: BatchPricingMode;
}): ProductPriceResolution => {
  if (!product || !product.productId) {
    return {
      effectivePrice: 0,
      pricingSource: 'product_master',
      totalAvailableQty: 0,
      allAvailableBatches: [],
      costPrice: 0,
      marginAmount: 0,
      marginPercent: 0
    };
  }

  const fefoBatches = getFefoBatchesForProduct(batches || [], product.productId, locationId);
  const activeBatch = fefoBatches[0];
  const nextBatch = fefoBatches[1];
  const totalAvailableQty = fefoBatches.reduce((sum, b) => sum + (b?.currentQuantity || 0), 0);

  let effectivePrice = product.sellingPrice || 0;
  let pricingSource: 'active_batch' | 'product_master' = 'product_master';
  let costPrice = product.costPrice || 0;

  if (pricingMode === 'ACTIVE_BATCH' && activeBatch && activeBatch.sellingPrice > 0) {
    effectivePrice = activeBatch.sellingPrice;
    pricingSource = 'active_batch';
    costPrice = activeBatch.costPrice;
  } else if (activeBatch) {
    costPrice = activeBatch.costPrice;
  }

  const marginAmount = effectivePrice - costPrice;
  const marginPercent = effectivePrice > 0 ? (marginAmount / effectivePrice) * 100 : 0;

  return {
    effectivePrice,
    activeBatch,
    nextBatch,
    pricingSource,
    totalAvailableQty,
    allAvailableBatches: fefoBatches,
    costPrice,
    marginAmount,
    marginPercent
  };
};
