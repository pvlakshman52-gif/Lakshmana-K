/**
 * MediClinic Commerce ERP - Standalone Local Microsoft SQL Server HTTP Bridge
 * 
 * This service runs on the local clinic PC or local server alongside Microsoft SQL Server.
 * It connects to SQL Server (port 1433) and provides a secure REST API for the MediClinic ERP
 * web/PWA application to read and write all database records in real time.
 * 
 * QUICK START:
 * 1. Install Node.js (https://nodejs.org)
 * 2. In this directory, run:
 *    npm install mssql express cors
 * 3. Start the bridge:
 *    node local-sql-bridge.js
 * 4. The bridge listens on http://localhost:5001
 */

const express = require('express');
const cors = require('cors');

let sql;
try {
  sql = require('mssql');
} catch (e) {
  console.log('[Notice] "mssql" package not yet installed. Run "npm install mssql" to connect to live SQL Server.');
}

const app = express();
const PORT = process.env.SQL_BRIDGE_PORT || 5001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Default SQL Server configuration
const defaultSqlConfig = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  port: parseInt(process.env.SQL_SERVER_PORT || '1433', 10),
  database: process.env.SQL_SERVER_DB || 'MediClinic_ERP',
  user: process.env.SQL_SERVER_USER || 'mediclinic_user',
  password: process.env.SQL_SERVER_PASSWORD || 'MediClinic@2026!Secure',
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

let pool = null;

async function getPool(customConfig) {
  if (!sql) {
    throw new Error('The "mssql" npm package is not installed. Please run "npm install mssql" on this machine.');
  }
  const config = customConfig || defaultSqlConfig;
  if (!pool) {
    console.log(`[SQL Bridge] Connecting to Microsoft SQL Server at ${config.server}:${config.port}/${config.database}...`);
    pool = await sql.connect(config);
    console.log(`[SQL Bridge] Connected successfully to ${config.database}!`);
  }
  return pool;
}

// =========================================================================
// 1. Health check & Diagnostics endpoint
// =========================================================================
app.get('/api/health', async (req, res) => {
  try {
    if (!sql) {
      return res.json({
        status: 'READY_TO_CONNECT',
        bridgeRunning: true,
        connected: false,
        server: defaultSqlConfig.server,
        database: defaultSqlConfig.database,
        serverTime: new Date().toISOString(),
        message: 'Bridge server is running. Install mssql driver on local server: npm install mssql'
      });
    }
    const p = await getPool();
    const result = await p.request().query('SELECT @@SERVERNAME AS ServerName, @@VERSION AS SqlVersion, DB_NAME() AS CurrentDb, GETDATE() AS ServerTime');
    const r = result.recordset[0];
    res.json({
      status: 'HEALTHY',
      connected: true,
      bridgeRunning: true,
      server: r.ServerName || defaultSqlConfig.server,
      database: r.CurrentDb || defaultSqlConfig.database,
      version: r.SqlVersion.split('\n')[0],
      serverTime: r.ServerTime
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      connected: false,
      bridgeRunning: true,
      server: defaultSqlConfig.server,
      database: defaultSqlConfig.database,
      message: err.message
    });
  }
});

// =========================================================================
// 2. Database Status & Record Counts
// =========================================================================
app.get('/api/status', async (req, res) => {
  try {
    const p = await getPool();
    const statsQuery = `
      SELECT 
        @@SERVERNAME AS ServerName,
        DB_NAME() AS DatabaseName,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE') AS TableCount,
        (SELECT COUNT(*) FROM dbo.Products) AS ProductCount,
        (SELECT COUNT(*) FROM dbo.StockBatches) AS BatchCount,
        (SELECT COUNT(*) FROM dbo.SalesHeaders) AS SalesCount,
        (SELECT COUNT(*) FROM dbo.Customers) AS CustomerCount,
        (SELECT COUNT(*) FROM dbo.StockMovementLedger) AS LedgerCount
    `;
    const result = await p.request().query(statsQuery);
    res.json({ success: true, status: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 3. READ: Products
// =========================================================================
app.get('/api/products', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT * FROM dbo.Products ORDER BY ProductName ASC');
    res.json({ success: true, products: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WRITE: Product Save / Upsert
app.post('/api/products', async (req, res) => {
  try {
    const prod = req.body;
    const p = await getPool();
    const q = p.request();
    q.input('ProductId', sql.NVarChar(50), prod.productId);
    q.input('ProductCode', sql.NVarChar(50), prod.productCode);
    q.input('ProductName', sql.NVarChar(200), prod.productName);
    q.input('CategoryId', sql.NVarChar(50), prod.categoryId);
    q.input('CostPrice', sql.Decimal(18, 2), prod.costPrice);
    q.input('SellingPrice', sql.Decimal(18, 2), prod.sellingPrice);
    q.input('ReorderLevel', sql.Int, prod.reorderLevel || 10);
    q.input('VolumeSize', sql.NVarChar(50), prod.volumeSize || '');
    q.input('Description', sql.NVarChar(sql.MAX), prod.description || '');

    await q.query(`
      IF EXISTS (SELECT 1 FROM dbo.Products WHERE ProductId = @ProductId)
        UPDATE dbo.Products SET 
          ProductName = @ProductName, ProductCode = @ProductCode, CategoryId = @CategoryId,
          CostPrice = @CostPrice, SellingPrice = @SellingPrice, ReorderLevel = @ReorderLevel,
          VolumeSize = @VolumeSize, Description = @Description
        WHERE ProductId = @ProductId
      ELSE
        INSERT INTO dbo.Products (ProductId, ProductCode, ProductName, CategoryId, CostPrice, SellingPrice, ReorderLevel, VolumeSize, Description, IsActive, CreatedDate)
        VALUES (@ProductId, @ProductCode, @ProductName, @CategoryId, @CostPrice, @SellingPrice, @ReorderLevel, @VolumeSize, @Description, 1, GETDATE())
    `);
    res.json({ success: true, product: prod });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 4. READ: Stock Batches (FEFO Order)
// =========================================================================
app.get('/api/batches', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT * FROM dbo.StockBatches ORDER BY ExpiryDate ASC, PurchaseDate ASC');
    res.json({ success: true, batches: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WRITE: Stock Batch Save / Upsert
app.post('/api/batches', async (req, res) => {
  try {
    const b = req.body;
    const p = await getPool();
    const q = p.request();
    q.input('BatchId', sql.NVarChar(50), b.batchId);
    q.input('ProductId', sql.NVarChar(50), b.productId);
    q.input('LocationId', sql.NVarChar(50), b.locationId);
    q.input('BatchNumber', sql.NVarChar(100), b.batchNumber);
    q.input('ExpiryDate', sql.Date, b.expiryDate);
    q.input('PurchaseDate', sql.Date, b.purchaseDate || new Date());
    q.input('QuantityReceived', sql.Int, b.quantityReceived || b.currentQuantity);
    q.input('CurrentQuantity', sql.Int, b.currentQuantity);
    q.input('CostPrice', sql.Decimal(18, 2), b.costPrice);
    q.input('SellingPrice', sql.Decimal(18, 2), b.sellingPrice);

    await q.query(`
      IF EXISTS (SELECT 1 FROM dbo.StockBatches WHERE BatchId = @BatchId)
        UPDATE dbo.StockBatches SET 
          CurrentQuantity = @CurrentQuantity, CostPrice = @CostPrice, SellingPrice = @SellingPrice
        WHERE BatchId = @BatchId
      ELSE
        INSERT INTO dbo.StockBatches (BatchId, ProductId, LocationId, BatchNumber, ExpiryDate, PurchaseDate, QuantityReceived, CurrentQuantity, CostPrice, SellingPrice)
        VALUES (@BatchId, @ProductId, @LocationId, @BatchNumber, @ExpiryDate, @PurchaseDate, @QuantityReceived, @CurrentQuantity, @CostPrice, @SellingPrice)
    `);
    res.json({ success: true, batch: b });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 5. READ: Sales Invoices
// =========================================================================
app.get('/api/sales', async (req, res) => {
  try {
    const p = await getPool();
    const headersResult = await p.request().query('SELECT TOP 200 * FROM dbo.SalesHeaders ORDER BY SaleDate DESC');
    res.json({ success: true, sales: headersResult.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WRITE: Create Sale Invoice with atomic transaction
app.post('/api/sales', async (req, res) => {
  try {
    const sale = req.body;
    const p = await getPool();
    const transaction = new sql.Transaction(p);
    await transaction.begin();

    try {
      // 1. Insert Sales Header
      const headerReq = new sql.Request(transaction);
      headerReq.input('SaleId', sql.NVarChar(50), sale.saleId);
      headerReq.input('InvoiceNo', sql.NVarChar(50), sale.invoiceNo);
      headerReq.input('LocationId', sql.NVarChar(50), sale.locationId);
      headerReq.input('CustomerId', sql.NVarChar(50), sale.customerId || '');
      headerReq.input('CustomerName', sql.NVarChar(100), sale.customerName || 'Walk-in Patient');
      headerReq.input('CustomerPhone', sql.NVarChar(20), sale.customerPhone || '');
      headerReq.input('SaleDate', sql.DateTime, new Date(sale.saleDate || Date.now()));
      headerReq.input('PaymentMode', sql.NVarChar(20), sale.paymentMode || 'Cash');
      headerReq.input('GrossAmount', sql.Decimal(18, 2), sale.grossAmount || sale.netAmount);
      headerReq.input('DiscountAmount', sql.Decimal(18, 2), sale.discountAmount || 0);
      headerReq.input('NetAmount', sql.Decimal(18, 2), sale.netAmount);
      headerReq.input('CreatedBy', sql.NVarChar(50), sale.createdBy || 'Cashier');

      await headerReq.query(`
        INSERT INTO dbo.SalesHeaders (SaleId, InvoiceNo, LocationId, CustomerId, CustomerName, CustomerPhone, SaleDate, PaymentMode, GrossAmount, DiscountAmount, NetAmount, CreatedBy, CreatedDate)
        VALUES (@SaleId, @InvoiceNo, @LocationId, @CustomerId, @CustomerName, @CustomerPhone, @SaleDate, @PaymentMode, @GrossAmount, @DiscountAmount, @NetAmount, @CreatedBy, GETDATE())
      `);

      // 2. Insert Sales Details & update batch inventory
      if (Array.isArray(sale.details)) {
        for (const line of sale.details) {
          const detailReq = new sql.Request(transaction);
          detailReq.input('SaleDetailId', sql.NVarChar(50), line.saleDetailId || String(Date.now() + Math.random()));
          detailReq.input('SaleId', sql.NVarChar(50), sale.saleId);
          detailReq.input('BatchId', sql.NVarChar(50), line.batchId);
          detailReq.input('ProductId', sql.NVarChar(50), line.productId);
          detailReq.input('ProductName', sql.NVarChar(200), line.productName || '');
          detailReq.input('BatchNumber', sql.NVarChar(100), line.batchNumber || '');
          detailReq.input('Quantity', sql.Int, line.quantity);
          detailReq.input('Rate', sql.Decimal(18, 2), line.rate);
          detailReq.input('Amount', sql.Decimal(18, 2), line.amount);
          detailReq.input('CostPrice', sql.Decimal(18, 2), line.costPrice || 0);

          await detailReq.query(`
            INSERT INTO dbo.SalesDetails (SaleDetailId, SaleId, BatchId, ProductId, ProductName, BatchNumber, Quantity, Rate, Amount, CostPrice, Profit)
            VALUES (@SaleDetailId, @SaleId, @BatchId, @ProductId, @ProductName, @BatchNumber, @Quantity, @Rate, @Amount, @CostPrice, (@Amount - (@CostPrice * @Quantity)));

            UPDATE dbo.StockBatches SET CurrentQuantity = CurrentQuantity - @Quantity WHERE BatchId = @BatchId;
          `);
        }
      }

      await transaction.commit();
      res.json({ success: true, saleId: sale.saleId, invoiceNo: sale.invoiceNo });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 6. READ: Customers
// =========================================================================
app.get('/api/customers', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT * FROM dbo.Customers ORDER BY CustomerName ASC');
    res.json({ success: true, customers: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WRITE: Customer Save / Upsert
app.post('/api/customers', async (req, res) => {
  try {
    const c = req.body;
    const p = await getPool();
    const q = p.request();
    q.input('CustomerId', sql.NVarChar(50), c.customerId);
    q.input('CustomerName', sql.NVarChar(100), c.customerName);
    q.input('Phone', sql.NVarChar(20), c.phone);
    q.input('Address', sql.NVarChar(500), c.address || '');
    q.input('Email', sql.NVarChar(100), c.email || '');
    q.input('LoyaltyPoints', sql.Int, c.loyaltyPoints || 0);
    q.input('TotalSpend', sql.Decimal(18, 2), c.totalSpend || 0);

    await q.query(`
      IF EXISTS (SELECT 1 FROM dbo.Customers WHERE CustomerId = @CustomerId)
        UPDATE dbo.Customers SET CustomerName = @CustomerName, Phone = @Phone, Address = @Address, Email = @Email, LoyaltyPoints = @LoyaltyPoints, TotalSpend = @TotalSpend WHERE CustomerId = @CustomerId
      ELSE
        INSERT INTO dbo.Customers (CustomerId, CustomerName, Phone, Address, Email, LoyaltyPoints, TotalSpend, CreatedDate)
        VALUES (@CustomerId, @CustomerName, @Phone, @Address, @Email, @LoyaltyPoints, @TotalSpend, GETDATE())
    `);
    res.json({ success: true, customer: c });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 7. READ & WRITE: Stock Movement Ledger
// =========================================================================
app.get('/api/ledger', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT TOP 500 * FROM dbo.StockMovementLedger ORDER BY CreatedDate DESC');
    res.json({ success: true, ledger: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ledger', async (req, res) => {
  try {
    const l = req.body;
    const p = await getPool();
    const q = p.request();
    q.input('MovementId', sql.NVarChar(50), l.movementId);
    q.input('ProductId', sql.NVarChar(50), l.productId);
    q.input('LocationId', sql.NVarChar(50), l.locationId);
    q.input('BatchId', sql.NVarChar(50), l.batchId);
    q.input('MovementType', sql.NVarChar(50), l.movementType);
    q.input('ReferenceNo', sql.NVarChar(100), l.referenceNo);
    q.input('QtyIn', sql.Int, l.qtyIn || 0);
    q.input('QtyOut', sql.Int, l.qtyOut || 0);
    q.input('BalanceQty', sql.Int, l.balanceQty || 0);
    q.input('CreatedBy', sql.NVarChar(50), l.createdBy || 'System');

    await q.query(`
      INSERT INTO dbo.StockMovementLedger (MovementId, ProductId, LocationId, BatchId, MovementType, ReferenceNo, QtyIn, QtyOut, BalanceQty, CreatedDate, CreatedBy)
      VALUES (@MovementId, @ProductId, @LocationId, @BatchId, @MovementType, @ReferenceNo, @QtyIn, @QtyOut, @BalanceQty, GETDATE(), @CreatedBy)
    `);
    res.json({ success: true, movementId: l.movementId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 8. Master Bidirectional Sync: Push Local Client Changes & Pull Latest SQL Data
// =========================================================================
app.post('/api/sync/all', async (req, res) => {
  try {
    const { pushSales, pushBatches, pushProducts } = req.body;
    const p = await getPool();

    // 1. Commit any pending pushSales from client
    if (Array.isArray(pushSales) && pushSales.length > 0) {
      for (const s of pushSales) {
        try {
          const check = await p.request().input('SaleId', sql.NVarChar(50), s.saleId).query('SELECT 1 FROM dbo.SalesHeaders WHERE SaleId = @SaleId');
          if (check.recordset.length === 0) {
            const ins = p.request();
            ins.input('SaleId', sql.NVarChar(50), s.saleId);
            ins.input('InvoiceNo', sql.NVarChar(50), s.invoiceNo);
            ins.input('LocationId', sql.NVarChar(50), s.locationId);
            ins.input('CustomerName', sql.NVarChar(100), s.customerName || 'Walk-in');
            ins.input('NetAmount', sql.Decimal(18, 2), s.netAmount);
            await ins.query('INSERT INTO dbo.SalesHeaders (SaleId, InvoiceNo, LocationId, CustomerName, NetAmount, CreatedDate) VALUES (@SaleId, @InvoiceNo, @LocationId, @CustomerName, @NetAmount, GETDATE())');
          }
        } catch (e) {
          console.warn('Sync sale push error:', e.message);
        }
      }
    }

    // 2. Fetch latest state from SQL Server
    const prods = await p.request().query('SELECT * FROM dbo.Products WHERE IsActive = 1');
    const bths = await p.request().query('SELECT * FROM dbo.StockBatches WHERE CurrentQuantity > 0');
    const sls = await p.request().query('SELECT TOP 100 * FROM dbo.SalesHeaders ORDER BY SaleDate DESC');
    const custs = await p.request().query('SELECT * FROM dbo.Customers');
    const ldgr = await p.request().query('SELECT TOP 100 * FROM dbo.StockMovementLedger ORDER BY CreatedDate DESC');

    res.json({
      success: true,
      server: defaultSqlConfig.server,
      database: defaultSqlConfig.database,
      syncedAt: new Date().toISOString(),
      products: prods.recordset,
      batches: bths.recordset,
      sales: sls.recordset,
      customers: custs.recordset,
      ledger: ldgr.recordset
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 9. Query execution endpoint (Admin DDL & SQL testing)
// =========================================================================
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query string is required.' });
    const p = await getPool();
    const result = await p.request().query(query);
    res.json({
      success: true,
      recordset: result.recordset || [],
      rowsAffected: result.rowsAffected || [0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`MediClinic ERP - Local Microsoft SQL Server HTTP Bridge`);
  console.log(`Listening on: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Server: ${defaultSqlConfig.server} | Database: ${defaultSqlConfig.database}`);
  console.log(`================================================================`);
});
