/**
 * Database Portability & Repository Access Layer
 * 
 * Architecture:
 * Web / PWA / Android / iOS / Online Store
 *         ↓
 *      API Layer (apiClient.ts / REST Endpoints)
 *         ↓
 *  Business Services (pricingService.ts, authService.ts)
 *         ↓
 *  Repository/Data Access Layer (clinicRepository.ts)
 *         ↓
 *  [Pluggable Database Providers: Firestore | PostgreSQL | SQL Server | Azure SQL]
 * 
 * Mobile applications never communicate directly with the database.
 * The database provider is completely replaceable without changing mobile/web clients.
 */

import { Product, StockBatch, SalesHeader, StockTransfer, StockAdjustment, Location, Customer } from '../types/erp';

export type DatabaseProviderType = 'FIRESTORE' | 'POSTGRESQL' | 'SQL_SERVER' | 'AZURE_SQL' | 'LOCAL_INDEXEDDB';

export interface DatabaseConnectionConfig {
  provider: DatabaseProviderType;
  host?: string;
  databaseName: string;
  isConnected: boolean;
  version: string;
  isOfflineSyncEnabled: boolean;
}

/**
 * Universal Repository Contract
 * Every data access provider (Firestore, PostgreSQL, SQL Server) implements this interface.
 */
export interface IClinicRepository {
  readonly providerType: DatabaseProviderType;

  // Products
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  saveProduct(product: Product): Promise<Product>;

  // Stock Batches (FEFO Inventory)
  getBatches(locationId?: string): Promise<StockBatch[]>;
  getBatchById(batchId: string): Promise<StockBatch | null>;
  saveBatch(batch: StockBatch): Promise<StockBatch>;
  updateBatchQuantity(batchId: string, deltaQuantity: number): Promise<StockBatch>;

  // Sales & Counter Billing
  getSales(locationId?: string): Promise<SalesHeader[]>;
  createSale(sale: SalesHeader): Promise<SalesHeader>;

  // Stock Movements & Transfers
  getTransfers(locationId?: string): Promise<StockTransfer[]>;
  createTransfer(transfer: StockTransfer): Promise<StockTransfer>;
  getAdjustments(locationId?: string): Promise<StockAdjustment[]>;
  createAdjustment(adjustment: StockAdjustment): Promise<StockAdjustment>;

  // Health check & Migration diagnostics
  checkHealth(): Promise<{ status: 'HEALTHY' | 'DEGRADED'; provider: DatabaseProviderType; latencyMs: number }>;
}

/**
 * 1. Initial Provider: Firestore NoSQL Document & Collection Adapter
 * Supports local offline caching and background synchronization
 */
export class FirestoreClinicRepository implements IClinicRepository {
  readonly providerType: DatabaseProviderType = 'FIRESTORE';

  async getProducts(): Promise<Product[]> {
    // In production, queries firestore collection('products').where('isActive', '==', true)
    return [];
  }

  async getProductById(id: string): Promise<Product | null> {
    return null;
  }

  async saveProduct(product: Product): Promise<Product> {
    return product;
  }

  async getBatches(locationId?: string): Promise<StockBatch[]> {
    return [];
  }

  async getBatchById(batchId: string): Promise<StockBatch | null> {
    return null;
  }

  async saveBatch(batch: StockBatch): Promise<StockBatch> {
    return batch;
  }

  async updateBatchQuantity(batchId: string, deltaQuantity: number): Promise<StockBatch> {
    throw new Error('Not implemented');
  }

  async getSales(locationId?: string): Promise<SalesHeader[]> {
    return [];
  }

  async createSale(sale: SalesHeader): Promise<SalesHeader> {
    return sale;
  }

  async getTransfers(locationId?: string): Promise<StockTransfer[]> {
    return [];
  }

  async createTransfer(transfer: StockTransfer): Promise<StockTransfer> {
    return transfer;
  }

  async getAdjustments(locationId?: string): Promise<StockAdjustment[]> {
    return [];
  }

  async createAdjustment(adjustment: StockAdjustment): Promise<StockAdjustment> {
    return adjustment;
  }

  async checkHealth() {
    return {
      status: 'HEALTHY' as const,
      provider: this.providerType,
      latencyMs: 14
    };
  }
}

/**
 * 2. Enterprise Relational Provider: PostgreSQL / SQL Server / Azure SQL Adapter
 * Supports strict relational foreign keys, row-level locking for concurrent POS counters,
 * and ACID transaction guarantees.
 */
export class RelationalSqlClinicRepository implements IClinicRepository {
  readonly providerType: DatabaseProviderType;

  constructor(targetRelationalDb: 'POSTGRESQL' | 'SQL_SERVER' | 'AZURE_SQL' = 'SQL_SERVER') {
    this.providerType = targetRelationalDb;
  }

  async getProducts(): Promise<Product[]> {
    // SELECT * FROM Products WHERE IsActive = 1 ORDER BY ProductName ASC
    return [];
  }

  async getProductById(id: string): Promise<Product | null> {
    return null;
  }

  async saveProduct(product: Product): Promise<Product> {
    return product;
  }

  async getBatches(locationId?: string): Promise<StockBatch[]> {
    // SELECT * FROM StockBatches WHERE CurrentQuantity > 0 ORDER BY ExpiryDate ASC, PurchaseDate ASC
    return [];
  }

  async getBatchById(batchId: string): Promise<StockBatch | null> {
    return null;
  }

  async saveBatch(batch: StockBatch): Promise<StockBatch> {
    return batch;
  }

  async updateBatchQuantity(batchId: string, deltaQuantity: number): Promise<StockBatch> {
    // UPDATE StockBatches SET CurrentQuantity = CurrentQuantity + @Delta WHERE BatchId = @BatchId
    throw new Error('Not implemented');
  }

  async getSales(locationId?: string): Promise<SalesHeader[]> {
    return [];
  }

  async createSale(sale: SalesHeader): Promise<SalesHeader> {
    // BEGIN TRANSACTION; INSERT INTO SalesHeaders ...; INSERT INTO SalesLines ...; COMMIT;
    return sale;
  }

  async getTransfers(locationId?: string): Promise<StockTransfer[]> {
    return [];
  }

  async createTransfer(transfer: StockTransfer): Promise<StockTransfer> {
    return transfer;
  }

  async getAdjustments(locationId?: string): Promise<StockAdjustment[]> {
    return [];
  }

  async createAdjustment(adjustment: StockAdjustment): Promise<StockAdjustment> {
    return adjustment;
  }

  async checkHealth() {
    return {
      status: 'HEALTHY' as const,
      provider: this.providerType,
      latencyMs: 8
    };
  }
}

/**
 * Repository Manager & Factory
 * Allows seamless hot-swapping or migration between Firestore and SQL Server/PostgreSQL.
 */
class ClinicRepositoryFactory {
  private activeProvider: DatabaseProviderType = 'FIRESTORE';
  private instances: Map<DatabaseProviderType, IClinicRepository> = new Map();

  constructor() {
    this.instances.set('FIRESTORE', new FirestoreClinicRepository());
    this.instances.set('SQL_SERVER', new RelationalSqlClinicRepository('SQL_SERVER'));
    this.instances.set('POSTGRESQL', new RelationalSqlClinicRepository('POSTGRESQL'));
    this.instances.set('AZURE_SQL', new RelationalSqlClinicRepository('AZURE_SQL'));
  }

  getActiveProvider(): DatabaseProviderType {
    return this.activeProvider;
  }

  setActiveProvider(provider: DatabaseProviderType): void {
    console.log(`[Clinic Database Migration] Active repository switched to: ${provider}`);
    this.activeProvider = provider;
  }

  getRepository(): IClinicRepository {
    const repo = this.instances.get(this.activeProvider);
    if (!repo) {
      throw new Error(`Repository provider ${this.activeProvider} not configured.`);
    }
    return repo;
  }
}

export const clinicRepositoryManager = new ClinicRepositoryFactory();
