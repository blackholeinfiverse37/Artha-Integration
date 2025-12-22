# BHIV Core Manual Startup Guide

## Quick Manual Setup (Recommended)

### Step 1: Open Command Prompt
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
```

### Step 2: Create Virtual Environment
```cmd
python -m venv .venv_minimal
.venv_minimal\Scripts\activate
```

### Step 3: Install Dependencies
```cmd
pip install fastapi uvicorn pydantic requests python-dotenv
```

### Step 4: Start Services (4 separate terminals)

**Terminal 1 - Simple API:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python simple_api_minimal.py --port 8001
```

**Terminal 2 - MCP Bridge:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python mcp_bridge_minimal.py
```

**Terminal 3 - Web Interface:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python web_interface_minimal.py
```

**Terminal 4 - Integration Bridge:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python integration_bridge_minimal.py
```

### Step 5: Test Integration

Open browser: http://localhost:5173
- Login: admin@artha.local / admin123
- Go to Dashboard
- Find "BHIV AI Integration" widget
- Click "Check Status" - should show "Connected"

## Expected Output

Each terminal should show:
```
BHIV [SERVICE] - MINIMAL VERSION
Server URL: http://0.0.0.0:[PORT]
Ready for ARTHA integration!
```

## Service URLs

- Simple API: http://localhost:8001
- MCP Bridge: http://localhost:8002  
- Web Interface: http://localhost:8003
- Integration Bridge: http://localhost:8004

## Troubleshooting

**If Python not found:**
- Install Python 3.8+ from python.org
- Add to PATH during installation

**If port in use:**
```cmd
taskkill /F /IM python.exe
```

**If services don't start:**
- Check each terminal for error messages
- Ensure all files exist in v1-BHIV_CORE-main folder
- Try reinstalling dependencies