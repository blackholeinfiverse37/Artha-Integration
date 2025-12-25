@echo off
echo ========================================
echo    ARTHA LOGIN DEBUG & FIX TOOL
echo ========================================
echo.

echo Step 1: Testing backend connection...
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Backend not running! Start it first:
    echo    cd backend && npm run dev
    pause
    exit /b 1
)
echo ✅ Backend is running

echo.
echo Step 2: Testing direct login API...
node test-direct-login.js

echo.
echo Step 3: Ensuring admin user exists...
cd backend
node scripts/ensure-admin.js
cd ..

echo.
echo Step 4: Clearing browser storage (if needed)...
echo Open browser console and run:
echo   localStorage.clear(); sessionStorage.clear();

echo.
echo ========================================
echo 🔧 LOGIN TROUBLESHOOTING STEPS:
echo ========================================
echo.
echo 1. Clear browser cache and storage
echo 2. Use these EXACT credentials:
echo    Email:    admin@artha.local
echo    Password: Admin@123456
echo.
echo 3. Check browser console for errors
echo 4. Verify backend logs show login attempts
echo.
echo 5. If still failing, restart backend:
echo    cd backend
echo    npm run dev
echo.
echo Press any key to open frontend...
pause
start http://localhost:5173