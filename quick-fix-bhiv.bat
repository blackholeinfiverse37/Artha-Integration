@echo off
title Quick Fix for BHIV Issues
color 0C

echo ================================================================
echo   QUICK FIX FOR BHIV CORE ISSUES
echo ================================================================
echo.

echo Step 1: Killing processes on port 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do (
    echo Killing process %%a
    taskkill /PID %%a /F 2>nul
)

echo Step 2: Installing missing qdrant-client...
cd "v1-BHIV_CORE-main"
call .venv\Scripts\activate
pip install qdrant-client[fastembed] numpy scikit-learn fastembed

echo Step 3: Starting BHIV Simple API on port 8001...
python simple_api.py --port 8001

pause