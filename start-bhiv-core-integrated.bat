@echo off
echo ========================================
echo  BHIV Core + ARTHA Integration Startup
echo ========================================
echo.

:: Set window title
title BHIV Core Integration Startup

:: Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

:: Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed
echo.

:: Navigate to BHIV Core directory
cd /d "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"

:: Check if virtual environment exists
if not exist ".venv" (
    echo 🔧 Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

:: Activate virtual environment
echo 🔧 Activating virtual environment...
call .venv\Scripts\activate.bat

:: Install/update dependencies
echo 📦 Installing BHIV Core dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

:: Kill any existing processes on BHIV ports
echo 🧹 Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8002') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8003') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8004') do taskkill /f /pid %%a >nul 2>&1

echo.
echo 🚀 Starting BHIV Core Services...
echo.

:: Start BHIV Simple API (Port 8001)
echo 📡 Starting BHIV Simple API on port 8001...
start "BHIV Simple API" cmd /k "cd /d \"c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main\" && .venv\Scripts\activate && python simple_api.py --port 8001"

:: Wait a moment for the first service to start
timeout /t 3 /nobreak >nul

:: Start BHIV MCP Bridge (Port 8002)
echo 🌉 Starting BHIV MCP Bridge on port 8002...
start "BHIV MCP Bridge" cmd /k "cd /d \"c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main\" && .venv\Scripts\activate && python mcp_bridge.py"

:: Wait a moment
timeout /t 3 /nobreak >nul

:: Start BHIV Web Interface (Port 8003)
echo 🌐 Starting BHIV Web Interface on port 8003...
start "BHIV Web Interface" cmd /k "cd /d \"c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main\" && .venv\Scripts\activate && python integration/web_interface.py"

:: Wait a moment
timeout /t 3 /nobreak >nul

:: Start Integration Bridge (Port 8004)
echo 🔗 Starting Integration Bridge on port 8004...
start "Integration Bridge" cmd /k "cd /d \"c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main\" && .venv\Scripts\activate && python integration_bridge.py"

echo.
echo ⏳ Waiting for services to initialize...
timeout /t 10 /nobreak >nul

echo.
echo 🎯 BHIV Core Services Status:
echo ================================
echo 📡 BHIV Simple API:     http://localhost:8001
echo 🌉 BHIV MCP Bridge:     http://localhost:8002  
echo 🌐 BHIV Web Interface:  http://localhost:8003
echo 🔗 Integration Bridge:  http://localhost:8004
echo.
echo 🔍 Health Check: http://localhost:8004/health
echo.

:: Check if ARTHA services are running
echo 🏢 Checking ARTHA Services...
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  ARTHA Backend not running on port 5000
    echo    Start it with: cd backend && npm run dev
) else (
    echo ✅ ARTHA Backend: http://localhost:5000
)

curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  ARTHA Frontend not running on port 5173
    echo    Start it with: cd frontend && npm run dev
) else (
    echo ✅ ARTHA Frontend: http://localhost:5173
)

echo.
echo 🎉 BHIV Core integration is now ready!
echo.
echo 📋 Next Steps:
echo 1. Open ARTHA Frontend: http://localhost:5173
echo 2. Login with: admin@artha.local / admin123
echo 3. Check Dashboard → BHIV AI Integration widget
echo 4. Click "Check Status" to verify connection
echo.
echo 💡 Troubleshooting:
echo - If services fail to start, check the individual windows for errors
echo - Ensure no antivirus is blocking Python processes
echo - Check Windows Firewall allows Python network access
echo.

pause