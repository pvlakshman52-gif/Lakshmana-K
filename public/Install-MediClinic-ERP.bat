@echo off
title Installing MediClinic Commerce ERP
color 0b
echo ===============================================================================
echo            MEDICLINIC COMMERCE ERP - LOCAL SYSTEM INSTALLER
echo ===============================================================================
echo.
echo [1/3] Detecting browser engine (Microsoft Edge / Google Chrome)...

set APP_NAME=MediClinic Commerce ERP
set DESKTOP_PATH=%USERPROFILE%\Desktop
set STARTMENU_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs
set CURRENT_DIR=%~dp0

:: Detect current URL or fallback to production URL
set APP_URL=https://ais-pre-xpktsvb7zj72r6ah3edhnv-571270076071.asia-east1.run.app

echo [2/3] Creating Windows Desktop and Start Menu standalone shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_PATH%\%APP_NAME%.lnk'); $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'; if (!(Test-Path $edge)) { $edge = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' }; $chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'; if (!(Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' }; if (Test-Path $edge) { $s.TargetPath = $edge; $s.Arguments = '--app=%APP_URL%'; } elseif (Test-Path $chrome) { $s.TargetPath = $chrome; $s.Arguments = '--app=%APP_URL%'; } else { $s.TargetPath = '%APP_URL%'; }; $s.Description = 'MediClinic Commerce ERP Standalone App'; $s.Save()"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTMENU_PATH%\%APP_NAME%.lnk'); $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'; if (!(Test-Path $edge)) { $edge = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' }; $chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'; if (!(Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' }; if (Test-Path $edge) { $s.TargetPath = $edge; $s.Arguments = '--app=%APP_URL%'; } elseif (Test-Path $chrome) { $s.TargetPath = $chrome; $s.Arguments = '--app=%APP_URL%'; } else { $s.TargetPath = '%APP_URL%'; }; $s.Description = 'MediClinic Commerce ERP Standalone App'; $s.Save()"

echo [3/3] Launching MediClinic Commerce ERP in Native Standalone App Mode...
start "" msedge --app="%APP_URL%" 2>nul || start "" chrome --app="%APP_URL%" 2>nul || start "" "%APP_URL%"

echo.
echo ===============================================================================
echo   SUCCESS: MediClinic Commerce ERP has been installed to your system!
echo   - Desktop Shortcut: %DESKTOP_PATH%\%APP_NAME%.lnk
echo   - Start Menu: %STARTMENU_PATH%\%APP_NAME%.lnk
echo ===============================================================================
echo.
echo You can now launch MediClinic directly from your Desktop or Taskbar!
timeout /t 5
