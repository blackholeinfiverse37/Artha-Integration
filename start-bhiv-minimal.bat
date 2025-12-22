@echo off
echo ========================================
echo  BHIV Core Minimal - ARTHA Integration
echo ========================================
echo.

title BHIV Core Minimal Startup

echo 🎯 Starting minimal BHIV Core services for ARTHA integration...
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

echo ✅ Python found
echo.

:: Navigate to BHIV directory
cd /d "%~dp0v1-BHIV_CORE-main"

:: Create virtual environment if it doesn't exist
if not exist ".venv_minimal" (
    echo 🔧 Creating minimal virtual environment...
    python -m venv .venv_minimal
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
)

:: Activate virtual environment
echo 🔧 Activating virtual environment...
call .venv_minimal\Scripts\activate.bat

:: Install minimal dependencies
echo 📦 Installing minimal dependencies...
pip install -r requirements_minimal.txt --quiet
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

:: Kill existing processes
echo 🧹 Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8002') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8003') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8004') do taskkill /f /pid %%a >nul 2>&1

echo.
echo 🚀 Starting BHIV Core Minimal Services...
echo.

:: Start BHIV Simple API (Minimal)
echo 📡 Starting BHIV Simple API (Minimal) on port 8001...
start "BHIV Simple API" cmd /k "cd /d "%~dp0v1-BHIV_CORE-main" ^& .venv_minimal\Scripts\activate ^& python simple_api_minimal.py --port 8001"

:: Wait for Simple API to start
timeout /t 5 /nobreak >nul

:: Start BHIV MCP Bridge (Minimal)
echo 🌉 Starting BHIV MCP Bridge (Minimal) on port 8002...
start "BHIV MCP Bridge" cmd /k "cd /d "%~dp0v1-BHIV_CORE-main" ^& .venv_minimal\Scripts\activate ^& python mcp_bridge_minimal.py"

:: Wait for MCP Bridge to start
timeout /t 5 /nobreak >nul

:: Start BHIV Web Interface (Minimal)
echo 🌐 Starting BHIV Web Interface (Minimal) on port 8003...
start "BHIV Web Interface" cmd /k "cd /d "%~dp0v1-BHIV_CORE-main" ^& .venv_minimal\Scripts\activate ^& python web_interface_minimal.py"

:: Wait for Web Interface to start
timeout /t 5 /nobreak >nul

:: Start Integration Bridge (Minimal)
echo 🔗 Starting Integration Bridge (Minimal) on port 8004...
start "Integration Bridge" cmd /k "cd /d "%~dp0v1-BHIV_CORE-main" ^& .venv_minimal\Scripts\activate ^& python integration_bridge_minimal.py"

echo.
echo ⏳ Waiting for all services to initialize...
timeout /t 15 /nobreak >nul

echo.
echo 🎉 BHIV Core Minimal Services Started!
echo.
echo 🌐 Service URLs:
echo ================================
echo 📡 BHIV Simple API:     http://localhost:8001
echo 🌉 BHIV MCP Bridge:     http://localhost:8002  
echo 🌐 BHIV Web Interface:  http://localhost:8003
echo 🔗 Integration Bridge:  http://localhost:8004
echo.
echo 🔍 Health Checks:
echo • Simple API:      http://localhost:8001/health
echo • MCP Bridge:      http://localhost:8002/health
echo • Web Interface:   http://localhost:8003/health
echo • Integration:     http://localhost:8004/health
echo.

:: Test the services
echo 🧪 Testing services...
echo.

:: Test Simple API
curl -s http://localhost:8001/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Simple API: Not responding
) else (
    echo ✅ Simple API: Running
)

:: Test MCP Bridge
curl -s http://localhost:8002/health >nul 2>&1
if errorlevel 1 (
    echo ❌ MCP Bridge: Not responding
) else (
    echo ✅ MCP Bridge: Running
)

:: Test Web Interface
curl -s http://localhost:8003/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Web Interface: Not responding
) else (
    echo ✅ Web Interface: Running
)

:: Test Integration Bridge
curl -s http://localhost:8004/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Integration Bridge: Not responding
) else (
    echo ✅ Integration Bridge: Running
)

echo.
echo 🏢 ARTHA Integration Status:
echo ================================

:: Check ARTHA Backend
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  ARTHA Backend: Not running (start with: cd backend && npm run dev)
) else (
    echo ✅ ARTHA Backend: Running
)

:: Check ARTHA Frontend
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  ARTHA Frontend: Not running (start with: cd frontend && npm run dev)
) else (
    echo ✅ ARTHA Frontend: Running
)

echo.
echo 📋 Next Steps:
echo ================================
echo 1. Open ARTHA Frontend: http://localhost:5173
echo 2. Login: admin@artha.local / admin123
echo 3. Go to Dashboard → BHIV AI Integration
echo 4. Click "Check Status" - should show "Connected"
echo 5. Test AI: Ask "How to record depreciation expense?"
echo.
echo 🌐 BHIV Web Interface: http://localhost:8003
echo 📚 API Documentation: http://localhost:8001/docs
echo.

set /p open_web="Open BHIV Web Interface? (Y/N): "
if /i "%open_web%"=="Y" (
    start http://localhost:8003
)

set /p open_artha="Open ARTHA Frontend? (Y/N): "
if /i "%open_artha%"=="Y" (
    start http://localhost:5173
)

echo.
echo ✅ BHIV Core Minimal is now integrated with ARTHA!
echo.
echo 💡 If you see connection issues:
echo • Wait 30 seconds for services to fully start
echo • Check individual service windows for errors
echo • Ensure Windows Firewall allows Python
echo.

pause