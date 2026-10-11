@echo off
title MediClinic ERP - Local UI Static Server
color 0b
echo ===============================================================================
echo          MEDICLINIC COMMERCE ERP - LOCAL UI WEB SERVER
echo ===============================================================================
echo.
echo Launching local HTTP web server for this production build folder...
echo.

rem 1. Check if Node.js npx serve is available
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo [Using Node.js npx serve] Hosting on port 3000...
    start "" http://localhost:3000
    npx -y serve -s . -l 3000
    goto end
)

rem 2. Check if Python 3 is available
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [Using Python 3 http.server] Hosting on port 8080...
    start "" http://localhost:8080
    python -m http.server 8080
    goto end
)

rem 3. Fallback: Launch index.html directly in default browser
echo [No local HTTP server found] Launching index.html directly...
start "" index.html

:end
pause
