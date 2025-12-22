# BHIV AI Integration Setup Guide

## Overview
This guide will help you set up and integrate BHIV AI with your Artha application.

## Prerequisites
- Python 3.8+ installed
- Node.js 16+ installed
- All required Python packages (will be installed automatically)

## Quick Setup

### Step 1: Start BHIV Services
Run one of these commands from the project root:

**Option A: Using Batch Script (Recommended)**
```bash
start-bhiv-services.bat
```

**Option B: Using PowerShell**
```powershell
.\start-bhiv-services.ps1
```

**Option C: Manual Start**
```bash
cd v1-BHIV_CORE-main
python simple_api.py --port 8001
# In another terminal:
python mcp_bridge.py
```

### Step 2: Start Artha Backend
```bash
cd backend
npm start
```

### Step 3: Start Artha Frontend
```bash
cd frontend
npm run dev
```

### Step 4: Test Integration
1. Open Artha in your browser (usually http://localhost:5173)
2. Navigate to the BHIV Integration section
3. Click "Check Status" - you should see "Connected"
4. Try asking a question like "How to record depreciation expense?"

## Service URLs
- **Simple API**: http://localhost:8001
- **MCP Bridge**: http://localhost:8002
- **Artha Backend**: http://localhost:5000
- **Artha Frontend**: http://localhost:5173

## Troubleshooting

### Issue: "BHIV Core: Disconnected"
**Cause**: BHIV services are not running
**Solution**: Run `start-bhiv-services.bat` to start the services

### Issue: "Service not running" error
**Cause**: Python services failed to start
**Solutions**:
1. Check if Python is installed: `python --version`
2. Install requirements: `cd v1-BHIV_CORE-main && pip install -r requirements.txt`
3. Check if ports 8001 and 8002 are available
4. Run services manually to see error messages

### Issue: "Request failed with status code 503"
**Cause**: BHIV routes not registered in backend
**Solution**: This has been fixed - restart the backend server

### Issue: Python import errors
**Cause**: Missing Python dependencies
**Solution**: 
```bash
cd v1-BHIV_CORE-main
pip install -r requirements.txt
```

### Issue: Port conflicts
**Cause**: Ports 8001 or 8002 are already in use
**Solutions**:
1. Kill existing processes using those ports
2. Or modify the ports in backend/.env:
   ```
   BHIV_SIMPLE_API_URL=http://localhost:8003
   BHIV_MCP_BRIDGE_URL=http://localhost:8004
   ```

## Features Available

### 1. Accounting Guidance
- Ask questions about accounting principles
- Get AI-powered responses based on knowledge base
- Example: "How to record depreciation expense?"

### 2. Receipt Processing
- Upload receipts for automatic data extraction
- AI analyzes and extracts expense details
- Integrates with expense management

### 3. Document Processing
- Process PDF documents for accounting information
- Extract relevant financial data
- Automated categorization

### 4. Health Monitoring
- Real-time status of BHIV services
- Performance metrics
- Error tracking and reporting

## Configuration

### Environment Variables (backend/.env)
```
BHIV_SIMPLE_API_URL=http://localhost:8001
BHIV_MCP_BRIDGE_URL=http://localhost:8002
BHIV_INTEGRATION_ENABLED=true
```

### BHIV Core Configuration
The BHIV services are configured in `v1-BHIV_CORE-main/config/settings.py`

## API Endpoints

### BHIV Integration Endpoints
- `GET /v1/bhiv/status` - Check service status
- `POST /v1/bhiv/guidance` - Get accounting guidance
- `POST /v1/bhiv/process-document` - Process documents
- `POST /v1/bhiv/analyze-receipt` - Analyze receipts

### BHIV Core Endpoints
- `GET http://localhost:8001/health` - Simple API health
- `GET http://localhost:8002/health` - MCP Bridge health
- `POST http://localhost:8001/ask-vedas` - Spiritual guidance
- `POST http://localhost:8002/handle_task` - Process tasks

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all services are running with health checks
3. Check console logs for error messages
4. Ensure all dependencies are installed

## Success Indicators
- ✅ BHIV Core shows "Connected" status
- ✅ Can ask questions and get AI responses
- ✅ All health checks pass
- ✅ No 503 errors in browser console