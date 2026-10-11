<#
===================================================================================
 MediClinic ERP - SQL Bridge Windows Service Repair & Maintenance Engine
 Re-registers, repairs, and verifies the MediClinicSqlBridge Windows Service
===================================================================================
 Description:
   Idempotently reconfigures or installs the MediClinicSqlBridge Windows Service.
   Uses the native C# ServiceBase wrapper binary (MediClinicSqlBridge.exe)
   - Never runs a .bat directly with sc.exe (prevents SCM Error 1053)
   - Configures automatic startup (boot) and failure auto-recovery (10s/20s/60s)
   - Sets log directory to C:\ProgramData\MediClinic\Logs
   - Verifies sc query MediClinicSqlBridge and http://localhost:5001/api/health
   - Reports success only when service is running and health returns valid JSON
===================================================================================
#>

[CmdletBinding()]
param(
    [string]$BridgeServicePath = "C:\Program Files\MediClinic\SQLBridge",
    [string]$LogDir = "C:\ProgramData\MediClinic\Logs",
    [string]$BridgePort = "5001",
    [string]$SqlServerHost = "",
    [string]$DatabaseName = "MediClinic_ERP"
)

# Elevate to Administrator if needed
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges to manage MediClinic Windows Service..." -ForegroundColor Yellow
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit 0
}

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  MEDICLINIC ERP - SQL BRIDGE WINDOWS SERVICE REPAIR & REINSTALL" -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Cyan

# 1. Ensure Directories exist
New-Item -ItemType Directory -Path $BridgeServicePath -Force | Out-Null
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

# 2. Stop Service if running
$serviceName = "MediClinicSqlBridge"
$displayName = "MediClinic ERP SQL Bridge"
$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($svc) {
    Write-Host "[1/5] Stopping existing service '$serviceName'..." -ForegroundColor Yellow
    try {
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    } catch {}
}

# 3. Resolve Node.js path
$nodeExePath = ""
$nodeCmdLookup = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCmdLookup) { $nodeExePath = $nodeCmdLookup.Source }
if (-not $nodeExePath -or -not (Test-Path $nodeExePath)) {
    if (Test-Path "C:\Program Files\nodejs\node.exe") { $nodeExePath = "C:\Program Files\nodejs\node.exe" }
    elseif (Test-Path "C:\Program Files (x86)\nodejs\node.exe") { $nodeExePath = "C:\Program Files (x86)\nodejs\node.exe" }
    else { $nodeExePath = "node.exe" }
}

# 4. Resolve SQL Server Host if not provided
if (-not $SqlServerHost) {
    $envFile = "$BridgeServicePath\.env"
    if (Test-Path $envFile) {
        $envLines = Get-Content $envFile
        foreach ($line in $envLines) {
            if ($line -match "^SQL_SERVER_HOST=(.*)") {
                $SqlServerHost = $Matches[1].Trim()
            }
        }
    }
    if (-not $SqlServerHost) {
        $SqlServerHost = "localhost\SQLEXPRESS"
    }
}

# 5. Compile or verify native wrapper executable (MediClinicSqlBridge.exe)
Write-Host "[2/5] Verifying native Windows Service wrapper binary (MediClinicSqlBridge.exe)..." -ForegroundColor Yellow
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
            SafeAppend(_logFile, string.Format("[{0:s}] [SERVICE] Starting Node.js bridge on port $BridgePort...\r\n", DateTime.Now));

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
            psi.EnvironmentVariables["SQL_SERVER_HOST"] = "$SqlServerHost";
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
            SafeAppend(_logFile, string.Format("[{0:s}] [SERVICE] Node.js bridge process started with PID {1}.\r\n", DateTime.Now, _childProcess.Id));
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
        Write-Host "  [OK] Compiled native Service wrapper: $wrapperExe" -ForegroundColor Green
        $compiled = $true
    }
}

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
            Write-Host "  [OK] Compiled wrapper using CSharpCodeProvider." -ForegroundColor Green
            $compiled = $true
        }
    } catch {}
}

# 6. Idempotent SCM Registration & Auto-Recovery Configuration
Write-Host "[3/5] Configuring Windows Service Control Manager (SCM)..." -ForegroundColor Yellow
if ($svc) {
    & sc.exe config $serviceName binPath= "`"$wrapperExe`"" start= auto DisplayName= "$displayName" | Out-Null
    Write-Host "  [OK] Updated service configuration." -ForegroundColor Green
} else {
    & sc.exe create $serviceName binPath= "`"$wrapperExe`"" start= auto DisplayName= "$displayName" | Out-Null
    Write-Host "  [OK] Created service '$serviceName' (Automatic startup)." -ForegroundColor Green
}

& sc.exe description $serviceName "MediClinic Commerce ERP persistent local Microsoft SQL Server synchronization bridge service running on port $BridgePort" | Out-Null
& sc.exe failure $serviceName reset= 86400 actions= restart/10000/restart/20000/restart/60000 | Out-Null
Write-Host "  [OK] Configured auto-recovery: Restart service automatically on failure." -ForegroundColor Green

# 7. Start Service
Write-Host "[4/5] Starting Windows Service '$serviceName'..." -ForegroundColor Yellow
& sc.exe start $serviceName | Out-Null
Start-Sleep -Seconds 3

# 8. Verify Service via sc query and HTTP Health Endpoint
Write-Host "[5/5] Verifying Service & Port $BridgePort Health..." -ForegroundColor Yellow
$scQuery = & sc.exe query $serviceName
$isServiceRunning = $scQuery -match "STATE\s+:\s+4\s+RUNNING"

if ($isServiceRunning) {
    Write-Host "  [OK] Windows Service '$serviceName' is verified RUNNING." -ForegroundColor Green
} else {
    Write-Host "  [WARN] Windows Service query output:" -ForegroundColor Yellow
    Write-Host ($scQuery -join "`n") -ForegroundColor Gray
}

# Health endpoint probe
$isHealthy = $false
$maxAttempts = 5

for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
        $healthRes = Invoke-WebRequest -Uri "http://localhost:$BridgePort/api/health" -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
        if ($healthRes.StatusCode -eq 200) {
            $ct = $healthRes.Headers["Content-Type"]
            if ($ct -and $ct -match "text/html") {
                Write-Host "  [WARN] Endpoint returned HTML instead of JSON." -ForegroundColor Yellow
            } else {
                $data = $healthRes.Content | ConvertFrom-Json
                if ($data.connected -eq $true) {
                    $isHealthy = $true
                    Write-Host ""
                    Write-Host "===============================================================================" -ForegroundColor Green
                    Write-Host "  [SUCCESS] Service is RUNNING and verified healthy!" -ForegroundColor Green
                    Write-Host "  Target SQL Server: $($data.server)" -ForegroundColor Cyan
                    Write-Host "  Database Catalog:  $($data.database)" -ForegroundColor Cyan
                    Write-Host "  Bridge Health URL: http://localhost:$BridgePort/api/health" -ForegroundColor White
                    Write-Host "  Log Directory:     $LogDir" -ForegroundColor White
                    Write-Host "===============================================================================" -ForegroundColor Green
                    break
                }
            }
        }
    } catch {
        Write-Host "  Waiting for service health response (attempt $i of $maxAttempts)..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $isHealthy -or -not $isServiceRunning) {
    Write-Host ""
    Write-Host "===============================================================================" -ForegroundColor Red
    Write-Host "  [WARNING] Service repair verification incomplete." -ForegroundColor Red
    Write-Host "  Windows Service Running: $isServiceRunning" -ForegroundColor Yellow
    Write-Host "  Health Endpoint Healthy: $isHealthy" -ForegroundColor Yellow
    if (Test-Path "$LogDir\bridge-error.log") {
        Write-Host "  Recent errors from $LogDir\bridge-error.log:" -ForegroundColor Yellow
        Get-Content -Path "$LogDir\bridge-error.log" -Tail 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
    Write-Host "===============================================================================" -ForegroundColor Red
}
