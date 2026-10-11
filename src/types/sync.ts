/**
 * MediClinic Commerce ERP - Branch Synchronization & Email Reporting Domain Models
 */

export interface BranchDataManifest {
  packageType: 'MEDICLINIC_BRANCH_DATA';
  packageVersion: '1.0';
  exportId: string; // e.g. "EXP-HUB-20261004-000001"
  branchCode: string; // e.g. "HUB"
  branchName: string; // e.g. "Hubballi Skin & Hair Center"
  sourceSystem: string; // "MediClinic ERP"
  sourceInstallationId: string; // e.g. "INST-HUB-01"
  exportedAt: string; // ISO 8601 string
  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD
  recordCounts: {
    sales: number;
    saleItems: number;
    payments: number;
    stockMovements: number;
    customers: number;
    transfers?: number;
    adjustments?: number;
    productsReference?: number;
  };
  totalGrossAmount: number;
  totalDiscountAmount: number;
  totalNetAmount: number;
  paymentBreakdown: {
    cash: number;
    upi: number;
    card: number;
    split: number;
  };
  checksum: string; // SHA-256 hash of payload
  schemaVersion: '1.0';
  exportedBy: string;
}

export interface ExportedSaleRecord {
  globalSaleId: string; // Stable UUID or "${branchCode}_${saleId}"
  saleId: string;
  invoiceNo: string;
  sourceBranchCode: string;
  sourceBranchName: string;
  locationId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  saleDate: string; // YYYY-MM-DD
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Split';
  upiReferenceNo?: string;
  grossAmount: number;
  discountAmount: number;
  courierCharges?: number;
  netAmount: number;
  totalProfit: number;
  createdBy: string;
  createdDate: string;
  itemsCount: number;
}

export interface ExportedSaleItemRecord {
  globalSaleItemId: string;
  globalSaleId: string;
  saleDetailId: string;
  saleId: string;
  productId: string;
  productCode: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  rate: number;
  amount: number;
  costPrice: number;
  profit: number;
}

export interface ExportedPaymentRecord {
  globalPaymentId: string;
  globalSaleId: string;
  invoiceNo: string;
  paymentMode: string;
  amount: number;
  paymentDate: string;
  referenceNo?: string;
  status: 'COMPLETED';
}

export interface ExportedCustomerRecord {
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  email?: string;
  createdDate: string;
  sourceBranchCode: string;
}

export interface ExportedStockMovementRecord {
  globalMovementId: string;
  movementId: string;
  productId: string;
  productCode: string;
  productName: string;
  sourceBranchCode: string;
  locationId: string;
  batchId: string;
  batchNumber: string;
  movementType: string;
  referenceNo: string;
  qtyIn: number;
  qtyOut: number;
  balanceQty: number;
  createdDate: string;
  createdBy: string;
}

export interface ExportedProductReference {
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  volumeSize: string;
  sellingPrice: number;
}

export interface BranchDataPackage {
  manifest: BranchDataManifest;
  sales: ExportedSaleRecord[];
  saleItems: ExportedSaleItemRecord[];
  payments: ExportedPaymentRecord[];
  customers: ExportedCustomerRecord[];
  stockMovements: ExportedStockMovementRecord[];
  transfers?: any[];
  adjustments?: any[];
  productsReference: ExportedProductReference[];
}

export interface EmailConfig {
  smtpServer: string;
  smtpPort: number;
  encryption: 'TLS' | 'SSL' | 'None';
  smtpUsername: string;
  smtpPassword?: string;
  hasPassword?: boolean;
  fromEmail: string;
  fromName: string;
  defaultRecipient: string;
  ccEmails?: string;
  bccEmails?: string;
  autoReportEnabled: boolean;
  autoReportSchedule: 'Daily' | 'Weekly' | 'Custom';
  autoReportTime: string; // e.g. "20:00"
  updatedAt?: string;
  updatedBy?: string;
}

export interface EmailHistoryRecord {
  id: string;
  timestamp: string;
  branchCode: string;
  branchName: string;
  reportType: 'SALES_REPORT' | 'BRANCH_DATA_PACKAGE' | 'TEST_EMAIL';
  periodFrom: string;
  periodTo: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodySnippet?: string;
  exportId?: string;
  attachmentName?: string;
  attachmentSizeBytes?: number;
  status: 'Sent' | 'Failed' | 'Pending Internet';
  sentBy: string;
  errorMessage?: string;
  retryCount: number;
}

export interface BranchImportRecord {
  importId: string; // e.g. "IMP-20261004-0001"
  exportId: string; // e.g. "EXP-HUB-20261004-000001"
  sourceBranchCode: string; // e.g. "HUB"
  sourceBranchName: string; // e.g. "Hubballi Skin & Hair Center"
  periodFrom: string;
  periodTo: string;
  recordCountSummary: {
    sales: number;
    saleItems: number;
    payments: number;
    stockMovements: number;
    customers: number;
  };
  totalNetAmount: number;
  importedAt: string;
  importedBy: string;
  status: 'Pending' | 'Validating' | 'Imported' | 'Failed' | 'Already Imported' | 'Rolled Back';
  errorMessage?: string;
  backupFileName?: string;
  packageFileName?: string;
}

export interface PackageValidationResult {
  isValid: boolean;
  canImport: boolean;
  isAlreadyImported: boolean;
  manifest?: BranchDataManifest;
  packageData?: BranchDataPackage;
  checks: {
    name: string;
    passed: boolean;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }[];
  conflictCount: number;
  duplicateSalesCount: number;
  missingProductsCount: number;
  missingProductsList: { code: string; name: string }[];
  summary: {
    branchCode: string;
    branchName: string;
    periodFrom: string;
    periodTo: string;
    salesCount: number;
    saleItemsCount: number;
    paymentsCount: number;
    stockMovementsCount: number;
    customersCount: number;
    totalNetAmount: number;
  };
}

export interface PeriodSalesSummary {
  branchCode: string;
  branchName: string;
  periodType: 'TODAY' | 'LAST_7_DAYS' | 'LAST_15_DAYS' | 'THIS_MONTH' | 'PREVIOUS_MONTH' | 'CUSTOM';
  periodFrom: string;
  periodTo: string;
  formattedPeriodDisplay: string;
  totalBills: number;
  grossSales: number;
  discount: number;
  netSales: number;
  cash: number;
  upi: number;
  card: number;
  split: number;
  courierCharges: number;
  avgBillValue: number;
  dailyBreakdown: {
    date: string;
    formattedDate: string;
    bills: number;
    grossSales: number;
    discount: number;
    netSales: number;
    cash: number;
    upi: number;
    card: number;
  }[];
  productBreakdown: {
    productId: string;
    productCode: string;
    productName: string;
    categoryName: string;
    quantitySold: number;
    grossAmount: number;
    discount: number;
    netAmount: number;
  }[];
}

export interface BranchOpenStockRecord {
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  volumeSize: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  purchaseDate?: string;
  purchaseInvoiceNo?: string;
  supplierName?: string;
  quantityReceived: number;
  currentQuantity: number;
  costPrice: number;
  sellingPrice: number;
  totalStockValue: number;
  locationId: string;
  sourceBranchCode: string;
  sourceBranchName: string;
  createdDate: string;
  isOpeningStock?: boolean;
  isNewlyAdded?: boolean;
}

export interface BranchOpenStockPackage {
  packageType: 'MEDICLINIC_OPEN_STOCK';
  packageVersion: '1.0';
  exportId: string;
  branchCode: string;
  branchName: string;
  exportedAt: string;
  filterMode: 'NEWLY_ADDED' | 'DATE_RANGE' | 'FULL_SNAPSHOT';
  dateFrom?: string;
  dateTo?: string;
  items: BranchOpenStockRecord[];
  productsReference: ExportedProductReference[];
  totalBatches: number;
  totalUnits: number;
  totalValuation: number;
  checksum: string;
}

export interface ProductSalesPeriodItem {
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  quantitySold: number;
  grossAmount: number;
  discount: number;
  netAmount: number;
  averageRate: number;
  invoiceCount: number;
}

export interface ProductSalesPeriodReport {
  branchCode: string;
  branchName: string;
  periodType: 'TODAY' | 'LAST_7_DAYS' | 'LAST_15_DAYS' | 'CUSTOM';
  fromDate: string;
  toDate: string;
  formattedPeriodDisplay: string;
  totalBills: number;
  totalUnitsSold: number;
  grossSales: number;
  totalDiscount: number;
  netSales: number;
  cash: number;
  upi: number;
  card: number;
  split: number;
  productBreakdown: ProductSalesPeriodItem[];
  sales: ExportedSaleRecord[];
  saleItems: ExportedSaleItemRecord[];
}

