@echo off
echo ========================================
echo    ARTHA + BHIV Network Startup
echo ========================================
echo.

echo Configuring services for network access...

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :found_ip
    )
)
:found_ip

echo Local IP Address: %LOCAL_IP%
echo.

echo Step 1: Starting BHIV Core (Network Mode)...
echo ----------------------------------------
start "BHIV Core API" cmd /k "cd v1-BHIV_CORE-main && python simple_api.py --host 0.0.0.0 --port 8001"
timeout /t 5

echo.
echo Step 2: Starting BHIV Central Depository (Network Mode)...
echo ----------------------------------------
cd "BHIV_Central_Depository-main"
set FASTAPI_HOST=0.0.0.0
start "BHIV Central" cmd /k "python main.py"
timeout /t 7
cd ..

echo.
echo Step 3: Starting Integration Bridge (Network Mode)...
echo ----------------------------------------
set INTEGRATION_BRIDGE_HOST=0.0.0.0
start "Integration Bridge" cmd /k "node integration-bridge.js"
timeout /t 5

echo.
echo Step 4: Starting ARTHA Backend (Network Mode)...
echo ----------------------------------------
cd backend
set HOST=0.0.0.0
start "ARTHA Backend" cmd /k "npm run dev"
timeout /t 7
cd ..

echo.
echo Step 5: Starting ARTHA Frontend (Network Mode)...
echo ----------------------------------------
cd frontend
set VITE_NETWORK_MODE=true
start "ARTHA Frontend" cmd /k "npm run dev"
cd ..

echo.
echo Waiting for services to initialize...
timeout /t 10

echo.
echo ========================================
echo    Network Services Started!
echo ========================================
echo.
echo 🌐 Network Access URLs:
echo ├─ ARTHA Frontend:           http://%LOCAL_IP%:5173
echo ├─ ARTHA Backend:            http://%LOCAL_IP%:5000
echo ├─ BHIV Central Depository:  http://%LOCAL_IP%:8000
echo ├─ BHIV Core API:            http://%LOCAL_IP%:8001
echo └─ Integration Bridge:       http://%LOCAL_IP%:8004
echo.
echo 🏠 Local Access URLs:
echo ├─ ARTHA Frontend:           http://localhost:5173
echo ├─ ARTHA Backend:            http://localhost:5000
echo ├─ BHIV Central Depository:  http://localhost:8000
echo ├─ BHIV Core API:            http://localhost:8001
echo └─ Integration Bridge:       http://localhost:8004
echo.
echo 📱 Mobile/Network Access:
echo Replace %LOCAL_IP% with your actual IP address
echo Example: http://192.168.1.100:5173
echo.
echo 🔐 Login Credentials:
echo ├─ Admin: admin@artha.local / Admin@123456
echo ├─ Accountant: accountant@artha.local / Accountant@123
echo └─ Viewer: user@example.com / testuser123
echo.
echo Press any key to run integration test...
pause
python test-bhiv-artha-integration.py