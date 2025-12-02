@echo off
title OrderPrep - Building for Production
color 0B

echo.
echo ========================================
echo    OrderPrep - Production Build
echo ========================================
echo.

cd /d "%~dp0"

echo [+] Building optimized production bundle...
echo.

call npm run build

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo.
    echo ========================================
    echo    BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo [+] Production files are in the 'dist' folder
    echo [+] Ready to deploy to any static hosting!
    echo.
    echo Would you like to preview the production build?
    echo.
    choice /C YN /M "Start preview server"
    if errorlevel 2 goto end
    if errorlevel 1 goto preview
) else (
    color 0C
    echo.
    echo [ERROR] Build failed! Check the errors above.
    echo.
)
goto end

:preview
echo.
echo [+] Starting preview server...
echo [+] Preview will be available at: http://localhost:4173
echo.
timeout /t 2 /nobreak >nul
start http://localhost:4173
call npm run preview

:end
echo.
pause
