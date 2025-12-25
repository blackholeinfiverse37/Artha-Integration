@echo off
echo ========================================
echo    ARTHA + BHIV Integrated System
echo ========================================
echo.

echo Running pre-startup diagnostics...
python diagnose-integration.py
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Issues detected. Please resolve them before starting services.
    echo Run: verify-integration-setup.bat for detailed checks
    pause
    exit /b 1
)

echo.
echo Step 1: Starting BHIV Core Services...
echo ----------------------------------------
cd "v1-BHIV_CORE-main"
echo Installing BHIV Core requirements...
pip install fastapi uvicorn pydantic requests python-dotenv langchain-huggingface langchain-community faiss-cpu
echo Starting BHIV Core Simple API (Port 8001)...
start "BHIV Core API" cmd /k "python simple_api.py --port 8001"
timeout /t 5
cd ..

echo.
echo Step 2: Starting BHIV Central Depository...
echo ----------------------------------------
cd "BHIV_Central_Depository-main"
echo Installing Central Depository requirements...
pip install fastapi uvicorn pydantic requests python-dotenv redis pymongo
echo Starting BHIV Central Depository (Port 8000)...
start "BHIV Central Depository" cmd /k "python main.py"
timeout /t 7
cd ..

echo.
echo Step 3: Starting Integration Bridge...
echo ----------------------------------------
echo Installing Integration Bridge requirements...
npm install express cors axios socket.io
echo Starting Integration Bridge (Port 8004)...
start "Integration Bridge" cmd /k "node integration-bridge.js"
timeout /t 5

echo.
echo Step 4: Starting ARTHA Backend...
echo ----------------------------------------
cd backend
echo Starting ARTHA Backend (Port 5000)...
start "ARTHA Backend" cmd /k "npm run dev"
timeout /t 7
cd ..

echo.
echo Step 5: Starting ARTHA Frontend...
echo ----------------------------------------
cd frontend
echo Starting ARTHA Frontend (Port 5173)...
start "ARTHA Frontend" cmd /k "npm run dev"
cd ..

echo.
echo Waiting for services to initialize...
timeout /t 10

echo.
echo Running post-startup health check...
python quick-health-check.py

echo.
echo ========================================
echo    All Services Started Successfully!
echo ========================================
echo.
echo 🌐 Service URLs:
echo ├─ ARTHA Frontend:           http://localhost:5173
echo ├─ ARTHA Backend:            http://localhost:5000
echo ├─ BHIV Central Depository:  http://localhost:8000
echo ├─ BHIV Core API:            http://localhost:8001
echo └─ Integration Bridge:       http://localhost:8004
echo.
echo 🔧 Admin Panels:
echo ├─ BHIV Central Admin:       http://localhost:8000/docs
echo ├─ BHIV Core Docs:           http://localhost:8001/docs
echo └─ Integration Bridge Health: http://localhost:8004/health
echo.
echo 📊 Testing Integration:
echo Run: python test-bhiv-artha-integration.py
echo.
echo Press any key to run integration test...
pause
python test-bhiv-artha-integration.py
echo.
echo Press any key to open ARTHA Frontend...
pause
start http://localhost:5173