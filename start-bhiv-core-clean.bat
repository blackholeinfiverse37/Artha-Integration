@echo off
echo ========================================
echo    BHIV Core Clean Startup
echo ========================================
echo.

cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"

echo Checking virtual environment...
if not exist ".venv_minimal" (
    echo Creating virtual environment...
    python -m venv .venv_minimal
)

echo Activating virtual environment...
call .venv_minimal\Scripts\activate

echo Installing core dependencies only...
pip install -r requirements_core.txt --quiet

echo.
echo Starting BHIV Core API (Clean Mode)...
echo ========================================
echo  Server will start on: http://localhost:8001
echo  API Documentation: http://localhost:8001/docs
echo  Mode: Minimal (no NAS/Qdrant dependencies)
echo ========================================
echo.

python simple_api.py --port 8001