@echo off
echo Starting BHIV AI Services...

cd "v1-BHIV_CORE-main"

echo Installing minimal requirements...
pip install fastapi uvicorn pydantic requests python-dotenv

echo Starting Simple API (Minimal) on port 8001...
start "BHIV Simple API" cmd /k "python simple_api_minimal.py"

timeout /t 3

echo Starting MCP Bridge on port 8002...
start "BHIV MCP Bridge" cmd /k "python mcp_bridge.py"

timeout /t 3

echo BHIV Services started!
echo Simple API: http://localhost:8001
echo MCP Bridge: http://localhost:8002
echo.
echo Press any key to continue...
pause