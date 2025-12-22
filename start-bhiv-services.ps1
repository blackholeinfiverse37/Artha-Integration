# BHIV AI Services Startup Script
Write-Host "Starting BHIV AI Services..." -ForegroundColor Green

# Change to BHIV directory
Set-Location "v1-BHIV_CORE-main"

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python not found! Please install Python first." -ForegroundColor Red
    exit 1
}

# Install requirements if needed
if (Test-Path "requirements.txt") {
    Write-Host "Installing Python requirements..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Start Simple API
Write-Host "Starting Simple API on port 8001..." -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "simple_api.py", "--port", "8001" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start MCP Bridge
Write-Host "Starting MCP Bridge on port 8002..." -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "mcp_bridge.py" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "BHIV Services started successfully!" -ForegroundColor Green
Write-Host "Simple API: http://localhost:8001" -ForegroundColor White
Write-Host "MCP Bridge: http://localhost:8002" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")