@echo off
title OrderPrep - Starting...
color 0A

echo.
echo ========================================
echo    OrderPrep - Food Business Manager
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [+] Node.js detected:
node --version
echo.

REM Navigate to app directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [!] Dependencies not found. Installing...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo [+] Dependencies installed successfully!
    echo.
) else (
    echo [+] Dependencies found.
    echo.
)

echo ========================================
echo    Starting OrderPrep Development Server
echo ========================================
echo.
echo [+] Server will start on: http://localhost:3000
echo [+] Press Ctrl+C to stop the server
echo.

REM Wait 2 seconds before opening browser
timeout /t 2 /nobreak >nul

REM Open browser automatically
start http://localhost:3000

REM Start the dev server
call npm run dev

REM If server stops, pause to see any errors
pause
