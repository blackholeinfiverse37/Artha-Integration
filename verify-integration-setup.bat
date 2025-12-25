@echo off
echo ========================================
echo    BHIV + ARTHA Integration Verification
echo ========================================
echo.

echo Checking service configurations...
echo.

echo 1. Checking ARTHA Backend configuration...
if exist "backend\.env" (
    echo ✅ Backend .env file exists
    findstr /C:"BHIV_INTEGRATION_ENABLED=true" backend\.env >nul
    if %errorlevel%==0 (
        echo ✅ BHIV integration enabled
    ) else (
        echo ❌ BHIV integration not enabled in .env
    )
) else (
    echo ❌ Backend .env file missing
)

echo.
echo 2. Checking BHIV Core directory...
if exist "v1-BHIV_CORE-main\simple_api.py" (
    echo ✅ BHIV Core found
) else (
    echo ❌ BHIV Core directory missing
)

echo.
echo 3. Checking BHIV Central Depository...
if exist "BHIV_Central_Depository-main\main.py" (
    echo ✅ BHIV Central found
) else (
    echo ❌ BHIV Central directory missing
)

echo.
echo 4. Checking Integration Bridge...
if exist "integration-bridge.js" (
    echo ✅ Integration Bridge found
) else (
    echo ❌ Integration Bridge missing
)

echo.
echo 5. Running quick health check...
python quick-health-check.py

echo.
echo ========================================
echo Verification complete!
echo.
echo To start the system:
echo   start-integrated-system.bat
echo.
echo To test integration:
echo   python test-bhiv-artha-integration.py
echo ========================================
pause