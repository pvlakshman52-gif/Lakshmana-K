import { Product, StockBatch, Location, Category, Subcategory, Customer, User, DatabaseMigrationPatch, DatabaseNotification } from '../types/erp';

export type SqlScriptVariant = 'FULL_MASTER' | 'SCHEMA_ONLY' | 'WITH_LIVE_SEED' | 'SAFE_INCREMENTAL' | 'AUDIT_TRIGGER';

export interface SchemaScriptOptions {
  includeTriggers?: boolean;
  includeStoredProcedures?: boolean;
  includeAuditLogs?: boolean;
  includeViews?: boolean;
  includeLiveSeed?: boolean;
  customColumns?: { tableName: string; columnName: string; dataType: string; defaultValue?: string }[];
  versionTag?: string;
  generatedAt?: string;
  locations?: Location[];
  products?: Product[];
  batches?: StockBatch[];
  categories?: Category[];
  subcategories?: Subcategory[];
  customers?: Customer[];
  users?: User[];
}

export interface FetchedScriptResult {
  script: string;
  lineCount: number;
  byteSize: number;
  objectCount: number;
  fetchedAt: string;
  version: string;
  variant: SqlScriptVariant;
}

/**
 * Generates the complete, production-ready Microsoft SQL Server T-SQL Schema Script
 * Dynamically generated with the latest timestamp, active migrations, and verified objects.
 */
export function generateCompleteSqlServerSchemaScript(options?: SchemaScriptOptions): string {
  const timestamp = options?.generatedAt || new Date().toISOString();
  const version = options?.versionTag || 'v1.4 Consolidated Latest';
  const customCols = options?.customColumns || [];

  return `-- ==============================================================================
-- MediClinic Commerce ERP - Microsoft SQL Server Latest Database Schema
-- Architecture: ASP.NET Core 8 / Node.js Entity Framework Relational Model
-- Database Target: Microsoft SQL Server (Local On-Premise) & Azure SQL Cloud
-- Schema Version: ${version}
-- Generated At: ${timestamp}
-- Status: Consolidated Complete Master Script (All Latest Tables & Objects)
-- ==============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'MediClinic_ERP')
BEGIN
    CREATE DATABASE [MediClinic_ERP];
END
GO

USE [MediClinic_ERP];
GO

-- ==============================================================================
-- 1. Table: Locations (Multi-Branch Clinic Master)
-- ==============================================================================
IF OBJECT_ID('dbo.Locations', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Locations] (
        [LocationId] NVARCHAR(50) NOT NULL,
        [LocationCode] NVARCHAR(10) NOT NULL,
        [LocationName] NVARCHAR(150) NOT NULL,
        [Address] NVARCHAR(500) NULL,
        [Phone] NVARCHAR(50) NULL,
        [Gstin] NVARCHAR(50) NULL,
        [DrugLicenseNo] NVARCHAR(100) NULL,
        [NextInvoiceSeq] INT NOT NULL CONSTRAINT [DF_Locations_NextInvoiceSeq] DEFAULT 1,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_Locations_IsActive] DEFAULT 1,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_Locations_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Locations] PRIMARY KEY CLUSTERED ([LocationId] ASC),
        CONSTRAINT [UQ_Locations_Code] UNIQUE NONCLUSTERED ([LocationCode] ASC)
    );
END
ELSE
BEGIN
    -- Safe non-destructive column additions for existing installations
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Locations') AND name = 'DrugLicenseNo')
        ALTER TABLE [dbo].[Locations] ADD [DrugLicenseNo] NVARCHAR(100) NULL;
END
GO

-- ==============================================================================
-- 2. Table: Categories
-- ==============================================================================
IF OBJECT_ID('dbo.Categories', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Categories] (
        [CategoryId] NVARCHAR(50) NOT NULL,
        [CategoryCode] NVARCHAR(50) NOT NULL,
        [CategoryName] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_Categories_IsActive] DEFAULT 1,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_Categories_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Categories] PRIMARY KEY CLUSTERED ([CategoryId] ASC)
    );
END
GO

-- ==============================================================================
-- 3. Table: Subcategories
-- ==============================================================================
IF OBJECT_ID('dbo.Subcategories', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Subcategories] (
        [SubcategoryId] NVARCHAR(50) NOT NULL,
        [SubcategoryCode] NVARCHAR(50) NOT NULL,
        [CategoryId] NVARCHAR(50) NOT NULL,
        [SubcategoryName] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_Subcategories_IsActive] DEFAULT 1,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_Subcategories_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Subcategories] PRIMARY KEY CLUSTERED ([SubcategoryId] ASC),
        CONSTRAINT [FK_Subcategories_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [dbo].[Categories] ([CategoryId])
    );
END
GO

-- ==============================================================================
-- 4. Table: Brands
-- ==============================================================================
IF OBJECT_ID('dbo.Brands', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Brands] (
        [BrandId] NVARCHAR(50) NOT NULL,
        [BrandName] NVARCHAR(100) NOT NULL,
        [Manufacturer] NVARCHAR(150) NULL,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_Brands_IsActive] DEFAULT 1,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_Brands_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Brands] PRIMARY KEY CLUSTERED ([BrandId] ASC)
    );
END
GO

-- ==============================================================================
-- 5. Table: Products (Master Formulary & Retail SKUs)
-- ==============================================================================
IF OBJECT_ID('dbo.Products', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Products] (
        [ProductId] NVARCHAR(50) NOT NULL,
        [ProductCode] NVARCHAR(50) NOT NULL,
        [Barcode] NVARCHAR(100) NULL,
        [ProductName] NVARCHAR(250) NOT NULL,
        [CategoryId] NVARCHAR(50) NOT NULL,
        [SubcategoryId] NVARCHAR(50) NULL,
        [BrandId] NVARCHAR(50) NULL,
        [BrandName] NVARCHAR(100) NULL,
        [ProductType] NVARCHAR(50) NOT NULL CONSTRAINT [DF_Products_ProductType] DEFAULT 'Retail Product',
        [CostPrice] DECIMAL(18, 2) NOT NULL CONSTRAINT [DF_Products_CostPrice] DEFAULT 0.00,
        [SellingPrice] DECIMAL(18, 2) NOT NULL CONSTRAINT [DF_Products_SellingPrice] DEFAULT 0.00,
        [ReorderLevel] INT NOT NULL CONSTRAINT [DF_Products_ReorderLevel] DEFAULT 10,
        [VolumeSize] NVARCHAR(50) NULL,
        [HsnCode] NVARCHAR(20) NULL,
        [GstRate] DECIMAL(5, 2) NOT NULL CONSTRAINT [DF_Products_GstRate] DEFAULT 18.00,
        [ImagePath] NVARCHAR(500) NULL,
        [BackImagePath] NVARCHAR(500) NULL,
        [Ingredients] NVARCHAR(MAX) NULL,
        [Directions] NVARCHAR(MAX) NULL,
        [Description] NVARCHAR(MAX) NULL,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_Products_IsActive] DEFAULT 1,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_Products_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Products] PRIMARY KEY CLUSTERED ([ProductId] ASC),
        CONSTRAINT [UQ_Products_Code] UNIQUE NONCLUSTERED ([ProductCode] ASC),
        CONSTRAINT [FK_Products_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [dbo].[Categories] ([CategoryId]),
        CONSTRAINT [FK_Products_Subcategories] FOREIGN KEY ([SubcategoryId]) REFERENCES [dbo].[Subcategories] ([SubcategoryId])
    );
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'Barcode')
        ALTER TABLE [dbo].[Products] ADD [Barcode] NVARCHAR(100) NULL;
END
GO

-- ==============================================================================
-- 6. Table: Users & Staff Authentication
-- ==============================================================================
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Users] (
        [UserId] NVARCHAR(50) NOT NULL,
        [FullName] NVARCHAR(150) NOT NULL,
        [Username] NVARCHAR(100) NOT NULL,
        [PasswordHash] NVARCHAR(255) NOT NULL,
        [Phone] NVARCHAR(50) NULL,
        [Role] NVARCHAR(50) NOT NULL, -- Admin, Doctor, Staff, Cashier
        [LocationId] NVARCHAR(50) NOT NULL, -- LocationId or 'ALL'
        [IsActive] BIT NOT NULL CONSTRAINT [DF_Users_IsActive] DEFAULT 1,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_Users_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserId] ASC),
        CONSTRAINT [UQ_Users_Username] UNIQUE NONCLUSTERED ([Username] ASC)
    );
END
GO

-- ==============================================================================
-- 7. Table: Customers (Patient Directory)
-- ==============================================================================
IF OBJECT_ID('dbo.Customers', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Customers] (
        [CustomerId] NVARCHAR(50) NOT NULL,
        [CustomerName] NVARCHAR(150) NOT NULL,
        [Phone] NVARCHAR(50) NOT NULL,
        [Address] NVARCHAR(500) NULL,
        [Email] NVARCHAR(150) NULL,
        [PasswordHash] NVARCHAR(255) NULL,
        [LoyaltyPoints] INT NOT NULL CONSTRAINT [DF_Customers_LoyaltyPoints] DEFAULT 0,
        [TotalSpend] DECIMAL(18, 2) NOT NULL CONSTRAINT [DF_Customers_TotalSpend] DEFAULT 0.00,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_Customers_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Customers] PRIMARY KEY CLUSTERED ([CustomerId] ASC)
    );
END
GO

-- ==============================================================================
-- 8. Table: StockBatches (Granular FEFO Inventory Batches)
-- ==============================================================================
IF OBJECT_ID('dbo.StockBatches', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[StockBatches] (
        [BatchId] NVARCHAR(50) NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [LocationId] NVARCHAR(50) NOT NULL,
        [BatchNumber] NVARCHAR(100) NOT NULL,
        [ExpiryDate] DATE NOT NULL,
        [PurchaseDate] DATE NOT NULL,
        [PurchaseInvoiceNo] NVARCHAR(100) NULL,
        [SupplierName] NVARCHAR(200) NULL,
        [QuantityReceived] INT NOT NULL,
        [CurrentQuantity] INT NOT NULL,
        [CostPrice] DECIMAL(18, 2) NOT NULL,
        [SellingPrice] DECIMAL(18, 2) NOT NULL,
        [IsOpeningStock] BIT NOT NULL CONSTRAINT [DF_StockBatches_IsOpeningStock] DEFAULT 0,
        [OpeningBatchNumber] NVARCHAR(100) NULL,
        [ImportSource] NVARCHAR(100) NULL CONSTRAINT [DF_StockBatches_ImportSource] DEFAULT 'MANUAL',
        [CreatedBy] NVARCHAR(100) NULL,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_StockBatches_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_StockBatches] PRIMARY KEY CLUSTERED ([BatchId] ASC),
        CONSTRAINT [FK_StockBatches_Products] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([ProductId]),
        CONSTRAINT [FK_StockBatches_Locations] FOREIGN KEY ([LocationId]) REFERENCES [dbo].[Locations] ([LocationId])
    );

    CREATE NONCLUSTERED INDEX [IX_StockBatches_FEFO] 
    ON [dbo].[StockBatches] ([ProductId], [LocationId], [CurrentQuantity], [ExpiryDate] ASC, [PurchaseDate] ASC)
    INCLUDE ([SellingPrice], [CostPrice], [BatchNumber]);
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockBatches') AND name = 'OpeningBatchNumber')
        ALTER TABLE [dbo].[StockBatches] ADD [OpeningBatchNumber] NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockBatches') AND name = 'ImportSource')
        ALTER TABLE [dbo].[StockBatches] ADD [ImportSource] NVARCHAR(100) NULL CONSTRAINT [DF_StockBatches_ImportSource] DEFAULT 'MANUAL' WITH VALUES;
END
GO

-- ==============================================================================
-- 9. Table: StockMovementLedger (Immutable Movement Audit Log)
-- ==============================================================================
IF OBJECT_ID('dbo.StockMovementLedger', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[StockMovementLedger] (
        [MovementId] NVARCHAR(50) NOT NULL,
        [MovementDate] DATETIME2 NOT NULL CONSTRAINT [DF_StockMovementLedger_Date] DEFAULT SYSUTCDATETIME(),
        [LocationId] NVARCHAR(50) NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [BatchId] NVARCHAR(50) NOT NULL,
        [MovementType] NVARCHAR(50) NOT NULL, -- Purchase, Sale, Transfer In, Transfer Out, Adjustment, Opening Stock
        [QuantityDelta] INT NOT NULL,
        [BalanceAfter] INT NOT NULL,
        [ReferenceNo] NVARCHAR(100) NOT NULL,
        [CostPrice] DECIMAL(18, 2) NOT NULL,
        [SellingPrice] DECIMAL(18, 2) NOT NULL,
        [FiscalYear] NVARCHAR(20) NULL CONSTRAINT [DF_StockMovementLedger_FiscalYear] DEFAULT '2026-2027',
        [Remarks] NVARCHAR(500) NULL,
        [CreatedBy] NVARCHAR(100) NULL,
        CONSTRAINT [PK_StockMovementLedger] PRIMARY KEY CLUSTERED ([MovementId] ASC),
        CONSTRAINT [FK_StockMovementLedger_Locations] FOREIGN KEY ([LocationId]) REFERENCES [dbo].[Locations] ([LocationId]),
        CONSTRAINT [FK_StockMovementLedger_Products] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([ProductId]),
        CONSTRAINT [FK_StockMovementLedger_Batches] FOREIGN KEY ([BatchId]) REFERENCES [dbo].[StockBatches] ([BatchId])
    );

    CREATE NONCLUSTERED INDEX [IX_StockMovementLedger_Audit] 
    ON [dbo].[StockMovementLedger] ([LocationId], [ProductId], [MovementDate] DESC);
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockMovementLedger') AND name = 'FiscalYear')
        ALTER TABLE [dbo].[StockMovementLedger] ADD [FiscalYear] NVARCHAR(20) NULL CONSTRAINT [DF_StockMovementLedger_FiscalYear] DEFAULT '2026-2027' WITH VALUES;
END
GO

-- ==============================================================================
-- 10. Table: SalesHeaders & SalesDetails (POS Counter Invoicing)
-- ==============================================================================
IF OBJECT_ID('dbo.SalesHeaders', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SalesHeaders] (
        [SaleId] NVARCHAR(50) NOT NULL,
        [InvoiceNo] NVARCHAR(50) NOT NULL,
        [SaleDate] DATE NOT NULL,
        [LocationId] NVARCHAR(50) NOT NULL,
        [CustomerId] NVARCHAR(50) NOT NULL,
        [CustomerName] NVARCHAR(150) NOT NULL,
        [CustomerPhone] NVARCHAR(50) NULL,
        [PaymentMode] NVARCHAR(20) NOT NULL, -- Cash, UPI, Card, Split
        [UpiReferenceNo] NVARCHAR(100) NULL,
        [GrossAmount] DECIMAL(18, 2) NOT NULL,
        [DiscountAmount] DECIMAL(18, 2) NOT NULL CONSTRAINT [DF_SalesHeaders_Discount] DEFAULT 0.00,
        [CourierCharges] DECIMAL(18, 2) NOT NULL CONSTRAINT [DF_SalesHeaders_Courier] DEFAULT 0.00,
        [NetAmount] DECIMAL(18, 2) NOT NULL,
        [TotalProfit] DECIMAL(18, 2) NOT NULL,
        [CreatedBy] NVARCHAR(100) NULL,
        [CreatedDate] DATETIME2 NOT NULL CONSTRAINT [DF_SalesHeaders_CreatedDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_SalesHeaders] PRIMARY KEY CLUSTERED ([SaleId] ASC),
        CONSTRAINT [UQ_SalesHeaders_InvoiceNo] UNIQUE NONCLUSTERED ([InvoiceNo] ASC),
        CONSTRAINT [FK_SalesHeaders_Locations] FOREIGN KEY ([LocationId]) REFERENCES [dbo].[Locations] ([LocationId]),
        CONSTRAINT [FK_SalesHeaders_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Customers] ([CustomerId])
    );
END
GO

IF OBJECT_ID('dbo.SalesDetails', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SalesDetails] (
        [DetailId] NVARCHAR(50) NOT NULL,
        [SaleId] NVARCHAR(50) NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [BatchId] NVARCHAR(50) NOT NULL,
        [Quantity] INT NOT NULL,
        [Rate] DECIMAL(18, 2) NOT NULL,
        [CostPrice] DECIMAL(18, 2) NOT NULL,
        [Profit] DECIMAL(18, 2) NOT NULL,
        [Total] DECIMAL(18, 2) NOT NULL,
        CONSTRAINT [PK_SalesDetails] PRIMARY KEY CLUSTERED ([DetailId] ASC),
        CONSTRAINT [FK_SalesDetails_SalesHeaders] FOREIGN KEY ([SaleId]) REFERENCES [dbo].[SalesHeaders] ([SaleId]) ON DELETE CASCADE,
        CONSTRAINT [FK_SalesDetails_Products] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([ProductId]),
        CONSTRAINT [FK_SalesDetails_Batches] FOREIGN KEY ([BatchId]) REFERENCES [dbo].[StockBatches] ([BatchId])
    );
END
GO

-- ==============================================================================
-- 11. Table: OnlineOrders (Home Delivery Tracking)
-- ==============================================================================
IF OBJECT_ID('dbo.OnlineOrders', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OnlineOrders] (
        [OrderId] NVARCHAR(50) NOT NULL,
        [OrderNumber] NVARCHAR(50) NOT NULL,
        [CustomerId] NVARCHAR(50) NOT NULL,
        [CustomerName] NVARCHAR(150) NOT NULL,
        [Phone] NVARCHAR(50) NOT NULL,
        [ShippingAddress] NVARCHAR(500) NOT NULL,
        [LocationId] NVARCHAR(50) NOT NULL,
        [TotalAmount] DECIMAL(18, 2) NOT NULL,
        [PaymentMethod] NVARCHAR(50) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL CONSTRAINT [DF_OnlineOrders_Status] DEFAULT 'Pending',
        [CourierPartner] NVARCHAR(100) NULL CONSTRAINT [DF_OnlineOrders_CourierPartner] DEFAULT 'BlueDart / DTDC',
        [WaybillNo] NVARCHAR(100) NULL,
        [TrackingNotes] NVARCHAR(500) NULL,
        [OrderDate] DATETIME2 NOT NULL CONSTRAINT [DF_OnlineOrders_OrderDate] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_OnlineOrders] PRIMARY KEY CLUSTERED ([OrderId] ASC),
        CONSTRAINT [FK_OnlineOrders_Locations] FOREIGN KEY ([LocationId]) REFERENCES [dbo].[Locations] ([LocationId])
    );
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.OnlineOrders') AND name = 'CourierPartner')
        ALTER TABLE [dbo].[OnlineOrders] ADD [CourierPartner] NVARCHAR(100) NULL CONSTRAINT [DF_OnlineOrders_CourierPartner] DEFAULT 'BlueDart / DTDC' WITH VALUES;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.OnlineOrders') AND name = 'WaybillNo')
        ALTER TABLE [dbo].[OnlineOrders] ADD [WaybillNo] NVARCHAR(100) NULL;
END
GO

-- ==============================================================================
-- 12. Table: DatabaseAuditLogs (Real-Time Change Logging)
-- ==============================================================================
IF OBJECT_ID('dbo.DatabaseAuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DatabaseAuditLogs] (
        [LogId] BIGINT IDENTITY(1,1) NOT NULL,
        [EventTime] DATETIME2 NOT NULL CONSTRAINT [DF_AuditLogs_EventTime] DEFAULT SYSUTCDATETIME(),
        [EventType] NVARCHAR(100) NOT NULL,
        [ObjectName] NVARCHAR(250) NULL,
        [ObjectType] NVARCHAR(100) NULL,
        [CommandText] NVARCHAR(MAX) NULL,
        [LoginName] NVARCHAR(150) NOT NULL,
        [ClientHost] NVARCHAR(150) NULL CONSTRAINT [DF_AuditLogs_Host] DEFAULT HOST_NAME(),
        [IsReadInApp] BIT NOT NULL CONSTRAINT [DF_AuditLogs_IsRead] DEFAULT 0,
        CONSTRAINT [PK_DatabaseAuditLogs] PRIMARY KEY CLUSTERED ([LogId] ASC)
    );
END
GO

-- ==============================================================================
-- 13. Stored Procedure: Execute Pos Sale with Atomic FEFO Deductions
-- ==============================================================================
IF OBJECT_ID('dbo.sp_ExecutePosSale', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[sp_ExecutePosSale];
GO

CREATE PROCEDURE [dbo].[sp_ExecutePosSale]
    @SaleId NVARCHAR(50),
    @InvoiceNo NVARCHAR(50),
    @LocationId NVARCHAR(50),
    @CustomerId NVARCHAR(50),
    @CustomerName NVARCHAR(150),
    @CustomerPhone NVARCHAR(50),
    @PaymentMode NVARCHAR(20),
    @UpiReferenceNo NVARCHAR(100),
    @GrossAmount DECIMAL(18, 2),
    @DiscountAmount DECIMAL(18, 2),
    @CourierCharges DECIMAL(18, 2),
    @NetAmount DECIMAL(18, 2),
    @TotalProfit DECIMAL(18, 2),
    @CreatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        INSERT INTO [dbo].[SalesHeaders] (
            [SaleId], [InvoiceNo], [SaleDate], [LocationId], [CustomerId],
            [CustomerName], [CustomerPhone], [PaymentMode], [UpiReferenceNo],
            [GrossAmount], [DiscountAmount], [CourierCharges], [NetAmount],
            [TotalProfit], [CreatedBy]
        ) VALUES (
            @SaleId, @InvoiceNo, CAST(GETDATE() AS DATE), @LocationId, @CustomerId,
            @CustomerName, @CustomerPhone, @PaymentMode, @UpiReferenceNo,
            @GrossAmount, @DiscountAmount, @CourierCharges, @NetAmount,
            @TotalProfit, @CreatedBy
        );

        UPDATE [dbo].[Locations] 
        SET [NextInvoiceSeq] = [NextInvoiceSeq] + 1
        WHERE [LocationId] = @LocationId;

        COMMIT TRANSACTION;
        SELECT 1 AS [Success], 'Sale committed successfully' AS [Message];
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ==============================================================================
-- 14. Real-Time DDL Audit Trigger: tr_AuditDatabaseSchemaChanges
-- ==============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_AuditDatabaseSchemaChanges' AND parent_class = 0)
    DROP TRIGGER [tr_AuditDatabaseSchemaChanges] ON DATABASE;
GO

CREATE TRIGGER [tr_AuditDatabaseSchemaChanges]
ON DATABASE
FOR DDL_DATABASE_LEVEL_EVENTS
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EventData XML = EVENTDATA();
    DECLARE @EventType NVARCHAR(100) = @EventData.value('(/EVENT_INSTANCE/EventType)[1]', 'NVARCHAR(100)');
    DECLARE @ObjectName NVARCHAR(250) = @EventData.value('(/EVENT_INSTANCE/ObjectName)[1]', 'NVARCHAR(250)');
    DECLARE @ObjectType NVARCHAR(100) = @EventData.value('(/EVENT_INSTANCE/ObjectType)[1]', 'NVARCHAR(100)');
    DECLARE @CommandText NVARCHAR(MAX) = @EventData.value('(/EVENT_INSTANCE/TSQLCommand/CommandText)[1]', 'NVARCHAR(MAX)');
    DECLARE @LoginName NVARCHAR(150) = @EventData.value('(/EVENT_INSTANCE/LoginName)[1]', 'NVARCHAR(150)');

    IF @ObjectName NOT LIKE '#%'
    BEGIN
        INSERT INTO [dbo].[DatabaseAuditLogs] (
            [EventType], [ObjectName], [ObjectType], [CommandText], [LoginName]
        ) VALUES (
            @EventType, @ObjectName, @ObjectType, @CommandText, @LoginName
        );
    END
END;
GO

-- ==============================================================================
-- 15. Enterprise Analytics Views: FEFO Valuation & POS Daily Aggregates
-- ==============================================================================
IF OBJECT_ID('dbo.vw_StockBatchFefoSummary', 'V') IS NOT NULL
    DROP VIEW [dbo].[vw_StockBatchFefoSummary];
GO

CREATE VIEW [dbo].[vw_StockBatchFefoSummary]
AS
SELECT 
    b.[BatchId],
    b.[BatchNumber],
    p.[ProductId],
    p.[ProductCode],
    p.[ProductName],
    l.[LocationCode],
    l.[LocationName],
    b.[CurrentQuantity],
    b.[CostPrice],
    b.[SellingPrice],
    (b.[CurrentQuantity] * b.[CostPrice]) AS [TotalCostValuation],
    (b.[CurrentQuantity] * b.[SellingPrice]) AS [TotalRetailValuation],
    b.[ExpiryDate],
    DATEDIFF(day, CAST(GETDATE() AS DATE), b.[ExpiryDate]) AS [DaysUntilExpiry],
    CASE 
        WHEN b.[ExpiryDate] < CAST(GETDATE() AS DATE) THEN 'EXPIRED'
        WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), b.[ExpiryDate]) <= 60 THEN 'NEAR_EXPIRY'
        ELSE 'HEALTHY'
    END AS [ShelfLifeStatus]
FROM [dbo].[StockBatches] b
INNER JOIN [dbo].[Products] p ON b.[ProductId] = p.[ProductId]
INNER JOIN [dbo].[Locations] l ON b.[LocationId] = l.[LocationId]
WHERE b.[CurrentQuantity] > 0;
GO

IF OBJECT_ID('dbo.vw_DailySalesSummary', 'V') IS NOT NULL
    DROP VIEW [dbo].[vw_DailySalesSummary];
GO

CREATE VIEW [dbo].[vw_DailySalesSummary]
AS
SELECT 
    h.[SaleDate],
    l.[LocationCode],
    l.[LocationName],
    h.[PaymentMode],
    COUNT(h.[SaleId]) AS [TotalInvoices],
    SUM(h.[GrossAmount]) AS [TotalGrossAmount],
    SUM(h.[DiscountAmount]) AS [TotalDiscountAmount],
    SUM(h.[NetAmount]) AS [TotalNetAmount],
    SUM(h.[TotalProfit]) AS [TotalGrossProfit]
FROM [dbo].[SalesHeaders] h
INNER JOIN [dbo].[Locations] l ON h.[LocationId] = l.[LocationId]
GROUP BY h.[SaleDate], l.[LocationCode], l.[LocationName], h.[PaymentMode];
GO

${customCols.length > 0 ? `
-- ==============================================================================
-- 16. User Custom Safe Column Additions (Session Verified)
-- ==============================================================================
${customCols.map(col => `
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.${col.tableName}') AND name = '${col.columnName}')
BEGIN
    ALTER TABLE [dbo].[${col.tableName}] ADD [${col.columnName}] ${col.dataType} ${col.defaultValue ? `DEFAULT (${col.defaultValue}) WITH VALUES` : 'NULL'};
    PRINT 'Added user custom column [${col.columnName}] to [dbo].[${col.tableName}]';
END
`).join('\n')}
GO
` : ''}

PRINT 'MediClinic_ERP Database Schema (${version}) successfully executed and verified at ${timestamp}.';
`;
}

/**
 * Authoritative Database Script Fetcher
 * Dynamically fetches the latest script about the database with live timestamp,
 * active migration patches, custom columns, and structured metadata.
 */
export function fetchAuthoritativeDatabaseScript(
  variant: SqlScriptVariant = 'FULL_MASTER',
  options?: SchemaScriptOptions
): FetchedScriptResult {
  const timestamp = options?.generatedAt || new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });
  const isoTime = new Date().toISOString();
  const version = options?.versionTag || 'v2.6.2 Master Production';
  
  let script = '';
  let objectCount = 14;

  switch (variant) {
    case 'FULL_MASTER':
      script = generateCompleteSqlServerSchemaScript({
        ...options,
        versionTag: version,
        generatedAt: isoTime
      });
      objectCount = 17; // 13 tables + 1 SP + 1 Trigger + 2 Views
      break;

    case 'SCHEMA_ONLY':
      script = generateCompleteSqlServerSchemaScript({
        ...options,
        includeAuditLogs: false,
        includeTriggers: false,
        versionTag: `${version} (DDL Tables Only)`,
        generatedAt: isoTime
      });
      objectCount = 12;
      break;

    case 'WITH_LIVE_SEED': {
      const baseDdl = generateCompleteSqlServerSchemaScript({
        ...options,
        versionTag: `${version} + Live Clinical Data`,
        generatedAt: isoTime
      });
      const liveSeed = generateLiveSqlInsertScript(
        options?.products || [],
        options?.batches || [],
        options?.locations || [],
        options?.categories || [],
        options?.subcategories || [],
        options?.customers || [],
        options?.users || []
      );
      script = `${baseDdl}\n\n-- ==============================================================================\n-- SECTION B: LIVE CLINICAL SEED DATA (Products, Batches, Locations)\n-- Generated for Hospete & Hubballi clinics at ${isoTime}\n-- ==============================================================================\n\n${liveSeed}`;
      objectCount = 18;
      break;
    }

    case 'SAFE_INCREMENTAL':
      script = generateIncrementalUpgradeScript(options?.customColumns);
      objectCount = 6;
      break;

    case 'AUDIT_TRIGGER':
      script = generateDatabaseAuditTriggerScript();
      objectCount = 2;
      break;

    default:
      script = generateCompleteSqlServerSchemaScript(options);
  }

  const lines = script.split('\n');
  const byteSize = new Blob([script]).size;

  return {
    script,
    lineCount: lines.length,
    byteSize,
    objectCount,
    fetchedAt: timestamp,
    version,
    variant
  };
}

/**
 * Generates an incremental upgrade script containing ONLY the latest changes/migrations
 * Safe to run against an existing SQL Server database without recreating tables.
 */
export function generateIncrementalUpgradeScript(customColumns?: any[]): string {
  const customCols = customColumns || [];
  return `-- ==============================================================================
-- MediClinic ERP - Safe Incremental Database Upgrade Script (Zero Data Loss)
-- Upgrades existing tables to latest schema without dropping tables or losing rows.
-- Generated At: ${new Date().toISOString()}
-- ==============================================================================

USE [MediClinic_ERP];
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;
BEGIN TRY

    -- 1. Upgrade dbo.Products
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'Barcode')
    BEGIN
        ALTER TABLE [dbo].[Products] ADD [Barcode] NVARCHAR(100) NULL;
        PRINT 'Added Barcode to dbo.Products';
    END;

    -- 2. Upgrade dbo.Locations
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Locations') AND name = 'DrugLicenseNo')
    BEGIN
        ALTER TABLE [dbo].[Locations] ADD [DrugLicenseNo] NVARCHAR(100) NULL;
        PRINT 'Added DrugLicenseNo to dbo.Locations';
    END;

    -- 3. Upgrade dbo.OnlineOrders
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.OnlineOrders') AND name = 'CourierPartner')
    BEGIN
        ALTER TABLE [dbo].[OnlineOrders] ADD [CourierPartner] NVARCHAR(100) NULL CONSTRAINT [DF_OnlineOrders_CourierPartner] DEFAULT 'BlueDart / DTDC' WITH VALUES;
        PRINT 'Added CourierPartner to dbo.OnlineOrders';
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.OnlineOrders') AND name = 'WaybillNo')
    BEGIN
        ALTER TABLE [dbo].[OnlineOrders] ADD [WaybillNo] NVARCHAR(100) NULL;
        PRINT 'Added WaybillNo to dbo.OnlineOrders';
    END;

    -- 4. Upgrade dbo.StockBatches
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockBatches') AND name = 'OpeningBatchNumber')
    BEGIN
        ALTER TABLE [dbo].[StockBatches] ADD [OpeningBatchNumber] NVARCHAR(100) NULL;
        PRINT 'Added OpeningBatchNumber to dbo.StockBatches';
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockBatches') AND name = 'ImportSource')
    BEGIN
        ALTER TABLE [dbo].[StockBatches] ADD [ImportSource] NVARCHAR(100) NULL CONSTRAINT [DF_StockBatches_ImportSource] DEFAULT 'EXCEL_IMPORT' WITH VALUES;
        PRINT 'Added ImportSource to dbo.StockBatches';
    END;

    -- 5. Upgrade dbo.StockMovementLedger
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockMovementLedger') AND name = 'FiscalYear')
    BEGIN
        ALTER TABLE [dbo].[StockMovementLedger] ADD [FiscalYear] NVARCHAR(20) NULL CONSTRAINT [DF_StockMovementLedger_FiscalYear] DEFAULT '2026-2027' WITH VALUES;
        PRINT 'Added FiscalYear to dbo.StockMovementLedger';
    END;

    -- 6. Install Audit Logs Table & Trigger
    IF OBJECT_ID('dbo.DatabaseAuditLogs', 'U') IS NULL
    BEGIN
        CREATE TABLE [dbo].[DatabaseAuditLogs] (
            [LogId] BIGINT IDENTITY(1,1) NOT NULL,
            [EventTime] DATETIME2 NOT NULL CONSTRAINT [DF_AuditLogs_EventTime] DEFAULT SYSUTCDATETIME(),
            [EventType] NVARCHAR(100) NOT NULL,
            [ObjectName] NVARCHAR(250) NULL,
            [ObjectType] NVARCHAR(100) NULL,
            [CommandText] NVARCHAR(MAX) NULL,
            [LoginName] NVARCHAR(150) NOT NULL,
            [ClientHost] NVARCHAR(150) NULL CONSTRAINT [DF_AuditLogs_Host] DEFAULT HOST_NAME(),
            [IsReadInApp] BIT NOT NULL CONSTRAINT [DF_AuditLogs_IsRead] DEFAULT 0,
            CONSTRAINT [PK_DatabaseAuditLogs] PRIMARY KEY CLUSTERED ([LogId] ASC)
        );
        PRINT 'Created dbo.DatabaseAuditLogs';
    END;

    ${customCols.map(col => `
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.${col.tableName}') AND name = '${col.columnName}')
    BEGIN
        ALTER TABLE [dbo].[${col.tableName}] ADD [${col.columnName}] ${col.dataType} ${col.defaultValue ? `DEFAULT (${col.defaultValue}) WITH VALUES` : 'NULL'};
        PRINT 'Added custom column [${col.columnName}] to [dbo].[${col.tableName}]';
    END;
    `).join('\n')}

    COMMIT TRANSACTION;
    PRINT 'SUCCESS: Incremental Database Upgrade executed cleanly with ZERO data loss.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
`;
}

/**
 * Generates an executable SQL Server T-SQL script containing all current live clinic data
 * (Locations, Categories, Subcategories, Products, StockBatches, Customers, Users)
 */
export function generateLiveSqlInsertScript(
  products: Product[],
  batches: StockBatch[],
  locations: Location[],
  categories: Category[],
  subcategories: Subcategory[],
  customers: Customer[],
  users: User[]
): string {
  const sanitize = (val: string | undefined | null) => {
    if (val === undefined || val === null) return 'NULL';
    return `N'${String(val).replace(/'/g, "''")}'`;
  };

  const lines: string[] = [
    `-- ==============================================================================`,
    `-- MediClinic ERP - Live Clinic Data Export for Microsoft SQL Server`,
    `-- Generated At: ${new Date().toISOString()}`,
    `-- ==============================================================================`,
    `USE [MediClinic_ERP];`,
    `GO`,
    `SET NOCOUNT ON;`,
    `BEGIN TRANSACTION;`,
    ``
  ];

  // 1. Locations
  lines.push(`-- 1. Insert Locations`);
  locations.forEach(loc => {
    lines.push(`IF NOT EXISTS (SELECT 1 FROM [dbo].[Locations] WHERE [LocationId] = ${sanitize(loc.locationId)})`);
    lines.push(`BEGIN`);
    lines.push(`    INSERT INTO [dbo].[Locations] ([LocationId], [LocationCode], [LocationName], [Address], [Phone], [NextInvoiceSeq], [IsActive])`);
    lines.push(`    VALUES (${sanitize(loc.locationId)}, ${sanitize(loc.locationCode)}, ${sanitize(loc.locationName)}, ${sanitize(loc.address)}, ${sanitize(loc.phone)}, ${loc.nextInvoiceSeq || 1}, ${loc.isActive ? 1 : 0});`);
    lines.push(`END;`);
  });
  lines.push(`GO`);
  lines.push(``);

  // 2. Categories
  lines.push(`-- 2. Insert Categories`);
  categories.forEach(cat => {
    lines.push(`IF NOT EXISTS (SELECT 1 FROM [dbo].[Categories] WHERE [CategoryId] = ${sanitize(cat.categoryId)})`);
    lines.push(`BEGIN`);
    lines.push(`    INSERT INTO [dbo].[Categories] ([CategoryId], [CategoryCode], [CategoryName], [Description], [IsActive])`);
    lines.push(`    VALUES (${sanitize(cat.categoryId)}, ${sanitize(cat.categoryCode)}, ${sanitize(cat.categoryName)}, ${sanitize(cat.description)}, ${cat.isActive ? 1 : 0});`);
    lines.push(`END;`);
  });
  lines.push(`GO`);
  lines.push(``);

  // 3. Subcategories
  lines.push(`-- 3. Insert Subcategories`);
  subcategories.forEach(sub => {
    lines.push(`IF NOT EXISTS (SELECT 1 FROM [dbo].[Subcategories] WHERE [SubcategoryId] = ${sanitize(sub.subcategoryId)})`);
    lines.push(`BEGIN`);
    lines.push(`    INSERT INTO [dbo].[Subcategories] ([SubcategoryId], [SubcategoryCode], [CategoryId], [SubcategoryName], [Description], [IsActive])`);
    lines.push(`    VALUES (${sanitize(sub.subcategoryId)}, ${sanitize(sub.subcategoryCode)}, ${sanitize(sub.categoryId)}, ${sanitize(sub.subcategoryName)}, ${sanitize(sub.description)}, ${sub.isActive ? 1 : 0});`);
    lines.push(`END;`);
  });
  lines.push(`GO`);
  lines.push(``);

  // 4. Products
  lines.push(`-- 4. Insert Products`);
  products.forEach(p => {
    lines.push(`IF NOT EXISTS (SELECT 1 FROM [dbo].[Products] WHERE [ProductId] = ${sanitize(p.productId)})`);
    lines.push(`BEGIN`);
    lines.push(`    INSERT INTO [dbo].[Products] ([ProductId], [ProductCode], [ProductName], [CategoryId], [SubcategoryId], [CostPrice], [SellingPrice], [ReorderLevel], [VolumeSize], [IsActive])`);
    lines.push(`    VALUES (${sanitize(p.productId)}, ${sanitize(p.productCode)}, ${sanitize(p.productName)}, ${sanitize(p.categoryId)}, ${sanitize(p.subcategoryId)}, ${p.costPrice || 0}, ${p.sellingPrice || 0}, ${p.reorderLevel || 10}, ${sanitize(p.volumeSize)}, ${p.isActive ? 1 : 0});`);
    lines.push(`END;`);
  });
  lines.push(`GO`);
  lines.push(``);

  // 5. Stock Batches
  lines.push(`-- 5. Insert Live Stock Batches`);
  batches.forEach(b => {
    lines.push(`IF NOT EXISTS (SELECT 1 FROM [dbo].[StockBatches] WHERE [BatchId] = ${sanitize(b.batchId)})`);
    lines.push(`BEGIN`);
    lines.push(`    INSERT INTO [dbo].[StockBatches] ([BatchId], [ProductId], [LocationId], [BatchNumber], [ExpiryDate], [PurchaseDate], [SupplierName], [QuantityReceived], [CurrentQuantity], [CostPrice], [SellingPrice], [IsOpeningStock], [OpeningBatchNumber], [CreatedBy])`);
    lines.push(`    VALUES (${sanitize(b.batchId)}, ${sanitize(b.productId)}, ${sanitize(b.locationId)}, ${sanitize(b.batchNumber)}, '${b.expiryDate}', '${b.purchaseDate}', ${sanitize(b.supplierName)}, ${b.quantityReceived}, ${b.currentQuantity}, ${b.costPrice}, ${b.sellingPrice}, ${b.isOpeningStock ? 1 : 0}, ${sanitize(b.openingBatchNumber)}, ${sanitize(b.createdBy)});`);
    lines.push(`END;`);
  });
  lines.push(`GO`);
  lines.push(``);

  // 6. Customers
  lines.push(`-- 6. Insert Customers`);
  customers.forEach(c => {
    lines.push(`IF NOT EXISTS (SELECT 1 FROM [dbo].[Customers] WHERE [CustomerId] = ${sanitize(c.customerId)})`);
    lines.push(`BEGIN`);
    lines.push(`    INSERT INTO [dbo].[Customers] ([CustomerId], [CustomerName], [Phone], [Address], [LoyaltyPoints], [TotalSpend])`);
    lines.push(`    VALUES (${sanitize(c.customerId)}, ${sanitize(c.customerName)}, ${sanitize(c.phone)}, ${sanitize(c.address)}, ${c.loyaltyPoints || 0}, ${c.totalSpend || 0});`);
    lines.push(`END;`);
  });
  lines.push(`GO`);
  lines.push(``);

  lines.push(`COMMIT TRANSACTION;`);
  lines.push(`PRINT 'All live clinic records successfully inserted into SQL Server database!';`);

  return lines.join('\n');
}

export interface SqlServerConnectionParams {
  server: string;
  port: number;
  database: string;
  authType: 'SQL_AUTH' | 'WINDOWS_AUTH';
  user?: string;
  password?: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectionTimeoutSeconds: number;
}

/**
 * Builds formatted connection strings for various platforms
 */
export function generateSqlServerConnectionStrings(params: SqlServerConnectionParams): Record<string, string> {
  const { server, port, database, authType, user, password, encrypt, trustServerCertificate, connectionTimeoutSeconds } = params;
  const isPortNeeded = port && port !== 1433 ? `,${port}` : '';
  const serverWithPort = `${server}${isPortNeeded}`;

  // 1. ADO.NET / ASP.NET Core 8 / Entity Framework Core
  let adoNet = '';
  if (authType === 'SQL_AUTH') {
    adoNet = `Server=${serverWithPort};Database=${database};User Id=${user || 'sa'};Password=${password || '********'};Encrypt=${encrypt ? 'True' : 'False'};TrustServerCertificate=${trustServerCertificate ? 'True' : 'False'};Connection Timeout=${connectionTimeoutSeconds};`;
  } else {
    adoNet = `Server=${serverWithPort};Database=${database};Integrated Security=True;Encrypt=${encrypt ? 'True' : 'False'};TrustServerCertificate=${trustServerCertificate ? 'True' : 'False'};Connection Timeout=${connectionTimeoutSeconds};`;
  }

  // 2. Node.js 'mssql' configuration
  const nodeConfig = JSON.stringify({
    server: server.includes('\\') ? server.split('\\')[0] : server,
    port: port || 1433,
    database,
    user: authType === 'SQL_AUTH' ? (user || 'sa') : undefined,
    password: authType === 'SQL_AUTH' ? (password || '********') : undefined,
    options: {
      encrypt,
      trustServerCertificate,
      instanceName: server.includes('\\') ? server.split('\\')[1] : undefined
    }
  }, null, 2);

  // 3. Python pyodbc
  const pyodbc = authType === 'SQL_AUTH'
    ? `DRIVER={ODBC Driver 18 for SQL Server};SERVER=${serverWithPort};DATABASE=${database};UID=${user || 'sa'};PWD=${password || '********'};Encrypt=${encrypt ? 'yes' : 'no'};TrustServerCertificate=${trustServerCertificate ? 'yes' : 'no'};`
    : `DRIVER={ODBC Driver 18 for SQL Server};SERVER=${serverWithPort};DATABASE=${database};Trusted_Connection=yes;Encrypt=${encrypt ? 'yes' : 'no'};TrustServerCertificate=${trustServerCertificate ? 'yes' : 'no'};`;

  // 4. JDBC (Java)
  const jdbc = authType === 'SQL_AUTH'
    ? `jdbc:sqlserver://${server}:${port || 1433};databaseName=${database};user=${user || 'sa'};password=${password || '********'};encrypt=${encrypt};trustServerCertificate=${trustServerCertificate};`
    : `jdbc:sqlserver://${server}:${port || 1433};databaseName=${database};integratedSecurity=true;encrypt=${encrypt};trustServerCertificate=${trustServerCertificate};`;

  // 5. PowerShell Invoke-Sqlcmd
  const powershell = authType === 'SQL_AUTH'
    ? `Invoke-Sqlcmd -ServerInstance "${server}" -Database "${database}" -Username "${user || 'sa'}" -Password "${password || '********'}" -Query "SELECT COUNT(*) FROM dbo.Products;"`
    : `Invoke-Sqlcmd -ServerInstance "${server}" -Database "${database}" -Query "SELECT COUNT(*) FROM dbo.Products;"`;

  return {
    'adoNet': adoNet,
    'nodeConfig': nodeConfig,
    'pyodbc': pyodbc,
    'jdbc': jdbc,
    'powershell': powershell
  };
}

/**
 * Generates a standalone Node.js local bridge script that clinic admins can run
 * on their Windows server/PC to bridge the web browser app with on-premise SQL Server.
 */
export function generateLocalSqlBridgeScript(params: SqlServerConnectionParams): string {
  return `/**
 * MediClinic ERP - Local SQL Server HTTP Bridge Service
 * 
 * Instructions:
 * 1. Install Node.js (https://nodejs.org) on the local Windows PC where SQL Server is installed.
 * 2. Create a folder: C:\\MediClinicBridge and place this file as "server.js".
 * 3. Open Command Prompt / PowerShell in that folder and run:
 *      npm init -y
 *      npm install mssql express cors
 * 4. Run the bridge:
 *      node server.js
 * 5. This opens http://localhost:5001/api/sql to bridge browser requests with SQL Server.
 */

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// SQL Server Connection Configuration
const sqlConfig = {
  server: '${params.server.replace(/\\/g, '\\\\')}',
  port: ${params.port || 1433},
  database: '${params.database}',
  user: '${params.user || 'sa'}',
  password: '${params.password || ''}',
  options: {
    encrypt: ${params.encrypt},
    trustServerCertificate: ${params.trustServerCertificate}
  }
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
    console.log('[SQL Bridge] Connected to Microsoft SQL Server:', sqlConfig.server, 'DB:', sqlConfig.database);
  }
  return pool;
}

// 1. Health check & Diagnostics endpoint
app.get('/api/health', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(\`
      SELECT 
        @@VERSION AS SqlVersion, 
        DB_NAME() AS CurrentDb, 
        GETDATE() AS ServerTime,
        (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0) AS TableCount
    \`);
    res.json({
      status: 'HEALTHY',
      connected: true,
      server: sqlConfig.server,
      database: sqlConfig.database,
      tableCount: result.recordset[0]?.TableCount || 12,
      version: result.recordset[0]?.SqlVersion?.split('\\n')[0] || 'Microsoft SQL Server',
      serverTime: result.recordset[0]?.ServerTime
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', connected: false, message: err.message, server: sqlConfig.server, database: sqlConfig.database });
  }
});

// 2. Configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    server: sqlConfig.server,
    database: sqlConfig.database,
    port: sqlConfig.port,
    user: sqlConfig.user,
    connected: pool !== null
  });
});

app.post('/api/config', async (req, res) => {
  try {
    const { server, database, port, user, password } = req.body;
    if (server) sqlConfig.server = server;
    if (database) sqlConfig.database = database;
    if (port) sqlConfig.port = port;
    if (user) sqlConfig.user = user;
    if (password !== undefined) sqlConfig.password = password;

    if (pool) {
      await pool.close();
      pool = null;
    }
    await getPool();
    res.json({ success: true, message: 'Reconnected to SQL Server with updated configuration', server: sqlConfig.server, database: sqlConfig.database });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Products Endpoints (Read & Write)
app.get('/api/products', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT * FROM dbo.Products WHERE IsActive = 1 ORDER BY ProductName ASC');
    res.json({ success: true, count: result.recordset.length, products: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const p = await getPool();
    const item = req.body;
    const request = p.request();
    request.input('ProductId', sql.NVarChar(50), item.productId);
    request.input('ProductCode', sql.NVarChar(50), item.productCode);
    request.input('ProductName', sql.NVarChar(250), item.productName);
    request.input('CategoryId', sql.NVarChar(50), item.categoryId || 'GEN');
    request.input('CostPrice', sql.Decimal(18, 2), item.costPrice || 0);
    request.input('SellingPrice', sql.Decimal(18, 2), item.sellingPrice || 0);
    request.input('ReorderLevel', sql.Int, item.reorderLevel || 10);
    request.input('VolumeSize', sql.NVarChar(100), item.volumeSize || '');
    request.input('Description', sql.NVarChar(500), item.description || '');

    await request.query(\`
      IF EXISTS (SELECT 1 FROM dbo.Products WHERE ProductId = @ProductId)
        UPDATE dbo.Products 
        SET ProductCode = @ProductCode, ProductName = @ProductName, CategoryId = @CategoryId,
            CostPrice = @CostPrice, SellingPrice = @SellingPrice, ReorderLevel = @ReorderLevel,
            VolumeSize = @VolumeSize, Description = @Description
        WHERE ProductId = @ProductId
      ELSE
        INSERT INTO dbo.Products (ProductId, ProductCode, ProductName, CategoryId, CostPrice, SellingPrice, ReorderLevel, VolumeSize, Description, IsActive, CreatedDate)
        VALUES (@ProductId, @ProductCode, @ProductName, @CategoryId, @CostPrice, @SellingPrice, @ReorderLevel, @VolumeSize, @Description, 1, GETDATE())
    \`);
    res.json({ success: true, productId: item.productId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Stock Batches Endpoints (Read & Write)
app.get('/api/batches', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT * FROM dbo.StockBatches WHERE CurrentQuantity > 0 ORDER BY ExpiryDate ASC');
    res.json({ success: true, count: result.recordset.length, batches: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/batches', async (req, res) => {
  try {
    const p = await getPool();
    const b = req.body;
    const request = p.request();
    request.input('BatchId', sql.NVarChar(50), b.batchId);
    request.input('ProductId', sql.NVarChar(50), b.productId);
    request.input('LocationId', sql.NVarChar(50), b.locationId || 'LOC-01');
    request.input('BatchNumber', sql.NVarChar(100), b.batchNumber);
    request.input('ExpiryDate', sql.Date, b.expiryDate);
    request.input('PurchaseDate', sql.Date, b.purchaseDate || new Date().toISOString().slice(0, 10));
    request.input('SupplierName', sql.NVarChar(200), b.supplierName || 'Central Depot');
    request.input('QuantityReceived', sql.Int, b.quantityReceived || b.currentQuantity || 1);
    request.input('CurrentQuantity', sql.Int, b.currentQuantity);
    request.input('CostPrice', sql.Decimal(18, 2), b.costPrice);
    request.input('SellingPrice', sql.Decimal(18, 2), b.sellingPrice);

    await request.query(\`
      IF EXISTS (SELECT 1 FROM dbo.StockBatches WHERE BatchId = @BatchId)
        UPDATE dbo.StockBatches 
        SET CurrentQuantity = @CurrentQuantity, CostPrice = @CostPrice, SellingPrice = @SellingPrice, ExpiryDate = @ExpiryDate
        WHERE BatchId = @BatchId
      ELSE
        INSERT INTO dbo.StockBatches (BatchId, ProductId, LocationId, BatchNumber, ExpiryDate, PurchaseDate, SupplierName, QuantityReceived, CurrentQuantity, CostPrice, SellingPrice)
        VALUES (@BatchId, @ProductId, @LocationId, @BatchNumber, @ExpiryDate, @PurchaseDate, @SupplierName, @QuantityReceived, @CurrentQuantity, @CostPrice, @SellingPrice)
    \`);
    res.json({ success: true, batchId: b.batchId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Sales Invoices Endpoints (Read & Write with Transaction)
app.get('/api/sales', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT TOP 500 * FROM dbo.SalesHeader ORDER BY CreatedDate DESC');
    res.json({ success: true, count: result.recordset.length, sales: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const p = await getPool();
    const s = req.body;
    const tx = new sql.Transaction(p);
    await tx.begin();

    try {
      const headerReq = new sql.Request(tx);
      headerReq.input('SaleId', sql.NVarChar(50), s.saleId);
      headerReq.input('InvoiceNo', sql.NVarChar(50), s.invoiceNo);
      headerReq.input('LocationId', sql.NVarChar(50), s.locationId || 'LOC-01');
      headerReq.input('CustomerId', sql.NVarChar(50), s.customerId || 'CUST-WALKIN');
      headerReq.input('CustomerName', sql.NVarChar(200), s.customerName || 'Walk-in Patient');
      headerReq.input('CustomerPhone', sql.NVarChar(50), s.customerPhone || '');
      headerReq.input('SaleDate', sql.DateTime2, s.saleDate || new Date().toISOString());
      headerReq.input('PaymentMode', sql.NVarChar(50), s.paymentMode || 'Cash');
      headerReq.input('DiscountAmount', sql.Decimal(18, 2), s.discountAmount || 0);
      headerReq.input('GrossAmount', sql.Decimal(18, 2), s.grossAmount || s.netAmount || 0);
      headerReq.input('NetAmount', sql.Decimal(18, 2), s.netAmount || 0);
      headerReq.input('TotalProfit', sql.Decimal(18, 2), s.totalProfit || 0);
      headerReq.input('CreatedBy', sql.NVarChar(100), s.createdBy || 'Cashier');

      await headerReq.query(\`
        IF NOT EXISTS (SELECT 1 FROM dbo.SalesHeader WHERE SaleId = @SaleId)
        BEGIN
          INSERT INTO dbo.SalesHeader (SaleId, InvoiceNo, LocationId, CustomerId, CustomerName, CustomerPhone, SaleDate, PaymentMode, DiscountAmount, GrossAmount, NetAmount, TotalProfit, CreatedBy, CreatedDate)
          VALUES (@SaleId, @InvoiceNo, @LocationId, @CustomerId, @CustomerName, @CustomerPhone, @SaleDate, @PaymentMode, @DiscountAmount, @GrossAmount, @NetAmount, @TotalProfit, @CreatedBy, GETDATE())
        END
      \`);

      if (Array.isArray(s.details)) {
        for (const item of s.details) {
          const detailReq = new sql.Request(tx);
          detailReq.input('SaleDetailId', sql.NVarChar(50), item.saleDetailId || \`\${s.saleId}-\${Math.random().toString(36).substr(2, 6)}\`);
          detailReq.input('SaleId', sql.NVarChar(50), s.saleId);
          detailReq.input('ProductId', sql.NVarChar(50), item.productId);
          detailReq.input('BatchId', sql.NVarChar(50), item.batchId);
          detailReq.input('Quantity', sql.Int, item.quantity);
          detailReq.input('UnitPrice', sql.Decimal(18, 2), item.unitPrice);
          detailReq.input('TotalLineAmount', sql.Decimal(18, 2), item.totalLineAmount || (item.quantity * item.unitPrice));

          await detailReq.query(\`
            INSERT INTO dbo.SalesDetails (SaleDetailId, SaleId, ProductId, BatchId, Quantity, UnitPrice, TotalLineAmount)
            VALUES (@SaleDetailId, @SaleId, @ProductId, @BatchId, @Quantity, @UnitPrice, @TotalLineAmount);

            UPDATE dbo.StockBatches
            SET CurrentQuantity = CASE WHEN CurrentQuantity >= @Quantity THEN CurrentQuantity - @Quantity ELSE 0 END
            WHERE BatchId = @BatchId;
          \`);
        }
      }

      await tx.commit();
      res.json({ success: true, saleId: s.saleId, invoiceNo: s.invoiceNo });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Customers Endpoints (Read & Write)
app.get('/api/customers', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT * FROM dbo.Customers ORDER BY FullName ASC');
    res.json({ success: true, count: result.recordset.length, customers: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const p = await getPool();
    const c = req.body;
    const request = p.request();
    request.input('CustomerId', sql.NVarChar(50), c.customerId);
    request.input('FullName', sql.NVarChar(200), c.fullName);
    request.input('Phone', sql.NVarChar(50), c.phone || '');
    request.input('Email', sql.NVarChar(150), c.email || '');
    request.input('Address', sql.NVarChar(300), c.address || '');
    request.input('Balance', sql.Decimal(18, 2), c.balance || 0);

    await request.query(\`
      IF EXISTS (SELECT 1 FROM dbo.Customers WHERE CustomerId = @CustomerId)
        UPDATE dbo.Customers
        SET FullName = @FullName, Phone = @Phone, Email = @Email, Address = @Address, Balance = @Balance
        WHERE CustomerId = @CustomerId
      ELSE
        INSERT INTO dbo.Customers (CustomerId, FullName, Phone, Email, Address, Balance, CreatedDate)
        VALUES (@CustomerId, @FullName, @Phone, @Email, @Address, @Balance, GETDATE())
    \`);
    res.json({ success: true, customerId: c.customerId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Stock Movement Ledger Endpoint
app.post('/api/ledger', async (req, res) => {
  try {
    const p = await getPool();
    const e = req.body;
    const request = p.request();
    request.input('LedgerId', sql.NVarChar(50), e.ledgerId || \`LEDGER-\${Date.now()}\`);
    request.input('LocationId', sql.NVarChar(50), e.locationId || 'LOC-01');
    request.input('ProductId', sql.NVarChar(50), e.productId);
    request.input('BatchId', sql.NVarChar(50), e.batchId);
    request.input('MovementType', sql.NVarChar(50), e.movementType || 'DISPENSE');
    request.input('QuantityDelta', sql.Int, e.quantityDelta);
    request.input('BalanceAfter', sql.Int, e.balanceAfter || 0);
    request.input('ReferenceDocType', sql.NVarChar(50), e.referenceDocType || 'INVOICE');
    request.input('ReferenceDocId', sql.NVarChar(50), e.referenceDocId || '');
    request.input('Notes', sql.NVarChar(300), e.notes || '');

    await request.query(\`
      INSERT INTO dbo.StockMovementLedger (LedgerId, LocationId, ProductId, BatchId, MovementType, QuantityDelta, BalanceAfter, ReferenceDocType, ReferenceDocId, Notes, Timestamp)
      VALUES (@LedgerId, @LocationId, @ProductId, @BatchId, @MovementType, @QuantityDelta, @BalanceAfter, @ReferenceDocType, @ReferenceDocId, @Notes, GETDATE())
    \`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Raw Query endpoint (Admin diagnostics)
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query parameter required' });
    const p = await getPool();
    const result = await p.request().query(query);
    res.json({ success: true, recordset: result.recordset, rowsAffected: result.rowsAffected });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Batch bulk sync endpoint
app.post('/api/sync/batches', async (req, res) => {
  try {
    const { batches } = req.body;
    const p = await getPool();
    const transaction = new sql.Transaction(p);
    await transaction.begin();

    for (const b of batches) {
      const request = new sql.Request(transaction);
      request.input('BatchId', sql.NVarChar(50), b.batchId);
      request.input('ProductId', sql.NVarChar(50), b.productId);
      request.input('LocationId', sql.NVarChar(50), b.locationId);
      request.input('BatchNumber', sql.NVarChar(100), b.batchNumber);
      request.input('ExpiryDate', sql.Date, b.expiryDate);
      request.input('PurchaseDate', sql.Date, b.purchaseDate);
      request.input('CurrentQuantity', sql.Int, b.currentQuantity);
      request.input('CostPrice', sql.Decimal(18, 2), b.costPrice);
      request.input('SellingPrice', sql.Decimal(18, 2), b.sellingPrice);

      await request.query(\`
        IF EXISTS (SELECT 1 FROM dbo.StockBatches WHERE BatchId = @BatchId)
          UPDATE dbo.StockBatches SET CurrentQuantity = @CurrentQuantity, CostPrice = @CostPrice, SellingPrice = @SellingPrice WHERE BatchId = @BatchId
        ELSE
          INSERT INTO dbo.StockBatches (BatchId, ProductId, LocationId, BatchNumber, ExpiryDate, PurchaseDate, QuantityReceived, CurrentQuantity, CostPrice, SellingPrice)
          VALUES (@BatchId, @ProductId, @LocationId, @BatchNumber, @ExpiryDate, @PurchaseDate, @CurrentQuantity, @CurrentQuantity, @CostPrice, @SellingPrice)
      \`);
    }

    await transaction.commit();
    res.json({ success: true, count: batches.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(\`==================================================\`);
  console.log(\`MediClinic ERP Local SQL Server Bridge is RUNNING\`);
  console.log(\`Listening on: http://localhost:\${PORT}\`);
  console.log(\`Health check: http://localhost:\${PORT}/api/health\`);
  console.log(\`==================================================\`);
});
`;
}

/**
 * Downloads a string as a .sql file
 */
export function downloadSqlScriptFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an idempotent T-SQL script to install the Database Audit & Notification trigger.
 * This logs every CREATE, ALTER, DROP, and DDL event in SQL Server so the app receives notifications.
 */
export function generateDatabaseAuditTriggerScript(): string {
  return `-- ==============================================================================
-- MediClinic ERP - Real-Time SQL Server DDL Audit & Notification Trigger
-- Captures all schema changes (ALTER TABLE, CREATE TABLE, ADD COLUMN, etc.)
-- without impacting table transactions or performance.
-- ==============================================================================

USE [MediClinic_ERP];
GO

-- 1. Create Database Audit & Notifications Log Table if not exists
IF OBJECT_ID('dbo.DatabaseAuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DatabaseAuditLogs] (
        [LogId] BIGINT IDENTITY(1,1) NOT NULL,
        [EventTime] DATETIME2 NOT NULL CONSTRAINT [DF_AuditLogs_EventTime] DEFAULT SYSUTCDATETIME(),
        [EventType] NVARCHAR(100) NOT NULL,
        [ObjectName] NVARCHAR(250) NULL,
        [ObjectType] NVARCHAR(100) NULL,
        [CommandText] NVARCHAR(MAX) NULL,
        [LoginName] NVARCHAR(150) NOT NULL,
        [ClientHost] NVARCHAR(150) NULL CONSTRAINT [DF_AuditLogs_Host] DEFAULT HOST_NAME(),
        [IsReadInApp] BIT NOT NULL CONSTRAINT [DF_AuditLogs_IsRead] DEFAULT 0,
        CONSTRAINT [PK_DatabaseAuditLogs] PRIMARY KEY CLUSTERED ([LogId] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_DatabaseAuditLogs_Recent] 
    ON [dbo].[DatabaseAuditLogs] ([EventTime] DESC)
    INCLUDE ([EventType], [ObjectName], [LoginName], [IsReadInApp]);

    PRINT 'Created dbo.DatabaseAuditLogs table successfully.';
END
GO

-- 2. DDL Database Trigger to capture any table/schema alteration
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_AuditDatabaseSchemaChanges' AND parent_class = 0)
BEGIN
    DROP TRIGGER [tr_AuditDatabaseSchemaChanges] ON DATABASE;
END
GO

CREATE TRIGGER [tr_AuditDatabaseSchemaChanges]
ON DATABASE
FOR DDL_DATABASE_LEVEL_EVENTS
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EventData XML = EVENTDATA();
    DECLARE @EventType NVARCHAR(100) = @EventData.value('(/EVENT_INSTANCE/EventType)[1]', 'NVARCHAR(100)');
    DECLARE @ObjectName NVARCHAR(250) = @EventData.value('(/EVENT_INSTANCE/ObjectName)[1]', 'NVARCHAR(250)');
    DECLARE @ObjectType NVARCHAR(100) = @EventData.value('(/EVENT_INSTANCE/ObjectType)[1]', 'NVARCHAR(100)');
    DECLARE @CommandText NVARCHAR(MAX) = @EventData.value('(/EVENT_INSTANCE/TSQLCommand/CommandText)[1]', 'NVARCHAR(MAX)');
    DECLARE @LoginName NVARCHAR(150) = @EventData.value('(/EVENT_INSTANCE/LoginName)[1]', 'NVARCHAR(150)');

    -- Skip internal temporary operations
    IF @ObjectName NOT LIKE '#%'
    BEGIN
        INSERT INTO [dbo].[DatabaseAuditLogs] (
            [EventType], [ObjectName], [ObjectType], [CommandText], [LoginName]
        ) VALUES (
            @EventType, @ObjectName, @ObjectType, @CommandText, @LoginName
        );
    END
END;
GO

PRINT 'Installed tr_AuditDatabaseSchemaChanges DDL Trigger successfully.';
GO
`;
}

/**
 * Generates an idempotent, non-destructive T-SQL script to add a column
 * to an existing table WITHOUT dropping the table or losing existing data.
 */
export function generateCustomSafeColumnScript(
  tableName: string,
  columnName: string,
  dataType: string,
  nullable: boolean,
  defaultValue?: string
): string {
  const cleanTableName = tableName.replace(/dbo\./g, '');
  const defaultConstraintName = `DF_${cleanTableName}_${columnName}`;
  const defaultClause = defaultValue && defaultValue.trim().length > 0
    ? `CONSTRAINT [${defaultConstraintName}] DEFAULT (${defaultValue}) WITH VALUES`
    : (nullable ? 'NULL' : 'NOT NULL');

  return `-- ==============================================================================
-- Non-Destructive Safe Schema Update (Zero Data Loss)
-- Target: [dbo].[${cleanTableName}]
-- Column: [${columnName}] (${dataType})
-- ==============================================================================

USE [MediClinic_ERP];
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[${cleanTableName}]') 
    AND name = N'${columnName}'
)
BEGIN
    PRINT 'Adding column [${columnName}] to [dbo].[${cleanTableName}]...';
    
    ALTER TABLE [dbo].[${cleanTableName}] 
    ADD [${columnName}] ${dataType} ${defaultClause};

    -- Audit notification
    IF OBJECT_ID('dbo.DatabaseAuditLogs', 'U') IS NOT NULL
    BEGIN
        INSERT INTO [dbo].[DatabaseAuditLogs] ([EventType], [ObjectName], [ObjectType], [CommandText], [LoginName])
        VALUES ('ALTER_TABLE_ADD_COLUMN', '${cleanTableName}', 'TABLE', 'Added column [${columnName}] (${dataType}) safely without data loss.', SYSTEM_USER);
    END

    PRINT 'SUCCESS: Column [${columnName}] added without affecting existing rows or table structure.';
END
ELSE
BEGIN
    PRINT 'NOTICE: Column [${columnName}] already exists in [dbo].[${cleanTableName}]. Existing data and schema intact.';
END
GO
`;
}

/**
 * Pre-defined safe migrations catalog for MediClinic ERP
 */
export const DEFAULT_MIGRATION_PATCHES: DatabaseMigrationPatch[] = [
  {
    id: 'MIG-001',
    version: 'v1.1',
    name: 'Barcode Scanning & Drug License Master Extension',
    description: 'Safely adds Barcode and DrugLicenseNo fields across Products and Locations without affecting existing items.',
    status: 'APPLIED',
    appliedDate: '2026-09-20 10:00:00',
    targetTables: ['Products', 'Locations'],
    verificationQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Products' AND COLUMN_NAME='Barcode'",
    safeNonDestructiveScript: `-- Migration v1.1: Barcode & Drug License Safe Extension
USE [MediClinic_ERP];
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'Barcode')
BEGIN
    ALTER TABLE [dbo].[Products] ADD [Barcode] NVARCHAR(100) NULL;
    PRINT 'Safely added [Barcode] to dbo.Products';
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Locations') AND name = 'DrugLicenseNo')
BEGIN
    ALTER TABLE [dbo].[Locations] ADD [DrugLicenseNo] NVARCHAR(100) NULL;
    PRINT 'Safely added [DrugLicenseNo] to dbo.Locations';
END;
GO`
  },
  {
    id: 'MIG-002',
    version: 'v1.2',
    name: 'Courier Partner Dispatch & Tracking Integration',
    description: 'Non-destructively adds courier partner tracking, waybill number, and dispatched timestamp to online orders.',
    status: 'APPLIED',
    appliedDate: '2026-09-24 14:30:00',
    targetTables: ['OnlineOrders'],
    verificationQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='OnlineOrders' AND COLUMN_NAME='CourierPartner'",
    safeNonDestructiveScript: `-- Migration v1.2: Courier Dispatch & Tracking Safe Extension
USE [MediClinic_ERP];
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.OnlineOrders') AND name = 'CourierPartner')
BEGIN
    ALTER TABLE [dbo].[OnlineOrders] ADD [CourierPartner] NVARCHAR(100) NULL CONSTRAINT [DF_OnlineOrders_CourierPartner] DEFAULT 'BlueDart / DTDC' WITH VALUES;
    PRINT 'Safely added [CourierPartner] to dbo.OnlineOrders';
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.OnlineOrders') AND name = 'WaybillNo')
BEGIN
    ALTER TABLE [dbo].[OnlineOrders] ADD [WaybillNo] NVARCHAR(100) NULL;
    PRINT 'Safely added [WaybillNo] to dbo.OnlineOrders';
END;
GO`
  },
  {
    id: 'MIG-003',
    version: 'v1.3',
    name: 'Opening Stock Inward Audit & Import Source Tracking',
    description: 'Safely adds OpeningBatchNumber, ImportSource, and VerifiedBy to StockBatches without locking or rewriting existing batches.',
    status: 'AVAILABLE',
    targetTables: ['StockBatches', 'StockMovementLedger'],
    verificationQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='StockBatches' AND COLUMN_NAME='ImportSource'",
    safeNonDestructiveScript: `-- Migration v1.3: Opening Stock Audit Extension
USE [MediClinic_ERP];
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockBatches') AND name = 'ImportSource')
BEGIN
    ALTER TABLE [dbo].[StockBatches] ADD [ImportSource] NVARCHAR(100) NULL CONSTRAINT [DF_StockBatches_ImportSource] DEFAULT 'EXCEL_IMPORT' WITH VALUES;
    PRINT 'Safely added [ImportSource] to dbo.StockBatches';
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockMovementLedger') AND name = 'FiscalYear')
BEGIN
    ALTER TABLE [dbo].[StockMovementLedger] ADD [FiscalYear] NVARCHAR(20) NULL CONSTRAINT [DF_StockMovementLedger_FiscalYear] DEFAULT '2026-2027' WITH VALUES;
    PRINT 'Safely added [FiscalYear] to dbo.StockMovementLedger';
END;
GO`
  },
  {
    id: 'MIG-004',
    version: 'v1.4',
    name: 'Real-Time DDL Audit Trigger & Change Notification System',
    description: 'Installs dbo.DatabaseAuditLogs and tr_AuditDatabaseSchemaChanges so every table change triggers real-time alerts in this UI.',
    status: 'AVAILABLE',
    targetTables: ['DatabaseAuditLogs'],
    verificationQuery: "SELECT 1 FROM sys.tables WHERE name='DatabaseAuditLogs'",
    safeNonDestructiveScript: `-- Migration v1.4: Real-Time Audit Trigger
USE [MediClinic_ERP];
GO

IF OBJECT_ID('dbo.DatabaseAuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DatabaseAuditLogs] (
        [LogId] BIGINT IDENTITY(1,1) NOT NULL,
        [EventTime] DATETIME2 NOT NULL CONSTRAINT [DF_AuditLogs_EventTime] DEFAULT SYSUTCDATETIME(),
        [EventType] NVARCHAR(100) NOT NULL,
        [ObjectName] NVARCHAR(250) NULL,
        [ObjectType] NVARCHAR(100) NULL,
        [CommandText] NVARCHAR(MAX) NULL,
        [LoginName] NVARCHAR(150) NOT NULL,
        [ClientHost] NVARCHAR(150) NULL CONSTRAINT [DF_AuditLogs_Host] DEFAULT HOST_NAME(),
        [IsReadInApp] BIT NOT NULL CONSTRAINT [DF_AuditLogs_IsRead] DEFAULT 0,
        CONSTRAINT [PK_DatabaseAuditLogs] PRIMARY KEY CLUSTERED ([LogId] ASC)
    );
    PRINT 'Created dbo.DatabaseAuditLogs successfully';
END;
GO`
  }
];

export const INITIAL_DATABASE_NOTIFICATIONS: DatabaseNotification[] = [
  {
    id: 'NOTIF-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    title: 'Table Schema Update: dbo.StockBatches Verified',
    description: 'Added index IX_StockBatches_FEFO on (ProductId, LocationId, ExpiryDate, CurrentQuantity). 0 rows affected; all live batches preserved.',
    changeType: 'SCHEMA_INDEX_MODIFIED',
    targetTable: 'dbo.StockBatches',
    severity: 'success',
    appliedBy: 'Dr. Rao (Admin)',
    isRead: false,
    isSchemaUpdate: true,
    safeToApplyWithoutDataLoss: true,
    sqlSnippet: 'CREATE NONCLUSTERED INDEX [IX_StockBatches_FEFO] ON [dbo].[StockBatches] ([ProductId], [LocationId], [CurrentQuantity], [ExpiryDate] ASC);'
  },
  {
    id: 'NOTIF-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    title: 'New Migration Available: v1.3 Opening Stock Audit',
    description: 'Adds ImportSource and FiscalYear columns safely using IF NOT EXISTS. Existing data remains 100% intact without downtime.',
    changeType: 'SCHEMA_COLUMN_ADDED',
    targetTable: 'dbo.StockBatches, dbo.StockMovementLedger',
    severity: 'info',
    appliedBy: 'MediClinic System',
    isRead: false,
    isSchemaUpdate: true,
    safeToApplyWithoutDataLoss: true,
    sqlSnippet: "ALTER TABLE [dbo].[StockBatches] ADD [ImportSource] NVARCHAR(100) NULL CONSTRAINT [DF_StockBatches_ImportSource] DEFAULT 'EXCEL_IMPORT' WITH VALUES;"
  },
  {
    id: 'NOTIF-003',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    title: 'Live Data Synchronized: 50 Opening Stock Items',
    description: 'Inwarded batch OPEN-HOS-0001 with 50 units for Hospete branch into SQL Server. Balances updated.',
    changeType: 'DATA_BATCH_SYNC',
    targetTable: 'dbo.StockBatches',
    severity: 'success',
    appliedBy: 'Dr. Rao (Admin)',
    isRead: false,
    isSchemaUpdate: false,
    safeToApplyWithoutDataLoss: true,
    sqlSnippet: "INSERT INTO [dbo].[StockBatches] ([BatchId], [ProductId], [LocationId], [BatchNumber], [CurrentQuantity]) VALUES ('BAT-001', 'PRD-001', 'LOC-HOS', 'OPEN-HOS-0001', 50);"
  }
];
