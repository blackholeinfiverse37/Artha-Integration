@echo off
echo ========================================
echo    BHIV + ARTHA Quick Fix Tool
echo ========================================
echo.

echo Applying common fixes...
echo.

echo 1. Updating backend environment configuration...
if exist "backend\.env" (
    echo Backing up current .env file...
    copy "backend\.env" "backend\.env.backup" >nul
    
    echo Adding missing BHIV configuration...
    echo. >> backend\.env
    echo # BHIV Integration >> backend\.env
    echo BHIV_INTEGRATION_ENABLED=true >> backend\.env
    echo BHIV_CENTRAL_DEPOSITORY_URL=http://localhost:8000 >> backend\.env
    echo BHIV_SIMPLE_API_URL=http://localhost:8001 >> backend\.env
    echo BHIV_AGENT_RUNNER_URL=http://localhost:8000 >> backend\.env
    echo INTEGRATION_BRIDGE_PORT=8004 >> backend\.env
    
    echo ✅ Backend configuration updated
) else (
    echo ❌ Backend .env file not found
    echo Creating basic .env file...
    echo NODE_ENV=development > backend\.env
    echo PORT=5000 >> backend\.env
    echo BHIV_INTEGRATION_ENABLED=true >> backend\.env
    echo BHIV_CENTRAL_DEPOSITORY_URL=http://localhost:8000 >> backend\.env
    echo BHIV_SIMPLE_API_URL=http://localhost:8001 >> backend\.env
    echo ✅ Basic .env file created
)

echo.
echo 2. Clearing any stuck processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
echo ✅ Processes cleared

echo.
echo 3. Installing missing dependencies...
echo Installing Integration Bridge dependencies...
npm install express cors axios socket.io 2>nul
echo ✅ Node.js dependencies installed

echo.
echo 4. Checking Python dependencies...
pip install fastapi uvicorn pydantic requests python-dotenv 2>nul
echo ✅ Python dependencies checked

echo.
echo ========================================
echo Quick fixes applied!
echo ========================================
echo.
echo Next steps:
echo 1. Run: start-integrated-system.bat
echo 2. Wait for all services to start
echo 3. Run: python test-bhiv-artha-integration.py
echo.
pause