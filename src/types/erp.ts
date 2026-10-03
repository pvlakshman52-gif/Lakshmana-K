/**
 * MediClinic Commerce ERP - Core Domain Models & Schemas
 * Directly aligned with ASP.NET Core 8 & SQL Server Database Architecture
 */

export type UserRole = 'Admin' | 'Doctor' | 'Staff' | 'Cashier';

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Split';

export type StockMovementType = 
  | 'Purchase' 
  | 'Sale' 
  | 'Transfer In' 
  | 'Transfer Out' 
  | 'Adjustment' 
  | 'Expiry'
  | 'Opening Stock';

export type AdjustmentType = 'Positive' | 'Negative' | 'Expired' | 'Damage';

export type DeliveryStatus = 'Pending' | 'Packed' | 'Shipped' | 'Delivered';

export type BatchPricingMode = 'ACTIVE_BATCH' | 'PRODUCT_MASTER';

// Master Tables
export interface Location {
  locationId: string;
  locationCode: string; // e.g. "HOS", "HUB"
  locationName: string; // e.g. "Hospete Clinic & Derma Care"
  address: string;
  phone: string;
  isActive: boolean;
  createdDate: string;
  gstin?: string;
  nextInvoiceSeq: number;
}

export interface Category {
  categoryId: string;
  categoryCode: string;
  categoryName: string; // "Hair Care", "Skin Care", "Body Care", "Treatment & Professional", "Supplements & Wellness", "Accessories"
  description: string;
  isActive: boolean;
  createdDate: string;
}

export interface Subcategory {
  subcategoryId: string;
  subcategoryCode: string;
  categoryId: string;
  subcategoryName: string;
  description?: string;
  isActive: boolean;
  createdDate: string;
}

export interface Brand {
  brandId: string;
  brandName: string;
  manufacturer?: string;
  isActive: boolean;
  createdDate: string;
}

export type ProductType = 
  | 'Retail Product' 
  | 'Professional Product' 
  | 'Treatment Product' 
  | 'Supplement' 
  | 'Accessory';

export interface ProductImageView {
  url: string;
  viewType: 'front' | 'back' | 'side' | 'packaging';
  label: string;
}

export interface Product {
  productId: string;
  productCode: string; // "PRD-HAIR-001"
  productName: string;
  categoryId: string;
  subcategoryId?: string;
  brandId?: string;
  brandName?: string;
  productType?: ProductType;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  imagePath?: string; // Primary / Front image URL
  backImagePath?: string; // Back View (Ingredients, Clinical Usage & Warnings)
  images?: string[]; // Array of image URLs [front, back, ...]
  imageViews?: ProductImageView[]; // Detailed views with labels & angles
  ingredients?: string;
  directions?: string;
  isActive: boolean;
  createdDate: string;
  description: string;
  volumeSize: string; // e.g. "100ml", "50g", "200ml"
  hsnCode?: string;
  gstRate?: number; // e.g. 18 (18%)
}

export interface User {
  userId: string;
  fullName: string;
  username: string;
  password?: string;
  phone?: string;
  role: UserRole;
  locationId: string; // LocationId or "ALL"
  isActive: boolean;
  createdDate: string;
}

export interface Customer {
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  email?: string;
  password?: string;
  createdDate: string;
  loyaltyPoints: number;
  totalSpend: number;
}

// Inventory Tables
export interface StockBatch {
  batchId: string;
  productId: string;
  locationId: string;
  batchNumber: string; // e.g. "OPEN-HOS-0001" or "BTH-2024-HOS-01"
  expiryDate: string; // YYYY-MM-DD
  purchaseDate: string; // YYYY-MM-DD
  purchaseInvoiceNo: string;
  supplierName: string;
  quantityReceived: number;
  currentQuantity: number;
  costPrice: number;
  sellingPrice: number; // Historical batch-wise selling price
  createdBy: string;
  createdDate: string;
  isOpeningStock?: boolean;
  openingBatchNumber?: string;
}

export interface OpeningStockItem {
  productId: string;
  quantity: number;
  costPrice?: number;
  sellingPrice?: number;
  expiryDate?: string;
}

export interface OpeningStockPayload {
  openingBatchNumber?: string; // Blank = auto-generated OPEN-LOC-XXXX
  openingStockDate: string; // YYYY-MM-DD
  locationId: string;
  remarks?: string;
  createdBy?: string;
  items: OpeningStockItem[];
}

export interface OpeningStockBatchSummary {
  openingBatchNumber: string;
  locationId: string;
  locationCode: string;
  openingStockDate: string;
  createdBy: string;
  productsCount: number;
  totalUnits: number;
  currentUnits: number;
  totalValuation: number;
  remarks?: string;
}

export interface ProductPriceHistory {
  historyId: string;
  productId: string;
  productCode: string;
  productName: string;
  oldCostPrice: number;
  newCostPrice: number;
  oldSellingPrice: number;
  newSellingPrice: number;
  changedBy: string;
  changedDate: string;
  reason?: string;
  batchesPreservedCount?: number;
}

export interface StockTransferDetail {
  transferDetailId: string;
  transferId: string;
  batchId: string;
  productId: string;
  quantity: number;
}

export interface StockTransfer {
  transferId: string;
  fromLocationId: string;
  toLocationId: string;
  transferDate: string;
  remarks: string;
  createdBy: string;
  status: 'Completed' | 'Pending';
  details: StockTransferDetail[];
}

export interface StockAdjustment {
  adjustmentId: string;
  locationId: string;
  productId: string;
  batchId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason: string;
  createdBy: string;
  createdDate: string;
}

export interface StockMovementLedger {
  movementId: string;
  productId: string;
  locationId: string;
  batchId: string;
  movementType: StockMovementType;
  referenceNo: string; // InvoiceNo, TransferId, AdjId, PO No
  qtyIn: number;
  qtyOut: number;
  balanceQty: number;
  createdDate: string;
  createdBy: string;
}

// Sales Tables
export interface SalesDetail {
  saleDetailId: string;
  saleId: string;
  batchId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  rate: number;
  amount: number;
  costPrice: number;
  profit: number;
}

export interface SalesHeader {
  saleId: string;
  invoiceNo: string; // e.g. "HOS-000001", "HUB-000001"
  locationId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  saleDate: string;
  paymentMode: PaymentMode;
  upiReferenceNo?: string;
  discountAmount: number;
  grossAmount: number;
  courierCharges?: number;
  netAmount: number;
  totalProfit: number;
  createdBy: string;
  createdDate: string;
  details: SalesDetail[];
}

export interface CourierSettings {
  standardCourierCharge: number;
  expressCourierCharge: number;
  freeDeliveryAbove: number;
  hospeteDepotCharge: number;
  hubballiDepotCharge: number;
  enabled: boolean;
}

// Online Store & Delivery (Future Module)
export interface OnlineOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  batchNumber?: string;
  batchId?: string;
  costPrice?: number;
  profit?: number;
}

export interface OnlineOrder {
  orderId: string;
  customerId?: string;
  customerName: string;
  phone: string;
  email?: string;
  shippingAddress: string;
  locationId: string; // branch handling fulfillment
  items: OnlineOrderItem[];
  itemsTotal?: number;
  courierCharges?: number;
  totalAmount: number;
  paymentMethod: 'UPI Online' | 'Cash on Delivery';
  orderDate: string;
  status: DeliveryStatus;
  trackingNotes?: string;
  deliveryAgent?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

// Go Live & System Reset Types
export interface DatabaseBackupRecord {
  backupId: string;
  fileName: string;
  timestamp: string; // ISO date-time
  createdDate: string; // YYYY-MM-DD
  createdTime: string; // HH:mm:ss
  createdBy: string;
  branchScope: 'ALL' | 'LOC-HOS' | 'LOC-HUB';
  sizeBytes: number;
  recordSummary: {
    products: number;
    batches: number;
    totalStockUnits: number;
    sales: number;
    customers: number;
    ledgerEntries: number;
  };
  snapshotJson: string;
}

export interface GoLiveAuditLog {
  logId: string;
  timestamp: string;
  date: string;
  time: string;
  user: string;
  branchScope: 'ALL' | 'LOC-HOS' | 'LOC-HUB';
  dataCleared: string[];
  backupFileName: string;
  notes?: string;
}

export interface GoLiveResetOptions {
  branchScope: 'ALL' | 'LOC-HOS' | 'LOC-HUB';
  // Selective options
  clearSales: boolean;
  clearInvoices: boolean;
  clearCustomers: boolean;
  clearLedger: boolean;
  clearPurchases: boolean;
  clearTransfers: boolean;
  clearAdjustments: boolean;
  clearPriceHistory?: boolean;
  clearProductImages: boolean;
  clearDemoUsers: boolean;
  clearDemoCategories: boolean;
  clearDemoSubcategories?: boolean;
  clearDemoBrands?: boolean;
  clearDemoProducts: boolean;
  clearDemoSuppliers: boolean;
  // Inventory mode
  inventoryMode: 'QUANTITIES_ONLY' | 'STOCK_AND_TRANSACTIONS' | 'FULL_DATABASE';
  // Product Master Protection
  keepProductMaster: boolean;
  // Sequence reset
  resetInvoiceSequences: boolean;
}

// Database Migration & Notification Types (Admin SQL Server Suite)
export type DatabaseChangeType = 
  | 'SCHEMA_COLUMN_ADDED' 
  | 'SCHEMA_TABLE_CREATED' 
  | 'SCHEMA_INDEX_MODIFIED' 
  | 'DATA_INSERTED' 
  | 'DATA_UPDATED' 
  | 'DATA_BATCH_SYNC' 
  | 'MIGRATION_APPLIED' 
  | 'TRIGGER_FIRED';

export interface DatabaseNotification {
  id: string;
  timestamp: string; // ISO string
  title: string;
  description: string;
  changeType: DatabaseChangeType;
  targetTable: string;
  severity: 'info' | 'success' | 'warning';
  sqlSnippet?: string;
  appliedBy: string;
  isRead: boolean;
  isSchemaUpdate: boolean;
  safeToApplyWithoutDataLoss: boolean;
}

export interface DatabaseMigrationPatch {
  id: string;
  version: string;
  name: string;
  description: string;
  appliedDate?: string;
  status: 'APPLIED' | 'PENDING' | 'AVAILABLE';
  targetTables: string[];
  safeNonDestructiveScript: string;
  rollbackScript?: string;
  verificationQuery: string;
}
