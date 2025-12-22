@echo off
echo Starting BHIV Simple API (Quick Fix)...

cd "v1-BHIV_CORE-main"

echo Installing minimal requirements...
pip install fastapi uvicorn pydantic requests

echo Starting Simple API on port 8001...
python simple_api_minimal.py