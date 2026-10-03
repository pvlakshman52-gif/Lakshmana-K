import { Product, StockBatch, BatchPricingMode } from '../types/erp';
import { sortBatchesByFefo } from '../utils/batchPricing';

export interface PriceResolutionResult {
  productId: string;
  productName: string;
  locationId: string;
  effectivePrice: number;
  originalMrp: number;
  activeBatch: StockBatch | null;
  totalAvailableStock: number;
  validBatchesCount: number;
  source: 'ACTIVE_FEFO_BATCH' | 'MASTER_CATALOG' | 'NEXT_IN_LINE_BATCH';
}

/**
 * Universal FEFO Active Batch Pricing Engine
 * Single Source of Truth for Desktop Web, Mobile PWA, Future Native Apps, POS & Online Store
 *
 * Rules:
 * 1. Filter batches for the target clinic location with currentQuantity > 0.
 * 2. Order batches strictly by FEFO (Earliest expiry date first; tie-break: oldest purchase date).
 * 3. In ACTIVE_BATCH mode: Return sellingPrice of active batch.
 * 4. When current batch reaches 0, automatically resolves to the next valid FEFO batch.
 * 5. In MASTER_PRICE mode: Return product.sellingPrice.
 */
export function resolveActiveFefoBatchPrice(
  product: Product,
  allBatches: StockBatch[],
  locationId: string,
  mode: BatchPricingMode = 'ACTIVE_BATCH'
): PriceResolutionResult {
  // If location is ALL or undefined, default to LOC-HOS
  const targetLoc = (!locationId || locationId === 'ALL') ? 'LOC-HOS' : locationId;

  // Filter available batches for target location
  const branchBatches = allBatches.filter(
    b => b && b.productId === product.productId && b.locationId === targetLoc && b.currentQuantity > 0
  );

  const totalAvailableStock = branchBatches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);

  // If no available batch stock at this location, fallback to product master
  if (branchBatches.length === 0) {
    const fallbackPrice = product.sellingPrice || 100;
    return {
      productId: product.productId,
      productName: product.productName,
      locationId: targetLoc,
      effectivePrice: fallbackPrice,
      originalMrp: Math.round(fallbackPrice * 1.18),
      activeBatch: null,
      totalAvailableStock: 0,
      validBatchesCount: 0,
      source: 'MASTER_CATALOG'
    };
  }

  // Sort batches strictly following FEFO
  const sorted = sortBatchesByFefo(branchBatches);
  const activeBatch = sorted[0];

  let effectivePrice: number;
  let source: 'ACTIVE_FEFO_BATCH' | 'MASTER_CATALOG' = 'ACTIVE_FEFO_BATCH';

  if (mode === 'PRODUCT_MASTER') {
    effectivePrice = product.sellingPrice || activeBatch.sellingPrice;
    source = 'MASTER_CATALOG';
  } else {
    // Mode is ACTIVE_BATCH
    effectivePrice = (activeBatch.sellingPrice !== undefined && activeBatch.sellingPrice > 0)
      ? activeBatch.sellingPrice
      : (product.sellingPrice || 100);
  }

  return {
    productId: product.productId,
    productName: product.productName,
    locationId: targetLoc,
    effectivePrice,
    originalMrp: Math.round(effectivePrice * 1.18),
    activeBatch,
    totalAvailableStock,
    validBatchesCount: sorted.length,
    source
  };
}
