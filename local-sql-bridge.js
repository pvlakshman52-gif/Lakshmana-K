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
const connectionString = process.env.SQL_CONNECTION_STRING || '';
const isWindowsAuth = process.env.SQL_AUTH_TYPE === 'WINDOWS_AUTH' || 
                      process.env.SQL_TRUSTED_CONNECTION === 'true' || 
                      !process.env.SQL_SERVER_USER;

const defaultSqlConfig = {
  server: process.env.SQL_SERVER_HOST || 'localhost\\SQLEXPRESS',
  port: parseInt(process.env.SQL_SERVER_PORT || '1433', 10),
  database: process.env.SQL_SERVER_DB || 'MediClinic_ERP',
  user: isWindowsAuth ? undefined : (process.env.SQL_SERVER_USER || 'mediclinic_user'),
  password: isWindowsAuth ? undefined : (process.env.SQL_SERVER_PASSWORD || ''),
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true,
    trustedConnection: isWindowsAuth
  }
};

if (isWindowsAuth) {
  delete defaultSqlConfig.user;
  delete defaultSqlConfig.password;
}

let pool = null;

async function getPool(customConfig) {
  if (!sql) {
    throw new Error('The "mssql" npm package is not installed. Please run "npm install mssql" on this machine.');
  }
  if (!pool) {
    if (connectionString) {
      console.log(`[SQL Bridge] Connecting using Connection String...`);
      pool = await sql.connect(connectionString);
      console.log(`[SQL Bridge] Connected successfully via Connection String!`);
    } else {
      const config = customConfig || defaultSqlConfig;
      console.log(`[SQL Bridge] Connecting to Microsoft SQL Server at ${config.server}:${config.port}/${config.database} (Windows Auth: ${!!config.options.trustedConnection})...`);
      try {
        pool = await sql.connect(config);
        console.log(`[SQL Bridge] Connected successfully to ${config.database}!`);
      } catch (err) {
        // If standard connection failed, attempt trusted connection (Windows Auth)
        if (!config.options.trustedConnection) {
          console.log(`[SQL Bridge] Standard auth failed. Retrying with Windows Integrated Security...`);
          const trustedConfig = {
            ...config,
            options: { ...config.options, trustedConnection: true }
          };
          delete trustedConfig.user;
          delete trustedConfig.password;
          pool = await sql.connect(trustedConfig);
          console.log(`[SQL Bridge] Connected with Windows Authentication!`);
        } else {
          throw err;
        }
      }
    }
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
// 5. READ: Sales Invoices (Headers + Line Items)
// =========================================================================
app.get('/api/sales', async (req, res) => {
  try {
    const p = await getPool();
    // 1. Fetch latest 200 sales headers preserving existing ordering
    const headersResult = await p.request().query('SELECT TOP 200 * FROM dbo.SalesHeaders ORDER BY SaleDate DESC');
    const salesHeaders = headersResult.recordset || [];

    if (salesHeaders.length === 0) {
      return res.json({ success: true, sales: [] });
    }

    // 2. Safely parameterize matching SaleIds to retrieve child SalesDetails
    const detailsReq = p.request();
    const paramNames = [];
    salesHeaders.forEach((sh, idx) => {
      const saleId = sh.SaleId || sh.saleId;
      if (saleId) {
        const paramName = `sId${idx}`;
        detailsReq.input(paramName, sql.NVarChar(50), String(saleId));
        paramNames.push(`@${paramName}`);
      }
    });

    let detailsRecords = [];
    if (paramNames.length > 0) {
      const detailsQuery = `
        SELECT 
          d.*,
          p.ProductName AS MasterProductName,
          b.BatchNumber AS MasterBatchNumber
        FROM dbo.SalesDetails d
        LEFT JOIN dbo.Products p ON d.ProductId = p.ProductId
        LEFT JOIN dbo.StockBatches b ON d.BatchId = b.BatchId
        WHERE d.SaleId IN (${paramNames.join(', ')})
      `;
      const detailsResult = await detailsReq.query(detailsQuery);
      detailsRecords = detailsResult.recordset || [];
    }

    // 3. Group details by SaleId map
    const detailsBySaleId = new Map();
    detailsRecords.forEach(d => {
      const sId = d.SaleId || d.saleId;
      if (!detailsBySaleId.has(sId)) {
        detailsBySaleId.set(sId, []);
      }

      // Check required fields without fabricating missing historical items
      // Derive ProductName from dbo.Products join (MasterProductName) or row, and BatchNumber from dbo.StockBatches (MasterBatchNumber) or row
      const rawProdName = d.MasterProductName ?? d.ProductName ?? d.productName;
      const rawBatchNo = d.MasterBatchNumber ?? d.BatchNumber ?? d.batchNumber;
      const rawQty = d.Quantity ?? d.quantity;
      const rawRate = d.Rate ?? d.UnitPrice ?? d.unitPrice ?? d.rate;
      const rawAmount = d.Total ?? d.Amount ?? d.TotalLineAmount ?? d.amount;
      const rawCost = d.CostPrice ?? d.costPrice;
      const rawProfit = d.Profit ?? d.profit;

      const hasValidQty = rawQty !== undefined && rawQty !== null && !isNaN(Number(rawQty));
      const hasValidRate = rawRate !== undefined && rawRate !== null && !isNaN(Number(rawRate));
      const hasValidAmount = rawAmount !== undefined && rawAmount !== null && !isNaN(Number(rawAmount));
      const hasValidName = typeof rawProdName === 'string' && rawProdName.trim().length > 0;

      const isUnverified = !hasValidName || !hasValidQty || !hasValidRate || !hasValidAmount;

      detailsBySaleId.get(sId).push({
        saleDetailId: d.DetailId || d.SaleDetailId || d.saleDetailId || '',
        detailId: d.DetailId || d.SaleDetailId || d.saleDetailId || '',
        saleId: sId,
        productId: d.ProductId || d.productId || '',
        productName: hasValidName ? rawProdName : (rawProdName || ''),
        batchId: d.BatchId || d.batchId || '',
        batchNumber: rawBatchNo || '',
        quantity: hasValidQty ? Number(rawQty) : null,
        rate: hasValidRate ? Number(rawRate) : null,
        amount: hasValidAmount ? Number(rawAmount) : null,
        total: hasValidAmount ? Number(rawAmount) : null,
        costPrice: (rawCost !== undefined && rawCost !== null && !isNaN(Number(rawCost))) ? Number(rawCost) : null,
        profit: (rawProfit !== undefined && rawProfit !== null && !isNaN(Number(rawProfit))) ? Number(rawProfit) : null,
        isUnverified
      });
    });

    // 4. Combine headers with their matched details
    const sales = salesHeaders.map(sh => {
      const sId = sh.SaleId || sh.saleId;
      const matchedDetails = detailsBySaleId.get(sId) || [];
      return {
        ...sh,
        details: matchedDetails
      };
    });

    res.json({ success: true, sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WRITE: Create Sale Invoice with atomic transaction, strict inventory validation and stock ledger
app.post('/api/sales', async (req, res) => {
  try {
    const sale = req.body;
    if (!sale || typeof sale !== 'object') {
      return res.status(400).json({ success: false, error: 'Request body must be a valid sale object.' });
    }

    if (!sale.saleId || !String(sale.saleId).trim()) {
      return res.status(400).json({ success: false, error: 'SaleId is required.' });
    }

    if (!sale.invoiceNo || !String(sale.invoiceNo).trim()) {
      return res.status(400).json({ success: false, error: 'InvoiceNo is required.' });
    }

    if (!sale.locationId || !String(sale.locationId).trim()) {
      return res.status(400).json({ success: false, error: 'LocationId is required.' });
    }

    if (!Array.isArray(sale.details) || sale.details.length === 0) {
      return res.status(400).json({ success: false, error: 'A sale requires at least one itemised line detail.' });
    }

    // Pre-validate all line items before acquiring database resources
    for (let i = 0; i < sale.details.length; i++) {
      const line = sale.details[i];
      if (!line || typeof line !== 'object') {
        return res.status(400).json({ success: false, error: `Line item at index ${i} is invalid.` });
      }
      if (!line.productId || !String(line.productId).trim()) {
        return res.status(400).json({ success: false, error: `Line item ${i + 1} is missing ProductId.` });
      }
      if (!line.batchId || !String(line.batchId).trim()) {
        return res.status(400).json({ success: false, error: `Line item ${i + 1} (${line.productName || line.productId}) is missing BatchId.` });
      }
      const qty = Number(line.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ success: false, error: `Line item ${i + 1} quantity must be a positive whole integer (received: ${line.quantity}).` });
      }
      const rate = Number(line.rate);
      if (isNaN(rate) || rate < 0) {
        return res.status(400).json({ success: false, error: `Line item ${i + 1} rate must be a non-negative number (received: ${line.rate}).` });
      }
      const amount = Number(line.amount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ success: false, error: `Line item ${i + 1} amount must be a non-negative number (received: ${line.amount}).` });
      }
    }

    const p = await getPool();

    // Idempotency check: if invoice or saleId already exists, do not duplicate
    const existingCheck = await p.request()
      .input('CheckSaleId', sql.NVarChar(50), String(sale.saleId))
      .input('CheckInvoiceNo', sql.NVarChar(50), String(sale.invoiceNo))
      .query('SELECT SaleId, InvoiceNo FROM dbo.SalesHeaders WHERE SaleId = @CheckSaleId OR InvoiceNo = @CheckInvoiceNo');

    if (existingCheck.recordset && existingCheck.recordset.length > 0) {
      const existing = existingCheck.recordset[0];
      return res.status(409).json({
        success: false,
        error: `Sale or Invoice already exists in SQL Server (SaleId: ${existing.SaleId}, InvoiceNo: ${existing.InvoiceNo}). Duplicate sale rejected.`,
        isDuplicate: true,
        saleId: existing.SaleId,
        invoiceNo: existing.InvoiceNo
      });
    }

    const transaction = new sql.Transaction(p);
    await transaction.begin();

    try {
      // 1. Insert Sales Header using VERIFIED dbo.SalesHeaders schema
      const headerReq = new sql.Request(transaction);
      headerReq.input('SaleId', sql.NVarChar(50), String(sale.saleId));
      headerReq.input('InvoiceNo', sql.NVarChar(50), String(sale.invoiceNo));
      headerReq.input('SaleDate', sql.Date, new Date(sale.saleDate || Date.now()));
      headerReq.input('LocationId', sql.NVarChar(50), String(sale.locationId));
      headerReq.input('CustomerId', sql.NVarChar(50), String(sale.customerId || ''));
      headerReq.input('CustomerName', sql.NVarChar(150), String(sale.customerName || 'Walk-in Patient'));
      headerReq.input('CustomerPhone', sql.NVarChar(50), String(sale.customerPhone || ''));
      headerReq.input('PaymentMode', sql.NVarChar(20), String(sale.paymentMode || 'Cash'));
      headerReq.input('UpiReferenceNo', sql.NVarChar(100), sale.upiReferenceNo ? String(sale.upiReferenceNo).trim() : null);
      headerReq.input('GrossAmount', sql.Decimal(18, 2), Number(sale.grossAmount ?? sale.netAmount));
      headerReq.input('DiscountAmount', sql.Decimal(18, 2), Number(sale.discountAmount || 0));
      headerReq.input('CourierCharges', sql.Decimal(18, 2), Number(sale.courierCharges || 0));
      headerReq.input('NetAmount', sql.Decimal(18, 2), Number(sale.netAmount));
      headerReq.input('TotalProfit', sql.Decimal(18, 2), Number(sale.totalProfit || 0));
      headerReq.input('CreatedBy', sql.NVarChar(100), String(sale.createdBy || 'Cashier'));

      await headerReq.query(`
        INSERT INTO dbo.SalesHeaders (
          SaleId, InvoiceNo, SaleDate, LocationId, CustomerId, CustomerName, CustomerPhone, 
          PaymentMode, UpiReferenceNo, GrossAmount, DiscountAmount, CourierCharges, NetAmount, 
          TotalProfit, CreatedBy, CreatedDate
        )
        VALUES (
          @SaleId, @InvoiceNo, @SaleDate, @LocationId, @CustomerId, @CustomerName, @CustomerPhone, 
          @PaymentMode, @UpiReferenceNo, @GrossAmount, @DiscountAmount, @CourierCharges, @NetAmount, 
          @TotalProfit, @CreatedBy, GETDATE()
        )
      `);

      // 2. Validate batches, deduct stock with rowlock, insert details, and write ledger atomically
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      for (let idx = 0; idx < sale.details.length; idx++) {
        const line = sale.details[idx];
        const lineQty = Math.floor(Number(line.quantity));

        // Lock batch row to prevent race conditions & negative stock
        const batchCheckReq = new sql.Request(transaction);
        batchCheckReq.input('LockBatchId', sql.NVarChar(50), String(line.batchId));
        const batchCheckRes = await batchCheckReq.query(`
          SELECT BatchId, ProductId, LocationId, BatchNumber, CurrentQuantity, ExpiryDate, CostPrice
          FROM dbo.StockBatches WITH (UPDLOCK, ROWLOCK)
          WHERE BatchId = @LockBatchId
        `);

        if (!batchCheckRes.recordset || batchCheckRes.recordset.length === 0) {
          throw new Error(`Batch "${line.batchId}" does not exist in SQL Server for item "${line.productName || line.productId}".`);
        }

        const dbBatch = batchCheckRes.recordset[0];

        // Check ProductId matches batch
        if (String(dbBatch.ProductId).trim() !== String(line.productId).trim()) {
          throw new Error(`Batch "${line.batchId}" belongs to Product "${dbBatch.ProductId}", not requested Product "${line.productId}".`);
        }

        // Check Location matches sale branch location
        if (dbBatch.LocationId && String(dbBatch.LocationId).trim() !== String(sale.locationId).trim()) {
          throw new Error(`Batch "${line.batchId}" belongs to Branch "${dbBatch.LocationId}", but sale is at Branch "${sale.locationId}".`);
        }

        // Check expiration
        if (dbBatch.ExpiryDate) {
          const exp = new Date(dbBatch.ExpiryDate);
          if (!isNaN(exp.getTime()) && exp < now) {
            const expFormatted = exp.toISOString().split('T')[0];
            throw new Error(`Batch "${dbBatch.BatchNumber || line.batchId}" expired on ${expFormatted}. Expired batches cannot be sold.`);
          }
        }

        // Check stock sufficiency
        const currentQty = Number(dbBatch.CurrentQuantity || 0);
        if (currentQty < lineQty) {
          throw new Error(`Insufficient stock for Batch "${dbBatch.BatchNumber || line.batchId}" (${line.productName || line.productId}). Available: ${currentQty}, Requested: ${lineQty}.`);
        }

        const newBalanceQty = currentQty - lineQty;

        // Deduct batch stock with atomic concurrency guard
        const updateBatchReq = new sql.Request(transaction);
        updateBatchReq.input('UpdBatchId', sql.NVarChar(50), String(line.batchId));
        updateBatchReq.input('DeductQty', sql.Int, lineQty);
        const updateResult = await updateBatchReq.query(`
          UPDATE dbo.StockBatches
          SET CurrentQuantity = CurrentQuantity - @DeductQty
          WHERE BatchId = @UpdBatchId AND CurrentQuantity >= @DeductQty;
        `);

        if (updateResult.rowsAffected[0] === 0) {
          throw new Error(`Concurrent stock deduction conflict on Batch "${line.batchId}". Insufficient remaining stock.`);
        }

        // Insert Sales Detail using VERIFIED dbo.SalesDetails schema:
        // DetailId, SaleId, ProductId, BatchId, Quantity, Rate, CostPrice, Profit, Total
        const detailId = line.detailId || line.saleDetailId || `SD-${sale.saleId}-${idx + 1}`;
        const lineRate = Number(line.rate);
        const lineCostPrice = Number(line.costPrice ?? dbBatch.CostPrice ?? 0);
        const lineTotal = Number(line.total ?? line.amount ?? (lineRate * lineQty));
        const lineProfit = Number(line.profit ?? (lineTotal - (lineCostPrice * lineQty)));

        const detailReq = new sql.Request(transaction);
        detailReq.input('DetailId', sql.NVarChar(50), detailId);
        detailReq.input('SaleId', sql.NVarChar(50), String(sale.saleId));
        detailReq.input('ProductId', sql.NVarChar(50), String(line.productId));
        detailReq.input('BatchId', sql.NVarChar(50), String(line.batchId));
        detailReq.input('Quantity', sql.Int, lineQty);
        detailReq.input('Rate', sql.Decimal(18, 2), lineRate);
        detailReq.input('CostPrice', sql.Decimal(18, 2), lineCostPrice);
        detailReq.input('Profit', sql.Decimal(18, 2), lineProfit);
        detailReq.input('Total', sql.Decimal(18, 2), lineTotal);

        await detailReq.query(`
          INSERT INTO dbo.SalesDetails (
            DetailId, SaleId, ProductId, BatchId, Quantity, Rate, CostPrice, Profit, Total
          )
          VALUES (
            @DetailId, @SaleId, @ProductId, @BatchId, @Quantity, @Rate, @CostPrice, @Profit, @Total
          );
        `);

        // Atomically insert Stock Movement Ledger entry in the SAME transaction using VERIFIED dbo.StockMovementLedger schema:
        // MovementId, MovementDate, LocationId, ProductId, BatchId, MovementType, QuantityDelta, BalanceAfter, ReferenceNo, CostPrice, SellingPrice, FiscalYear, Remarks, CreatedBy
        const movementId = `MOV-${sale.saleId}-${idx + 1}-${Date.now().toString().slice(-4)}`;
        const batchSellingPrice = Number(dbBatch.SellingPrice ?? lineRate);

        // Consistent signed QuantityDelta convention: Sale deducts stock, so QuantityDelta = -lineQty
        const quantityDelta = -lineQty;
        const balanceAfter = newBalanceQty;

        // Current Indian Fiscal Year (e.g. 2026-2027)
        const saleDateObj = new Date(sale.saleDate || Date.now());
        const calYear = saleDateObj.getFullYear();
        const calMonth = saleDateObj.getMonth() + 1; // 1-12
        const fyStart = calMonth >= 4 ? calYear : calYear - 1;
        const fiscalYear = `${fyStart}-${fyStart + 1}`;

        const ledgerReq = new sql.Request(transaction);
        ledgerReq.input('MovementId', sql.NVarChar(50), movementId);
        ledgerReq.input('LocationId', sql.NVarChar(50), String(sale.locationId));
        ledgerReq.input('ProductId', sql.NVarChar(50), String(line.productId));
        ledgerReq.input('BatchId', sql.NVarChar(50), String(line.batchId));
        ledgerReq.input('MovementType', sql.NVarChar(50), 'Sale');
        ledgerReq.input('QuantityDelta', sql.Int, quantityDelta);
        ledgerReq.input('BalanceAfter', sql.Int, balanceAfter);
        ledgerReq.input('ReferenceNo', sql.NVarChar(100), String(sale.invoiceNo));
        ledgerReq.input('CostPrice', sql.Decimal(18, 2), lineCostPrice);
        ledgerReq.input('SellingPrice', sql.Decimal(18, 2), batchSellingPrice);
        ledgerReq.input('FiscalYear', sql.NVarChar(20), fiscalYear);
        ledgerReq.input('Remarks', sql.NVarChar(500), `POS Sale ${sale.invoiceNo} (${lineQty} units dispensed)`);
        ledgerReq.input('CreatedBy', sql.NVarChar(100), String(sale.createdBy || 'Cashier'));

        await ledgerReq.query(`
          INSERT INTO dbo.StockMovementLedger (
            MovementId, MovementDate, LocationId, ProductId, BatchId, MovementType, 
            QuantityDelta, BalanceAfter, ReferenceNo, CostPrice, SellingPrice, FiscalYear, Remarks, CreatedBy
          )
          VALUES (
            @MovementId, GETDATE(), @LocationId, @ProductId, @BatchId, @MovementType, 
            @QuantityDelta, @BalanceAfter, @ReferenceNo, @CostPrice, @SellingPrice, @FiscalYear, @Remarks, @CreatedBy
          )
        `);
      }

      await transaction.commit();
      res.json({ success: true, saleId: sale.saleId, invoiceNo: sale.invoiceNo });
    } catch (txErr) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Transaction rollback error:', rbErr.message);
      }
      return res.status(400).json({ success: false, error: txErr.message });
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
// 7. READ & WRITE: Stock Movement Ledger (VERIFIED dbo.StockMovementLedger schema)
// =========================================================================
app.get('/api/ledger', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT TOP 500 * FROM dbo.StockMovementLedger ORDER BY MovementDate DESC');
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
    q.input('MovementId', sql.NVarChar(50), l.movementId || `MOV-${Date.now()}`);
    q.input('LocationId', sql.NVarChar(50), l.locationId || 'LOC-HOS');
    q.input('ProductId', sql.NVarChar(50), l.productId);
    q.input('BatchId', sql.NVarChar(50), l.batchId);
    q.input('MovementType', sql.NVarChar(50), l.movementType || 'Manual Adjustment');
    const qtyDelta = Number(l.quantityDelta ?? (l.qtyIn ? l.qtyIn : (l.qtyOut ? -l.qtyOut : 0)));
    q.input('QuantityDelta', sql.Int, qtyDelta);
    q.input('BalanceAfter', sql.Int, Number(l.balanceAfter ?? l.balanceQty ?? 0));
    q.input('ReferenceNo', sql.NVarChar(100), l.referenceNo || 'MANUAL-LEDGER');
    q.input('CostPrice', sql.Decimal(18, 2), Number(l.costPrice || 0));
    q.input('SellingPrice', sql.Decimal(18, 2), Number(l.sellingPrice || 0));
    q.input('FiscalYear', sql.NVarChar(20), l.fiscalYear || '2026-2027');
    q.input('Remarks', sql.NVarChar(500), l.remarks || l.movementType || '');
    q.input('CreatedBy', sql.NVarChar(100), l.createdBy || 'System');

    await q.query(`
      INSERT INTO dbo.StockMovementLedger (
        MovementId, MovementDate, LocationId, ProductId, BatchId, MovementType, 
        QuantityDelta, BalanceAfter, ReferenceNo, CostPrice, SellingPrice, FiscalYear, Remarks, CreatedBy
      )
      VALUES (
        @MovementId, GETDATE(), @LocationId, @ProductId, @BatchId, @MovementType, 
        @QuantityDelta, @BalanceAfter, @ReferenceNo, @CostPrice, @SellingPrice, @FiscalYear, @Remarks, @CreatedBy
      )
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
    const ldgr = await p.request().query('SELECT TOP 100 * FROM dbo.StockMovementLedger ORDER BY MovementDate DESC');

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
