@echo off
echo Starting BHIV Central Depository Services...

cd "BHIV_Central_Depository-main"

echo Installing Python requirements...
pip install fastapi uvicorn pydantic requests python-dotenv redis pymongo

echo Starting BHIV Central Depository API on port 8000...
start "BHIV Central Depository" cmd /k "python main.py"

timeout /t 5

echo BHIV Central Depository started!
echo Main API: http://localhost:8000
echo Admin Panel: http://localhost:8000/docs
echo.
echo Press any key to continue...
pause