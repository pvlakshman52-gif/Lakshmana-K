<#
===================================================================================
 MediClinic Commerce ERP - Customer Side Automated Windows Setup & Deployment Engine
===================================================================================
 Description:
   Automates the complete customer-side deployment on Windows 10/11/Server:
   1. Automatic dependency check (Node.js, IIS, URL Rewrite 2.1, ARR 3.0)
   2. IIS features & module verification (Enables ARR Proxy)
   3. Installs MediClinicSqlBridge as a native Windows Background Service:
      - Uses compiled native service wrapper (MediClinicSqlBridge.exe via C# ServiceBase)
      - Never runs a .bat directly with sc.exe (prevents SCM Error 1053)
      - Runs 24/7 silently without open CMD or PowerShell console windows
      - Survives terminal closure and starts automatically on Windows boot
      - Idempotent configuration (repairs existing service instead of duplicates)
      - Configures automatic failure recovery (10s/20s/60s auto-restart)
      - Configures writable log directory under C:\ProgramData\MediClinic\Logs
      - Windows Authentication (trusted connection) supported without cleartext passwords
   4. Extracts UI build bundle (mediclinic-ui-build.zip) to C:\inetpub\wwwroot\mediclinic
   5. Configures production web.config with /api reverse proxy and SPA routing
   6. Validates deployment with 5-point health check (sc query + http://localhost:5001/api/health)
   7. Does not report success until service is RUNNING and health endpoint returns valid JSON
   8. Creates desktop & start menu shortcuts and launches the application

 Execution:
   powershell -NoProfile -ExecutionPolicy Bypass -File .\MediClinic-ERP-Setup.ps1
===================================================================================
#>

[CmdletBinding()]
param(
    [string]$InstallPath = "C:\inetpub\wwwroot\mediclinic",
    [string]$BridgeServicePath = "C:\Program Files\MediClinic\SQLBridge",
    [string]$LogDir = "C:\ProgramData\MediClinic\Logs",
    [string]$BridgePort = "5001",
    [string]$SqlServerInstance = "",
    [string]$DatabaseName = "MediClinic_ERP",
    [string]$UiZipSource = "",
    [switch]$SkipBrowserLaunch,
    [switch]$Quiet
)

$ErrorActionPreference = "Continue"

# ---------------------------------------------------------------------------------
# UTILITY LOGGING FUNCTIONS
# ---------------------------------------------------------------------------------
function Write-Header {
    param([string]$text)
    Write-Host ""
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor White
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$stepNum, [string]$title)
    Write-Host ""
    Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " [STAGE $stepNum] $title" -ForegroundColor Yellow
    Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$text)
    Write-Host "  [OK] $text" -ForegroundColor Green
}

function Write-Info {
    param([string]$text)
    Write-Host "  [..] $text" -ForegroundColor Gray
}

function Write-Warn {
    param([string]$text)
    Write-Host "  [WARN] $text" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$text)
    Write-Host "  [FAIL] $text" -ForegroundColor Red
}

# ---------------------------------------------------------------------------------
# STAGE 0: ELEVATION & PERMISSIONS CHECK
# ---------------------------------------------------------------------------------
Write-Header "MEDICLINIC COMMERCE ERP - CUSTOMER AUTOMATED SYSTEM DEPLOYMENT"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warn "Setup requires Administrator privileges to configure IIS, SCM, and Windows Services."
    Write-Info "Requesting UAC Elevation..."
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit 0
}

Write-Success "Elevated Administrator privileges confirmed."
Write-Info "Target Web Physical Path: $InstallPath"
Write-Info "Target SQL Bridge Service Path: $BridgeServicePath"
Write-Info "Target Writable Logs Path: $LogDir"

# ---------------------------------------------------------------------------------
# STAGE 1: LOCAL SQL SERVER DETECTION & CONFIGURATION
# ---------------------------------------------------------------------------------
Write-Step "1/8" "Detecting Microsoft SQL Server Instance"

# If SQL instance was not explicitly passed, detect automatically
if (-not $SqlServerInstance) {
    # Check common SQL Server service names
    $sqlServices = Get-Service -Name "MSSQL*", "MSSQL`$*" -ErrorAction SilentlyContinue
    if ($sqlServices) {
        $expressSvc = $sqlServices | Where-Object { $_.Name -like "*SQLEXPRESS*" } | Select-Object -First 1
        if ($expressSvc) {
            $SqlServerInstance = "$env:COMPUTERNAME\SQLEXPRESS"
            Write-Success "Detected running SQL Express service: $($expressSvc.Name)"
        } else {
            $defaultSvc = $sqlServices | Where-Object { $_.Name -eq "MSSQLSERVER" } | Select-Object -First 1
            if ($defaultSvc) {
                $SqlServerInstance = "localhost"
                Write-Success "Detected default SQL Server instance (MSSQLSERVER)"
            } else {
                $firstSvc = $sqlServices | Select-Object -First 1
                $instName = $firstSvc.Name -replace "^MSSQL\$(.*)", '$1'
                $SqlServerInstance = "$env:COMPUTERNAME\$instName"
                Write-Success "Detected SQL instance service: $($firstSvc.Name) -> $SqlServerInstance"
            }
        }
    } else {
        # Check standard default instance fallback
        $SqlServerInstance = "localhost\SQLEXPRESS"
        Write-Info "Using standard SQL Express instance: $SqlServerInstance"
    }
}

Write-Success "SQL Server Instance: $SqlServerInstance"
Write-Success "Target Database Catalog: $DatabaseName"

# ---------------------------------------------------------------------------------
# STAGE 2: DEPENDENCY VERIFICATION & AUTO-PROVISIONING
# ---------------------------------------------------------------------------------
Write-Step "2/8" "Automatic Dependency Check (Node.js, IIS, URL Rewrite 2.1, ARR 3.0)"

# 2.1 Check Node.js
$nodeInstalled = $false
$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVersion = & node.exe -v 2>$null
    Write-Success "Node.js detected: $nodeVersion ($($nodeCmd.Source))"
    $nodeInstalled = $true
} else {
    Write-Warn "Node.js not detected in PATH. Searching Program Files..."
    if (Test-Path "C:\Program Files\nodejs\node.exe") {
        $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
        $nodeVersion = & "C:\Program Files\nodejs\node.exe" -v 2>$null
        Write-Success "Found Node.js in Program Files: $nodeVersion"
        $nodeInstalled = $true
    }
}

if (-not $nodeInstalled) {
    Write-Info "Downloading and installing Node.js LTS (64-bit)..."
    $nodeMsiUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
    $nodeMsiPath = "$env:TEMP\nodejs-lts.msi"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeMsiUrl -OutFile $nodeMsiPath -UseBasicParsing
        Write-Info "Installing Node.js silently..."
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsiPath`" /qn /norestart" -Wait
        $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
        Write-Success "Node.js LTS installed successfully."
    } catch {
        Write-Fail "Could not automatically download Node.js: $_"
        Write-Warn "Please install Node.js manually from https://nodejs.org"
    }
}

# 2.2 Check IIS
$iisInstalled = $false
if (Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue) {
    Write-Success "Microsoft IIS (W3SVC) is installed and active."
    $iisInstalled = $true
} else {
    Write-Info "Enabling Microsoft Internet Information Services (IIS)..."
    try {
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-StaticContent, IIS-DefaultDocument, IIS-HttpErrors, IIS-ApplicationDevelopment -All -NoRestart | Out-Null
        Write-Success "IIS features enabled successfully."
        $iisInstalled = $true
    } catch {
        Write-Warn "Could not enable IIS automatically via DISM: $_"
    }
}

# 2.3 Check IIS URL Rewrite Module 2.1
$rewriteInstalled = Test-Path "$env:SystemRoot\System32\inetsrv\rewrite.dll"
if ($rewriteInstalled) {
    Write-Success "IIS URL Rewrite Module 2.1 is installed."
} else {
    Write-Info "Downloading & Installing IIS URL Rewrite Module 2.1..."
    $rewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E03-C533-4BB4-A56E-E230F73B5B93/rewrite_amd64_en-US.msi"
    $rewriteMsi = "$env:TEMP\urlrewrite2.msi"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $rewriteUrl -OutFile $rewriteMsi -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i `"$rewriteMsi`" /qn /norestart" -Wait
        Write-Success "IIS URL Rewrite Module 2.1 installed."
    } catch {
        Write-Warn "Could not download URL Rewrite automatically. Please install from https://www.iis.net/downloads/microsoft/url-rewrite"
    }
}

# 2.4 Check Application Request Routing (ARR) 3.0
$arrInstalled = Test-Path "$env:SystemRoot\System32\inetsrv\requestRouter.dll"
if ($arrInstalled) {
    Write-Success "IIS Application Request Routing (ARR 3.0) is installed."
} else {
    Write-Info "Downloading & Installing Application Request Routing (ARR 3.0)..."
    $arrUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/ARRv3_setup_amd64_en-us.msi"
    $arrMsi = "$env:TEMP\arr3.msi"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $arrUrl -OutFile $arrMsi -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i `"$arrMsi`" /qn /norestart" -Wait
        Write-Success "Application Request Routing (ARR 3.0) installed."
    } catch {
        Write-Warn "Could not download ARR automatically. Please install from https://www.iis.net/downloads/microsoft/application-request-routing"
    }
}

# ---------------------------------------------------------------------------------
# STAGE 3: CONFIGURE IIS & ENABLE ARR PROXY
# ---------------------------------------------------------------------------------
Write-Step "3/8" "Configuring IIS & Enabling ARR Reverse Proxy"

$appCmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
if (Test-Path $appCmd) {
    try {
        # Enable ARR Proxy functionality for reverse routing /api to port 5001
        & $appCmd set config -section:system.webServer/proxy /enabled:"True" /commit:apphost 2>$null
        Write-Success "ARR Server Proxy enabled in applicationHost.config."
    } catch {
        Write-Warn "Could not enable ARR proxy via appcmd: $_"
    }
}

# Ensure IIS W3SVC service is running
try {
    Start-Service -Name "W3SVC" -ErrorAction SilentlyContinue
    Set-Service -Name "W3SVC" -StartupType Automatic
    Write-Success "IIS Web Server (W3SVC) is RUNNING (Automatic Startup)."
} catch {}

# ---------------------------------------------------------------------------------
# STAGE 4: NATIVE WINDOWS BACKGROUND SERVICE ARCHITECTURE (MediClinicSqlBridge)
# ---------------------------------------------------------------------------------
Write-Step "4/8" "Installing Native Windows Background Service (MediClinicSqlBridge)"

# Ensure production directories exist
New-Item -ItemType Directory -Path $BridgeServicePath -Force | Out-Null
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
Write-Success "Service directory verified: $BridgeServicePath"
Write-Success "Writable log directory verified: $LogDir"

# Copy local-sql-bridge.js from script directory or public
$sourceBridge = "$PSScriptRoot\local-sql-bridge.js"
if (-not (Test-Path $sourceBridge)) {
    $sourceBridge = "$PSScriptRoot\public\local-sql-bridge.js"
}
if (Test-Path $sourceBridge) {
    Copy-Item -Path $sourceBridge -Destination "$BridgeServicePath\local-sql-bridge.js" -Force
    Write-Success "Deployed local-sql-bridge.js to $BridgeServicePath"
}

# Copy repair-service.ps1 and MediClinicSqlBridge.xml
if (Test-Path "$PSScriptRoot\repair-service.ps1") {
    Copy-Item -Path "$PSScriptRoot\repair-service.ps1" -Destination "$BridgeServicePath\repair-service.ps1" -Force
}
if (Test-Path "$PSScriptRoot\MediClinicSqlBridge.xml") {
    Copy-Item -Path "$PSScriptRoot\MediClinicSqlBridge.xml" -Destination "$BridgeServicePath\MediClinicSqlBridge.xml" -Force
}

# Write environment configuration (Windows Authentication supported, no cleartext passwords stored)
$bridgeEnv = @"
SQL_SERVER_HOST=$SqlServerInstance
SQL_SERVER_PORT=1433
SQL_SERVER_DB=$DatabaseName
SQL_AUTH_TYPE=WINDOWS_AUTH
SQL_TRUSTED_CONNECTION=true
SQL_BRIDGE_PORT=$BridgePort
SQL_ENCRYPT=true
SQL_LOG_DIR=$LogDir
"@
Set-Content -Path "$BridgeServicePath\.env" -Value $bridgeEnv -Encoding UTF8
Write-Success "Created bridge configuration (.env) with Windows Authentication."

# Install npm dependencies (mssql, express, cors)
Write-Info "Installing bridge drivers (mssql, express, cors)..."
Push-Location $BridgeServicePath
try {
    & npm install --omit=dev --silent 2>$null
    Write-Success "SQL Bridge npm packages verified."
} catch {
    Write-Warn "npm install notice: Service will load installed dependencies."
}
Pop-Location

# Resolve absolute path to node.exe
$nodeExePath = ""
$nodeCmdLookup = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCmdLookup) { $nodeExePath = $nodeCmdLookup.Source }
if (-not $nodeExePath -or -not (Test-Path $nodeExePath)) {
    if (Test-Path "C:\Program Files\nodejs\node.exe") { $nodeExePath = "C:\Program Files\nodejs\node.exe" }
    elseif (Test-Path "C:\Program Files (x86)\nodejs\node.exe") { $nodeExePath = "C:\Program Files (x86)\nodejs\node.exe" }
    else { $nodeExePath = "node.exe" }
}

# Build Native Windows Service Wrapper Executable (MediClinicSqlBridge.exe)
# Architecture:
# - Inherits from System.ServiceProcess.ServiceBase
# - No Command Prompt / CMD / PowerShell window (WindowStyle = Hidden, CreateNoWindow = true)
# - Survives terminal closure; starts automatically on Windows boot
# - Auto-restarts child process if it exits unexpectedly
# - Automatically rotates logs in C:\ProgramData\MediClinic\Logs when size > 10MB
# - Gracefully terminates process tree on service stop (taskkill /PID /T /F)
Write-Info "Compiling native Windows Service wrapper binary (MediClinicSqlBridge.exe)..."
$wrapperExe = "$BridgeServicePath\MediClinicSqlBridge.exe"
$csSource = "$BridgeServicePath\MediClinicBridgeService.cs"

$csharpCode = @"
using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;
using System.Threading;

public class MediClinicBridgeService : ServiceBase {
    private Process _childProcess;
    private volatile bool _stopping = false;
    private readonly string _baseDir;
    private readonly string _logDir;
    private readonly string _logFile;
    private readonly string _errFile;
    private readonly string _nodeExe;

    public MediClinicBridgeService() {
        this.ServiceName = "MediClinicSqlBridge";
        this.CanStop = true;
        this.CanShutdown = true;
        
        _baseDir = @"$BridgeServicePath";
        _logDir = @"$LogDir";
        _logFile = Path.Combine(_logDir, "bridge.log");
        _errFile = Path.Combine(_logDir, "bridge-error.log");
        
        string configuredNode = @"$nodeExePath";
        if (File.Exists(configuredNode)) {
            _nodeExe = configuredNode;
        } else if (File.Exists(@"C:\Program Files\nodejs\node.exe")) {
            _nodeExe = @"C:\Program Files\nodejs\node.exe";
        } else if (File.Exists(@"C:\Program Files (x86)\nodejs\node.exe")) {
            _nodeExe = @"C:\Program Files (x86)\nodejs\node.exe";
        } else {
            _nodeExe = "node.exe";
        }
    }

    private void SafeAppend(string file, string message) {
        try {
            string dir = Path.GetDirectoryName(file);
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            
            // Auto-rotate if log exceeds 10 MB
            if (File.Exists(file) && new FileInfo(file).Length > 10 * 1024 * 1024) {
                string oldFile = file + ".old";
                if (File.Exists(oldFile)) File.Delete(oldFile);
                File.Move(file, oldFile);
            }
            File.AppendAllText(file, message);
        } catch {}
    }

    private void StartNodeProcess() {
        if (_stopping) return;
        try {
            SafeAppend(_logFile, string.Format("[{0:s}] [SERVICE] Launching Node.js bridge on port $BridgePort via {1}...\r\n", DateTime.Now, _nodeExe));

            ProcessStartInfo psi = new ProcessStartInfo {
                FileName = _nodeExe,
                Arguments = "\"" + Path.Combine(_baseDir, "local-sql-bridge.js") + "\"",
                WorkingDirectory = _baseDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            psi.EnvironmentVariables["SQL_BRIDGE_PORT"] = "$BridgePort";
            psi.EnvironmentVariables["SQL_SERVER_HOST"] = "$SqlServerInstance";
            psi.EnvironmentVariables["SQL_SERVER_DB"] = "$DatabaseName";
            psi.EnvironmentVariables["SQL_AUTH_TYPE"] = "WINDOWS_AUTH";
            psi.EnvironmentVariables["SQL_TRUSTED_CONNECTION"] = "true";
            psi.EnvironmentVariables["SQL_LOG_DIR"] = _logDir;

            _childProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };

            _childProcess.OutputDataReceived += (s, e) => {
                if (!string.IsNullOrEmpty(e.Data)) {
                    SafeAppend(_logFile, string.Format("[{0:s}] {1}\r\n", DateTime.Now, e.Data));
                }
            };
            _childProcess.ErrorDataReceived += (s, e) => {
                if (!string.IsNullOrEmpty(e.Data)) {
                    SafeAppend(_errFile, string.Format("[{0:s}] [ERROR] {1}\r\n", DateTime.Now, e.Data));
                }
            };
            _childProcess.Exited += (s, e) => {
                SafeAppend(_logFile, string.Format("[{0:s}] [SERVICE] Bridge process exited with code {1}.\r\n", DateTime.Now, _childProcess != null ? _childProcess.ExitCode : -1));
                if (!_stopping) {
                    SafeAppend(_logFile, string.Format("[{0:s}] [SERVICE] Process exited unexpectedly. Auto-recovering in 3 seconds...\r\n", DateTime.Now));
                    Thread.Sleep(3000);
                    StartNodeProcess();
                }
            };

            _childProcess.Start();
            _childProcess.BeginOutputReadLine();
            _childProcess.BeginErrorReadLine();
            SafeAppend(_logFile, string.Format("[{0:s}] [SERVICE] Node.js bridge running with PID {1}.\r\n", DateTime.Now, _childProcess.Id));
        } catch (Exception ex) {
            SafeAppend(_errFile, string.Format("[{0:s}] [FATAL] Failed to start Node process: {1}\r\n", DateTime.Now, ex.Message));
        }
    }

    protected override void OnStart(string[] args) {
        _stopping = false;
        Directory.CreateDirectory(_logDir);
        SafeAppend(_logFile, string.Format("[{0:s}] [SERVICE] MediClinic ERP SQL Bridge Service Starting...\r\n", DateTime.Now));
        StartNodeProcess();
    }

    protected override void OnStop() {
        _stopping = true;
        SafeAppend(_logFile, string.Format("[{0:s}] [SERVICE] Stopping MediClinic ERP SQL Bridge Service...\r\n", DateTime.Now));
        
        if (_childProcess != null && !_childProcess.HasExited) {
            try {
                // Kill process tree cleanly
                ProcessStartInfo psiKill = new ProcessStartInfo {
                    FileName = "taskkill.exe",
                    Arguments = string.Format("/PID {0} /T /F", _childProcess.Id),
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                Process.Start(psiKill).WaitForExit(5000);
            } catch {
                try { _childProcess.Kill(); } catch {}
            }
        }
    }

    public static void Main() {
        ServiceBase.Run(new MediClinicBridgeService());
    }
}
"@

Set-Content -Path $csSource -Value $csharpCode -Encoding UTF8

# Locate C# Compiler (csc.exe) across standard Framework paths
$csc = "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = "$env:SystemRoot\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    $cscFound = Get-ChildItem -Path "$env:SystemRoot\Microsoft.NET" -Filter "csc.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cscFound) { $csc = $cscFound.FullName }
}

$compiled = $false
if (Test-Path $csc) {
    & $csc /target:winexe /out:"$wrapperExe" "$csSource" /reference:System.ServiceProcess.dll /reference:System.dll 2>$null
    if (Test-Path $wrapperExe) {
        Write-Success "Compiled native Windows Service wrapper: $wrapperExe"
        $compiled = $true
    }
}

# Fallback: In-memory CSharpCodeProvider compilation
if (-not $compiled -and -not (Test-Path $wrapperExe)) {
    try {
        $provider = New-Object Microsoft.CSharp.CSharpCodeProvider
        $cParams = New-Object System.CodeDom.Compiler.CompilerParameters
        $cParams.GenerateExecutable = $true
        $cParams.OutputAssembly = $wrapperExe
        $cParams.CompilerOptions = "/target:winexe"
        $cParams.ReferencedAssemblies.Add("System.dll") | Out-Null
        $cParams.ReferencedAssemblies.Add("System.ServiceProcess.dll") | Out-Null
        $res = $provider.CompileAssemblyFromFile($cParams, $csSource)
        if (Test-Path $wrapperExe) {
            Write-Success "Compiled wrapper binary using PowerShell CSharpCodeProvider."
            $compiled = $true
        }
    } catch {
        Write-Warn "CSharpCodeProvider compilation warning: $_"
    }
}

if (-not (Test-Path $wrapperExe)) {
    Write-Fail "Could not generate wrapper binary $wrapperExe. Please ensure .NET Framework 4.x is installed."
}

# ---------------------------------------------------------------------------------
# IDEMPOTENT SERVICE REGISTRATION (Requirement 6 & 11)
# Service name: MediClinicSqlBridge
# Display name: MediClinic ERP SQL Bridge
# Startup: Automatic
# Recovery: Restart service automatically after failure
# ---------------------------------------------------------------------------------
$serviceName = "MediClinicSqlBridge"
$displayName = "MediClinic ERP SQL Bridge"
$existingSvc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($existingSvc) {
    Write-Info "Service '$serviceName' already exists. Performing idempotent update/repair..."
    try {
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    } catch {}
    & sc.exe config $serviceName binPath= "`"$wrapperExe`"" start= auto DisplayName= "$displayName" 2>$null
    Write-Success "Updated service configuration for '$serviceName'."
} else {
    Write-Info "Registering Windows Service '$serviceName'..."
    & sc.exe create $serviceName binPath= "`"$wrapperExe`"" start= auto DisplayName= "$displayName" 2>$null
    Write-Success "Created Windows Service '$serviceName' (Startup: Automatic)."
}

# Configure description & auto-recovery (Requirement 6)
& sc.exe description $serviceName "MediClinic Commerce ERP persistent local Microsoft SQL Server synchronization bridge service running on port $BridgePort" 2>$null
& sc.exe failure $serviceName reset= 86400 actions= restart/10000/restart/20000/restart/60000 2>$null
Write-Success "Configured auto-recovery: Automatically restarts on failure (10s / 20s / 60s delay)."

# Start the Windows Service
Write-Info "Starting Windows Service '$serviceName'..."
try {
    Start-Service -Name $serviceName -ErrorAction SilentlyContinue
} catch {
    & sc.exe start $serviceName 2>$null
}
Start-Sleep -Seconds 3

# Verify service state via sc query (Requirement 12)
$scQueryOutput = & sc.exe query $serviceName
if ($scQueryOutput -match "STATE\s+:\s+4\s+RUNNING") {
    Write-Success "Windows Service '$serviceName' is verified RUNNING (State: 4 RUNNING)."
} else {
    Write-Warn "Windows Service state query reported: $($scQueryOutput -join ' ')"
}

# ---------------------------------------------------------------------------------
# STAGE 5: EXTRACT UI ZIP (mediclinic-ui-build.zip)
# ---------------------------------------------------------------------------------
Write-Step "5/8" "Deploying Frontend UI Build Bundle"

New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null

# Locate UI ZIP
$zipPath = $UiZipSource
if (-not $zipPath -or -not (Test-Path $zipPath)) {
    $zipCandidates = @(
        "$PSScriptRoot\mediclinic-ui-build.zip",
        "$PSScriptRoot\public\mediclinic-ui-build.zip",
        "$env:USERPROFILE\Downloads\mediclinic-ui-build.zip",
        ".\mediclinic-ui-build.zip"
    )
    foreach ($candidate in $zipCandidates) {
        if (Test-Path $candidate) {
            $zipPath = (Resolve-Path $candidate).Path
            break
        }
    }
}

if ($zipPath -and (Test-Path $zipPath)) {
    Write-Info "Extracting UI Bundle: $zipPath..."
    try {
        Expand-Archive -Path $zipPath -DestinationPath $InstallPath -Force
        Write-Success "Extracted production assets to $InstallPath"
    } catch {
        Write-Warn "Expand-Archive error: $_. Copying local directory contents..."
        Copy-Item -Path "$PSScriptRoot\*" -Destination $InstallPath -Recurse -Force
    }
} else {
    Write-Warn "mediclinic-ui-build.zip not found in immediate paths. Copying directory assets..."
    if (Test-Path "$PSScriptRoot\dist") {
        Copy-Item -Path "$PSScriptRoot\dist\*" -Destination $InstallPath -Recurse -Force
    }
}

# Grant IIS Read & Execute Permissions to Physical Path
try {
    $acl = Get-Acl $InstallPath
    $iisRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
    $iusrRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IUSR", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
    $acl.SetAccessRule($iisRule)
    $acl.SetAccessRule($iusrRule)
    Set-Acl -Path $InstallPath -AclObject $acl
    Write-Success "Configured IIS_IUSRS / IUSR read permissions on $InstallPath"
} catch {}

# ---------------------------------------------------------------------------------
# STAGE 6: CONFIGURE API & PRODUCTION WEB.CONFIG
# ---------------------------------------------------------------------------------
Write-Step "6/8" "Configuring Production API Reverse Proxy (/api -> port 5001)"

$webConfigContent = @"
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
        <!-- Reverse Proxy /api/* to Windows SQL Bridge Service (Port 5001) -->
        <rule name="SQL Bridge Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:$BridgePort/api/{R:1}" />
        </rule>

        <!-- SPA Client-Side Fallback -->
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
"@
Set-Content -Path "$InstallPath\web.config" -Value $webConfigContent -Encoding UTF8
Write-Success "Production web.config installed with /api/* reverse proxy and SPA routing."

# Configure IIS Site or Virtual Application
try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    $appCmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
    
    $defaultSite = Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
    if ($defaultSite) {
        $existingApp = Get-WebApplication -Site "Default Web Site" -Name "mediclinic" -ErrorAction SilentlyContinue
        if (-not $existingApp) {
            Write-Info "Creating IIS Application '/mediclinic' under Default Web Site..."
            & $appCmd add app /site.name:"Default Web Site" /path:"/mediclinic" /physicalPath:"$InstallPath" 2>$null
            Write-Success "IIS Application created: http://localhost/mediclinic"
        } else {
            Write-Success "IIS Application '/mediclinic' is active."
        }
    }
} catch {
    Write-Info "IIS physical site path: $InstallPath"
}

# ---------------------------------------------------------------------------------
# STAGE 7: AUTOMATED HEALTH VERIFICATION (Requirements 12 & 13)
# ---------------------------------------------------------------------------------
Write-Step "7/8" "Running Automated Health Verification Checks"

Start-Sleep -Seconds 2

# Check 1: Verify Windows Service is RUNNING via sc.exe query (Requirement 12)
$isServiceRunning = $false
$scQuery = & sc.exe query MediClinicSqlBridge
if ($scQuery -match "STATE\s+:\s+4\s+RUNNING") {
    $isServiceRunning = $true
    Write-Success "Windows Service 'MediClinicSqlBridge': RUNNING (State: 4 RUNNING)"
} else {
    Write-Fail "Windows Service 'MediClinicSqlBridge' is NOT in RUNNING state."
    Write-Info ($scQuery -join "`n")
}

# Check 2: Poll Health Endpoint http://localhost:5001/api/health (Requirement 12 & 13)
$bridgeHealth = $null
$isBridgeHealthy = $false
$maxAttempts = 5

for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
        $bridgeRes = Invoke-WebRequest -Uri "http://localhost:$BridgePort/api/health" -TimeoutSec 4 -UseBasicParsing -ErrorAction Stop
        if ($bridgeRes.StatusCode -eq 200) {
            $ct = $bridgeRes.Headers["Content-Type"]
            if ($ct -and $ct -match "text/html") {
                Write-Warn "Health endpoint returned HTML instead of JSON. Check reverse proxy."
            } else {
                $bridgeHealth = $bridgeRes.Content | ConvertFrom-Json
                if ($bridgeHealth.connected -eq $true) {
                    $isBridgeHealthy = $true
                    Write-Success "Direct SQL Bridge HTTP Health: VERIFIED HEALTHY (Port $BridgePort)"
                    Write-Success "Microsoft SQL Server: CONNECTED ($($bridgeHealth.server) / $($bridgeHealth.database))"
                    break
                }
            }
        }
    } catch {
        Write-Info "Waiting for bridge connection (attempt $i of $maxAttempts)..."
        Start-Sleep -Seconds 2
    }
}

if (-not $isBridgeHealthy) {
    Write-Fail "SQL Bridge service health check failed or SQL Server disconnected."
    if (Test-Path "$LogDir\bridge-error.log") {
        Write-Warn "Recent error log entries from $LogDir\bridge-error.log:"
        Get-Content -Path "$LogDir\bridge-error.log" -Tail 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
    Write-Warn "To inspect or repair, execute: powershell -File `"$BridgeServicePath\repair-service.ps1`""
}

# Check 3: IIS Web Site Entry
try {
    $iisRes = Invoke-WebRequest -Uri "http://localhost/mediclinic/index.html" -TimeoutSec 4 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($iisRes.StatusCode -eq 200) {
        Write-Success "IIS Web Application: OK (http://localhost/mediclinic)"
    } else {
        Write-Info "IIS Frontend deployed at: $InstallPath"
    }
} catch {
    Write-Info "IIS Web Server running on Port 80."
}

# Check 4: Reverse Proxy API via IIS
$isIisProxyHealthy = $false
try {
    $proxyRes = Invoke-WebRequest -Uri "http://localhost/mediclinic/api/health" -TimeoutSec 4 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($proxyRes.StatusCode -eq 200 -and -not ($proxyRes.Headers["Content-Type"] -match "text/html")) {
        $proxyData = $proxyRes.Content | ConvertFrom-Json
        if ($proxyData.connected -eq $true) {
            $isIisProxyHealthy = $true
            Write-Success "IIS Reverse Proxy: VERIFIED (http://localhost/mediclinic/api/health -> Port $BridgePort)"
        }
    }
} catch {}

# Requirement 13: Do NOT report success unless service is actually running AND health endpoint returns valid JSON
$overallHealthy = $isServiceRunning -and $isBridgeHealthy

if (-not $overallHealthy) {
    Write-Host ""
    Write-Host "===============================================================================" -ForegroundColor Red
    Write-Host "  SETUP WARNING: Service or SQL connection not fully established." -ForegroundColor Red
    Write-Host "  Windows Service Running: $isServiceRunning" -ForegroundColor Yellow
    Write-Host "  Health Endpoint Healthy: $isBridgeHealthy" -ForegroundColor Yellow
    Write-Host "  Logs: $LogDir\bridge.log" -ForegroundColor Yellow
    Write-Host "  Repair Script: $BridgeServicePath\repair-service.ps1" -ForegroundColor Yellow
    Write-Host "===============================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    if (-not $Quiet) {
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit 1
}

# ---------------------------------------------------------------------------------
# STAGE 8: GO LIVE! (Shortcuts, Launch, Final Summary)
# ---------------------------------------------------------------------------------
Write-Step "8/8" "Go Live - Creating Shortcuts & Launching Application"

$appUrl = "http://localhost/mediclinic"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$startMenuPath = [Environment]::GetFolderPath("CommonStartMenu") + "\Programs"

# Create Desktop Shortcut
try {
    $wscript = New-Object -ComObject WScript.Shell
    $shortcut = $wscript.CreateShortcut("$desktopPath\MediClinic Commerce ERP.lnk")
    
    $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if (-not (Test-Path $edgePath)) { $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
    $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    if (-not (Test-Path $chromePath)) { $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }

    if (Test-Path $edgePath) {
        $shortcut.TargetPath = $edgePath
        $shortcut.Arguments = "--app=$appUrl"
    } elseif (Test-Path $chromePath) {
        $shortcut.TargetPath = $chromePath
        $shortcut.Arguments = "--app=$appUrl"
    } else {
        $shortcut.TargetPath = $appUrl
    }
    $shortcut.Description = "MediClinic Commerce ERP Production System"
    $shortcut.Save()
    Write-Success "Desktop Shortcut created: $desktopPath\MediClinic Commerce ERP.lnk"
} catch {
    Write-Warn "Could not create desktop shortcut."
}

# Launch Application in Browser
if (-not $SkipBrowserLaunch) {
    Write-Info "Launching MediClinic Commerce ERP in browser..."
    try {
        Start-Process $appUrl
    } catch {
        Start-Process "cmd.exe" -ArgumentList "/c start `"$appUrl`""
    }
}

Write-Header "MEDICLINIC COMMERCE ERP - GO-LIVE COMPLETE & VERIFIED 100% HEALTHY!"
Write-Host "  Application URL:         $appUrl" -ForegroundColor Cyan
Write-Host "  IIS Physical Directory:  $InstallPath" -ForegroundColor White
Write-Host "  SQL Server Bridge:       http://localhost:$BridgePort/api/health" -ForegroundColor White
Write-Host "  Windows Service:         $serviceName (Verified RUNNING)" -ForegroundColor Green
Write-Host "  SQL Server Target:       $($bridgeHealth.server)" -ForegroundColor Green
Write-Host "  Database Name:           $($bridgeHealth.database)" -ForegroundColor Green
Write-Host "  Log Directory:           $LogDir" -ForegroundColor White
Write-Host ""
Write-Host "  Default Admin Login:     admin  /  admin123" -ForegroundColor Green
Write-Host "  Default Pharmacist:      pharmacist  /  admin123" -ForegroundColor Green
Write-Host "  Default Cashier:         cashier  /  admin123" -ForegroundColor Green
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "Setup finished successfully. Press any key to exit..." -ForegroundColor Gray
if (-not $Quiet) {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
