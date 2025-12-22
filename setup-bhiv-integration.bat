@echo off
echo ========================================
echo  BHIV Core Integration - One Click Fix
echo ========================================
echo.

title BHIV Core Integration Setup

echo 🎯 This script will:
echo    1. Start all BHIV Core services
echo    2. Verify ARTHA integration
echo    3. Test AI functionality
echo    4. Provide access URLs
echo.

set /p confirm="Continue? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo 🚀 Starting BHIV Core integration...
echo.

:: Step 1: Start BHIV services
echo 📡 Starting BHIV Core services...
call "c:\Users\Ashmit Pandey\Desktop\Artha Integration\start-bhiv-core-integrated.bat"

:: Wait for services to stabilize
echo.
echo ⏳ Waiting for services to stabilize...
timeout /t 20 /nobreak >nul

:: Step 2: Run health check
echo.
echo 🔍 Running integration health check...
cd /d "c:\Users\Ashmit Pandey\Desktop\Artha Integration"
python check-bhiv-integration.py

:: Step 3: Run comprehensive test
echo.
echo 🧪 Running comprehensive integration test...
python test-bhiv-artha-integration.py

echo.
echo ========================================
echo  🎉 BHIV Core Integration Complete!
echo ========================================
echo.
echo 🌐 Access Points:
echo ├─ ARTHA Frontend:     http://localhost:5173
echo ├─ ARTHA Backend:      http://localhost:5000
echo ├─ BHIV Simple API:    http://localhost:8001
echo ├─ BHIV MCP Bridge:    http://localhost:8002
echo ├─ BHIV Web Interface: http://localhost:8003
echo └─ Integration Bridge: http://localhost:8004
echo.
echo 🔑 Login Credentials:
echo ├─ Email:    admin@artha.local
echo └─ Password: admin123
echo.
echo 💡 Quick Start:
echo 1. Open: http://localhost:5173
echo 2. Login with credentials above
echo 3. Go to Dashboard
echo 4. Find "BHIV AI Integration" widget
echo 5. Click "Check Status" - should show "Connected"
echo 6. Ask AI: "How to record depreciation expense?"
echo.
echo 🛠️  If issues occur:
echo ├─ Run: fix-bhiv-connection.bat
echo ├─ Check individual service windows for errors
echo └─ Ensure Windows Firewall allows Python
echo.

:: Open ARTHA in browser
set /p open_browser="Open ARTHA in browser? (Y/N): "
if /i "%open_browser%"=="Y" (
    start http://localhost:5173
)

echo.
echo ✅ Setup complete! Your BHIV Core AI is now integrated with ARTHA.
echo.
pause