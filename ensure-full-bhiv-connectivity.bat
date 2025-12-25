@echo off
echo ========================================
echo    Ensure Full BHIV Connectivity
echo ========================================
echo.

echo Checking and starting all required BHIV services...
echo.

echo Step 1: Check current service status...
echo ----------------------------------------
python quick-health-check.py

echo.
echo Step 2: Start BHIV Core (if not running)...
echo ----------------------------------------
curl -s -m 3 http://localhost:8001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo BHIV Core not running, starting...
    cd "v1-BHIV_CORE-main"
    start "BHIV Core API" cmd /k "python simple_api_minimal.py --port 8001"
    cd ..
    timeout /t 3
    echo ✅ BHIV Core started
) else (
    echo ✅ BHIV Core already running
)

echo.
echo Step 3: Start BHIV Central (if not running)...
echo ----------------------------------------
curl -s -m 3 http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo BHIV Central not running, starting...
    cd "BHIV_Central_Depository-main"
    start "BHIV Central" cmd /k "python main.py"
    cd ..
    timeout /t 5
    echo ✅ BHIV Central started
) else (
    echo ✅ BHIV Central already running
)

echo.
echo Step 4: Verify Integration Bridge...
echo ----------------------------------------
curl -s -m 3 http://localhost:8004/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Integration Bridge not running, starting...
    start "Integration Bridge" cmd /k "node integration-bridge.js"
    timeout /t 3
    echo ✅ Integration Bridge started
) else (
    echo ✅ Integration Bridge already running
)

echo.
echo Step 5: Wait for services to initialize...
echo ----------------------------------------
echo Waiting 10 seconds for all services to be ready...
timeout /t 10

echo.
echo Step 6: Test full connectivity...
echo ----------------------------------------
echo Testing BHIV service integration...
curl -s http://localhost:8004/health | python -m json.tool

echo.
echo Step 7: Test ARTHA-BHIV integration...
echo ----------------------------------------
echo Checking ARTHA Backend BHIV status...
curl -s http://localhost:5000/api/v1/bhiv/status | python -m json.tool

echo.
echo ========================================
echo Full BHIV Connectivity Check Complete!
echo ========================================
echo.
echo Expected result: BHIV should show "Connected" status
echo.
echo Next steps:
echo 1. Refresh ARTHA Frontend (F5)
echo 2. Check BHIV Integration widget
echo 3. Test AI guidance functionality
echo.
pause