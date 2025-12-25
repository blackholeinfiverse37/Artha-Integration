@echo off
echo ========================================
echo    Fix Services Based on 8004 Response
echo ========================================
echo.

echo Analyzing the issues from port 8004 response:
echo - ARTHA Backend: HTTP 404 error
echo - BHIV Core: Timeout (5000ms exceeded)
echo - BHIV Central: Healthy ✅
echo.

echo Step 1: Fixing ARTHA Backend (404 error)...
echo ----------------------------------------
echo Stopping any existing ARTHA Backend processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ARTHA Backend*" 2>nul

echo Starting ARTHA Backend with correct health endpoint...
cd backend
start "ARTHA Backend" cmd /k "npm run dev"
echo ✅ ARTHA Backend restarted
cd ..

echo.
echo Step 2: Fixing BHIV Core (timeout issue)...
echo ----------------------------------------
echo Stopping any hanging BHIV Core processes...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq BHIV Core*" 2>nul

echo Starting BHIV Core with optimized settings...
cd "v1-BHIV_CORE-main"
start "BHIV Core API" cmd /k "python simple_api.py --port 8001 --host 0.0.0.0"
echo ✅ BHIV Core restarted
cd ..

echo.
echo Step 3: Waiting for services to initialize...
echo ----------------------------------------
echo Waiting 15 seconds for services to start properly...
timeout /t 15

echo.
echo Step 4: Testing the fix...
echo ----------------------------------------
echo Checking Integration Bridge health...
curl -s http://localhost:8004/health | python -m json.tool

echo.
echo ========================================
echo Service restart complete!
echo ========================================
echo.
echo Next steps:
echo 1. Check if services are now healthy
echo 2. Run: python test-bhiv-artha-integration.py
echo 3. If still issues, run: check-service-status.py
echo.
pause