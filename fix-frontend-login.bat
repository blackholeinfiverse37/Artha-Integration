@echo off
echo ========================================
echo    ARTHA Frontend Login Fix Script
echo ========================================
echo.

echo Step 1: Checking backend connection...
python -c "import requests; r=requests.get('http://localhost:5000/api/health', timeout=5); print('✅ Backend is running') if r.status_code==200 else print('❌ Backend not responding')" 2>nul || (
    echo ❌ Backend not running or Python not available
    echo.
    echo Starting ARTHA Backend...
    cd backend
    start "ARTHA Backend" cmd /k "npm run dev"
    cd ..
    echo Waiting for backend to start...
    timeout /t 10
)

echo.
echo Step 2: Ensuring admin user exists...
cd backend
node scripts/ensure-admin.js
cd ..

echo.
echo Step 3: Checking frontend environment...
if not exist "frontend\.env" (
    echo Creating frontend .env file...
    echo VITE_API_URL=http://localhost:5000/api/v1 > frontend\.env
    echo VITE_SIGNING_SECRET=default-secret-key >> frontend\.env
)

echo.
echo Step 4: Installing/updating frontend dependencies...
cd frontend
npm install --silent
cd ..

echo.
echo Step 5: Running health check...
python frontend-health-check.py

echo.
echo ========================================
echo    Login Fix Complete!
echo ========================================
echo.
echo 🌐 Frontend URL: http://localhost:5173
echo 👤 Admin Login: admin@artha.local / Admin@123456
echo 👤 Accountant: accountant@artha.local / Accountant@123
echo 👤 Viewer: user@example.com / testuser123
echo.
echo Press any key to start frontend...
pause
cd frontend
npm run dev