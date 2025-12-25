@echo off
echo ========================================
echo    ARTHA Login Fix & User Setup
echo ========================================
echo.

echo Step 1: Checking backend service...
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ARTHA Backend not running!
    echo Please start the backend first:
    echo    cd backend
    echo    npm run dev
    echo.
    pause
    exit /b 1
)
echo ✅ ARTHA Backend is running

echo.
echo Step 2: Ensuring admin user exists...
cd backend
node scripts/ensure-admin.js
if %errorlevel% neq 0 (
    echo ❌ Failed to create admin user
    echo Trying to seed the database...
    node scripts/seed.js
)
cd ..

echo.
echo Step 3: Testing login functionality...
python comprehensive-health-check.py

echo.
echo Step 4: Verifying credentials...
echo ========================================
echo 🔐 CORRECT LOGIN CREDENTIALS:
echo ========================================
echo.
echo 👤 Admin User:
echo    Email:    admin@artha.local
echo    Password: Admin@123456
echo.
echo 👤 Accountant User:
echo    Email:    accountant@artha.local  
echo    Password: Accountant@123
echo.
echo 👤 Viewer User:
echo    Email:    user@example.com
echo    Password: testuser123
echo.
echo ========================================
echo 🌐 ACCESS POINTS:
echo ========================================
echo.
echo Frontend:  http://localhost:5173
echo Backend:   http://localhost:5000
echo API Docs:  http://localhost:5000/api/docs
echo.
echo ========================================
echo 💡 TROUBLESHOOTING TIPS:
echo ========================================
echo.
echo 1. If login fails:
echo    - Check backend is running (npm run dev)
echo    - Verify database connection
echo    - Run this script again
echo.
echo 2. If "Invalid credentials" error:
echo    - Use exact credentials above
echo    - Check for typos in email/password
echo    - Try clicking demo credentials in login page
echo.
echo 3. If "Backend server not running":
echo    - Start backend: cd backend && npm run dev
echo    - Check port 5000 is not blocked
echo.
echo Press any key to open frontend...
pause
start http://localhost:5173