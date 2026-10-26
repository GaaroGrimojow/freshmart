@echo off
:: Batch script to restart PostgreSQL service as Administrator and finalize FreshMart setup
echo ========================================================
echo  FreshMart PostgreSQL Quick Fix & Service Restarter
echo ========================================================
echo.
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges to restart PostgreSQL service...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [1/3] Restarting postgresql-x64-18 service...
net stop postgresql-x64-18
net start postgresql-x64-18

echo.
echo [2/3] Configuring password, creating database, and seeding products...
cd /d "%~dp0"
node scripts\reset-password-and-setup.js

echo.
echo [3/3] Restarting PostgreSQL with final secure configuration...
net stop postgresql-x64-18
net start postgresql-x64-18

echo.
echo ========================================================
echo  All done! PostgreSQL is fully connected to FreshMart.
echo  You can now refresh http://localhost:5000 in your browser!
echo ========================================================
pause
