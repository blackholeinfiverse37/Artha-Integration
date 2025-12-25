@echo off
echo Starting BHIV Core API Service...
echo.

cd /d "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"

echo Checking virtual environment...
if not exist ".venv_minimal" (
    echo Creating virtual environment...
    python -m venv .venv_minimal
)

echo Activating virtual environment...
call .venv_minimal\Scripts\activate

echo Installing/updating dependencies...
pip install --quiet fastapi uvicorn pydantic requests python-dotenv

echo.
echo Starting BHIV Core API on port 8001...
echo Service will be available at: http://localhost:8001
echo Health check: http://localhost:8001/health
echo.

python simple_api_minimal.py --port 8001