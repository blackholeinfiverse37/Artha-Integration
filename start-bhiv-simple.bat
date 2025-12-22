@echo off
echo ========================================
echo  BHIV Core Minimal - Simple Startup
echo ========================================
echo.

:: Get the directory where this script is located
set SCRIPT_DIR=%~dp0
set BHIV_DIR=%SCRIPT_DIR%v1-BHIV_CORE-main

echo Script directory: %SCRIPT_DIR%
echo BHIV directory: %BHIV_DIR%
echo.

:: Check if BHIV directory exists
if not exist "%BHIV_DIR%" (
    echo ERROR: BHIV directory not found at %BHIV_DIR%
    pause
    exit /b 1
)

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

echo Python found: 
python --version
echo.

:: Navigate to BHIV directory
cd /d "%BHIV_DIR%"

:: Create virtual environment
if not exist ".venv_minimal" (
    echo Creating virtual environment...
    python -m venv .venv_minimal
)

:: Install dependencies
echo Installing dependencies...
.venv_minimal\Scripts\pip.exe install fastapi uvicorn pydantic requests python-dotenv --quiet

:: Kill existing processes
echo Cleaning up ports...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8001') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8002') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8003') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8004') do taskkill /f /pid %%a >nul 2>&1

echo.
echo Starting services...
echo.

:: Start services with simpler commands
echo Starting Simple API...
start "BHIV Simple API" cmd /k "cd /d \"%BHIV_DIR%\" & .venv_minimal\Scripts\python.exe simple_api_minimal.py --port 8001"

timeout /t 3 /nobreak >nul

echo Starting MCP Bridge...
start "BHIV MCP Bridge" cmd /k "cd /d \"%BHIV_DIR%\" & .venv_minimal\Scripts\python.exe mcp_bridge_minimal.py"

timeout /t 3 /nobreak >nul

echo Starting Web Interface...
start "BHIV Web Interface" cmd /k "cd /d \"%BHIV_DIR%\" & .venv_minimal\Scripts\python.exe web_interface_minimal.py"

timeout /t 3 /nobreak >nul

echo Starting Integration Bridge...
start "Integration Bridge" cmd /k "cd /d \"%BHIV_DIR%\" & .venv_minimal\Scripts\python.exe integration_bridge_minimal.py"

echo.
echo Waiting for services to start...
timeout /t 15 /nobreak >nul

echo.
echo Testing services...
echo.

:: Test services
curl -s http://localhost:8001/health >nul 2>&1
if errorlevel 1 (
    echo Simple API: Not responding
) else (
    echo Simple API: Running
)

curl -s http://localhost:8002/health >nul 2>&1
if errorlevel 1 (
    echo MCP Bridge: Not responding
) else (
    echo MCP Bridge: Running
)

curl -s http://localhost:8003/health >nul 2>&1
if errorlevel 1 (
    echo Web Interface: Not responding
) else (
    echo Web Interface: Running
)

curl -s http://localhost:8004/health >nul 2>&1
if errorlevel 1 (
    echo Integration Bridge: Not responding
) else (
    echo Integration Bridge: Running
)

echo.
echo Service URLs:
echo Simple API: http://localhost:8001
echo MCP Bridge: http://localhost:8002
echo Web Interface: http://localhost:8003
echo Integration Bridge: http://localhost:8004
echo.
echo ARTHA Frontend: http://localhost:5173
echo.

pause