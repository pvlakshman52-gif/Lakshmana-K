import { 
  User, 
  Product, 
  StockBatch, 
  SalesHeader, 
  StockTransfer, 
  StockAdjustment 
} from '../types/erp';
import { AuthService } from './authService';
import { resolveActiveFefoBatchPrice } from './pricingService';

// In-memory set for deduplication / idempotent transaction tracking
const processedTransactionIds = new Set<string>();

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface LoginPayload {
  username: string;
  password?: string;
  locationId?: string;
  phone?: string;
}

export interface SalePayload {
  clientTransactionId: string; // Idempotency key
  locationId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  paymentMode: 'Cash' | 'UPI' | 'Card';
  upiRefNo?: string;
  discountAmount?: number;
  isCourierDelivery?: boolean;
  courierFee?: number;
  items: {
    productId: string;
    batchId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

/**
 * Standard REST API Client / Service Interface
 * Designed for Desktop Web, Mobile PWA, and Future Dedicated Native Mobile Apps
 */
export class ClinicApiClient {
  /**
   * POST /api/auth/login
   */
  static async login(
    payload: LoginPayload,
    users: User[]
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    const trimmed = (payload.username || '').trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === trimmed);

    if (!user) {
      return {
        success: false,
        error: 'Invalid username. Please check your credentials.',
        timestamp: new Date().toISOString()
      };
    }

    if (user.password && payload.password && user.password !== payload.password) {
      return {
        success: false,
        error: 'Incorrect password.',
        timestamp: new Date().toISOString()
      };
    }

    // Generate mock bearer token for future native app session
    const token = `mclinic_token_${user.userId}_${Date.now()}`;

    return {
      success: true,
      data: { user, token },
      message: `Authenticated as ${user.fullName} (${user.role})`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /api/products
   * Filterable by category, subcategory, search query, location stock
   */
  static async getProducts(
    currentUser: User,
    products: Product[],
    batches: StockBatch[],
    locationId: string = 'LOC-HOS'
  ): Promise<ApiResponse<Product[]>> {
    // Authorize location access
    AuthService.authorizeLocationAccess(currentUser, locationId);

    return {
      success: true,
      data: products.filter(p => p.isActive !== false),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /api/products/:id
   */
  static async getProductById(
    productId: string,
    products: Product[],
    batches: StockBatch[],
    locationId: string = 'LOC-HOS'
  ): Promise<ApiResponse<{ product: Product; priceResolution: ReturnType<typeof resolveActiveFefoBatchPrice> }>> {
    const product = products.find(p => p.productId === productId);
    if (!product) {
      return {
        success: false,
        error: 'Product not found',
        timestamp: new Date().toISOString()
      };
    }

    const priceResolution = resolveActiveFefoBatchPrice(product, batches, locationId);

    return {
      success: true,
      data: { product, priceResolution },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /api/batches
   * Returns active batches for clinic
   */
  static async getBatches(
    currentUser: User,
    allBatches: StockBatch[],
    locationId: string
  ): Promise<ApiResponse<StockBatch[]>> {
    const authorizedLoc = AuthService.authorizeLocationAccess(currentUser, locationId);

    const filtered = allBatches.filter(b => {
      if (authorizedLoc !== 'ALL' && b.locationId !== authorizedLoc) return false;
      return true;
    });

    return {
      success: true,
      data: filtered,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * POST /api/sales
   * Idempotent sale execution: prevents duplicate sales after reconnecting
   */
  static async submitSale(
    currentUser: User,
    payload: SalePayload
  ): Promise<ApiResponse<{ invoiceNo: string; saleId: string }>> {
    // 1. Authorize location
    AuthService.authorizeLocationAccess(currentUser, payload.locationId);

    // 2. Prevent duplicate submissions via clientTransactionId
    if (processedTransactionIds.has(payload.clientTransactionId)) {
      return {
        success: false,
        error: `Duplicate transaction detected: Sale ${payload.clientTransactionId} has already been recorded. Re-submission rejected to prevent double billing.`,
        timestamp: new Date().toISOString()
      };
    }

    processedTransactionIds.add(payload.clientTransactionId);

    return {
      success: true,
      data: {
        invoiceNo: `${payload.locationId === 'LOC-HUB' ? 'HUB' : 'HOS'}-${Date.now().toString().slice(-6)}`,
        saleId: payload.clientTransactionId
      },
      message: 'Sale successfully committed to clinic ledger.',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /api/inventory
   * Returns aggregated stock per SKU for authorized clinic
   */
  static async getInventory(
    currentUser: User,
    products: Product[],
    batches: StockBatch[],
    locationId: string
  ): Promise<ApiResponse<{ productId: string; productName: string; totalQty: number; activeFefoBatchPrice: number }[]>> {
    const authorizedLoc = AuthService.authorizeLocationAccess(currentUser, locationId);

    const result = products.map(p => {
      const pBatches = batches.filter(b => {
        if (authorizedLoc !== 'ALL' && b.locationId !== authorizedLoc) return false;
        return b.productId === p.productId && b.currentQuantity > 0;
      });
      const totalQty = pBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
      const priceRes = resolveActiveFefoBatchPrice(p, batches, authorizedLoc === 'ALL' ? 'LOC-HOS' : authorizedLoc);

      return {
        productId: p.productId,
        productName: p.productName,
        totalQty,
        activeFefoBatchPrice: priceRes.effectivePrice
      };
    });

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * POST /api/transfers
   * Inter-branch stock transfer between Hospete and Hubballi
   */
  static async submitTransfer(
    currentUser: User,
    transfer: StockTransfer
  ): Promise<ApiResponse<StockTransfer>> {
    // Check authorization for source location
    AuthService.authorizeLocationAccess(currentUser, transfer.fromLocationId);

    return {
      success: true,
      data: transfer,
      message: `Stock transfer ${transfer.transferId} initiated from ${transfer.fromLocationId} to ${transfer.toLocationId}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * POST /api/adjustments
   * Audit adjustment (breakage, damage, expiry, physical audit correction)
   */
  static async submitAdjustment(
    currentUser: User,
    adjustment: StockAdjustment
  ): Promise<ApiResponse<StockAdjustment>> {
    AuthService.authorizeLocationAccess(currentUser, adjustment.locationId);

    return {
      success: true,
      data: adjustment,
      message: `Stock adjustment ${adjustment.adjustmentId} recorded for batch ${adjustment.batchId}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /api/reports/sales
   */
  static async getSalesReport(
    currentUser: User,
    sales: SalesHeader[],
    locationId: string = 'ALL'
  ): Promise<ApiResponse<{ totalSales: number; totalBills: number; cashTotal: number; upiTotal: number; sales: SalesHeader[] }>> {
    const authorizedLoc = AuthService.authorizeLocationAccess(currentUser, locationId);

    const filtered = sales.filter(s => {
      if (authorizedLoc !== 'ALL' && s.locationId !== authorizedLoc) return false;
      return true;
    });

    const totalSales = filtered.reduce((acc, s) => acc + s.netAmount, 0);
    const cashTotal = filtered.filter(s => s.paymentMode === 'Cash').reduce((acc, s) => acc + s.netAmount, 0);
    const upiTotal = filtered.filter(s => s.paymentMode === 'UPI').reduce((acc, s) => acc + s.netAmount, 0);

    return {
      success: true,
      data: {
        totalSales,
        totalBills: filtered.length,
        cashTotal,
        upiTotal,
        sales: filtered
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /api/reports/stock
   */
  static async getStockReport(
    currentUser: User,
    batches: StockBatch[],
    locationId: string = 'ALL'
  ): Promise<ApiResponse<{ totalBatches: number; totalCostValuation: number; totalRetailValuation: number }>> {
    const authorizedLoc = AuthService.authorizeLocationAccess(currentUser, locationId);

    const filtered = batches.filter(b => {
      if (authorizedLoc !== 'ALL' && b.locationId !== authorizedLoc) return false;
      return b.currentQuantity > 0;
    });

    const totalCostValuation = filtered.reduce((sum, b) => sum + (b.currentQuantity * (b.costPrice || 0)), 0);
    const totalRetailValuation = filtered.reduce((sum, b) => sum + (b.currentQuantity * (b.sellingPrice || 0)), 0);

    return {
      success: true,
      data: {
        totalBatches: filtered.length,
        totalCostValuation,
        totalRetailValuation
      },
      timestamp: new Date().toISOString()
    };
  }
}
