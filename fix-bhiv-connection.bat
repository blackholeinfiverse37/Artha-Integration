@echo off
echo ========================================
echo  BHIV Core Quick Fix & Troubleshooting
echo ========================================
echo.

:: Set window title
title BHIV Core Quick Fix

echo 🔧 Diagnosing BHIV Core connection issues...
echo.

:: Check if processes are running on BHIV ports
echo 📊 Checking port usage:
echo.

for %%p in (8001 8002 8003 8004) do (
    echo Checking port %%p...
    netstat -ano | findstr :%%p >nul 2>&1
    if errorlevel 1 (
        echo   ❌ Port %%p: No process running
    ) else (
        echo   ✅ Port %%p: Process active
        for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
            echo      └─ PID: %%a
        )
    )
)

echo.
echo 🧹 Cleaning up stuck processes...

:: Kill any stuck Python processes on BHIV ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    echo Terminating process on port 8001 (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8002') do (
    echo Terminating process on port 8002 (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8003') do (
    echo Terminating process on port 8003 (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat-aon ^| findstr :8004') do (
    echo Terminating process on port 8004 (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo 🔍 Checking Python environment...

:: Navigate to BHIV directory
cd /d "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"

:: Check if virtual environment exists
if not exist ".venv" (
    echo ❌ Virtual environment not found
    echo 🔧 Creating new virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        echo Please ensure Python 3.11+ is installed
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
)

:: Activate virtual environment
call .venv\Scripts\activate.bat

:: Check Python version
echo 🐍 Python version:
python --version

:: Check if requirements are installed
echo.
echo 📦 Checking dependencies...
pip list | findstr fastapi >nul 2>&1
if errorlevel 1 (
    echo ❌ FastAPI not found - installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies appear to be installed
)

echo.
echo 🔧 Fixing common configuration issues...

:: Check .env file
if not exist ".env" (
    echo ❌ .env file not found
    echo 🔧 Creating default .env file...
    
    echo # MongoDB Configuration > .env
    echo MONGO_URI=mongodb+srv://blackholeinfiverse54_db_user:Gjpl998Z6hsQLjJF@artha.rzneis7.mongodb.net/bhiv_core?retryWrites=true^&w=majority >> .env
    echo USE_RL=true >> .env
    echo RL_EXPLORATION_RATE=0.2 >> .env
    echo. >> .env
    echo # API Keys (Optional) >> .env
    echo GROQ_API_KEY= >> .env
    echo GEMINI_API_KEY= >> .env
    echo OLLAMA_MODEL=llama3.1 >> .env
    echo OLLAMA_URL=http://localhost:11434/api/generate >> .env
    echo OLLAMA_TIMEOUT=60 >> .env
    echo. >> .env
    echo # ARTHA Integration >> .env
    echo ARTHA_API_URL=http://localhost:5000/api/v1 >> .env
    echo ARTHA_INTEGRATION_ENABLED=true >> .env
    echo ARTHA_API_EMAIL=admin@artha.local >> .env
    echo ARTHA_API_PASSWORD=admin123 >> .env
    
    echo ✅ Default .env file created
) else (
    echo ✅ .env file exists
)

echo.
echo 🚀 Starting BHIV Core services with error handling...
echo.

:: Start services one by one with error checking
echo 📡 Starting BHIV Simple API...
start "BHIV Simple API" cmd /k "cd /d \"c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main\" && .venv\Scripts\activate && echo Starting Simple API... && python simple_api.py --port 8001 || (echo ERROR: Simple API failed to start && pause)"

timeout /t 5 /nobreak >nul

echo 🌉 Starting BHIV MCP Bridge...
start "BHIV MCP Bridge" cmd /k "cd /d \"c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main\" && .venv\Scripts\activate && echo Starting MCP Bridge... && python mcp_bridge.py || (echo ERROR: MCP Bridge failed to start && pause)"

timeout /t 5 /nobreak >nul

echo 🌐 Starting BHIV Web Interface...
start "BHIV Web Interface" cmd /k "cd /d \"c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main\" && .venv\Scripts\activate && echo Starting Web Interface... && python integration/web_interface.py || (echo ERROR: Web Interface failed to start && pause)"

timeout /t 5 /nobreak >nul

echo 🔗 Starting Integration Bridge...
start "Integration Bridge" cmd /k "cd /d \"c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main\" && .venv\Scripts\activate && echo Starting Integration Bridge... && python integration_bridge.py || (echo ERROR: Integration Bridge failed to start && pause)"

echo.
echo ⏳ Waiting for services to initialize...
timeout /t 15 /nobreak >nul

echo.
echo 🔍 Running health check...
python check-bhiv-integration.py

echo.
echo 💡 If issues persist:
echo 1. Check individual service windows for specific error messages
echo 2. Ensure Windows Firewall allows Python network access
echo 3. Verify no antivirus is blocking Python processes
echo 4. Check if ports 8001-8004 are available
echo.
echo 📞 For support, check the error messages in the service windows
echo.

pause