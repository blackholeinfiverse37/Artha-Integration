@echo off
echo 🚀 Starting ARTHA Backend Service...
echo.

cd /d "c:\Users\Ashmit Pandey\Desktop\Artha Integration\backend"

echo 📋 Checking backend directory...
if not exist "package.json" (
    echo ❌ Error: package.json not found in backend directory
    echo Please ensure you're in the correct directory
    pause
    exit /b 1
)

echo ✅ Backend directory found
echo.

echo 🔍 Checking if port 5000 is already in use...
netstat -ano | findstr :5000 > nul
if %errorlevel% == 0 (
    echo ⚠️  Port 5000 is already in use
    echo Attempting to kill existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
        taskkill /F /PID %%a 2>nul
    )
    timeout /t 2 /nobreak > nul
)

echo 📦 Installing/updating dependencies...
call npm install

echo.
echo 🔧 Starting ARTHA Backend in development mode...
echo Backend will be available at: http://localhost:5000
echo Health check: http://localhost:5000/api/health
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev