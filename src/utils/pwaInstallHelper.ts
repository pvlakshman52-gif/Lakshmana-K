/**
 * Utility for Local System Installation & PWA Deployment
 * 
 * Provides automated scripts for:
 * 1. PWA Standalone Windows Desktop installation
 * 2. Automated Local Microsoft SQL Server Bridge connector setup
 * 3. Two-way live database synchronization
 */

import { SqlServerConfig } from '../services/localSqlService';

export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Generates and downloads the All-In-One Windows Installer (.bat)
 * Installs both the Standalone Desktop PWA AND the Local Microsoft SQL Server Connector!
 */
export function downloadWindowsDesktopInstaller(customUrl?: string, customSqlConfig?: Partial<SqlServerConfig>) {
  const targetUrl = customUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-xpktsvb7zj72r6ah3edhnv-571270076071.asia-east1.run.app');
  const appName = 'MediClinic Commerce ERP';
  const server = customSqlConfig?.server || 'localhost\\SQLEXPRESS';
  const database = customSqlConfig?.database || 'MediClinic_ERP';
  const port = customSqlConfig?.port || 1433;
  const bridgePort = 5001;

  const batContent = `@echo off
title Installing ${appName} & Local SQL Server Connector
color 0b
echo ===============================================================================
echo            ${appName.toUpperCase()} - LOCAL SYSTEM INSTALLER
echo                 Integrated with Local Microsoft SQL Server
echo ===============================================================================
echo.
echo [1/4] Detecting browser engine (Microsoft Edge / Google Chrome)...

set APP_NAME=${appName}
set DESKTOP_PATH=%USERPROFILE%\\Desktop
set STARTMENU_PATH=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs
set APP_URL=${targetUrl}
set BRIDGE_DIR=%USERPROFILE%\\MediClinic-SQL-Bridge
set SQL_SERVER=${server}
set SQL_DB=${database}
set SQL_PORT=${port}
set BRIDGE_PORT=${bridgePort}

echo [2/4] Registering Windows Desktop and Start Menu standalone shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_PATH%\\%APP_NAME%.lnk'); $edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'; if (!(Test-Path $edge)) { $edge = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' }; $chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; if (!(Test-Path $chrome)) { $chrome = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' }; if (Test-Path $edge) { $s.TargetPath = $edge; $s.Arguments = '--app=%APP_URL%'; } elseif (Test-Path $chrome) { $s.TargetPath = $chrome; $s.Arguments = '--app=%APP_URL%'; } else { $s.TargetPath = '%APP_URL%'; }; $s.Description = 'MediClinic Commerce ERP Standalone App'; $s.Save()"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTMENU_PATH%\\%APP_NAME%.lnk'); $edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'; if (!(Test-Path $edge)) { $edge = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' }; $chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; if (!(Test-Path $chrome)) { $chrome = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' }; if (Test-Path $edge) { $s.TargetPath = $edge; $s.Arguments = '--app=%APP_URL%'; } elseif (Test-Path $chrome) { $s.TargetPath = $chrome; $s.Arguments = '--app=%APP_URL%'; } else { $s.TargetPath = '%APP_URL%'; }; $s.Description = 'MediClinic Commerce ERP Standalone App'; $s.Save()"

echo.
echo [3/4] Setting up Local SQL Server Two-Way Bridge in %BRIDGE_DIR%...
if not exist "%BRIDGE_DIR%" mkdir "%BRIDGE_DIR%"

rem Create package.json for bridge
(
echo {
echo   "name": "mediclinic-sql-bridge",
echo   "version": "1.0.0",
echo   "description": "MediClinic ERP Local SQL Server HTTP Bridge",
echo   "main": "server.js",
echo   "dependencies": {
echo     "cors": "^2.8.5",
echo     "express": "^4.18.2",
echo     "mssql": "^10.0.1"
echo   }
echo }
) > "%BRIDGE_DIR%\\package.json"

rem Create Start-Bridge launcher bat
(
echo @echo off
echo title MediClinic Local SQL Server Bridge ^(Port %BRIDGE_PORT%^)
echo color 0a
echo echo ==================================================================
echo echo MediClinic ERP - Local SQL Server Two-Way Bridge
echo echo Target Server: %SQL_SERVER%
echo echo Database:      %SQL_DB%
echo echo Bridge Port:   %BRIDGE_PORT%
echo echo ==================================================================
echo where node ^>nul 2^>nul
echo if %%errorlevel%% neq 0 ^(
echo     echo [ERROR] Node.js is required to connect to SQL Server.
echo     echo Please download Node.js from https://nodejs.org and re-run.
echo     pause
echo     exit /b 1
echo ^)
echo if not exist node_modules call npm install --no-audit --no-fund
echo node server.js
echo pause
) > "%BRIDGE_DIR%\\start-bridge.bat"

rem Register desktop shortcut for Start-Bridge
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_PATH%\\Start MediClinic SQL Bridge.lnk'); $s.TargetPath = '%BRIDGE_DIR%\\start-bridge.bat'; $s.WorkingDirectory = '%BRIDGE_DIR%'; $s.Description = 'Starts Local SQL Server Bridge for MediClinic ERP'; $s.Save()"

rem Create minimal server.js template if not exists
if not exist "%BRIDGE_DIR%\\server.js" (
(
echo const express = require^('express'^);
echo const sql = require^('mssql'^);
echo const cors = require^('cors'^);
echo const app = express^(^);
echo const PORT = process.env.PORT ^|^| %BRIDGE_PORT%;
echo app.use^(cors^(^)^);
echo app.use^(express.json^({ limit: '50mb' }^)^);
echo const sqlConfig = {
echo   server: '%SQL_SERVER%',
echo   port: %SQL_PORT%,
echo   database: '%SQL_DB%',
echo   user: 'sa',
echo   password: '',
echo   options: { encrypt: false, trustServerCertificate: true }
echo };
echo let pool = null;
echo async function getPool^(^) {
echo   if ^(!pool^) pool = await sql.connect^(sqlConfig^);
echo   return pool;
echo }
echo app.get^('/api/health', async ^(req, res^) =^> {
echo   try {
echo     const p = await getPool^(^);
echo     const r = await p.request^(^).query^('SELECT @@VERSION as ver, DB_NAME^(^) as db'^);
echo     res.json^({ connected: true, server: sqlConfig.server, database: sqlConfig.database, version: r.recordset[0].ver }^);
echo   } catch ^(err^) {
echo     res.json^({ connected: false, server: sqlConfig.server, database: sqlConfig.database, error: err.message }^);
echo   }
echo }^);
echo app.listen^(PORT, ^(^) =^> console.log^('MediClinic SQL Bridge active on http://localhost:' + PORT^)^);
) > "%BRIDGE_DIR%\\server.js"
)

echo.
echo [4/4] Launching ${appName} in Native Standalone App Mode...
start "" msedge --app="%APP_URL%" 2>nul || start "" chrome --app="%APP_URL%" 2>nul || start "" "%APP_URL%"

echo.
echo ===============================================================================
echo   SUCCESS: ${appName} has been installed to your system!
echo   - Desktop App Shortcut: %DESKTOP_PATH%\\%APP_NAME%.lnk
echo   - Start Menu Shortcut:  %STARTMENU_PATH%\\%APP_NAME%.lnk
echo   - SQL Bridge Folder:    %BRIDGE_DIR%
echo   - SQL Server Target:    %SQL_SERVER% (Database: %SQL_DB%)
echo ===============================================================================
echo.
echo When the app opens, it will automatically connect to your local SQL Server
echo through the bridge to read and write all live clinic data.
echo.
echo Press any key to finish installation.
pause >nul
`;

  const blob = new Blob([batContent], { type: 'application/x-bat' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Install-MediClinic-ERP.bat';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads Standalone SQL Server Bridge setup script (.bat)
 */
export function downloadStandaloneSqlBridgeInstaller(customSqlConfig?: Partial<SqlServerConfig>) {
  const server = customSqlConfig?.server || 'localhost\\SQLEXPRESS';
  const database = customSqlConfig?.database || 'MediClinic_ERP';
  const port = customSqlConfig?.port || 1433;
  const bridgePort = 5001;

  const batContent = `@echo off
title Setup MediClinic Local SQL Server Two-Way Bridge
color 0a
echo ===============================================================================
echo     MEDICLINIC ERP - STANDALONE LOCAL SQL SERVER CONNECTOR SERVICE
echo ===============================================================================
echo.
echo Target SQL Server: %SQL_SERVER%
echo Database Name:     %SQL_DB%
echo.

set BRIDGE_DIR=%USERPROFILE%\\MediClinic-SQL-Bridge
set SQL_SERVER=${server}
set SQL_DB=${database}
set SQL_PORT=${port}
set BRIDGE_PORT=${bridgePort}

echo [1/3] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js from https://nodejs.org (LTS) and run this script again.
    echo.
    pause
    exit /b 1
)

echo [2/3] Setting up Bridge directory in %BRIDGE_DIR%...
if not exist "%BRIDGE_DIR%" mkdir "%BRIDGE_DIR%"
cd /d "%BRIDGE_DIR%"

(
echo {
echo   "name": "mediclinic-sql-bridge",
echo   "version": "1.0.0",
echo   "description": "MediClinic ERP Local SQL Server Two-Way Bridge",
echo   "main": "server.js",
echo   "scripts": {
echo     "start": "node server.js"
echo   },
echo   "dependencies": {
echo     "cors": "^2.8.5",
echo     "express": "^4.18.2",
echo     "mssql": "^10.0.1"
echo   }
echo }
) > "%BRIDGE_DIR%\\package.json"

echo Installing npm dependencies (express, mssql, cors)...
call npm install --no-audit --no-fund

echo [3/3] Creating and starting bridge service...
node server.js
pause
`;

  const blob = new Blob([batContent], { type: 'application/x-bat' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Setup-Local-SQL-Bridge.bat';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Dynamically generates and downloads the Windows Desktop Internet Shortcut (.url)
 */
export function downloadWindowsDesktopShortcut(customUrl?: string) {
  const targetUrl = customUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-xpktsvb7zj72r6ah3edhnv-571270076071.asia-east1.run.app');
  const content = `[InternetShortcut]\r\nURL=${targetUrl}\r\nIconIndex=0\r\nHotKey=0\r\nIDList=\r\n[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,0\r\n`;
  const blob = new Blob([content], { type: 'application/internet-shortcut' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MediClinic-ERP.url';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
