# ARTHA + BHIV Integrated System - Complete Setup Guide

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-green.svg)](https://www.mongodb.com/)

**ARTHA + BHIV** is a comprehensive AI-powered accounting system that combines ARTHA's robust financial management with BHIV's intelligent multi-agent AI ecosystem.

## 🎯 System Overview

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   ARTHA         │    │  Integration     │    │   BHIV Ecosystem    │
│   Frontend      │◄──►│  Bridge          │◄──►│                     │
│   (Port 5173)   │    │  (Port 8004)     │    │  ┌─────────────────┐│
└─────────────────┘    └──────────────────┘    │  │ Central         ││
                                               │  │ Depository      ││
┌─────────────────┐    ┌──────────────────┐    │  │ (Port 8000)     ││
│   ARTHA         │    │  BHIV Service    │    │  └─────────────────┘│
│   Backend       │◄──►│  Integration     │◄──►│                     │
│   (Port 5000)   │    │  Layer           │    │  ┌─────────────────┐│
└─────────────────┘    └──────────────────┘    │  │ BHIV Core       ││
                                               │  │ (Port 8001)     ││
                                               │  └─────────────────┘│
                                               └─────────────────────┘
```

### Key Features
- **AI-Powered Financial Analysis**: Multi-agent system for comprehensive business insights
- **Intelligent Document Processing**: Automated receipt and invoice analysis
- **Real-time Financial Monitoring**: Live cash flow and health monitoring
- **Legal & Compliance Guidance**: AI-powered business law assistance
- **Multi-Agent Workflows**: Complex business process automation
- **India GST Compliance**: Complete GST filing and compliance support

## 🚀 Quick Start Guide

### Prerequisites

**Required Software:**
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **Git** (Optional)

**Verify Installation:**
```bash
node --version    # Should show v18.x.x or higher
python --version  # Should show 3.8.x or higher
```

### 📁 Project Structure
```
Artha Integration/
├── backend/                          # ARTHA Backend (Node.js)
├── frontend/                         # ARTHA Frontend (React)
├── BHIV_Central_Depository-main/     # BHIV Multi-Agent System
├── v1-BHIV_CORE-main/               # BHIV Core AI Services
├── integration-bridge.js             # Integration Coordination Layer
├── start-integrated-system.bat      # Complete System Startup
└── test-bhiv-artha-integration.py   # Integration Test Suite
```

## 🎯 **RECOMMENDED: Automated Startup (2 Minutes)**

### Step 1: Run Complete System Startup
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration"
start-integrated-system.bat
```

**This will automatically start:**
- BHIV Core Services (Port 8001)
- BHIV Central Depository (Port 8000)
- Integration Bridge (Port 8004)
- ARTHA Backend (Port 5000)
- ARTHA Frontend (Port 5173)

### Step 2: Verify Integration
```cmd
python test-bhiv-artha-integration.py
```

**Expected Output:**
```
🧪 Comprehensive BHIV + ARTHA Integration Test Suite
✅ ARTHA Authentication
✅ Integration Bridge Health
✅ BHIV Central Depository
✅ BHIV Core API
✅ ARTHA-BHIV Integration
✅ Agent Execution via ARTHA
✅ Financial Analysis Integration
✅ Document Processing Pipeline

📊 Results: 8/8 tests passed
🎉 All tests passed! BHIV is fully integrated with ARTHA.
```

### Step 3: Access the System
1. **Open ARTHA**: http://localhost:5173
2. **Login**: admin@artha.local / admin123
3. **Dashboard** → Find "BHIV AI Integration" widget
4. **Test Integration**: Ask "How to record depreciation expense?"

## 🔧 Manual Startup (If Automated Fails)

python frontend-health-check.py

### Step 1: Start BHIV Core Services

**Terminal 1 - BHIV Core API:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"

# Create virtual environment (first time only)
python -m venv .venv_minimal

# Activate virtual environment
.venv_minimal\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic requests python-dotenv langchain-huggingface langchain-community faiss-cpu

# Start BHIV Core API
python simple_api.py --port 8001
```
**Wait for:** `Server URL: http://0.0.0.0:8001`

**If virtual environment already exists:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python simple_api.py --port 8001
```

### Step 2: Start BHIV Central Depository

**Terminal 2 - BHIV Central Depository:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\BHIV_Central_Depository-main"

# Install dependencies from requirements.txt
pip install -r requirements.txt

# OR install manually:
# pip install fastapi uvicorn pydantic requests python-dotenv redis pymongo python-socketio

# Start Central Depository
python main.py
```
**Wait for:** `Application startup complete`

### Step 3: Start Integration Bridge

**Terminal 3 - Integration Bridge:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration"

# Install Node.js dependencies
npm install express cors axios socket.io

# Start Integration Bridge
node integration-bridge.js
```
**Wait for:** `🌉 BHIV-ARTHA Integration Bridge running on port 8004`

### Step 4: Start ARTHA Backend

**Terminal 4 - ARTHA Backend:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\backend"

# Install dependencies (first time only)
npm install

# Start ARTHA Backend
npm run dev
```
**Wait for:** `Server running in development mode on port 5000`

### Step 5: Start ARTHA Frontend

**Terminal 5 - ARTHA Frontend:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\frontend"

# Install dependencies (first time only)
npm install

# Start ARTHA Frontend
npm run dev
```
**Wait for:** `Local: http://localhost:5173/`

### Step 6: Verify All Services

**Check Service Status:**
```cmd
# Open new terminal and run
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration"
python test-bhiv-artha-integration.py
```

**Manual Health Checks:**
```cmd
curl http://localhost:5000/api/health   # ARTHA Backend
curl http://localhost:8000/health       # BHIV Central
curl http://localhost:8001/health       # BHIV Core
curl http://localhost:8004/health       # Integration Bridge
```

### Step 7: Access and Test

1. **Open ARTHA**: http://localhost:5173
2. **Login**: admin@artha.local / admin123
3. **Check BHIV Status**: Dashboard → BHIV Integration widget
4. **Test AI**: Ask "How to record depreciation expense?"
5. **Verify Response**: Should get AI-powered accounting guidance

## 🌐 Service URLs & Health Checks

| Service | URL | Health Check | Purpose |
|---------|-----|-------------|---------|
| **ARTHA Frontend** | http://localhost:5173 | Main App | User Interface |
| **ARTHA Backend** | http://localhost:5000 | /api/health | Core API |
| **BHIV Central** | http://localhost:8000 | /health | Multi-Agent System |
| **BHIV Core** | http://localhost:8001 | /health | AI Knowledge Base |
| **Integration Bridge** | http://localhost:8004 | /health | Service Coordination |

## 🧪 Testing & Verification

### Comprehensive Integration Test
```cmd
python test-bhiv-artha-integration.py
```

### Individual Health Checks
```cmd
curl http://localhost:5000/api/health   # ARTHA Backend
curl http://localhost:8000/health       # BHIV Central
curl http://localhost:8001/health       # BHIV Core
curl http://localhost:8004/health       # Integration Bridge
```

### Manual Verification Steps
1. **ARTHA Login**: Access http://localhost:5173 and login
2. **BHIV Status**: Check Dashboard → BHIV Integration widget shows "Connected"
3. **AI Response**: Ask a question and verify AI responds
4. **Agent Access**: Verify agents are available via API
5. **Document Processing**: Test document upload and processing

## 🤖 Available AI Agents & Capabilities

### Financial Agents
- **financial_coordinator**: Comprehensive financial analysis and insights
- **cashflow_analyzer**: Cash flow analysis and projections
- **auto_diagnostics**: Automated financial health diagnostics

### Document Processing Agents
- **textToJson**: Extract structured data from documents
- **image_agent**: Process images and receipts
- **archive_agent**: Document archival and retrieval

### Advisory Agents
- **law_agent**: Legal guidance and compliance advice
- **goal_recommender**: Business goal recommendations
- **workflow**: Process optimization suggestions

### Knowledge Agents
- **gurukul**: Educational content and training
- **vedic_quiz_agent**: Interactive learning modules
- **sanskrit_parser**: Ancient text analysis

## 📋 Agent Workflows (Baskets)

### Financial Operations
- **financial_operations**: Complete financial analysis workflow
- **Cashflow + Law agent**: Combined financial and legal analysis
- **finance_daily_check**: Daily financial health monitoring

### Document Processing
- **text_to_json_test**: Document extraction and processing
- **multi_agent_test**: Multi-step document analysis

### Monitoring & Optimization
- **workflow_optimizer**: Process optimization analysis
- **enhanced_logging_test**: System monitoring and logging

## 🔗 API Integration Examples

### 1. Run Financial Analysis
```javascript
const response = await fetch('/api/v1/bhiv/financial-analysis', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: {
      ledger_entries: ledgerData,
      analysis_type: 'comprehensive'
    }
  })
});
```

### 2. Execute AI Agent
```javascript
const response = await fetch('/api/v1/bhiv/run-agent', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agentName: 'financial_coordinator',
    inputData: {
      financial_data: data,
      analysis_type: 'comprehensive'
    }
  })
});
```

### 3. Process Document Pipeline
```javascript
const response = await fetch('http://localhost:8004/process/document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filePath: '/path/to/invoice.pdf',
    documentType: 'invoice'
  })
});
```

## 🐛 Troubleshooting Guide

### Issue: Services Not Starting

**Solution 1: Check Port Availability**
```cmd
netstat -ano | findstr :5000
netstat -ano | findstr :8000
netstat -ano | findstr :8001
```

**Solution 2: Kill Existing Processes**
```cmd
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

**Solution 3: Restart with Clean Environment**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration"
start-integrated-system.bat
```

### Issue: Integration Tests Failing

**Check Service Health:**
```cmd
curl http://localhost:8004/health
```

**Verify Environment Variables:**
Check `backend\.env` contains:
```env
BHIV_INTEGRATION_ENABLED=true
BHIV_CENTRAL_DEPOSITORY_URL=http://localhost:8000
BHIV_SIMPLE_API_URL=http://localhost:8001
```

### Issue: BHIV Status Shows "Disconnected"

**Solution 1: Restart ARTHA Backend**
```cmd
cd backend
# Stop with Ctrl+C, then:
npm run dev
```

**Solution 2: Check BHIV Services**
```cmd
curl http://localhost:8000/health
curl http://localhost:8001/health
```

### Issue: Python Dependencies

**Recreate Virtual Environment:**
```cmd
cd "v1-BHIV_CORE-main"
python -m venv .venv_minimal
.venv_minimal\Scripts\activate
pip install fastapi uvicorn pydantic requests python-dotenv
```

### Issue: Node.js Dependencies

**Clean Install:**
```cmd
cd backend
rmdir /s node_modules
del package-lock.json
npm cache clean --force
npm install
```

## ⚙️ Environment Configuration

### Backend Configuration (backend/.env)
```env
# BHIV Integration
BHIV_INTEGRATION_ENABLED=true
BHIV_SIMPLE_API_URL=http://localhost:8001
BHIV_CENTRAL_DEPOSITORY_URL=http://localhost:8000
BHIV_AGENT_RUNNER_URL=http://localhost:8000
INTEGRATION_BRIDGE_PORT=8004

# Database
MONGODB_URI=mongodb+srv://your-connection-string
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your-jwt-secret
ADMIN_EMAIL=admin@artha.local
ADMIN_PASSWORD=admin123
```

## 📊 Success Indicators

**✅ System is working correctly when:**
1. All 5 service URLs return 200 OK status
2. ARTHA Dashboard shows "BHIV: Connected"
3. Integration test shows 8/8 tests passed
4. AI responses appear within 3 seconds
5. No error messages in service terminals
6. Document processing completes successfully
7. Financial analysis returns insights

## 💡 Usage Examples

### AI Accounting Guidance
**Question**: "How do I record a cash sale?"
**Response**: Step-by-step accounting guidance with journal entries

### Financial Analysis
**Input**: Upload ledger data
**Output**: AI-powered insights on cash flow, profitability, and recommendations

### Document Processing
**Input**: Upload invoice/receipt
**Output**: Structured data extraction and automatic journal entry creation

### Legal Compliance
**Question**: "What are GST requirements for services?"
**Response**: Detailed compliance guidance with practical examples

## 🔄 Stopping the System

**Quick Stop (All Services):**
```cmd
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

**Graceful Stop:**
- Press `Ctrl+C` in each terminal window
- Wait for services to shut down properly

## 📈 Advanced Features

### Real-time Financial Monitoring
```javascript
const socket = io('http://localhost:8004');
socket.on('financial-health-update', (data) => {
  console.log('Financial update:', data);
});
```

### Multi-Agent Workflows
Execute complex business processes using pre-configured agent baskets that combine multiple AI agents for comprehensive analysis.

### Intelligent Service Routing
The system automatically routes requests to the most appropriate service with fallback mechanisms for reliability.

## 📚 Additional Resources

- **Integration Documentation**: [BHIV-ARTHA-INTEGRATION.md](BHIV-ARTHA-INTEGRATION.md)
- **API Documentation**: http://localhost:8000/docs (BHIV Central)
- **Core API Docs**: http://localhost:8001/docs (BHIV Core)
- **Health Monitoring**: http://localhost:8004/health (Integration Bridge)

## 🤝 Support

For issues or questions:
1. Run the integration test suite
2. Check service health endpoints
3. Review service logs in terminal windows
4. Verify environment configuration

## 📄 License

Proprietary - BHIV Inc.

---

**Version**: 2.0.0 - Integrated BHIV + ARTHA System  
**Status**: Production Ready  
**Last Updated**: January 2025  
**Integration Status**: ✅ Complete - All systems fully integrated