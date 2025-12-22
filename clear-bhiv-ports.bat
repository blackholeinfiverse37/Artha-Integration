@echo off
echo Checking and clearing BHIV ports...

echo Checking port 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do (
    echo Killing process %%a on port 8001
    taskkill /PID %%a /F 2>nul
)

echo Checking port 8002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8002') do (
    echo Killing process %%a on port 8002
    taskkill /PID %%a /F 2>nul
)

echo Checking port 8003...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003') do (
    echo Killing process %%a on port 8003
    taskkill /PID %%a /F 2>nul
)

echo Checking port 8004...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8004') do (
    echo Killing process %%a on port 8004
    taskkill /PID %%a /F 2>nul
)

echo All BHIV ports cleared!
timeout /t 2 >nul