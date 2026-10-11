@echo off
:: ==============================================================================
:: MediClinic Commerce ERP - Customer Automated Installer Launcher
:: Elevates to Administrator, verifies environment, and executes MediClinic-ERP-Setup.ps1
:: ==============================================================================
title MediClinic Commerce ERP - Installer Launcher
color 0b

echo ==============================================================================
echo            MEDICLINIC COMMERCE ERP - SYSTEM SETUP & DEPLOYMENT
echo ==============================================================================
echo.

:: 1. Check for Administrative Privileges and Elevate if Needed
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ELEVATING] Administrator privileges required for IIS and Windows Services.
    echo Requesting UAC elevation...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -Verb RunAs -ArgumentList '/k \"\"%~dp0MediClinic-ERP-Setup.bat\"\"'"
    exit /b
)

:: 2. Execute PowerShell Automated Setup Engine
echo [LAUNCHING] Starting automated dependency check and deployment pipeline...
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0MediClinic-ERP-Setup.ps1"

if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Setup encountered an issue. See log above for details.
    pause
)
