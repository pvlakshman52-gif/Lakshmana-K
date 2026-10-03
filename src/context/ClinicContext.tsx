import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Location,
  Category,
  Subcategory,
  Brand,
  Product,
  User,
  UserRole,
  Customer,
  StockBatch,
  SalesHeader,
  SalesDetail,
  StockMovementLedger,
  StockTransfer,
  StockAdjustment,
  OnlineOrder,
  PaymentMode,
  AdjustmentType,
  DeliveryStatus,
  CourierSettings,
  ProductPriceHistory,
  OpeningStockPayload,
  BatchPricingMode,
  GoLiveAuditLog,
  GoLiveResetOptions,
  DatabaseBackupRecord
} from '../types/erp';
import {
  resolveProductSellingPrice,
  getFefoBatchesForProduct,
  sortBatchesByFefo,
  ProductPriceResolution
} from '../utils/batchPricing';
import {
  normalizeCategoryId,
  resolveCategory,
  resolveSubcategory,
  inferLegacyCategoryAndSubcategory
} from '../utils/categoryUtils';
import {
  INITIAL_LOCATIONS,
  INITIAL_CATEGORIES,
  INITIAL_SUBCATEGORIES,
  INITIAL_BRANDS,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  INITIAL_BATCHES,
  INITIAL_SALES,
  INITIAL_LEDGER,
  INITIAL_ONLINE_ORDERS,
  INITIAL_COURIER_SETTINGS,
  INITIAL_PRICE_HISTORY
} from '../data/initialData';
import { localSqlServerService, SqlServerStatus } from '../services/localSqlService';

interface CartItem {
  product: Product;
  batch: StockBatch;
  quantity: number;
  rate: number;
}

interface SalePayload {
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: {
    productId: string;
    batchId: string;
    quantity: number;
    rate: number;
  }[];
  paymentMode: PaymentMode;
  upiReferenceNo?: string;
  discountAmount: number;
  courierCharges?: number;
}

interface TransferPayload {
  fromLocationId: string;
  toLocationId: string;
  remarks: string;
  items: {
    batchId: string;
    productId: string;
    quantity: number;
  }[];
}

interface ClinicContextType {
  // Navigation & Identity
  selectedLocationId: string; // 'LOC-HOS' | 'LOC-HUB' | 'ALL'
  setSelectedLocationId: (locId: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  activeLocation: Location | undefined;
  
  // Data entities
  locations: Location[];
  categories: Category[];
  subcategories: Subcategory[];
  brands: Brand[];
  products: Product[];
  users: User[];
  customers: Customer[];
  batches: StockBatch[];
  sales: SalesHeader[];
  ledger: StockMovementLedger[];
  transfers: StockTransfer[];
  adjustments: StockAdjustment[];
  onlineOrders: OnlineOrder[];
  priceHistory: ProductPriceHistory[];

  // Actions
  addCategory: (categoryName: string, description?: string, categoryCode?: string) => Category;
  updateCategory: (
    categoryId: string,
    updates: Partial<Pick<Category, 'categoryName' | 'categoryCode' | 'description' | 'isActive'>>
  ) => void;
  deleteCategory: (categoryId: string) => { success: boolean; message: string };
  toggleCategoryActive: (categoryId: string) => void;

  // Subcategories
  addSubcategory: (subcat: Omit<Subcategory, 'subcategoryId' | 'createdDate'>) => Subcategory;
  updateSubcategory: (
    subcategoryId: string,
    updates: Partial<Pick<Subcategory, 'subcategoryName' | 'subcategoryCode' | 'categoryId' | 'description' | 'isActive'>>
  ) => void;
  deleteSubcategory: (subcategoryId: string) => { success: boolean; message: string };
  toggleSubcategoryActive: (subcategoryId: string) => void;

  // Brands
  addBrand: (brandName: string, manufacturer?: string) => Brand;
  updateBrand: (
    brandId: string,
    updates: Partial<Pick<Brand, 'brandName' | 'manufacturer' | 'isActive'>>
  ) => void;
  deleteBrand: (brandId: string) => { success: boolean; message: string };
  toggleBrandActive: (brandId: string) => void;
  addProduct: (
    product: Omit<Product, 'productId' | 'createdDate'>,
    initialStock?: {
      quantity: number;
      locationId: string;
      batchNumber?: string;
      expiryDate?: string;
      supplierName?: string;
    }
  ) => Product;
  updateProduct: (product: Product, reason?: string) => void;
  deleteProduct: (productId: string) => void;
  addPriceHistoryEntry: (entry: Omit<ProductPriceHistory, 'historyId' | 'changedDate'>) => void;
  clearPriceHistory: (productId?: string) => void;
  addStockBatch: (batch: Omit<StockBatch, 'batchId' | 'createdDate' | 'createdBy'>) => void;
  addBulkOpeningStock: (payload: OpeningStockPayload) => {
    openingBatchNumber: string;
    batchesCreated: number;
    totalQuantity: number;
    totalValuation: number;
  };
  generateNextOpeningBatchNumber: (locationId: string) => string;
  updateStockBatch: (
    batchId: string,
    updatedFields: Partial<StockBatch>,
    reason?: string
  ) => void;
  deleteStockBatch: (batchId: string, reason?: string) => void;
  executeSale: (payload: SalePayload) => SalesHeader;
  executeStockTransfer: (payload: TransferPayload) => void;
  executeStockAdjustment: (
    locationId: string,
    productId: string,
    batchId: string,
    adjustmentType: AdjustmentType,
    quantity: number,
    reason: string
  ) => void;
  quickAddCustomer: (name: string, phone: string, address: string) => Customer;
  updateOnlineOrderStatus: (orderId: string, status: DeliveryStatus) => void;
  updateOnlineOrderDeliveryInfo: (
    orderId: string,
    updates: Partial<Pick<OnlineOrder, 'status' | 'trackingNotes' | 'deliveryAgent' | 'trackingNumber' | 'estimatedDelivery' | 'courierCharges'>>
  ) => void;
  createOnlineOrder: (order: Omit<OnlineOrder, 'orderId' | 'orderDate'>) => OnlineOrder;
  courierSettings: CourierSettings;
  updateCourierSettings: (settings: Partial<CourierSettings>) => void;
  updateOrderCourierCharge: (orderId: string, courierCharges: number) => void;

  // Staff / Admin Authentication
  isAuthenticated: boolean;
  loginUser: (credentials: {
    username: string;
    password?: string;
    locationId?: string;
    phone?: string;
    role?: UserRole;
  }) => { success: boolean; message: string; user?: User };
  logoutUser: () => void;
  resetUserPassword: (username: string, phone: string, newPassword: string) => { success: boolean; message: string };
  addUser: (user: Omit<User, 'userId' | 'createdDate'>) => User;
  updateUser: (user: User) => void;

  // Online Store Customer Authentication
  currentCustomer: Customer | null;
  sendCustomerOTP: (phone: string) => { success: boolean; otp: string; message: string };
  loginCustomerWithOTP: (phone: string, otp: string) => { success: boolean; message: string; customer?: Customer; isNewCustomer?: boolean };
  loginCustomerWithPassword: (identifier: string, password: string) => { success: boolean; message: string; customer?: Customer };
  registerCustomer: (payload: {
    customerName: string;
    password?: string;
    address: string;
    phone: string;
  }) => { success: boolean; message: string; customer?: Customer };
  logoutCustomer: () => void;
  
  // Batch Pricing Policy & FEFO Resolution
  batchPricingMode: BatchPricingMode;
  setBatchPricingMode: (mode: BatchPricingMode) => void;
  getProductPriceResolution: (product: Product, locationId?: string) => ProductPriceResolution;

  // Backup & Restore & Go Live System Setup
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonString: string) => boolean;
  resetDatabase: () => void;
  backups: DatabaseBackupRecord[];
  auditLogs: GoLiveAuditLog[];
  createDatabaseBackup: (branchScope?: 'ALL' | 'LOC-HOS' | 'LOC-HUB', label?: string) => DatabaseBackupRecord;
  executeGoLiveReset: (options: GoLiveResetOptions) => {
    backupRecord: DatabaseBackupRecord;
    auditLog: GoLiveAuditLog;
    summary: string[];
  };
  downloadBackupFile: (backup: DatabaseBackupRecord) => void;
  restoreFromBackupRecord: (backupId: string) => boolean;
  deleteBackupRecord: (backupId: string) => void;

  // Local Microsoft SQL Server Live Database State & Sync
  sqlServerStatus: SqlServerStatus;
  refreshSqlServerData: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'mediclinic_erp_v1_';

const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const deduplicateLedger = (items: StockMovementLedger[]): StockMovementLedger[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item.movementId || seen.has(item.movementId)) return false;
    seen.add(item.movementId);
    return true;
  });
};

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local storage helpers
  const loadStored = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return stored !== null ? JSON.parse(stored) : fallback;
    } catch (e) {
      console.error(`Failed to load ${key} from storage:`, e);
      return fallback;
    }
  };

  const wasReset = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_PREFIX + 'go_live_cleared') === 'true';

  const [locations, setLocations] = useState<Location[]>(() => loadStored('locations', INITIAL_LOCATIONS));
  const [categories, setCategories] = useState<Category[]>(() => {
    const rawLoaded = loadStored('categories', wasReset ? [] : INITIAL_CATEGORIES);
    const loadedList: Category[] = Array.isArray(rawLoaded) && rawLoaded.length > 0
      ? rawLoaded
      : (wasReset ? [] : INITIAL_CATEGORIES);

    const normalized: Category[] = [];
    const seenIds = new Set<string>();

    // 1. Process loaded categories with canonical ID normalization and deduplication
    loadedList.forEach(c => {
      const canonicalId = normalizeCategoryId(c.categoryId);
      if (seenIds.has(canonicalId)) return;
      seenIds.add(canonicalId);

      const standard = INITIAL_CATEGORIES.find(ic => ic.categoryId === canonicalId);
      if (standard) {
        normalized.push({
          ...standard,
          isActive: c.isActive !== false
        });
      } else {
        let cat = { ...c, categoryId: canonicalId };
        if (!cat.categoryCode) {
          cat.categoryCode = canonicalId.replace(/^CAT-/, '');
        }
        normalized.push(cat);
      }
    });

    // 2. Ensure all 6 standard formulary categories are always present
    if (!wasReset) {
      INITIAL_CATEGORIES.forEach(initCat => {
        if (!seenIds.has(initCat.categoryId)) {
          normalized.push(initCat);
          seenIds.add(initCat.categoryId);
        }
      });
    }

    return normalized;
  });

  const [subcategories, setSubcategories] = useState<Subcategory[]>(() => {
    const rawLoaded = loadStored('subcategories', wasReset ? [] : INITIAL_SUBCATEGORIES);
    const loadedList: Subcategory[] = Array.isArray(rawLoaded) && rawLoaded.length > 0
      ? rawLoaded
      : (wasReset ? [] : INITIAL_SUBCATEGORIES);

    const normalized: Subcategory[] = [];
    const seenIds = new Set<string>();

    loadedList.forEach(s => {
      if (s && s.subcategoryId && !seenIds.has(s.subcategoryId)) {
        seenIds.add(s.subcategoryId);
        normalized.push(s);
      }
    });

    if (!wasReset) {
      INITIAL_SUBCATEGORIES.forEach(initSub => {
        if (!seenIds.has(initSub.subcategoryId)) {
          normalized.push(initSub);
          seenIds.add(initSub.subcategoryId);
        }
      });
    }

    return normalized;
  });

  const [brands, setBrands] = useState<Brand[]>(() => {
    const rawLoaded = loadStored('brands', wasReset ? [] : INITIAL_BRANDS);
    const loadedList: Brand[] = Array.isArray(rawLoaded) && rawLoaded.length > 0
      ? rawLoaded
      : (wasReset ? [] : INITIAL_BRANDS);

    const normalized: Brand[] = [];
    const seenIds = new Set<string>();

    loadedList.forEach(b => {
      if (b && b.brandId && !seenIds.has(b.brandId)) {
        seenIds.add(b.brandId);
        normalized.push(b);
      }
    });

    if (!wasReset) {
      INITIAL_BRANDS.forEach(initBrand => {
        if (!seenIds.has(initBrand.brandId)) {
          normalized.push(initBrand);
          seenIds.add(initBrand.brandId);
        }
      });
    }

    return normalized;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const rawLoaded = loadStored('products', wasReset ? [] : INITIAL_PRODUCTS);
    const loaded = Array.isArray(rawLoaded) ? rawLoaded.filter(p => p && (p.productId || p.productCode)) : (wasReset ? [] : INITIAL_PRODUCTS);
    return loaded.map(p => {
      const initialMatch = INITIAL_PRODUCTS.find(ip => ip && (ip.productCode === p.productCode || ip.productId === p.productId));
      let resolvedCategoryId = normalizeCategoryId(p.categoryId);
      let resolvedSubcategoryId = p.subcategoryId;

      // Migrate legacy categories (CAT-SOAP -> CAT-BODY, CAT-HAIROIL -> CAT-HAIR, etc.) or infer if missing
      if (!resolvedSubcategoryId) {
        if (initialMatch?.subcategoryId) {
          resolvedSubcategoryId = initialMatch.subcategoryId;
          resolvedCategoryId = initialMatch.categoryId;
        } else {
          const inferred = inferLegacyCategoryAndSubcategory(p);
          resolvedCategoryId = inferred.categoryId;
          resolvedSubcategoryId = inferred.subcategoryId;
        }
      }

      // Synchronize category if subcategory or SKU code clearly indicates another category
      const subMatch = INITIAL_SUBCATEGORIES.find(s => s.subcategoryId === resolvedSubcategoryId) ||
                       INITIAL_SUBCATEGORIES.find(s => s.subcategoryName.toLowerCase() === (resolvedSubcategoryId || '').toLowerCase());
      if (subMatch?.categoryId) {
        resolvedCategoryId = normalizeCategoryId(subMatch.categoryId);
        resolvedSubcategoryId = subMatch.subcategoryId;
      } else if (p.productCode?.startsWith('PRD-SKIN-') || p.productCode?.startsWith('PRD-SKN-')) {
        resolvedCategoryId = 'CAT-SKIN';
      } else if (p.productCode?.startsWith('PRD-HAIR-')) {
        resolvedCategoryId = 'CAT-HAIR';
      } else if (p.productCode?.startsWith('PRD-BODY-')) {
        resolvedCategoryId = 'CAT-BODY';
      } else if (p.productCode?.startsWith('PRD-TRT-')) {
        resolvedCategoryId = 'CAT-TREATMENT';
      } else if (p.productCode?.startsWith('PRD-SUP-')) {
        resolvedCategoryId = 'CAT-SUPPLEMENTS';
      } else if (p.productCode?.startsWith('PRD-ACC-')) {
        resolvedCategoryId = 'CAT-ACCESSORIES';
      }

      const resolvedBrandId = p.brandId || initialMatch?.brandId || 'BRD-DERMACLINIX';
      const resolvedBrandName = p.brandName || initialMatch?.brandName || 'DermaClinix';
      const resolvedProductType = p.productType || initialMatch?.productType || 'Retail Product';
      const resolvedHsn = p.hsnCode || initialMatch?.hsnCode || '33049900';
      const resolvedGst = p.gstRate !== undefined ? p.gstRate : (initialMatch?.gstRate !== undefined ? initialMatch.gstRate : 18);

      return {
        ...p,
        categoryId: resolvedCategoryId,
        subcategoryId: resolvedSubcategoryId,
        brandId: resolvedBrandId,
        brandName: resolvedBrandName,
        productType: resolvedProductType,
        hsnCode: resolvedHsn,
        gstRate: resolvedGst,
        imagePath: p.imagePath || initialMatch?.imagePath,
        backImagePath: p.backImagePath || initialMatch?.backImagePath
      };
    });
  });
  const [users, setUsers] = useState<User[]>(() => loadStored('users', INITIAL_USERS));
  const [customers, setCustomers] = useState<Customer[]>(() => loadStored('customers', INITIAL_CUSTOMERS));
  const [batches, setBatches] = useState<StockBatch[]>(() => {
    const rawLoaded = loadStored('batches', wasReset ? [] : INITIAL_BATCHES);
    const validLoaded = Array.isArray(rawLoaded) ? rawLoaded.filter(b => b && b.productId) : (wasReset ? [] : INITIAL_BATCHES);
    return validLoaded.map(b => {
      const p = INITIAL_PRODUCTS.find(prod => prod && prod.productId === b.productId);
      if (p) {
        // If batch was assigned an auto 1.5x fallback price (e.g. 644 for 429 cost) rather than the actual selling price (455)
        if (b.sellingPrice === Math.round(b.costPrice * 1.5) && b.sellingPrice !== p.sellingPrice) {
          return {
            ...b,
            sellingPrice: p.sellingPrice
          };
        }
      }
      if (b.sellingPrice !== undefined && b.sellingPrice > 0) return b;
      return {
        ...b,
        sellingPrice: p ? p.sellingPrice : Math.round(b.costPrice * 1.5)
      };
    });
  });
  const [sales, setSales] = useState<SalesHeader[]>(() => {
    const loaded = loadStored('sales', wasReset ? [] : INITIAL_SALES);
    return (Array.isArray(loaded) && loaded.length > 0) ? loaded : INITIAL_SALES;
  });
  const [ledger, setLedger] = useState<StockMovementLedger[]>(() => deduplicateLedger(loadStored('ledger', wasReset ? [] : INITIAL_LEDGER)));
  const [transfers, setTransfers] = useState<StockTransfer[]>(() => loadStored('transfers', []));
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(() => loadStored('adjustments', []));
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() => loadStored('online_orders', wasReset ? [] : INITIAL_ONLINE_ORDERS));
  const [courierSettings, setCourierSettings] = useState<CourierSettings>(() => loadStored('courier_settings', INITIAL_COURIER_SETTINGS));
  const [priceHistory, setPriceHistory] = useState<ProductPriceHistory[]>(() => {
    if (wasReset) {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'price_history');
      if (stored !== null) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
      return [];
    }
    return loadStored('price_history', INITIAL_PRICE_HISTORY);
  });
  const [batchPricingMode, setBatchPricingMode] = useState<BatchPricingMode>(() => loadStored('batch_pricing_mode', 'ACTIVE_BATCH'));
  const [backups, setBackups] = useState<DatabaseBackupRecord[]>(() => loadStored('backups', []));
  const [auditLogs, setAuditLogs] = useState<GoLiveAuditLog[]>(() => loadStored('audit_logs', []));

  // Current session states
  const [currentUser, setCurrentUser] = useState<User>(() => loadStored('current_user', INITIAL_USERS[0]));
  const [selectedLocationId, setSelectedLocationIdState] = useState<string>(() => {
    const storedUser = loadStored<User>('current_user', INITIAL_USERS[0]);
    if (storedUser?.role === 'Admin') {
      return 'ALL';
    }
    return storedUser?.locationId || 'LOC-HOS';
  });

  // Guard location setting based on role: Admin can view ALL or specific branches; Staff is strictly locked to their assigned branch
  const setSelectedLocationId = (locId: string) => {
    if (currentUser.role !== 'Admin') {
      setSelectedLocationIdState(currentUser.locationId || 'LOC-HOS');
      return;
    }
    setSelectedLocationIdState(locId);
  };

  // Enforce staff location locking whenever currentUser changes
  useEffect(() => {
    if (currentUser.role !== 'Admin') {
      const staffLoc = currentUser.locationId || 'LOC-HOS';
      if (selectedLocationId !== staffLoc) {
        setSelectedLocationIdState(staffLoc);
      }
    }
  }, [currentUser, selectedLocationId]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => loadStored('is_authenticated', true));
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => loadStored('current_customer', null));
  const [otpStore, setOtpStore] = useState<Record<string, string>>({});
  const [sqlServerStatus, setSqlServerStatus] = useState<SqlServerStatus>(() => localSqlServerService.getStatus());

  // Function to re-read latest data from Local SQL Server
  const refreshSqlServerData = async () => {
    const status = await localSqlServerService.probeConnection();
    setSqlServerStatus(status);
    if (status.connected) {
      try {
        const [sqlProds, sqlBatches, sqlSales, sqlCustomers] = await Promise.all([
          localSqlServerService.fetchProducts(),
          localSqlServerService.fetchBatches(),
          localSqlServerService.fetchSales(),
          localSqlServerService.fetchCustomers()
        ]);
        if (sqlProds && sqlProds.length > 0) setProducts(sqlProds);
        if (sqlBatches && sqlBatches.length > 0) setBatches(sqlBatches);
        if (sqlSales && sqlSales.length > 0) setSales(sqlSales);
        if (sqlCustomers && sqlCustomers.length > 0) setCustomers(sqlCustomers);
      } catch (err) {
        console.warn('Failed to refresh data from local SQL Server:', err);
      }
    }
  };

  // Live Local SQL Server Read & Synchronization on Mount
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = localSqlServerService.subscribe(newStatus => {
      if (isMounted) setSqlServerStatus(newStatus);
    });

    async function initLocalSqlDatabase() {
      const status = await localSqlServerService.probeConnection();
      if (!isMounted) return;
      setSqlServerStatus(status);

      if (status.connected) {
        console.log(`[MediClinic ERP] Connected to Local Microsoft SQL Server (${status.server}/${status.database}). Reading live data...`);
        try {
          const [sqlProds, sqlBatches, sqlSales, sqlCustomers] = await Promise.all([
            localSqlServerService.fetchProducts(),
            localSqlServerService.fetchBatches(),
            localSqlServerService.fetchSales(),
            localSqlServerService.fetchCustomers()
          ]);
          if (isMounted) {
            if (sqlProds && sqlProds.length > 0) {
              console.log(`[MediClinic ERP] Loaded ${sqlProds.length} products directly from local SQL Server.`);
              setProducts(sqlProds);
            }
            if (sqlBatches && sqlBatches.length > 0) {
              console.log(`[MediClinic ERP] Loaded ${sqlBatches.length} stock batches directly from local SQL Server.`);
              setBatches(sqlBatches);
            }
            if (sqlSales && sqlSales.length > 0) {
              console.log(`[MediClinic ERP] Loaded ${sqlSales.length} sales invoices directly from local SQL Server.`);
              setSales(sqlSales);
            }
            if (sqlCustomers && sqlCustomers.length > 0) {
              console.log(`[MediClinic ERP] Loaded ${sqlCustomers.length} customers directly from local SQL Server.`);
              setCustomers(sqlCustomers);
            }
          }
        } catch (readErr) {
          console.warn('[MediClinic ERP] Could not read records from SQL Server:', readErr);
        }
      }
    }

    initLocalSqlDatabase();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'locations', JSON.stringify(locations));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'categories', JSON.stringify(categories));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'subcategories', JSON.stringify(subcategories));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'brands', JSON.stringify(brands));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'products', JSON.stringify(products));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'users', JSON.stringify(users));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'customers', JSON.stringify(customers));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'batches', JSON.stringify(batches));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'sales', JSON.stringify(sales));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'ledger', JSON.stringify(ledger));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'transfers', JSON.stringify(transfers));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'adjustments', JSON.stringify(adjustments));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'online_orders', JSON.stringify(onlineOrders));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'courier_settings', JSON.stringify(courierSettings));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'price_history', JSON.stringify(priceHistory));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'batch_pricing_mode', JSON.stringify(batchPricingMode));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'backups', JSON.stringify(backups));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'audit_logs', JSON.stringify(auditLogs));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'is_authenticated', JSON.stringify(isAuthenticated));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'current_customer', JSON.stringify(currentCustomer));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'current_user', JSON.stringify(currentUser));
  }, [locations, categories, subcategories, brands, products, users, customers, batches, sales, ledger, transfers, adjustments, onlineOrders, courierSettings, priceHistory, batchPricingMode, backups, auditLogs, isAuthenticated, currentCustomer, currentUser]);

  const activeLocation = locations.find(l => l.locationId === selectedLocationId);

  // Generate sequential Opening Batch Number if blank e.g. OPEN-HOS-0001, OPEN-HUB-0001
  const generateNextOpeningBatchNumber = (locId: string): string => {
    const loc = locations.find(l => l.locationId === locId) || locations[0];
    const locCode = loc ? loc.locationCode : 'HOS';
    const prefix = `OPEN-${locCode}-`;

    let maxSeq = 0;
    batches.forEach(b => {
      const bth = (b.batchNumber || '').trim();
      if (bth.startsWith(prefix)) {
        const numPart = bth.slice(prefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  };

  // Add Category
  const addCategory = (categoryName: string, description?: string, categoryCode?: string): Category => {
    const trimmedName = categoryName.trim();
    const lower = trimmedName.toLowerCase();

    // Check if matching category already exists (including Hair Care / Hair Products & Skin Care / Skin Products)
    const existing = categories.find(
      c => c.categoryName.trim().toLowerCase() === lower ||
           (c.categoryId === 'CAT-HAIR' && (lower === 'hair care' || lower === 'hair products')) ||
           (c.categoryId === 'CAT-SKIN' && (lower === 'skin care' || lower === 'skin products'))
    );

    if (existing) {
      const updatedCat: Category = {
        ...existing,
        categoryName: trimmedName,
        categoryCode: categoryCode?.trim().toUpperCase() || existing.categoryCode,
        description: description?.trim() || existing.description
      };
      setCategories(prev => {
        const next = prev.map(c => c.categoryId === existing.categoryId ? updatedCat : c);
        try {
          localStorage.setItem(STORAGE_KEY_PREFIX + 'categories', JSON.stringify(next));
        } catch (e) {
          console.error('Failed to sync updated category to storage:', e);
        }
        return next;
      });
      return updatedCat;
    }

    const slug = categoryCode?.trim().toUpperCase() || trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    let newId = `CAT-${slug || 'CUSTOM'}`;
    if (categories.some(c => c.categoryId === newId)) {
      newId = `${newId}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
    }

    const newCategory: Category = {
      categoryId: newId,
      categoryCode: slug,
      categoryName: trimmedName,
      description: description?.trim() || `${trimmedName} clinical formulary category`,
      isActive: true,
      createdDate: new Date().toISOString()
    };

    setCategories(prev => {
      const updated = [...prev, newCategory];
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'categories', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to sync new category to storage:', e);
      }
      return updated;
    });

    return newCategory;
  };

  // Update Category
  const updateCategory = (
    categoryId: string,
    updates: Partial<Pick<Category, 'categoryName' | 'categoryCode' | 'description' | 'isActive'>>
  ) => {
    setCategories(prev => {
      const next = prev.map(c => {
        if (c.categoryId === categoryId) {
          return {
            ...c,
            ...updates,
            categoryName: updates.categoryName !== undefined ? updates.categoryName.trim() : c.categoryName,
            categoryCode: updates.categoryCode !== undefined ? updates.categoryCode.trim().toUpperCase() : c.categoryCode,
            description: updates.description !== undefined ? updates.description.trim() : c.description
          };
        }
        return c;
      });
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'categories', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to sync updated category to storage:', e);
      }
      return next;
    });
  };

  // Toggle Category Active / Inactive
  const toggleCategoryActive = (categoryId: string) => {
    setCategories(prev => {
      const next = prev.map(c => c.categoryId === categoryId ? { ...c, isActive: !c.isActive } : c);
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'categories', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to sync category active state:', e);
      }
      return next;
    });
  };

  // Delete Category
  const deleteCategory = (categoryId: string): { success: boolean; message: string } => {
    const assignedProducts = products.filter(p => p.categoryId === categoryId);
    if (assignedProducts.length > 0) {
      return {
        success: false,
        message: `Cannot delete: ${assignedProducts.length} product(s) (e.g. "${assignedProducts[0].productName}") are currently linked to this category. Please reassign the products or mark this category as Inactive.`
      };
    }

    setCategories(prev => {
      const next = prev.filter(c => c.categoryId !== categoryId);
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'categories', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to remove category from storage:', e);
      }
      return next;
    });

    return {
      success: true,
      message: 'Category deleted successfully.'
    };
  };

  // Subcategory Actions
  const addSubcategory = (subcat: Omit<Subcategory, 'subcategoryId' | 'createdDate'>): Subcategory => {
    const trimmedName = subcat.subcategoryName.trim();
    const slug = subcat.subcategoryCode?.trim().toUpperCase() || trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const catCode = categories.find(c => c.categoryId === subcat.categoryId)?.categoryCode || 'GEN';
    let newId = `SUB-${catCode}-${slug}`;
    if (subcategories.some(s => s.subcategoryId === newId)) {
      newId = `${newId}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
    }

    const newSub: Subcategory = {
      subcategoryId: newId,
      subcategoryCode: slug,
      categoryId: subcat.categoryId,
      subcategoryName: trimmedName,
      description: subcat.description?.trim(),
      isActive: subcat.isActive !== false,
      createdDate: new Date().toISOString()
    };

    setSubcategories(prev => {
      const next = [...prev, newSub];
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'subcategories', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to sync subcategory to storage:', e);
      }
      return next;
    });

    return newSub;
  };

  const updateSubcategory = (
    subcategoryId: string,
    updates: Partial<Pick<Subcategory, 'subcategoryName' | 'subcategoryCode' | 'categoryId' | 'description' | 'isActive'>>
  ) => {
    setSubcategories(prev => {
      const next = prev.map(s => {
        if (s.subcategoryId === subcategoryId) {
          return {
            ...s,
            ...updates,
            subcategoryName: updates.subcategoryName !== undefined ? updates.subcategoryName.trim() : s.subcategoryName,
            subcategoryCode: updates.subcategoryCode !== undefined ? updates.subcategoryCode.trim().toUpperCase() : s.subcategoryCode,
            description: updates.description !== undefined ? updates.description.trim() : s.description
          };
        }
        return s;
      });
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'subcategories', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to sync updated subcategory:', e);
      }
      return next;
    });
  };

  const deleteSubcategory = (subcategoryId: string): { success: boolean; message: string } => {
    const linked = products.filter(p => p.subcategoryId === subcategoryId);
    if (linked.length > 0) {
      return {
        success: false,
        message: `Cannot delete subcategory: ${linked.length} product(s) (e.g. "${linked[0].productName}") are linked to it. Please reassign them or mark the subcategory as Inactive.`
      };
    }
    setSubcategories(prev => {
      const next = prev.filter(s => s.subcategoryId !== subcategoryId);
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'subcategories', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to sync deleted subcategory:', e);
      }
      return next;
    });
    return { success: true, message: 'Subcategory deleted successfully.' };
  };

  const toggleSubcategoryActive = (subcategoryId: string) => {
    setSubcategories(prev => {
      const next = prev.map(s => s.subcategoryId === subcategoryId ? { ...s, isActive: !s.isActive } : s);
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'subcategories', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to toggle subcategory:', e);
      }
      return next;
    });
  };

  // Brand Actions
  const addBrand = (brandName: string, manufacturer?: string): Brand => {
    const trimmed = brandName.trim();
    const slug = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    let newId = `BRD-${slug || 'CUSTOM'}`;
    if (brands.some(b => b.brandId === newId)) {
      newId = `${newId}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
    }

    const newBrand: Brand = {
      brandId: newId,
      brandName: trimmed,
      manufacturer: manufacturer?.trim(),
      isActive: true,
      createdDate: new Date().toISOString()
    };

    setBrands(prev => {
      const next = [...prev, newBrand];
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'brands', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to sync brand to storage:', e);
      }
      return next;
    });

    return newBrand;
  };

  const updateBrand = (
    brandId: string,
    updates: Partial<Pick<Brand, 'brandName' | 'manufacturer' | 'isActive'>>
  ) => {
    setBrands(prev => {
      const next = prev.map(b => {
        if (b.brandId === brandId) {
          return {
            ...b,
            ...updates,
            brandName: updates.brandName !== undefined ? updates.brandName.trim() : b.brandName,
            manufacturer: updates.manufacturer !== undefined ? updates.manufacturer.trim() : b.manufacturer
          };
        }
        return b;
      });
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'brands', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to sync updated brand:', e);
      }
      return next;
    });
  };

  const deleteBrand = (brandId: string): { success: boolean; message: string } => {
    const linked = products.filter(p => p.brandId === brandId);
    if (linked.length > 0) {
      return {
        success: false,
        message: `Cannot delete brand: ${linked.length} product(s) (e.g. "${linked[0].productName}") are linked to it. Please reassign them or mark the brand as Inactive.`
      };
    }
    setBrands(prev => {
      const next = prev.filter(b => b.brandId !== brandId);
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'brands', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to sync deleted brand:', e);
      }
      return next;
    });
    return { success: true, message: 'Brand deleted successfully.' };
  };

  const toggleBrandActive = (brandId: string) => {
    setBrands(prev => {
      const next = prev.map(b => b.brandId === brandId ? { ...b, isActive: !b.isActive } : b);
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'brands', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to toggle brand:', e);
      }
      return next;
    });
  };

  // Add Product (with mandatory category & subcategory, brand, productType, and optional opening stock)
  const addProduct = (
    prodData: Omit<Product, 'productId' | 'createdDate'>,
    initialStock?: {
      quantity: number;
      locationId: string;
      batchNumber?: string;
      expiryDate?: string;
      supplierName?: string;
    }
  ): Product => {
    const newProductId = `PRD-${Date.now().toString().slice(-4)}`;
    const resolvedCatId = normalizeCategoryId(prodData.categoryId);

    // Resolve brand name from brandId if not passed
    const matchedBrand = brands.find(b => b.brandId === prodData.brandId);
    const resolvedBrandName = prodData.brandName || matchedBrand?.brandName || 'In-House';

    const newProduct: Product = {
      ...prodData,
      categoryId: resolvedCatId,
      subcategoryId: prodData.subcategoryId,
      brandId: prodData.brandId,
      brandName: resolvedBrandName,
      productType: prodData.productType || 'Retail Product',
      hsnCode: prodData.hsnCode || '33049900',
      gstRate: prodData.gstRate !== undefined ? prodData.gstRate : 18,
      productId: newProductId,
      createdDate: new Date().toISOString().split('T')[0]
    };
    setProducts(prev => [newProduct, ...prev]);

    // If opening stock quantity is provided, register initial stock batch & ledger
    if (initialStock && initialStock.quantity > 0) {
      const loc = locations.find(l => l.locationId === initialStock.locationId) || locations[0];
      const newBatchId = generateUniqueId('BTH');
      const bthNo = initialStock.batchNumber?.trim() || generateNextOpeningBatchNumber(initialStock.locationId);
      const expDate = initialStock.expiryDate?.trim() || '2028-12-31';

      const initialBatch: StockBatch = {
        batchId: newBatchId,
        productId: newProductId,
        locationId: initialStock.locationId,
        batchNumber: bthNo,
        openingBatchNumber: bthNo,
        isOpeningStock: true,
        expiryDate: expDate,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseInvoiceNo: bthNo,
        supplierName: initialStock.supplierName?.trim() || 'Opening Stock Migration',
        quantityReceived: initialStock.quantity,
        currentQuantity: initialStock.quantity,
        costPrice: prodData.costPrice,
        sellingPrice: prodData.sellingPrice,
        createdBy: currentUser.fullName,
        createdDate: new Date().toISOString()
      };

      setBatches(prev => [initialBatch, ...prev]);

      const ledgerEntry: StockMovementLedger = {
        movementId: generateUniqueId('MOV'),
        productId: newProductId,
        locationId: initialStock.locationId,
        batchId: newBatchId,
        movementType: 'Opening Stock',
        referenceNo: bthNo,
        qtyIn: initialStock.quantity,
        qtyOut: 0,
        balanceQty: initialStock.quantity,
        createdDate: new Date().toISOString(),
        createdBy: currentUser.fullName
      };

      setLedger(prev => deduplicateLedger([ledgerEntry, ...prev]));
      localSqlServerService.writeBatch(initialBatch).catch(err => console.warn('SQL initial batch write:', err));
      localSqlServerService.writeLedger(ledgerEntry).catch(err => console.warn('SQL initial ledger write:', err));
    }

    localSqlServerService.writeProduct(newProduct).catch(err => console.warn('SQL product write:', err));

    return newProduct;
  };

  // Update Product (When price is updated, track in ProductPriceHistory; DO NOT overwrite historical batch prices)
  const updateProduct = (updated: Product, reason?: string) => {
    const existing = products.find(p => p.productId === updated.productId);
    if (existing) {
      const costChanged = existing.costPrice !== updated.costPrice;
      const sellingChanged = existing.sellingPrice !== updated.sellingPrice;
      if (costChanged || sellingChanged) {
        const affectedBatches = batches.filter(b => b.productId === updated.productId);
        const historyEntry: ProductPriceHistory = {
          historyId: generateUniqueId('PRC-HIST'),
          productId: updated.productId,
          productCode: updated.productCode,
          productName: updated.productName,
          oldCostPrice: existing.costPrice,
          newCostPrice: updated.costPrice,
          oldSellingPrice: existing.sellingPrice,
          newSellingPrice: updated.sellingPrice,
          changedBy: currentUser.fullName,
          changedDate: new Date().toISOString(),
          reason: reason?.trim() || 'Product Master price revision (Existing batches preserved at historical prices)',
          batchesPreservedCount: affectedBatches.length
        };
        setPriceHistory(prev => [historyEntry, ...prev]);
      }
    }
    // Update Product Master prices for future purchase orders
    const matchedBrand = brands.find(b => b.brandId === updated.brandId);
    const resolvedUpdated: Product = {
      ...updated,
      categoryId: normalizeCategoryId(updated.categoryId),
      subcategoryId: updated.subcategoryId,
      brandId: updated.brandId,
      brandName: updated.brandName || matchedBrand?.brandName,
      productType: updated.productType,
      hsnCode: updated.hsnCode,
      gstRate: updated.gstRate
    };
    setProducts(prev => prev.map(p => p.productId === updated.productId ? resolvedUpdated : p));
    localSqlServerService.writeProduct(resolvedUpdated).catch(err => console.warn('SQL product update:', err));
    // CRITICAL: batches are NOT modified! Historical stock batches keep their original costPrice and sellingPrice.
  };

  const addPriceHistoryEntry = (entry: Omit<ProductPriceHistory, 'historyId' | 'changedDate'>) => {
    const newEntry: ProductPriceHistory = {
      ...entry,
      historyId: generateUniqueId('PRC-HIST'),
      changedDate: new Date().toISOString()
    };
    setPriceHistory(prev => [newEntry, ...prev]);
  };

  const clearPriceHistory = (productId?: string) => {
    if (productId && productId !== 'ALL') {
      setPriceHistory(prev => {
        const next = prev.filter(h => h.productId !== productId);
        try {
          localStorage.setItem(STORAGE_KEY_PREFIX + 'price_history', JSON.stringify(next));
        } catch (e) {
          console.error('Failed to sync cleared price history to storage:', e);
        }
        return next;
      });
    } else {
      setPriceHistory([]);
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'price_history', JSON.stringify([]));
      } catch (e) {
        console.error('Failed to clear price history in storage:', e);
      }
    }
  };

  // Delete / Remove Product (if entered mistakenly)
  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.productId !== productId));
    setBatches(prev => prev.filter(b => b.productId !== productId));
  };

  // Update Stock Batch (Correct wrong quantity, cost price, expiry, or batch number)
  const updateStockBatch = (
    batchId: string,
    updatedFields: Partial<StockBatch>,
    reason: string = 'Stock/Price Typo Correction'
  ) => {
    const existing = batches.find(b => b.batchId === batchId);
    if (!existing) return;

    const oldQty = existing.currentQuantity;
    const newQty = updatedFields.currentQuantity !== undefined ? updatedFields.currentQuantity : oldQty;
    const qtyDiff = newQty - oldQty;

    const updatedBatch: StockBatch = {
      ...existing,
      ...updatedFields,
      currentQuantity: newQty
    };

    setBatches(prev => prev.map(b => b.batchId === batchId ? updatedBatch : b));
    localSqlServerService.writeBatch(updatedBatch).catch(err => console.warn('SQL batch update:', err));

    // If quantity was altered, log an adjustment entry in the movement ledger
    if (qtyDiff !== 0) {
      const ledgerEntry: StockMovementLedger = {
        movementId: generateUniqueId('MOV'),
        productId: existing.productId,
        locationId: existing.locationId,
        batchId: existing.batchId,
        movementType: 'Adjustment',
        referenceNo: `CORRECTION: ${reason}`,
        qtyIn: qtyDiff > 0 ? qtyDiff : 0,
        qtyOut: qtyDiff < 0 ? Math.abs(qtyDiff) : 0,
        balanceQty: newQty,
        createdDate: new Date().toISOString(),
        createdBy: currentUser.fullName
      };
      setLedger(prev => deduplicateLedger([ledgerEntry, ...prev]));
      localSqlServerService.writeLedger(ledgerEntry).catch(err => console.warn('SQL ledger write:', err));
    }
  };

  // Delete / Void Stock Batch
  const deleteStockBatch = (batchId: string, reason: string = 'Entry Voided') => {
    const existing = batches.find(b => b.batchId === batchId);
    if (!existing) return;

    if (existing.currentQuantity > 0) {
      const ledgerEntry: StockMovementLedger = {
        movementId: generateUniqueId('MOV'),
        productId: existing.productId,
        locationId: existing.locationId,
        batchId: existing.batchId,
        movementType: 'Adjustment',
        referenceNo: `VOID-BATCH: ${reason}`,
        qtyIn: 0,
        qtyOut: existing.currentQuantity,
        balanceQty: 0,
        createdDate: new Date().toISOString(),
        createdBy: currentUser.fullName
      };
      setLedger(prev => deduplicateLedger([ledgerEntry, ...prev]));
    }

    setBatches(prev => prev.filter(b => b.batchId !== batchId));
  };

  // Add Stock Batch (Goods Receipt / Purchase Order Inward)
  // Creates a new batch with its own independent costPrice and sellingPrice
  const addStockBatch = (batchData: Omit<StockBatch, 'batchId' | 'createdDate' | 'createdBy'>) => {
    const prod = products.find(p => p.productId === batchData.productId);
    const resolvedCostPrice = batchData.costPrice !== undefined && batchData.costPrice > 0 
      ? Number(batchData.costPrice) 
      : (prod ? prod.costPrice : 0);
    const resolvedSellingPrice = batchData.sellingPrice !== undefined && batchData.sellingPrice > 0 
      ? Number(batchData.sellingPrice) 
      : (prod ? prod.sellingPrice : Math.round(resolvedCostPrice * 1.5));

    const newBatchId = generateUniqueId('BTH');
    const newBatch: StockBatch = {
      ...batchData,
      costPrice: resolvedCostPrice,
      sellingPrice: resolvedSellingPrice,
      batchId: newBatchId,
      createdBy: currentUser.fullName,
      createdDate: new Date().toISOString()
    };

    setBatches(prev => [newBatch, ...prev]);
    localSqlServerService.writeBatch(newBatch).catch(err => console.warn('SQL batch write:', err));

    // Record in Stock Movement Ledger
    const ledgerEntry: StockMovementLedger = {
      movementId: generateUniqueId('MOV'),
      productId: batchData.productId,
      locationId: batchData.locationId,
      batchId: newBatchId,
      movementType: 'Purchase',
      referenceNo: batchData.purchaseInvoiceNo || 'PO-DIRECT',
      qtyIn: batchData.quantityReceived,
      qtyOut: 0,
      balanceQty: batchData.quantityReceived,
      createdDate: new Date().toISOString(),
      createdBy: currentUser.fullName
    };

    setLedger(prev => deduplicateLedger([ledgerEntry, ...prev]));
    localSqlServerService.writeLedger(ledgerEntry).catch(err => console.warn('SQL ledger write:', err));
  };

  // Add Bulk Opening Stock with common Opening Batch Number
  const addBulkOpeningStock = (payload: OpeningStockPayload) => {
    const loc = locations.find(l => l.locationId === payload.locationId) || locations[0];
    const rawBatchNo = payload.openingBatchNumber?.trim();
    const resolvedBatchNumber = rawBatchNo && rawBatchNo.length > 0 
      ? rawBatchNo 
      : generateNextOpeningBatchNumber(payload.locationId);
    const stockDate = payload.openingStockDate || new Date().toISOString().split('T')[0];
    const creator = payload.createdBy || currentUser.fullName;

    const validItems = payload.items.filter(item => Number(item.quantity) > 0);
    if (validItems.length === 0) {
      throw new Error('Please enter at least one product with quantity greater than zero.');
    }

    const newBatches: StockBatch[] = [];
    const newLedgerEntries: StockMovementLedger[] = [];
    let totalValuation = 0;
    let totalQuantity = 0;

    validItems.forEach(item => {
      const prod = products.find(p => p.productId === item.productId);
      const costPrice = item.costPrice !== undefined && item.costPrice > 0 ? Number(item.costPrice) : (prod?.costPrice || 0);
      const sellingPrice = item.sellingPrice !== undefined && item.sellingPrice > 0 ? Number(item.sellingPrice) : (prod?.sellingPrice || Math.round(costPrice * 1.5));
      const expiryDate = item.expiryDate?.trim() || '2028-12-31';
      const qty = Number(item.quantity);

      totalQuantity += qty;
      totalValuation += qty * costPrice;

      const newBatchId = generateUniqueId('BTH');
      const newBatch: StockBatch = {
        batchId: newBatchId,
        productId: item.productId,
        locationId: payload.locationId,
        batchNumber: resolvedBatchNumber,
        openingBatchNumber: resolvedBatchNumber,
        isOpeningStock: true,
        expiryDate,
        purchaseDate: stockDate,
        purchaseInvoiceNo: resolvedBatchNumber,
        supplierName: payload.remarks?.trim() || 'Opening Stock Migration',
        quantityReceived: qty,
        currentQuantity: qty,
        costPrice,
        sellingPrice,
        createdBy: creator,
        createdDate: new Date().toISOString()
      };
      newBatches.push(newBatch);

      const existingBalance = batches
        .filter(b => b.productId === item.productId && b.locationId === payload.locationId)
        .reduce((sum, b) => sum + b.currentQuantity, 0);

      const ledgerEntry: StockMovementLedger = {
        movementId: generateUniqueId('MOV'),
        productId: item.productId,
        locationId: payload.locationId,
        batchId: newBatchId,
        movementType: 'Opening Stock',
        referenceNo: resolvedBatchNumber,
        qtyIn: qty,
        qtyOut: 0,
        balanceQty: existingBalance + qty,
        createdDate: stockDate.includes('T') ? stockDate : `${stockDate}T09:00:00`,
        createdBy: creator
      };
      newLedgerEntries.push(ledgerEntry);
    });

    setBatches(prev => [...newBatches, ...prev]);
    setLedger(prev => deduplicateLedger([...newLedgerEntries, ...prev]));

    return {
      openingBatchNumber: resolvedBatchNumber,
      batchesCreated: newBatches.length,
      totalQuantity,
      totalValuation
    };
  };

  // Execute Point of Sale Bill
  const executeSale = (payload: SalePayload): SalesHeader => {
    const targetLocId = selectedLocationId === 'ALL' ? 'LOC-HOS' : selectedLocationId;
    const loc = locations.find(l => l.locationId === targetLocId) || locations[0];

    // Generate location invoice sequence e.g. HOS-000019 or HUB-000012
    const currentSeq = loc.nextInvoiceSeq || 1;
    const invoiceNo = `${loc.locationCode}-${String(currentSeq).padStart(6, '0')}`;

    // Update location sequence counter
    setLocations(prev =>
      prev.map(l => l.locationId === loc.locationId ? { ...l, nextInvoiceSeq: currentSeq + 1 } : l)
    );

    let grossAmount = 0;
    let totalCost = 0;
    const saleId = generateUniqueId('SALE');
    const saleDetails: SalesDetail[] = [];
    const newLedgerEntries: StockMovementLedger[] = [];

    // Clone batches array to update quantities cleanly
    const updatedBatches = batches.map(b => ({ ...b }));

    payload.items.forEach((item, index) => {
      const batchIndex = updatedBatches.findIndex(b => b.batchId === item.batchId);
      const product = products.find(p => p.productId === item.productId);
      const productName = product ? product.productName : 'Clinical Product';
      const batch = batchIndex >= 0 ? updatedBatches[batchIndex] : null;
      const costPrice = batch ? batch.costPrice : (product ? product.costPrice : 0);
      const batchNumber = batch ? batch.batchNumber : 'DEFAULT-BTH';

      const lineAmount = item.rate * item.quantity;
      const lineCost = costPrice * item.quantity;
      const lineProfit = lineAmount - lineCost;

      grossAmount += lineAmount;
      totalCost += lineCost;

      saleDetails.push({
        saleDetailId: `SD-${saleId}-${index + 1}`,
        saleId,
        batchId: item.batchId,
        productId: item.productId,
        productName,
        batchNumber,
        quantity: item.quantity,
        rate: item.rate,
        amount: lineAmount,
        costPrice,
        profit: lineProfit
      });

      if (batchIndex >= 0) {
        const oldQty = updatedBatches[batchIndex].currentQuantity;
        const newQty = Math.max(0, oldQty - item.quantity);
        updatedBatches[batchIndex].currentQuantity = newQty;

        // Prepare ledger entry with guaranteed unique movementId
        newLedgerEntries.push({
          movementId: generateUniqueId('MOV'),
          productId: item.productId,
          locationId: targetLocId,
          batchId: item.batchId,
          movementType: 'Sale',
          referenceNo: invoiceNo,
          qtyIn: 0,
          qtyOut: item.quantity,
          balanceQty: newQty,
          createdDate: new Date().toISOString(),
          createdBy: currentUser.fullName
        });
      }
    });

    setBatches(updatedBatches);

    const courierFee = Number(payload.courierCharges) || 0;
    const netAmount = Math.max(0, grossAmount + courierFee - (payload.discountAmount || 0));
    const totalProfit = netAmount - totalCost;

    const newSaleHeader: SalesHeader = {
      saleId,
      invoiceNo,
      locationId: targetLocId,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      saleDate: new Date().toISOString().split('T')[0],
      paymentMode: payload.paymentMode,
      upiReferenceNo: payload.upiReferenceNo,
      discountAmount: payload.discountAmount,
      grossAmount,
      courierCharges: courierFee,
      netAmount,
      totalProfit,
      createdBy: currentUser.fullName,
      createdDate: new Date().toISOString(),
      details: saleDetails
    };

    setSales(prev => [newSaleHeader, ...prev]);
    setLedger(prev => deduplicateLedger([...newLedgerEntries, ...prev]));

    // Asynchronously write to local Microsoft SQL Server database in real time
    localSqlServerService.writeSale(newSaleHeader).catch(err => {
      console.warn('Asynchronous SQL Server write for sale deferred:', err);
    });
    newLedgerEntries.forEach(entry => {
      localSqlServerService.writeLedger(entry).catch(err => console.warn('SQL ledger write error:', err));
    });

    // Update customer loyalty points (1 point per ₹100 spent)
    if (payload.customerId && payload.customerId !== 'CUST-005') {
      const earnedPoints = Math.floor(netAmount / 100);
      setCustomers(prev =>
        prev.map(c =>
          c.customerId === payload.customerId
            ? {
                ...c,
                loyaltyPoints: c.loyaltyPoints + earnedPoints,
                totalSpend: c.totalSpend + netAmount
              }
            : c
        )
      );
    }

    return newSaleHeader;
  };

  // Inter-Clinic Stock Transfer
  const executeStockTransfer = (payload: TransferPayload) => {
    const transferId = generateUniqueId('TRF');
    const newTransfer: StockTransfer = {
      transferId,
      fromLocationId: payload.fromLocationId,
      toLocationId: payload.toLocationId,
      transferDate: new Date().toISOString().split('T')[0],
      remarks: payload.remarks,
      createdBy: currentUser.fullName,
      status: 'Completed',
      details: payload.items.map((it, idx) => ({
        transferDetailId: `TD-${transferId}-${idx}`,
        transferId,
        batchId: it.batchId,
        productId: it.productId,
        quantity: it.quantity
      }))
    };

    const newLedgerEntries: StockMovementLedger[] = [];
    const updated = batches.map(b => ({ ...b }));

    payload.items.forEach((item) => {
      const sourceIndex = updated.findIndex(b => b.batchId === item.batchId);
      if (sourceIndex >= 0) {
        const srcBatch = updated[sourceIndex];
        const newSrcQty = Math.max(0, srcBatch.currentQuantity - item.quantity);
        updated[sourceIndex].currentQuantity = newSrcQty;

        // Transfer Out Ledger
        newLedgerEntries.push({
          movementId: generateUniqueId('MOV-TRF-OUT'),
          productId: item.productId,
          locationId: payload.fromLocationId,
          batchId: item.batchId,
          movementType: 'Transfer Out',
          referenceNo: transferId,
          qtyIn: 0,
          qtyOut: item.quantity,
          balanceQty: newSrcQty,
          createdDate: new Date().toISOString(),
          createdBy: currentUser.fullName
        });

        // Check if destination location already has this batch number
        const destIndex = updated.findIndex(
          b => b.productId === item.productId &&
               b.locationId === payload.toLocationId &&
               b.batchNumber === srcBatch.batchNumber
        );

        if (destIndex >= 0) {
          const destBatch = updated[destIndex];
          const newDestQty = destBatch.currentQuantity + item.quantity;
          updated[destIndex].currentQuantity = newDestQty;

          newLedgerEntries.push({
            movementId: generateUniqueId('MOV-TRF-IN'),
            productId: item.productId,
            locationId: payload.toLocationId,
            batchId: destBatch.batchId,
            movementType: 'Transfer In',
            referenceNo: transferId,
            qtyIn: item.quantity,
            qtyOut: 0,
            balanceQty: newDestQty,
            createdDate: new Date().toISOString(),
            createdBy: currentUser.fullName
          });
        } else {
          // Create corresponding batch at destination clinic
          const newDestBatchId = generateUniqueId(`BTH-${payload.toLocationId}`);
          const newDestBatch: StockBatch = {
            ...srcBatch,
            batchId: newDestBatchId,
            locationId: payload.toLocationId,
            quantityReceived: item.quantity,
            currentQuantity: item.quantity,
            purchaseInvoiceNo: `TRF-${transferId}`,
            supplierName: `Stock Transfer from ${payload.fromLocationId}`,
            createdDate: new Date().toISOString(),
            createdBy: currentUser.fullName
          };
          updated.push(newDestBatch);

          newLedgerEntries.push({
            movementId: generateUniqueId('MOV-TRF-IN'),
            productId: item.productId,
            locationId: payload.toLocationId,
            batchId: newDestBatchId,
            movementType: 'Transfer In',
            referenceNo: transferId,
            qtyIn: item.quantity,
            qtyOut: 0,
            balanceQty: item.quantity,
            createdDate: new Date().toISOString(),
            createdBy: currentUser.fullName
          });
        }
      }
    });

    setBatches(updated);
    setTransfers(prev => [newTransfer, ...prev]);
    setLedger(prev => deduplicateLedger([...newLedgerEntries, ...prev]));
  };

  // Stock Adjustment (Damage, Expired, Found, Recount)
  const executeStockAdjustment = (
    locationId: string,
    productId: string,
    batchId: string,
    adjustmentType: AdjustmentType,
    quantity: number,
    reason: string
  ) => {
    const adjId = generateUniqueId('ADJ');
    const newAdj: StockAdjustment = {
      adjustmentId: adjId,
      locationId,
      productId,
      batchId,
      adjustmentType,
      quantity,
      reason,
      createdBy: currentUser.fullName,
      createdDate: new Date().toISOString()
    };

    let newLedgerEntry: StockMovementLedger | null = null;
    const isNegative = adjustmentType === 'Negative' || adjustmentType === 'Damage' || adjustmentType === 'Expired';

    const updatedBatches = batches.map(b => {
      if (b.batchId === batchId) {
        const newQty = isNegative ? Math.max(0, b.currentQuantity - quantity) : b.currentQuantity + quantity;

        newLedgerEntry = {
          movementId: generateUniqueId('MOV-ADJ'),
          productId,
          locationId,
          batchId,
          movementType: adjustmentType === 'Expired' ? 'Expiry' : 'Adjustment',
          referenceNo: `${adjId} (${adjustmentType})`,
          qtyIn: isNegative ? 0 : quantity,
          qtyOut: isNegative ? quantity : 0,
          balanceQty: newQty,
          createdDate: new Date().toISOString(),
          createdBy: currentUser.fullName
        };

        return { ...b, currentQuantity: newQty };
      }
      return b;
    });

    setBatches(updatedBatches);
    if (newLedgerEntry) {
      setLedger(prev => deduplicateLedger([newLedgerEntry!, ...prev]));
    }
    setAdjustments(prev => [newAdj, ...prev]);
  };

  // Quick Add Customer
  const quickAddCustomer = (name: string, phone: string, address: string): Customer => {
    const newCust: Customer = {
      customerId: `CUST-${Date.now().toString().slice(-4)}`,
      customerName: name,
      phone,
      address: address || 'Local Address',
      createdDate: new Date().toISOString().split('T')[0],
      loyaltyPoints: 0,
      totalSpend: 0
    };
    setCustomers(prev => [newCust, ...prev]);
    localSqlServerService.writeCustomer(newCust).catch(err => console.warn('SQL customer write:', err));
    return newCust;
  };

  // Online Storefront Order Updates
  const updateOnlineOrderStatus = (orderId: string, status: DeliveryStatus) => {
    setOnlineOrders(prev =>
      prev.map(o => o.orderId === orderId ? { ...o, status } : o)
    );
  };

  const updateOnlineOrderDeliveryInfo = (
    orderId: string,
    updates: Partial<Pick<OnlineOrder, 'status' | 'trackingNotes' | 'deliveryAgent' | 'trackingNumber' | 'estimatedDelivery' | 'courierCharges'>>
  ) => {
    setOnlineOrders(prev =>
      prev.map(o => {
        if (o.orderId !== orderId) return o;
        const updated = { ...o, ...updates };
        if (updates.courierCharges !== undefined) {
          const itemsTotal = updated.itemsTotal ?? updated.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
          updated.itemsTotal = itemsTotal;
          updated.totalAmount = itemsTotal + updates.courierCharges;
        }
        return updated;
      })
    );
  };

  const updateCourierSettings = (settings: Partial<CourierSettings>) => {
    setCourierSettings(prev => ({ ...prev, ...settings }));
  };

  const updateOrderCourierCharge = (orderId: string, courierCharges: number) => {
    setOnlineOrders(prev =>
      prev.map(o => {
        if (o.orderId !== orderId) return o;
        const itemsTotal = o.itemsTotal ?? o.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
        return {
          ...o,
          itemsTotal,
          courierCharges,
          totalAmount: itemsTotal + courierCharges
        };
      })
    );
  };

  const getProductPriceResolution = (product: Product, locationId?: string): ProductPriceResolution => {
    const targetLoc = locationId || (selectedLocationId === 'ALL' ? undefined : selectedLocationId);
    return resolveProductSellingPrice({
      product,
      batches,
      locationId: targetLoc,
      pricingMode: batchPricingMode
    });
  };

  const createOnlineOrder = (orderData: Omit<OnlineOrder, 'orderId' | 'orderDate'>): OnlineOrder => {
    const orderId = `ORD-WEB-${Date.now().toString().slice(-4)}`;
    const updatedBatches = batches.map(b => ({ ...b }));
    const newLedgerEntries: StockMovementLedger[] = [];

    // Deduct stock from the active FEFO batch for each item
    const resolvedItems = orderData.items.map(item => {
      const prod = products.find(p => p.productId === item.productId);
      const fefoBatches = getFefoBatchesForProduct(updatedBatches, item.productId, orderData.locationId);
      const activeBatch = fefoBatches[0];
      const batchNumber = activeBatch ? activeBatch.batchNumber : (item.batchNumber || 'WEB-STOCK');
      const batchId = activeBatch ? activeBatch.batchId : item.batchId;
      const costPrice = activeBatch ? activeBatch.costPrice : (prod?.costPrice || 0);
      const sellingPrice = (batchPricingMode === 'ACTIVE_BATCH' && activeBatch && activeBatch.sellingPrice > 0)
        ? activeBatch.sellingPrice
        : (item.price || prod?.sellingPrice || 0);
      const profit = (sellingPrice - costPrice) * item.quantity;

      if (activeBatch) {
        const batchIndex = updatedBatches.findIndex(b => b.batchId === activeBatch.batchId);
        if (batchIndex >= 0) {
          const oldQty = updatedBatches[batchIndex].currentQuantity;
          const newQty = Math.max(0, oldQty - item.quantity);
          updatedBatches[batchIndex].currentQuantity = newQty;

          newLedgerEntries.push({
            movementId: generateUniqueId('MOV-WEB'),
            productId: item.productId,
            locationId: orderData.locationId,
            batchId: activeBatch.batchId,
            movementType: 'Sale',
            referenceNo: orderId,
            qtyIn: 0,
            qtyOut: item.quantity,
            balanceQty: newQty,
            createdDate: new Date().toISOString(),
            createdBy: currentCustomer?.customerName || 'Online Patient'
          });
        }
      }

      return {
        ...item,
        price: sellingPrice,
        batchNumber,
        batchId,
        costPrice,
        profit
      };
    });

    if (newLedgerEntries.length > 0) {
      setBatches(updatedBatches);
      setLedger(prev => deduplicateLedger([...newLedgerEntries, ...prev]));
    }

    const itemsTotal = orderData.itemsTotal !== undefined
      ? orderData.itemsTotal
      : resolvedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

    const courierFee = orderData.courierCharges !== undefined
      ? orderData.courierCharges
      : (
        courierSettings.enabled && (courierSettings.freeDeliveryAbove === 0 || itemsTotal < courierSettings.freeDeliveryAbove)
          ? (orderData.locationId === 'LOC-HOS' ? courierSettings.hospeteDepotCharge : courierSettings.hubballiDepotCharge)
          : 0
      );

    const totalAmount = itemsTotal + courierFee;

    const newOrder: OnlineOrder = {
      ...orderData,
      customerId: orderData.customerId || currentCustomer?.customerId,
      orderId,
      orderDate: new Date().toISOString(),
      items: resolvedItems,
      itemsTotal,
      courierCharges: courierFee,
      totalAmount
    };
    setOnlineOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  // Backup & Restore Database
  const exportDatabaseJSON = (): string => {
    const fullState = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      locations,
      categories,
      products,
      customers,
      batches,
      sales,
      ledger,
      transfers,
      adjustments,
      onlineOrders
    };
    return JSON.stringify(fullState, null, 2);
  };

  const importDatabaseJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.locations && data.products && data.batches) {
        setLocations(data.locations);
        setCategories(data.categories || INITIAL_CATEGORIES);
        setProducts(data.products);
        setCustomers(data.customers || INITIAL_CUSTOMERS);
        setBatches(data.batches);
        setSales(data.sales || []);
        setLedger(data.ledger || []);
        setTransfers(data.transfers || []);
        setAdjustments(data.adjustments || []);
        setOnlineOrders(data.onlineOrders || []);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Invalid JSON import:', e);
      return false;
    }
  };

  // User Authentication
  const loginUser = (credentials: {
    username: string;
    password?: string;
    locationId?: string;
    phone?: string;
    role?: UserRole;
  }) => {
    const trimmedUser = credentials.username.trim().toLowerCase();
    const matched = users.find(u => u.username.toLowerCase() === trimmedUser);
    if (!matched) {
      return { success: false, message: 'Invalid username. Please check your credentials.' };
    }
    if (matched.password && credentials.password && matched.password !== credentials.password) {
      return { success: false, message: 'Incorrect password.' };
    }
    const targetLoc = credentials.locationId || matched.locationId;
    setCurrentUser(matched);
    // When Admin logs in in any location (like Hospet or Hubballi), Admin can view all locations data!
    if (matched.role === 'Admin') {
      setSelectedLocationIdState('ALL');
    } else {
      // Staff only: locked strictly to their assigned clinic branch
      setSelectedLocationIdState(matched.locationId || (targetLoc === 'ALL' ? 'LOC-HOS' : targetLoc));
    }
    setIsAuthenticated(true);
    return { success: true, message: `Welcome, ${matched.fullName}!`, user: matched };
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
  };

  const resetUserPassword = (username: string, phone: string, newPassword: string) => {
    const trimmedUser = username.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');
    const userIndex = users.findIndex(u => 
      u.username.toLowerCase() === trimmedUser && 
      (!u.phone || u.phone.replace(/\D/g, '') === cleanPhone)
    );
    if (userIndex === -1) {
      return { success: false, message: 'No matching user found with this username and phone number.' };
    }
    const updated = [...users];
    updated[userIndex] = {
      ...updated[userIndex],
      password: newPassword
    };
    setUsers(updated);
    return { success: true, message: 'Password has been successfully reset! You can now log in.' };
  };

  const addUser = (userData: Omit<User, 'userId' | 'createdDate'>): User => {
    const newUser: User = {
      ...userData,
      userId: generateUniqueId('USR'),
      createdDate: new Date().toISOString().split('T')[0]
    };
    setUsers(prev => [newUser, ...prev]);
    return newUser;
  };

  const updateUser = (updated: User) => {
    setUsers(prev => prev.map(u => u.userId === updated.userId ? updated : u));
  };

  // Online Store Customer Authentication
  const sendCustomerOTP = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return { success: false, otp: '', message: 'Please enter a valid 10-digit mobile number.' };
    }
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
    setOtpStore(prev => ({ ...prev, [cleanPhone]: generatedOtp }));
    return { 
      success: true, 
      otp: generatedOtp, 
      message: `OTP sent: ${generatedOtp} (Verification Code)` 
    };
  };

  const loginCustomerWithOTP = (phone: string, otp: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const expectedOtp = otpStore[cleanPhone] || '1234';
    if (otp !== expectedOtp && otp !== '1234') {
      return { success: false, message: 'Invalid OTP code. Please enter the 4-digit code.' };
    }
    const existing = customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
    if (existing) {
      setCurrentCustomer(existing);
      return { success: true, message: `Welcome back, ${existing.customerName}!`, customer: existing, isNewCustomer: false };
    } else {
      const provisional: Customer = {
        customerId: generateUniqueId('CUST'),
        customerName: `Customer (${cleanPhone.slice(-4)})`,
        phone: cleanPhone,
        address: '',
        createdDate: new Date().toISOString().split('T')[0],
        loyaltyPoints: 10,
        totalSpend: 0
      };
      setCustomers(prev => [provisional, ...prev]);
      setCurrentCustomer(provisional);
      return { success: true, message: 'Mobile verified! Please confirm your profile.', customer: provisional, isNewCustomer: true };
    }
  };

  const loginCustomerWithPassword = (identifier: string, password: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, '');
    const existing = customers.find(c => 
      c.customerName.toLowerCase() === cleanId || 
      c.phone.replace(/\D/g, '') === cleanDigits ||
      (c.email && c.email.toLowerCase() === cleanId)
    );
    if (!existing) {
      return { success: false, message: 'Customer account not found. Please register or use Mobile OTP.' };
    }
    if (existing.password && existing.password !== password) {
      return { success: false, message: 'Incorrect password.' };
    }
    setCurrentCustomer(existing);
    return { success: true, message: `Welcome back, ${existing.customerName}!`, customer: existing };
  };

  const registerCustomer = (payload: {
    customerName: string;
    password?: string;
    address: string;
    phone: string;
  }) => {
    const cleanPhone = payload.phone.replace(/\D/g, '');
    const existing = customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
    if (existing) {
      const updated: Customer = {
        ...existing,
        customerName: payload.customerName.trim() || existing.customerName,
        address: payload.address.trim() || existing.address,
        password: payload.password || existing.password
      };
      setCustomers(prev => prev.map(c => c.customerId === existing.customerId ? updated : c));
      setCurrentCustomer(updated);
      return { success: true, message: 'Profile updated & logged in!', customer: updated };
    }

    const newCustomer: Customer = {
      customerId: generateUniqueId('CUST'),
      customerName: payload.customerName.trim(),
      phone: cleanPhone,
      address: payload.address.trim(),
      password: payload.password,
      createdDate: new Date().toISOString().split('T')[0],
      loyaltyPoints: 20,
      totalSpend: 0
    };
    setCustomers(prev => [newCustomer, ...prev]);
    setCurrentCustomer(newCustomer);
    return { success: true, message: 'Registration successful! Welcome.', customer: newCustomer };
  };

  const logoutCustomer = () => {
    setCurrentCustomer(null);
  };

  const resetDatabase = () => {
    localStorage.clear();
    setLocations(INITIAL_LOCATIONS);
    setCategories(INITIAL_CATEGORIES);
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setBatches(INITIAL_BATCHES);
    setSales(INITIAL_SALES);
    setLedger(INITIAL_LEDGER);
    setTransfers([]);
    setAdjustments([]);
    setOnlineOrders(INITIAL_ONLINE_ORDERS);
    setPriceHistory(INITIAL_PRICE_HISTORY);
    setBatchPricingMode('ACTIVE_BATCH');
    setSelectedLocationId('LOC-HOS');
    setCurrentUser(INITIAL_USERS[0]);
  };

  // Go Live & System Reset Services
  const createDatabaseBackup = (
    branchScope: 'ALL' | 'LOC-HOS' | 'LOC-HUB' = 'ALL',
    label?: string
  ): DatabaseBackupRecord => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hh}:${min}:${sec}`;
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const fileName = `Backup_${yyyy}_${mm}_${dd}_${hh}${min}.bak`;

    const snapshot = {
      version: '1.0',
      exportedAt: now.toISOString(),
      branchScope,
      label: label || 'System Backup Snapshot',
      locations,
      categories,
      products,
      users,
      customers,
      batches,
      sales,
      ledger,
      transfers,
      adjustments,
      onlineOrders,
      courierSettings,
      priceHistory,
      batchPricingMode
    };

    const snapshotJson = JSON.stringify(snapshot, null, 2);
    const totalStockUnits = batches
      .filter(b => branchScope === 'ALL' || b.locationId === branchScope)
      .reduce((sum, b) => sum + b.currentQuantity, 0);

    const newRecord: DatabaseBackupRecord = {
      backupId: `BAK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName,
      timestamp: now.toISOString(),
      createdDate: dateStr,
      createdTime: timeStr,
      createdBy: currentUser.fullName ? `${currentUser.fullName} (${currentUser.role})` : 'Dr. Rajesh Rao (Admin)',
      branchScope,
      sizeBytes: new Blob([snapshotJson]).size,
      recordSummary: {
        products: products.length,
        batches: batches.filter(b => branchScope === 'ALL' || b.locationId === branchScope).length,
        totalStockUnits,
        sales: sales.filter(s => branchScope === 'ALL' || s.locationId === branchScope).length,
        customers: customers.length,
        ledgerEntries: ledger.filter(l => branchScope === 'ALL' || l.locationId === branchScope).length
      },
      snapshotJson
    };

    setBackups(prev => [newRecord, ...prev]);
    return newRecord;
  };

  const executeGoLiveReset = (options: GoLiveResetOptions): {
    backupRecord: DatabaseBackupRecord;
    auditLog: GoLiveAuditLog;
    summary: string[];
  } => {
    // 1. Mandatory Backup First
    const backupRecord = createDatabaseBackup(options.branchScope, 'Pre-Reset Mandatory Safety Snapshot');

    const summary: string[] = [];
    const scopeLabel = options.branchScope === 'ALL'
      ? 'All Branches (Consolidated)'
      : options.branchScope === 'LOC-HOS'
      ? 'Hospete Clinic [HOS]'
      : 'Hubballi Depot [HUB]';

    let nextSales = [...sales];
    let nextOnlineOrders = [...onlineOrders];
    let nextCustomers = [...customers];
    let nextLedger = [...ledger];
    let nextTransfers = [...transfers];
    let nextAdjustments = [...adjustments];
    let nextBatches = [...batches];
    let nextProducts = [...products];
    let nextCategories = [...categories];
    let nextSubcategories = [...subcategories];
    let nextBrands = [...brands];
    let nextUsers = [...users];
    let nextLocations = [...locations];

    // 2. Sales & Invoices
    if (options.clearSales || options.clearInvoices) {
      if (options.branchScope === 'ALL') {
        nextSales = [];
        nextOnlineOrders = [];
        summary.push('Cleared all billing sales transactions and online orders');
      } else {
        nextSales = nextSales.filter(s => s.locationId !== options.branchScope);
        nextOnlineOrders = nextOnlineOrders.filter(o => o.locationId !== options.branchScope);
        summary.push(`Cleared billing sales transactions for ${scopeLabel}`);
      }
    }

    // 3. Customers
    if (options.clearCustomers) {
      const defaultCustomer = INITIAL_CUSTOMERS.find(c => c.customerId === 'CUST-005') || {
        customerId: 'CUST-WALKIN',
        customerName: 'Walk-in Patient (General)',
        phone: '9000000000',
        address: 'Local Clinic Counter',
        createdDate: '2026-01-01',
        loyaltyPoints: 0,
        totalSpend: 0
      };
      nextCustomers = [defaultCustomer];
      summary.push('Reset customer directory to clean baseline (Walk-in Patient counter preserved)');
    }

    // 4. Stock Movement Ledger
    if (options.clearLedger) {
      if (options.branchScope === 'ALL') {
        nextLedger = [];
        summary.push('Cleared all stock movement ledger history');
      } else {
        nextLedger = nextLedger.filter(l => l.locationId !== options.branchScope);
        summary.push(`Cleared stock movement ledger for ${scopeLabel}`);
      }
    }

    // 5. Stock Transfers & Adjustments
    if (options.clearTransfers) {
      if (options.branchScope === 'ALL') {
        nextTransfers = [];
        summary.push('Cleared stock transfer manifests');
      } else {
        nextTransfers = nextTransfers.filter(t => t.fromLocationId !== options.branchScope && t.toLocationId !== options.branchScope);
        summary.push(`Cleared stock transfers involving ${scopeLabel}`);
      }
    }

    if (options.clearAdjustments) {
      if (options.branchScope === 'ALL') {
        nextAdjustments = [];
        summary.push('Cleared physical stock adjustment records');
      } else {
        nextAdjustments = nextAdjustments.filter(a => a.locationId !== options.branchScope);
        summary.push(`Cleared stock adjustments for ${scopeLabel}`);
      }
    }

    // 6. Purchase Entries
    if (options.clearPurchases) {
      if (options.branchScope === 'ALL') {
        nextLedger = nextLedger.filter(l => l.movementType !== 'Purchase');
        nextBatches = nextBatches.filter(b => b.isOpeningStock);
        summary.push('Cleared purchase inwards and purchase batch movements');
      } else {
        nextLedger = nextLedger.filter(l => !(l.locationId === options.branchScope && l.movementType === 'Purchase'));
        nextBatches = nextBatches.filter(b => !(b.locationId === options.branchScope && !b.isOpeningStock));
        summary.push(`Cleared purchase entries for ${scopeLabel}`);
      }
    }

    // 6.5 Product Price History & Batch Costing Audit Trail
    let nextPriceHistory = [...priceHistory];
    const shouldClearPriceHistory = options.clearPriceHistory ?? (
      options.inventoryMode === 'STOCK_AND_TRANSACTIONS' ||
      options.inventoryMode === 'FULL_DATABASE'
    );
    if (shouldClearPriceHistory) {
      nextPriceHistory = [];
      summary.push('Cleared Product Price History & Batch Costing Audit Table records');
    }

    // 7. Inventory Reset Mode
    if (options.inventoryMode === 'QUANTITIES_ONLY') {
      if (options.branchScope === 'ALL') {
        nextBatches = nextBatches.map(b => ({ ...b, currentQuantity: 0 }));
        summary.push('Reset active stock quantities to 0 across all products (Product Master preserved)');
      } else {
        nextBatches = nextBatches.map(b => b.locationId === options.branchScope ? { ...b, currentQuantity: 0 } : b);
        summary.push(`Reset active stock quantities to 0 in ${scopeLabel} (Product Master preserved)`);
      }
    } else if (options.inventoryMode === 'STOCK_AND_TRANSACTIONS') {
      if (options.branchScope === 'ALL') {
        nextBatches = [];
        nextSales = [];
        nextOnlineOrders = [];
        nextLedger = [];
        nextTransfers = [];
        nextAdjustments = [];
        summary.push('Cleared all stock batches and transactions (Product Master preserved for Opening Stock)');
      } else {
        nextBatches = nextBatches.filter(b => b.locationId !== options.branchScope);
        nextSales = nextSales.filter(s => s.locationId !== options.branchScope);
        nextOnlineOrders = nextOnlineOrders.filter(o => o.locationId !== options.branchScope);
        nextLedger = nextLedger.filter(l => l.locationId !== options.branchScope);
        summary.push(`Cleared inventory batches and transactions for ${scopeLabel}`);
      }
    } else if (options.inventoryMode === 'FULL_DATABASE') {
      if (options.keepProductMaster) {
        nextBatches = [];
        nextSales = [];
        nextOnlineOrders = [];
        nextLedger = [];
        nextTransfers = [];
        nextAdjustments = [];
        summary.push('Cleared inventory stock and transactions (Product Master fully protected)');
      } else {
        nextBatches = [];
        nextSales = [];
        nextOnlineOrders = [];
        nextLedger = [];
        nextTransfers = [];
        nextAdjustments = [];
        if (options.clearDemoProducts) {
          nextProducts = [];
          summary.push('Cleared demo product catalog');
        }
        if (options.clearDemoCategories) {
          nextCategories = [];
          summary.push('Cleared demo categories');
        }
        summary.push('Full database reset performed (Admin account retained)');
      }
    }

    // 8. Product Master & Images
    if (!options.keepProductMaster) {
      if (options.clearDemoProducts) {
        nextProducts = [];
        summary.push('Purged demo products');
      }
      if (options.clearDemoCategories) {
        nextCategories = [];
        summary.push('Purged demo categories');
      }
      if (options.clearDemoSubcategories) {
        nextSubcategories = [];
        summary.push('Purged demo subcategories');
      }
      if (options.clearDemoBrands) {
        nextBrands = [];
        summary.push('Purged demo brands');
      }
      if (options.clearProductImages) {
        nextProducts = nextProducts.map(p => ({
          ...p,
          imagePath: undefined,
          backImagePath: undefined,
          images: undefined
        }));
        summary.push('Removed custom product image mappings');
      }
    }

    // 9. Demo Users (Retain Super Admin)
    if (options.clearDemoUsers) {
      nextUsers = nextUsers.filter(u => u.role === 'Admin');
      summary.push('Cleared demo staff user logins (Super Admin Dr. Rajesh Rao retained)');
    }

    // 10. Demo Suppliers
    if (options.clearDemoSuppliers) {
      nextBatches = nextBatches.map(b => ({ ...b, supplierName: 'Live Registered Supplier' }));
      summary.push('Cleared demo supplier references');
    }

    // 11. Invoice Sequences Reset
    if (options.resetInvoiceSequences) {
      if (options.branchScope === 'ALL') {
        nextLocations = nextLocations.map(l => ({ ...l, nextInvoiceSeq: 1 }));
        summary.push('Reset invoice sequence counter to 1 for Hospete (HOS-000001) & Hubballi (HUB-000001)');
      } else {
        nextLocations = nextLocations.map(l => l.locationId === options.branchScope ? { ...l, nextInvoiceSeq: 1 } : l);
        summary.push(`Reset invoice sequence counter to 1 for ${scopeLabel}`);
      }
    }

    // 12. Audit Log Record
    const now = new Date();
    const auditLog: GoLiveAuditLog = {
      logId: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now.toISOString(),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      user: currentUser.fullName ? `${currentUser.fullName} (${currentUser.role})` : 'Dr. Rajesh Rao (Admin)',
      branchScope: options.branchScope,
      dataCleared: summary,
      backupFileName: backupRecord.fileName,
      notes: `Executed ${options.inventoryMode} reset for ${scopeLabel}. Product Master Protected: ${options.keepProductMaster ? 'YES' : 'NO'}. Invoice Reset: ${options.resetInvoiceSequences ? 'YES' : 'NO'}.`
    };

    // Apply all state updates
    setSales(nextSales);
    setOnlineOrders(nextOnlineOrders);
    setCustomers(nextCustomers);
    setLedger(nextLedger);
    setTransfers(nextTransfers);
    setAdjustments(nextAdjustments);
    setBatches(nextBatches);
    setPriceHistory(nextPriceHistory);
    setProducts(nextProducts);
    setCategories(nextCategories);
    setSubcategories(nextSubcategories);
    setBrands(nextBrands);
    setUsers(nextUsers);
    setLocations(nextLocations);
    setAuditLogs(prev => [auditLog, ...prev]);

    // SYNCHRONOUS PERSISTENCE to localStorage so zero data resurrects
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'go_live_cleared', 'true');
      localStorage.setItem(STORAGE_KEY_PREFIX + 'sales', JSON.stringify(nextSales));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'online_orders', JSON.stringify(nextOnlineOrders));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'customers', JSON.stringify(nextCustomers));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'ledger', JSON.stringify(nextLedger));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'transfers', JSON.stringify(nextTransfers));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'adjustments', JSON.stringify(nextAdjustments));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'batches', JSON.stringify(nextBatches));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'price_history', JSON.stringify(nextPriceHistory));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'products', JSON.stringify(nextProducts));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'categories', JSON.stringify(nextCategories));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'subcategories', JSON.stringify(nextSubcategories));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'brands', JSON.stringify(nextBrands));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'users', JSON.stringify(nextUsers));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'locations', JSON.stringify(nextLocations));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'audit_logs', JSON.stringify([auditLog, ...auditLogs]));
    } catch (e) {
      console.error('Failed to write go-live reset to storage:', e);
    }

    return { backupRecord, auditLog, summary };
  };

  const downloadBackupFile = (backup: DatabaseBackupRecord) => {
    const blob = new Blob([backup.snapshotJson], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backup.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const restoreFromBackupRecord = (backupId: string): boolean => {
    const rec = backups.find(b => b.backupId === backupId);
    if (!rec) return false;
    return importDatabaseJSON(rec.snapshotJson);
  };

  const deleteBackupRecord = (backupId: string) => {
    setBackups(prev => prev.filter(b => b.backupId !== backupId));
  };

  return (
    <ClinicContext.Provider
      value={{
        selectedLocationId,
        setSelectedLocationId,
        currentUser,
        setCurrentUser,
        activeLocation,
        locations,
        categories,
        subcategories,
        brands,
        products,
        users,
        customers,
        batches,
        sales,
        ledger,
        transfers,
        adjustments,
        onlineOrders,
        priceHistory,
        batchPricingMode,
        setBatchPricingMode,
        getProductPriceResolution,
        addCategory,
        updateCategory,
        deleteCategory,
        toggleCategoryActive,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        toggleSubcategoryActive,
        addBrand,
        updateBrand,
        deleteBrand,
        toggleBrandActive,
        addProduct,
        updateProduct,
        deleteProduct,
        addPriceHistoryEntry,
        clearPriceHistory,
        addStockBatch,
        addBulkOpeningStock,
        generateNextOpeningBatchNumber,
        updateStockBatch,
        deleteStockBatch,
        executeSale,
        executeStockTransfer,
        executeStockAdjustment,
        quickAddCustomer,
        updateOnlineOrderStatus,
        updateOnlineOrderDeliveryInfo,
        createOnlineOrder,
        courierSettings,
        updateCourierSettings,
        updateOrderCourierCharge,
        isAuthenticated,
        loginUser,
        logoutUser,
        resetUserPassword,
        addUser,
        updateUser,
        currentCustomer,
        sendCustomerOTP,
        loginCustomerWithOTP,
        loginCustomerWithPassword,
        registerCustomer,
        logoutCustomer,
        exportDatabaseJSON,
        importDatabaseJSON,
        resetDatabase,
        backups,
        auditLogs,
        createDatabaseBackup,
        executeGoLiveReset,
        downloadBackupFile,
        restoreFromBackupRecord,
        deleteBackupRecord,
        sqlServerStatus,
        refreshSqlServerData
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
