; =====================================================================
; MediClinic Commerce ERP - Inno Setup Script
; Compiles MediClinic-ERP-Setup.exe (Standalone Windows Native Installer)
; =====================================================================

#define MyAppName "MediClinic Commerce ERP"
#define MyAppVersion "2.8.2"
#define MyAppPublisher "MediClinic Healthcare Systems"
#define MyAppURL "http://localhost/mediclinic"
#define MyAppExeName "MediClinic-ERP-Setup.bat"

[Setup]
AppId={{E15B4C24-B835-4D54-8B52-3298E9B61E63}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\MediClinic
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputBaseFilename=MediClinic-ERP-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "mediclinic-ui-build.zip"; DestDir: "{app}"; Flags: ignoreversion
Source: "MediClinic-ERP-Setup.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "MediClinic-ERP-Setup.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "local-sql-bridge.js"; DestDir: "{app}\SQLBridge"; Flags: ignoreversion
Source: "web.config"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch MediClinic Automated Deployment Pipeline"; Flags: postinstall runascurrentuser
