@echo off
title ARTHA + BHIV Integrated System Startup
color 0A

echo ================================================================
echo   ARTHA + BHIV CORE - INTEGRATED SYSTEM STARTUP
echo ================================================================
echo.

:: Check if we're in the right directory
if not exist "v1-BHIV_CORE-main" (
    echo ERROR: Please run this script from the Artha Integration directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

:: Step 1: Clear any existing processes on BHIV ports
echo [1/7] Clearing existing processes on BHIV ports...
call clear-bhiv-ports.bat

:: Step 2: Install missing dependencies
echo [2/7] Installing missing BHIV dependencies...
cd "v1-BHIV_CORE-main"
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

:: Step 3: Start ARTHA Backend
echo [3/7] Starting ARTHA Backend...
start "ARTHA Backend" cmd /k "cd /d "%CD%\backend" && npm install && npm run dev"
timeout /t 5 >nul

:: Step 4: Start ARTHA Frontend
echo [4/7] Starting ARTHA Frontend...
start "ARTHA Frontend" cmd /k "cd /d "%CD%\frontend" && npm install && npm run dev"
timeout /t 3 >nul

:: Step 5: Start BHIV Simple API
echo [5/7] Starting BHIV Simple API...
start "BHIV Simple API" cmd /k "cd /d "%CD%\v1-BHIV_CORE-main" && .venv\Scripts\activate && python simple_api.py --port 8001"
timeout /t 3 >nul

:: Step 6: Start BHIV MCP Bridge
echo [6/7] Starting BHIV MCP Bridge...
start "BHIV MCP Bridge" cmd /k "cd /d "%CD%\v1-BHIV_CORE-main" && .venv\Scripts\activate && python mcp_bridge.py"
timeout /t 3 >nul

:: Step 7: Start Integration Bridge
echo [7/7] Starting Integration Bridge...
start "Integration Bridge" cmd /k "cd /d "%CD%\v1-BHIV_CORE-main" && .venv\Scripts\activate && python integration_bridge.py"

echo.
echo ================================================================
echo   ALL SERVICES STARTED SUCCESSFULLY!
echo ================================================================
echo.
echo Access URLs:
echo   ARTHA Frontend:     http://localhost:5173
echo   ARTHA Backend:      http://localhost:5000
echo   BHIV Simple API:    http://localhost:8001
echo   BHIV MCP Bridge:    http://localhost:8002
echo   Integration Bridge: http://localhost:8004
echo.
echo Default Login:
echo   Email: admin@artha.local
echo   Password: admin123
echo.
echo Press any key to open the main application...
pause >nul
start http://localhost:5173