# MediClinic Commerce ERP — Complete Application Workflow & IIS Deployment Guide

---

## Table of Contents
1. [System Architecture & Overview](#1-system-architecture--overview)
2. [Role-Based Access Control & Default Logins](#2-role-based-access-control--default-logins)
3. [End-to-End Application Workflow Guides](#3-end-to-end-application-workflow-guides)
   - [Workflow 1: Clinic Branch Management & Multi-Location Context](#workflow-1-clinic-branch-management--multi-location-context)
   - [Workflow 2: Product Master, Catalog & Pricing Engines](#workflow-2-product-master-catalog--pricing-engines)
   - [Workflow 3: Inventory Management & FEFO Batch Engine](#workflow-3-inventory-management--fefo-batch-engine)
   - [Workflow 4: POS Counter Billing & Thermal Invoicing](#workflow-4-pos-counter-billing--thermal-invoicing)
   - [Workflow 5: Operations & Patient Home Delivery Pipeline](#workflow-5-operations--patient-home-delivery-pipeline)
   - [Workflow 6: Online Patient Storefront](#workflow-6-online-patient-storefront)
   - [Workflow 7: Financial Reports & Clinical Stock Analytics](#workflow-7-financial-reports--clinical-stock-analytics)
   - [Workflow 8: Go-Live Setup, Reset & Database Snapshots](#workflow-8-go-live-setup-reset--database-snapshots)
4. [Step-by-Step Microsoft SQL Server Installation & Setup](#4-step-by-step-microsoft-sql-server-installation--setup)
   - [Step 4.1: SQL Server Instance Installation](#step-41-sql-server-instance-installation)
   - [Step 4.2: Enable Mixed-Mode Authentication & Port 1433](#step-42-enable-mixed-mode-authentication--port-1433)
   - [Step 4.3: Configure Windows Firewall](#step-43-configure-windows-firewall)
   - [Step 4.4: Create Database, User & Permissions (T-SQL Script)](#step-44-create-database-user--permissions-t-sql-script)
   - [Step 4.5: Execute Production DDL Schema (17 Core Objects)](#step-45-execute-production-ddl-schema-17-core-objects)
5. [Step-by-Step Local IIS Server Installation & Hosting](#5-step-by-step-local-iis-server-installation--hosting)
   - [Step 5.1: Install IIS & Prerequisites](#step-51-install-iis--prerequisites)
   - [Step 5.2: Install IIS URL Rewrite & ARR Modules](#step-52-install-iis-url-rewrite--arr-modules)
   - [Step 5.3: Build the Production Application](#step-53-build-the-production-application)
   - [Step 5.4: Deploy to IIS Physical Directory](#step-54-deploy-to-iis-physical-directory)
   - [Step 5.5: Configure IIS Site, Bindings & App Pool](#step-55-configure-iis-site-bindings--app-pool)
   - [Step 5.6: Folder Permissions (IUSR / IIS_IUSRS)](#step-56-folder-permissions-iusr--iis_iusrs)
   - [Step 5.7: Verify Web.config for SPA Routing](#step-57-verify-webconfig-for-spa-routing)
6. [Step-by-Step SQL Server HTTP Bridge Setup (Windows Service)](#6-step-by-step-sql-server-http-bridge-setup-windows-service)
   - [Step 6.1: Bridge Dependencies Installation](#step-61-bridge-dependencies-installation)
   - [Step 6.2: Test Bridge Connection](#step-62-test-bridge-connection)
   - [Step 6.3: Run as a Persistent Windows Service (via PM2 or NSSM)](#step-63-run-as-a-persistent-windows-service-via-pm2-or-nssm)
   - [Step 6.4: Connect from MediClinic ERP UI](#step-64-connect-from-mediclinic-erp-ui)
7. [Maintenance, Troubleshooting & Disaster Recovery](#7-maintenance-troubleshooting--disaster-recovery)

---

## 1. System Architecture & Overview

MediClinic Commerce ERP is built on an enterprise 3-tier architecture engineered for hospital clinics, specialized hair/skin treatment centers, and retail pharmacies:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (Browsers & PWA)                        │
│   • Desktop Chrome/Edge/Firefox       • iPad / Android Tablets  • Mobile PWA     │
│   • Barcode Scanning & Offline Cache  • Thermal Printer (58mm/80mm Raw Printing) │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTP (Port 80 / 443)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               WEB SERVER (IIS 10.0+)                             │
│   • Microsoft IIS with URL Rewrite 2.1 & Application Request Routing (ARR)       │
│   • Static SPA Bundle Hosting (HTML5 / React 19 / Vite / Tailwind CSS)           │
│   • Reverse Proxy: /api/*  ──>  http://localhost:5001/api/*                      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Local REST / WebSocket
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   LOCAL SQL SERVER HTTP BRIDGE (Node.js Service)                 │
│   • Runs on Port 5001 (via PM2 or Windows Service NSSM)                          │
│   • Native `mssql` Connection Pool with Connection Resiliency                    │
│   • Real-Time Schema Audit Triggers, Two-Way Sync Engine & Migrations            │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ TCP/IP Port 1433
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER (Microsoft SQL Server)                      │
│   • SQL Server 2016 / 2019 / 2022 (Express, Standard, or Developer)              │
│   • Database: MediClinic_ERP                                                     │
│   • 17 Relational Tables, Non-Destructive Migrations, Audit Event Logs           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Role-Based Access Control & Default Logins

The ERP provides strict Role-Based Access Control (RBAC). When the database is newly initialized, the following pre-configured user credentials are available:

| Role | Username | Full Name | Branch Access | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | Dr. Batra's Admin | ALL (Consolidated) | Full system access: Go-Live wizard, SQL Server Suite, DDL migrations, user management, pricing modes, global reports. |
| **Pharmacist** | `pharmacist` | Senior Pharmacist | Hospete (`LOC-HOS`) | Stock batch entry, opening stock import, inward purchases, expiry auditing, inventory valuation. |
| **Cashier** | `cashier` | Lead Billing Cashier | Hubballi (`LOC-HUB`) | POS billing counter, barcode scanning, customer management, thermal receipt reprint, return processing. |
| **Doctor** | `doctor` | Consulting Trichologist | Hospete (`LOC-HOS`) | Patient history, product catalog review, stock level verification. |

> **Security Note:** In production, access the **System Setup** menu to update passwords and enforce branch-specific restrictions.

---

## 3. End-to-End Application Workflow Guides

### Workflow 1: Clinic Branch Management & Multi-Location Context
- **Overview:** MediClinic Commerce ERP manages multiple clinical centers within a single database. The default branches are **Hospete (`LOC-HOS`)** and **Hubballi (`LOC-HUB`)**.
- **Execution:**
  1. The top header displays a **Branch Selector** dropdown.
  2. Administrators can switch between individual branches or choose **All Branches (Consolidated)** to analyze enterprise metrics.
  3. When an operator is logged in as a Cashier or Pharmacist, transactions (sales, stock deductions, batches) are automatically stamped with their assigned clinic `locationId`.

---

### Workflow 2: Product Master, Catalog & Pricing Engines
- **Menu Location:** `Products` ➔ `Product Master`
- **Steps:**
  1. **Add / Edit Products:** Register item details including Product Code/SKU, Brand, Category (Hair Care, Skin Care, Body Care, Clinical Treatments), HSN Code, and GST Rate (0%, 5%, 12%, 18%, 28%).
  2. **Dual-Pricing Architecture:** The system supports two distinct pricing models toggled under **Setup & Tools ➔ Pricing Modes**:
     - **Active Batch Price Mode (FEFO Priority):** POS charges the exact retail price recorded on the physical batch currently being sold.
     - **Master Catalog Price Mode:** POS overrides batch prices with the universal product master price while still deducting quantity from the earliest expiring batch.

---

### Workflow 3: Inventory Management & FEFO Batch Engine
- **Menu Location:** `Inventory` ➔ `Stock & Batches` | `Opening Stock` | `Movement Ledger`
- **Steps:**
  1. **Opening Stock Import (Excel):**
     - Navigate to `Inventory` ➔ `Opening Stock`.
     - Download the official `.xlsx` pre-formatted template.
     - Fill in Product Code, Batch Number, Expiry Date (`YYYY-MM-DD`), Purchase Date, Quantity, Cost Price, and Selling Price.
     - Upload the completed sheet. The validation engine checks for missing fields, invalid dates, and zero quantities before committing.
  2. **Purchase Inward:**
     - Navigate to `Procurement` ➔ `Purchase Inward`.
     - Log supplier delivery invoices, batch lot numbers, manufactured and expiry dates.
  3. **FEFO Allocation Engine (First-Expiry-First-Out):**
     - When products are billed or transferred, the database engine sorts available batches in ascending order of `ExpiryDate`.
     - Batches with the closest expiry date are depleted first, safeguarding patients and minimizing clinical stock waste.
  4. **Expiry Management & Urgent Alerts:**
     - Batches with less than 30 days before expiry automatically display an **Urgent** badge and appear in the Header Bell notification center.
  5. **Stock Movement Ledger:**
     - An immutable chronological log recording every unit addition, sale, return, and adjustment with timestamps and user audit references.

---

### Workflow 4: POS Counter Billing & Thermal Invoicing
- **Menu Location:** `POS & Sales` ➔ `POS Billing` (Shortcut: `F2` / `Alt+P`)
- **Steps:**
  1. **Customer Assignment:** Select an existing patient via phone number/name or click **+ Quick Add** to enter customer details.
  2. **Item Scanning / Selection:**
     - Scan product barcodes with a 1D/2D USB or Bluetooth barcode scanner, or search by product name/code in the search input.
     - The line item automatically allocates stock from the earliest valid batch according to FEFO rules.
  3. **Payment Tender Split:**
     - Choose payment method: **Cash**, **UPI** (QR code / dynamic settlement), **Card**, or a custom split (e.g., ₹500 Cash + ₹1,250 UPI).
  4. **Invoice Generation:**
     - Click **Complete Sale & Print**.
     - An invoice number is generated sequentially (e.g., `INV-HOS-2026-0042`).
     - A formatted 58mm / 80mm thermal receipt dialog opens with hospital GST details, itemized tax breakdowns, and payment confirmation.

---

### Workflow 5: Operations & Patient Home Delivery Pipeline
- **Menu Location:** `Operations` ➔ `Delivery Pipeline`
- **Steps:**
  1. Orders placed for home delivery appear under **Pending**.
  2. The pharmacist packs the items and advances the order to **Packed**.
  3. Upon handing to the logistics carrier, enter the **Courier Partner** (DTDC, Blue Dart, SpeedPost) and **AWB Tracking Number**, transitioning the order to **Shipped**.
  4. Once confirmed by the courier, mark the order as **Delivered**.

---

### Workflow 6: Online Patient Storefront
- **Menu Location:** `Online Store` ➔ `Storefront`
- **Steps:**
  1. Patients can access the responsive digital storefront at `/store` on desktop or mobile.
  2. Browse authorized Dr. Batra's clinical remedies, add items to the cart, and select **Clinic Pickup** or **Home Delivery**.
  3. Submitting an order transmits it straight into the clinic's **Operations Delivery Pipeline** for immediate packing.

---

### Workflow 7: Financial Reports & Clinical Stock Analytics
- **Menu Location:** `Reports` ➔ `Sales Reports` | `Inventory Valuation` | `Profit & Loss`
- **Reports Available:**
  1. **Daily Counter Sales:** Cash vs. UPI breakdowns, bill counts, and average bill size.
  2. **Inventory Valuation:** Total inventory evaluated simultaneously at Cost Price (actual investment) and Selling Price (realizable revenue).
  3. **Batch Expiry Risk Report:** Identifies near-expiry batches to facilitate promotional discounts or vendor returns.
  4. **Gross Margin Analysis:** Profit percentage per item category and branch.

---

### Workflow 8: Go-Live Setup, Reset & Database Snapshots
- **Menu Location:** `Setup & Tools` ➔ `System Reset / Go Live` | `Database Backup / Restore`
- **Steps:**
  1. **Pre-Launch Clearing:** Use the **System Reset Wizard** to purge demo sales while keeping the master catalog intact.
  2. **JSON Snapshots:** Export a single JSON file containing all products, batches, users, and settings for safe offline retention.
  3. **Restore Engine:** Upload any prior snapshot to restore the system state instantly.

---

## 4. Step-by-Step Microsoft SQL Server Installation & Setup

### Step 4.1: SQL Server Instance Installation
1. Download **Microsoft SQL Server** (2019, 2022, or Developer/Express edition) from [Microsoft's official portal](https://www.microsoft.com/en-us/sql-server/sql-server-downloads).
2. Run the installer and select **Custom** or **Basic** installation.
3. On the **Feature Selection** step, ensure **Database Engine Services** is checked.
4. On the **Instance Configuration** step:
   - Select **Default Instance** (`MSSQLSERVER`) or **Named Instance** (e.g., `SQLEXPRESS`).

---

### Step 4.2: Enable Mixed-Mode Authentication & Port 1433
1. On the **Database Engine Configuration** step during setup (or inside SSMS):
   - Choose **Mixed Mode (SQL Server authentication and Windows authentication)**.
   - Enter a secure password for the System Administrator account (`sa`).
2. Open **SQL Server Configuration Manager**:
   - Expand **SQL Server Network Configuration** ➔ **Protocols for MSSQLSERVER** (or your named instance).
   - Ensure **TCP/IP** is set to **Enabled**.
   - Right-click **TCP/IP** ➔ select **Properties** ➔ open the **IP Addresses** tab.
   - Scroll down to the **IPAll** section at the bottom:
     - Clear the **TCP Dynamic Ports** field (leave it blank).
     - Set **TCP Port** to `1433`.
   - Click **Apply** and **OK**.
3. In **SQL Server Configuration Manager**, click **SQL Server Services**:
   - Right-click **SQL Server (MSSQLSERVER)** ➔ click **Restart**.

---

### Step 4.3: Configure Windows Firewall
Run Windows PowerShell as **Administrator** and execute the following command to allow inbound SQL Server connections:

```powershell
New-NetFirewallRule -DisplayName "SQL Server (Port 1433)" -Direction Inbound -LocalPort 1433 -Protocol TCP -Action Allow
```

---

### Step 4.4: Create Database, User & Permissions (T-SQL Script)
Open **SQL Server Management Studio (SSMS)**, connect to your server, open a **New Query** window, and execute:

```sql
-- 1. Create MediClinic Database
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'MediClinic_ERP')
BEGIN
    CREATE DATABASE [MediClinic_ERP];
    PRINT 'Database [MediClinic_ERP] created successfully.';
END
GO

USE [MediClinic_ERP];
GO

-- 2. Create Dedicated SQL Login & User
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'mediclinic_user')
BEGIN
    CREATE LOGIN [mediclinic_user] WITH PASSWORD = N'MediClinic@2026!Secure', CHECK_POLICY = OFF;
    PRINT 'Login [mediclinic_user] created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'mediclinic_user')
BEGIN
    CREATE USER [mediclinic_user] FOR LOGIN [mediclinic_user];
    ALTER ROLE [db_owner] ADD MEMBER [mediclinic_user];
    PRINT 'User [mediclinic_user] granted db_owner role on [MediClinic_ERP].';
END
GO
```

---

### Step 4.5: Execute Production DDL Schema (17 Core Objects)
Open the MediClinic ERP application in your browser:
1. Navigate to **Setup & Tools** ➔ **Create SQL Database (DDL)**.
2. The UI automatically displays the complete, fully validated production T-SQL script containing all 17 tables, foreign keys, non-clustered indexes, and database audit triggers.
3. Click **Copy Full T-SQL DDL Script**.
4. In SSMS, paste and execute the script against `[MediClinic_ERP]`.

The script creates the following schema:
- `dbo.Branches`
- `dbo.Users`
- `dbo.Categories`
- `dbo.Brands`
- `dbo.Products`
- `dbo.StockBatches` (with FEFO indexing)
- `dbo.Customers`
- `dbo.SalesInvoices`
- `dbo.InvoiceItems`
- `dbo.StockMovements`
- `dbo.OnlineOrders`
- `dbo.OnlineOrderItems`
- `dbo.Suppliers`
- `dbo.PurchaseInwards`
- `dbo.PricingConfigurations`
- `dbo.DatabaseAuditLogs`
- `trg_DatabaseSchemaAudit` (DDL Audit Trigger)

---

## 5. Step-by-Step Local IIS Server Installation & Hosting

### Step 5.1: Install IIS & Prerequisites
1. Press `Win + R`, type `optionalfeatures`, and press **Enter**.
2. Expand **Internet Information Services**:
   - Check **Web Management Tools** (includes IIS Management Console).
   - Check **World Wide Web Services** ➔ **Common HTTP Features** (Default Document, Directory Browsing, HTTP Errors, Static Content).
   - Check **World Wide Web Services** ➔ **Performance Features** (Dynamic Content Compression, Static Content Compression).
   - Check **World Wide Web Services** ➔ **Application Development Features** (.NET Extensibility, ASP.NET, ISAPI Extensions, ISAPI Filters).
3. Click **OK** and allow Windows to complete the feature installation.

---

### Step 5.2: Install IIS URL Rewrite & ARR Modules
To ensure Single Page Application (SPA) client routes (e.g., `/pos`, `/inventory`, `/reports`) load cleanly without 404 errors, install these two official Microsoft extensions:
1. **URL Rewrite Module 2.1:** [Download from Microsoft IIS](https://www.iis.net/downloads/microsoft/url-rewrite).
2. **Application Request Routing (ARR) 3.0:** [Download from Microsoft IIS](https://www.iis.net/downloads/microsoft/application-request-routing).

After installation, open **IIS Manager** ➔ double-click **Application Request Routing** ➔ click **Server Proxy Settings** in the right-hand actions panel ➔ check **Enable proxy** ➔ click **Apply**.

---

### Step 5.3: Build the Production Application
On your development machine or server, run the build command inside the project directory:

```bash
# 1. Install dependencies
npm install

# 2. Build the production bundle
npm run build
```

The compiled, minified production assets will be placed in the `dist/` directory, including:
- `dist/index.html`
- `dist/assets/*.js` and `dist/assets/*.css`
- `dist/web.config` (automatically copied from `public/web.config`)
- PWA manifests and icons

---

### Step 5.4: Deploy to IIS Physical Directory
1. Create a production directory on your local machine or server:
   ```
   C:\inetpub\wwwroot\mediclinic
   ```
2. Copy the entire contents of the `dist/` folder into `C:\inetpub\wwwroot\mediclinic`.

---

### Step 5.5: Configure IIS Site, Bindings & App Pool
1. Open **IIS Manager** (`inetmgr`).
2. In the **Connections** panel, right-click **Sites** ➔ click **Add Website...**.
3. Enter site details:
   - **Site name:** `MediClinic ERP`
   - **Application pool:** Click **Select...** ➔ choose **No Managed Code** (since this serves static SPA assets and proxies API calls).
   - **Physical path:** `C:\inetpub\wwwroot\mediclinic`
   - **Binding:**
     - **Type:** `http`
     - **IP address:** `All Unassigned`
     - **Port:** `80` (or `8080` if port 80 is used by Default Web Site).
     - **Host name:** `mediclinic.local` (or leave blank for IP access).
4. Click **OK**.

---

### Step 5.6: Folder Permissions (IUSR / IIS_IUSRS)
Ensure the IIS worker process can read the web assets:
1. Open Windows File Explorer and navigate to `C:\inetpub\wwwroot`.
2. Right-click the `mediclinic` folder ➔ select **Properties** ➔ open the **Security** tab.
3. Click **Edit...** ➔ click **Add...**.
4. Type `IIS_IUSRS` and click **Check Names**, then click **OK**. Give **Read & execute**, **List folder contents**, and **Read** permissions.
5. Click **Add...** again, type `IUSR`, click **Check Names**, then click **OK**. Give **Read & execute** and **Read** permissions.
6. Click **Apply** and **OK**.

---

### Step 5.7: Verify Web.config for SPA Routing
The application includes a production-grade `web.config` in the root:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".webmanifest" />
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
      <remove fileExtension=".woff" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      <remove fileExtension=".svg" />
      <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
    </staticContent>

    <rewrite>
      <rules>
        <!-- Reverse Proxy /api to SQL Bridge on port 5001 -->
        <rule name="SQL Bridge Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:5001/api/{R:1}" />
        </rule>

        <!-- SPA client-side fallback to index.html -->
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>

    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

---

## 6. Step-by-Step SQL Server HTTP Bridge Setup (Windows Service)

The bridge script (`local-sql-bridge.js`) acts as a secure connector between the web frontend and Microsoft SQL Server.

### Step 6.1: Bridge Dependencies Installation
In your application directory on the server:

```powershell
# Install Node.js if not already installed (https://nodejs.org)
# Then install the bridge drivers:
npm install mssql express cors
```

---

### Step 6.2: Test Bridge Connection
Run the bridge directly in PowerShell to verify connectivity:

```powershell
# Set environment variables for your SQL Server credentials
$env:SQL_SERVER_HOST = "localhost"
$env:SQL_SERVER_PORT = "1433"
$env:SQL_SERVER_DB   = "MediClinic_ERP"
$env:SQL_SERVER_USER = "mediclinic_user"
$env:SQL_SERVER_PASSWORD = "MediClinic@2026!Secure"
$env:SQL_BRIDGE_PORT = "5001"

# Launch the bridge
node local-sql-bridge.js
```

You should see:
```text
================================================================
MediClinic ERP - Local Microsoft SQL Server HTTP Bridge
Listening on: http://localhost:5001
Health check: http://localhost:5001/api/health
================================================================
```

Open a browser and navigate to `http://localhost:5001/api/health`. You will receive a JSON response confirming:
```json
{
  "status": "HEALTHY",
  "connected": true,
  "database": "MediClinic_ERP"
}
```

---

### Step 6.3: Run as a Persistent Windows Service (via PM2 or NSSM)

#### Option A: Using PM2 (Recommended)
```powershell
npm install -g pm2 pm2-windows-service
pm2-service-install
pm2 start local-sql-bridge.js --name "mediclinic-sql-bridge"
pm2 save
```

#### Option B: Using NSSM (Non-Sucking Service Manager)
1. Download NSSM from [nssm.cc](https://nssm.cc).
2. Open PowerShell as Administrator and run:
   ```powershell
   nssm install MediClinicSqlBridge "C:\Program Files\nodejs\node.exe" "C:\inetpub\wwwroot\mediclinic\local-sql-bridge.js"
   nssm set MediClinicSqlBridge AppDirectory "C:\inetpub\wwwroot\mediclinic"
   nssm set MediClinicSqlBridge AppEnvironmentExtra SQL_SERVER_HOST=localhost SQL_SERVER_PORT=1433 SQL_SERVER_DB=MediClinic_ERP SQL_SERVER_USER=mediclinic_user SQL_SERVER_PASSWORD=MediClinic@2026!Secure SQL_BRIDGE_PORT=5001
   nssm start MediClinicSqlBridge
   ```

Now, the SQL bridge runs automatically as an independent background Windows service that restarts on system reboots.

---

### Step 6.4: Connect from MediClinic ERP UI
1. Open the ERP in your browser (e.g., `http://localhost:8080` or `http://localhost`).
2. Log in as an Administrator (`admin` / `admin123`).
3. Navigate to **Setup & Tools** ➔ **SQL Server & Cloud Suite**.
4. In the **Connect Local SQL Server** tab, verify the parameters:
   - **Bridge Host / Port:** `http://localhost:5001` (or leave as `/api` if using the IIS reverse proxy rule).
   - **Database Name:** `MediClinic_ERP`
   - **Username:** `mediclinic_user`
5. Click **Test & Establish Live Connection**.
6. The connection indicator will turn green with a pulsing status badge, indicating live synchronization.

---

### Step 6.5: Installing MediClinic ERP to Local Client Workstations (Windows PWA & Desktop Launcher)

Cashier counter PCs, pharmacy billing stations, and manager laptops can install MediClinic ERP as a standalone native Windows application in seconds:

#### Method A: 1-Click Windows Batch Installer (`Install-MediClinic-ERP.bat`)
1. Click the **Install PWA** button in the header or in **Setup & Tools ➔ PWA / Offline Sync**.
2. The browser automatically downloads **`Install-MediClinic-ERP.bat`**.
3. Double-click the downloaded file in your `Downloads` folder.
4. The script:
   - Registers a **Desktop Shortcut** (`%USERPROFILE%\Desktop\MediClinic Commerce ERP.lnk`).
   - Registers a **Windows Start Menu** entry.
   - Automatically launches Microsoft Edge or Google Chrome in dedicated application mode (`--app=http://localhost:8080`) with zero browser address bars or tab distractions.

#### Method B: Native Browser PWA Install (Microsoft Edge & Chrome)
1. Open the ERP website in Chrome or Microsoft Edge.
2. In the right side of the URL address bar, look for the **Install** icon (⤓ or ⊕).
3. Click **Install MediClinic Commerce ERP** and check **Pin to taskbar** and **Pin to Start**.
4. The application now runs with full offline caching and hardware printer/scanner acceleration.

---

## 7. Maintenance, Troubleshooting & Disaster Recovery

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **HTTP 404 on page refresh** | IIS URL Rewrite not installed or rules disabled. | Install URL Rewrite 2.1 and verify the `SPA Fallback` rule in `web.config`. |
| **SQL Connection Failed (Timeout / Connection Refused)** | TCP/IP port 1433 not enabled in SQL Server Configuration Manager. | Enable TCP/IP in SQL Server Configuration Manager under IPAll (Port 1433) and restart the SQL Server service. |
| **Login failed for user 'mediclinic_user'** | Mixed-mode authentication not enabled or incorrect password. | In SSMS, right-click the server instance ➔ Properties ➔ Security ➔ check "SQL Server and Windows Authentication mode", then restart the server. |
| **Thermal Printer Does Not Print** | Browser blocking raw printing dialogs. | Ensure browser pop-up permissions are granted for the clinic domain; use standard 58mm/80mm ESC/POS printer drivers. |
| **Bridge reports `Cannot find module 'mssql'`** | Node packages not installed locally. | In the folder containing `local-sql-bridge.js`, execute `npm install mssql express cors`. |
| **Disaster Recovery / Offline Operation** | Network loss to local SQL Server. | The ERP automatically transitions to its built-in offline engine (`localStorage` / IndexedDB). Once connectivity is restored, use **Store & Sync Data** to push all pending transactions. |
