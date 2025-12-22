# ARTHA + BHIV Core - Integrated AI-Powered Accounting System

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shield# ARTHA + BHIV Core Integration - Complete Setup Guide

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-green.svg)](https://www.mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org/)

**ARTHA + BHIV Core** is a comprehensive, India-compliant accounting system enhanced with AI-powered features for intelligent financial management.

## 🎯 Key Features

### ✅ AI-Powered Features (BHIV Core Integration)
- **Intelligent Document Processing**: Multi-modal AI for PDF, image, and audio analysis
- **Smart Receipt Analysis**: Automated expense categorization and data extraction
- **Conversational Accounting**: Natural language queries for financial insights
- **Knowledge-Based Guidance**: Real-time accounting advice and compliance help
- **Reinforcement Learning**: Adaptive system that learns from user patterns

### ✅ Core Accounting
- **Double-Entry Ledger**: HMAC-chain verified, tamper-proof ledger system
- **Hash-Chain Verification**: Full ledger integrity checking with entry-by-entry verification
- **Financial Reports**: P&L, Balance Sheet, Cash Flow, Trial Balance, Aged Receivables
- **Dashboard**: Real-time KPIs, balance summaries, recent activities

### ✅ India Compliance
- **GST Integration**:
  - GSTR-1 filing packet (outward supplies)
  - GSTR-3B filing packet (tax summary & reconciliation)
  - IGST / CGST+SGST calculation
  - Filing-ready JSON/CSV export

- **TDS/PF/ESI**: Tax calculation and deduction recording
- **Multi-Year Support**: Multiple financial years

### ✅ Invoice Management
- Invoice lifecycle: Draft → Sent → Partial → Paid → Cancelled
- Automatic journal entry creation
- Tax calculation per line item
- Payment tracking and recording

### ✅ Expense Management
- Expense approval workflow
- **OCR Receipt Scanning**: Extract vendor, date, amount, tax from receipt images
- Automatic expense-to-ledger posting
- Category tracking

### ✅ Production Features
- **Hash-Chain Ledger**: Every entry linked with HMAC-SHA256 for audit trail
- **Redis Caching**: Response caching and session management
- **Docker Deployment**: Multi-container production setup
- **Health Checks**: Liveness, readiness, and detailed health endpoints
- **Backup & Restore**: Automated MongoDB backups with recovery scripts
- **Monitoring**: Real-time system health dashboard

### ✅ Security
- JWT authentication with refresh tokens
- Role-based access control (admin, accountant, user)
- Audit logging for all actions
- Input validation and sanitization
- CORS protection

## 🚀 Complete Setup Guide - ARTHA + BHIV Integration

### Prerequisites

**Required Software:**
- Node.js 18+ ([Download](https://nodejs.org/))
- Python 3.8+ ([Download](https://www.python.org/downloads/))
- Git (Optional)

**Note:** MongoDB and Redis are configured to use cloud services. No local installation required!

**Verify Installation:**
```bash
node --version    # Should show v18.x.x or higher
python --version  # Should show 3.8.x or higher
```

### 📁 Project Structure
```
Artha Integration/
├── backend/                 # ARTHA Backend (Node.js)
├── frontend/               # ARTHA Frontend (React)
├── v1-BHIV_CORE-main/    # BHIV AI Services (Python)
├── start-bhiv-simple.bat  # BHIV Startup Script
├── test-artha-bhiv.py     # Integration Test
└── diagnose-bhiv.py       # Diagnostic Tool
```

## 🎯 **RECOMMENDED: Quick Setup (5 Minutes)**

### Step 1: Start ARTHA Services

**Terminal 1 - ARTHA Backend:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\backend"
npm install
npm run dev
```
**Wait for:** `Server running in development mode on port 5000`

**Terminal 2 - ARTHA Frontend:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\frontend"
npm install
npm run dev
```
**Wait for:** `Local: http://localhost:5173/`

### Step 2: Setup BHIV Core (Minimal Version)

**Terminal 3 - BHIV Setup:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
python -m venv .venv_minimal
.venv_minimal\Scripts\activate
pip install fastapi uvicorn pydantic requests python-dotenv
```

### Step 3: Start BHIV Services (4 Terminals)

**Terminal 4 - BHIV Simple API:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python simple_api_minimal.py --port 8001
```

**Terminal 5 - BHIV MCP Bridge:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python mcp_bridge_minimal.py
```

**Terminal 6 - BHIV Web Interface:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python web_interface_minimal.py
```

**Terminal 7 - Integration Bridge:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
.venv_minimal\Scripts\activate
python integration_bridge_minimal.py
```

### Step 4: Verify Integration

**Test Connection:**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration"
python test-artha-bhiv.py
```

**Expected Output:**
```
✅ Simple API: Healthy
✅ MCP Bridge: Healthy
✅ ARTHA login successful
✅ BHIV status response received: {"enabled": true, "status": "connected"}
```

### Step 5: Access the System

1. **Open ARTHA**: http://localhost:5173
2. **Login**: admin@artha.local / admin123
3. **Dashboard** → Find "BHIV AI Integration" widget
4. **Click "Check Status"** → Should show **"Connected"** ✅
5. **Test AI**: Ask "How to record depreciation expense?"

## 🎉 Service URLs

| Service | URL | Status Check |
|---------|-----|-------------|
| **ARTHA Frontend** | http://localhost:5173 | Main Application |
| **ARTHA Backend** | http://localhost:5000 | http://localhost:5000/health |
| **BHIV Simple API** | http://localhost:8001 | http://localhost:8001/health |
| **BHIV MCP Bridge** | http://localhost:8002 | http://localhost:8002/health |
| **BHIV Web Interface** | http://localhost:8003 | http://localhost:8003/health |
| **Integration Bridge** | http://localhost:8004 | http://localhost:8004/health |

## 🔧 Alternative: Automated Startup

**Option 1: Use Batch Script (Windows)**
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration"
start-bhiv-simple.bat
```

**Option 2: Manual Commands (Reliable)**
Follow the step-by-step commands above for full control.

## 🧪 Testing & Verification

### Health Check All Services
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration"
python diagnose-bhiv.py
```

### Test ARTHA-BHIV Integration
```cmd
python test-artha-bhiv.py
```

### Manual Health Checks
```cmd
curl http://localhost:5000/health   # ARTHA Backend
curl http://localhost:8001/health   # BHIV Simple API
curl http://localhost:8002/health   # BHIV MCP Bridge
curl http://localhost:8003/health   # BHIV Web Interface
curl http://localhost:8004/health   # Integration Bridge
```

## 🐛 Troubleshooting Guide

### Issue: "BHIV Core: Disconnected"

**Solution 1: Check Service Status**
```cmd
netstat -ano | findstr :8001
netstat -ano | findstr :8002
```

**Solution 2: Restart ARTHA Backend**
```cmd
# Stop ARTHA Backend (Ctrl+C)
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\backend"
npm run dev
```

**Solution 3: Verify Environment**
Check `backend\.env` file contains:
```
BHIV_INTEGRATION_ENABLED=true
BHIV_SIMPLE_API_URL=http://localhost:8001
BHIV_MCP_BRIDGE_URL=http://localhost:8002
```

### Issue: Port Already in Use
```cmd
# Kill existing processes
taskkill /F /IM python.exe
taskkill /F /IM node.exe

# Or kill specific ports
for /f "tokens=5" %a in ('netstat -aon ^| findstr :8001') do taskkill /f /pid %a
```

### Issue: Python Virtual Environment
```cmd
# Recreate environment
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\v1-BHIV_CORE-main"
rmdir /s .venv_minimal
python -m venv .venv_minimal
.venv_minimal\Scripts\activate
pip install fastapi uvicorn pydantic requests python-dotenv
```

### Issue: Node.js Dependencies
```cmd
cd "c:\Users\Ashmit Pandey\Desktop\Artha Integration\backend"
rmdir /s node_modules
del package-lock.json
npm cache clean --force
npm install
```

### Issue: Windows Firewall
- Allow Python and Node.js through Windows Firewall
- Check antivirus software isn't blocking processes

## 📦 First-Time Setup Checklist

- [ ] **Prerequisites Installed**: Node.js 18+, Python 3.8+
- [ ] **ARTHA Backend Running**: Port 5000
- [ ] **ARTHA Frontend Running**: Port 5173
- [ ] **BHIV Services Running**: Ports 8001-8004
- [ ] **Integration Test Passed**: `python test-artha-bhiv.py`
- [ ] **ARTHA Login Working**: admin@artha.local / admin123
- [ ] **BHIV Status Connected**: Dashboard widget shows "Connected"
- [ ] **AI Response Working**: Test query returns response

## 🔄 Stopping the System

**Quick Stop (All Services):**
```cmd
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

**Graceful Stop:**
- Press `Ctrl+C` in each terminal window
- Wait for services to shut down properly

## 🎯 Success Indicators

**You know it's working when:**
1. ✅ All 6 service URLs return 200 OK
2. ✅ ARTHA Dashboard shows "BHIV Core: Connected"
3. ✅ AI responses appear in < 3 seconds
4. ✅ Test script shows all green checkmarks
5. ✅ No error messages in service windows

## 💡 Usage Examples

### AI Accounting Guidance
**Question**: "How do I record a cash sale?"
**Response**: AI provides step-by-step accounting guidance with journal entries.

### Financial Insights
**Question**: "What does my cash flow tell me?"
**Response**: AI analyzes patterns and provides actionable insights.

### Compliance Help
**Question**: "How to handle GST for services?"
**Response**: AI explains GST compliance with practical examples.

## 🔧 Advanced Configuration

### Environment Variables (backend/.env)
```bash
# BHIV Integration
BHIV_INTEGRATION_ENABLED=true
BHIV_SIMPLE_API_URL=http://localhost:8001
BHIV_MCP_BRIDGE_URL=http://localhost:8002
BHIV_WEB_INTERFACE_URL=http://localhost:8003

# Database
MONGODB_URI=mongodb+srv://...

# Redis
REDIS_HOST=redis-17252.c265.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=17252
```

### BHIV Configuration (v1-BHIV_CORE-main/.env)
```bash
# ARTHA Integration
ARTHA_API_URL=http://localhost:5000/api/v1
ARTHA_INTEGRATION_ENABLED=true
ARTHA_API_EMAIL=admin@artha.local
ARTHA_API_PASSWORD=admin123
```

## 📊 API Documentation

### BHIV AI Integration Endpoints
```bash
# Check BHIV Status
GET /api/v1/bhiv/status
Headers: { Authorization: "Bearer <token>" }

# Get AI Accounting Guidance
POST /api/v1/bhiv/guidance
Headers: { Authorization: "Bearer <token>" }
Body: { query: "How to record depreciation?" }

# Process Document with AI
POST /api/v1/bhiv/process-document
Headers: { Authorization: "Bearer <token>" }
Body: { filePath: "path/to/file.pdf", documentType: "pdf" }

# Analyze Receipt with AI
POST /api/v1/bhiv/analyze-receipt
Headers: { Authorization: "Bearer <token>" }
Body: { filePath: "path/to/receipt.jpg" }
```

### Authentication
```bash
# Register
POST /api/v1/auth/register
Body: { email, password, name }

# Login
POST /api/v1/auth/login
Body: { email, password }

# Refresh Token
POST /api/v1/auth/refresh
Body: { refreshToken }
```

### Ledger
```bash
# Get all entries
GET /api/v1/ledger/entries

# Create entry
POST /api/v1/ledger/entries
Body: { date, description, lines }

# Verify chain integrity
GET /api/v1/ledger/verify-chain

# Verify single entry
GET /api/v1/ledger/entries/:id/verify

# Get chain segment
GET /api/v1/ledger/chain-segment?startPosition=0&endPosition=100
```

### Invoices
```bash
# Get all invoices
GET /api/v1/invoices

# Create invoice
POST /api/v1/invoices
Body: { invoiceDate, dueDate, customerName, lines }

# Send invoice
POST /api/v1/invoices/:id/send

# Record payment
POST /api/v1/invoices/:id/payment
Body: { amount, paymentMethod, reference }
```

### Expenses
```bash
# Get all expenses
GET /api/v1/expenses

# Create expense
POST /api/v1/expenses
Body: { date, vendor, category, amount, taxAmount }

# Process OCR
POST /api/v1/expenses/ocr
Body: FormData with receipt file

# Approve expense
POST /api/v1/expenses/:id/approve

# Record expense
POST /api/v1/expenses/:id/record
```

### GST Filing
```bash
# Get GST summary
GET /api/v1/gst/summary?period=2025-02

# Get GSTR-1 packet
GET /api/v1/gst/filing-packet/gstr-1?period=2025-02

# Get GSTR-3B packet
GET /api/v1/gst/filing-packet/gstr-3b?period=2025-02

# Export filing packet
GET /api/v1/gst/filing-packet/export?type=gstr-1&period=2025-02
```

### Reports
```bash
# Profit & Loss
GET /api/v1/reports/profit-loss?startDate=2025-01-01&endDate=2025-12-31

# Balance Sheet
GET /api/v1/reports/balance-sheet?asOfDate=2025-12-31

# Cash Flow
GET /api/v1/reports/cash-flow?startDate=2025-01-01&endDate=2025-12-31

# Trial Balance
GET /api/v1/reports/trial-balance?asOfDate=2025-12-31

# Dashboard Summary
GET /api/v1/reports/dashboard-summary
```

## 🎓 Learning Resources

### Video Tutorials
- [ARTHA Setup Guide](https://example.com/setup)
- [BHIV Integration Tutorial](https://example.com/bhiv)
- [AI Accounting Features](https://example.com/ai-features)

### Documentation
- [API Reference](http://localhost:5000/docs) - Interactive API documentation
- [BHIV AI Guide](http://localhost:8001/docs) - AI service documentation
- [Integration Examples](./docs/examples/) - Code examples and use cases

## 🤝 Support & Community

### Getting Help
- **Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Documentation**: Comprehensive guides and tutorials

### Contributing
- Fork the repository
- Create feature branches
- Submit pull requests
- Follow coding standards

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ARTHA Team** - Core accounting system development
- **BHIV Core Team** - AI integration and services
- **Contributors** - Community contributions and feedback
- **Open Source Libraries** - FastAPI, React, Node.js, and more

---

**Version**: 2.0.0 with BHIV Integration  
**Status**: Production Ready  
**Last Updated**: January 2025  
**Maintainers**: ARTHA + BHIV Core Teamsrts/dashboard
```

### BHIV AI Integration
```bash
# Get BHIV system status
GET /api/v1/bhiv/status

# Get AI accounting guidance
POST /api/v1/bhiv/guidance
Body: { query: "How to record depreciation?" }

# Process document with AI
POST /api/v1/bhiv/process-document
Body: { filePath: "/path/to/document.pdf", documentType: "pdf" }

# Analyze receipt with AI
POST /api/v1/bhiv/analyze-receipt
Body: { filePath: "/path/to/receipt.jpg" }

# Process receipt with AI (for expenses)
POST /api/v1/expenses/:id/process-receipt
```

### Integration Bridge
```bash
# System health check
GET http://localhost:8004/health

# Process financial document
POST http://localhost:8004/process-financial-document
Body: { file_path: "document.pdf", document_type: "pdf", create_journal_entry: false }

# Create enhanced journal entry
POST http://localhost:8004/enhanced-journal-entry
Body: { description: "Office supplies", lines: [...], enhance_with_ai: true }

# Get financial summary with AI insights
GET http://localhost:8004/financial-summary
```

## API Endpoints (Legacy)

### Authentication (Legacy)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout user

### Authentication (V1)
- `POST /api/v1/auth/register` - Register new user (enhanced)
- `POST /api/v1/auth/login` - Login user (enhanced)
- `GET /api/v1/auth/me` - Get current user (enhanced)
- `POST /api/v1/auth/logout` - Logout user

### Chart of Accounts
- `GET /api/v1/accounts` - Get all accounts with filters
- `GET /api/v1/accounts/:id` - Get single account
- `POST /api/v1/accounts` - Create new account (admin/accountant)
- `PUT /api/v1/accounts/:id` - Update account (admin/accountant)
- `DELETE /api/v1/accounts/:id` - Deactivate account (admin)
- `POST /api/v1/accounts/seed` - Seed default accounts (admin)

### Ledger Management
- `GET /api/v1/ledger/entries` - Get journal entries with filters
- `GET /api/v1/ledger/entries/:id` - Get single journal entry
- `POST /api/v1/ledger/entries` - Create journal entry (admin/accountant)
- `POST /api/v1/ledger/entries/:id/post` - Post journal entry (admin/accountant)
- `POST /api/v1/ledger/entries/:id/void` - Void journal entry (admin/accountant)
- `GET /api/v1/ledger/balances` - Get account balances
- `GET /api/v1/ledger/summary` - Get ledger summary
- `GET /api/v1/ledger/verify` - Verify ledger integrity (admin)

### Legacy Ledger Routes (Backward Compatibility)
- `GET /api/v1/ledger/journal-entries` - Get journal entries (legacy)
- `POST /api/v1/ledger/journal-entries` - Create journal entry (legacy)
- `GET /api/v1/ledger/journal-entries/:id` - Get single journal entry (legacy)
- `POST /api/v1/ledger/journal-entries/:id/post` - Post journal entry (legacy)
- `POST /api/v1/ledger/journal-entries/:id/void` - Void journal entry (legacy)
- `GET /api/v1/ledger/verify-chain` - Verify ledger integrity (legacy)

### Reports
- `GET /api/v1/reports/general-ledger` - Export General Ledger as PDF (admin/accountant)

### Invoices
- `GET /api/v1/invoices` - Get all invoices with filters (admin/accountant/manager)
- `GET /api/v1/invoices/stats` - Get invoice statistics (admin/accountant/manager)
- `GET /api/v1/invoices/:id` - Get single invoice (admin/accountant/manager)
- `POST /api/v1/invoices` - Create new invoice (admin/accountant)
- `PUT /api/v1/invoices/:id` - Update invoice (admin/accountant)
- `POST /api/v1/invoices/:id/send` - Send invoice and create AR entry (admin/accountant)
- `POST /api/v1/invoices/:id/payment` - Record payment for invoice (admin/accountant)
- `POST /api/v1/invoices/:id/cancel` - Cancel invoice (admin/accountant)

### Expenses
- `GET /api/v1/expenses` - Get all expenses with filters (admin/accountant/manager)
- `GET /api/v1/expenses/stats` - Get expense statistics (admin/accountant/manager)
- `GET /api/v1/expenses/:id` - Get single expense (admin/accountant/manager/owner)
- `POST /api/v1/expenses` - Create new expense with receipt uploads (all users)
- `PUT /api/v1/expenses/:id` - Update expense with additional receipts (admin/accountant/owner)
- `POST /api/v1/expenses/:id/approve` - Approve expense (admin/accountant)
- `POST /api/v1/expenses/:id/reject` - Reject expense (admin/accountant)
- `POST /api/v1/expenses/:id/record` - Record expense in ledger (admin/accountant)
- `DELETE /api/v1/expenses/:id/receipts/:receiptId` - Delete receipt (admin/accountant/owner)

### InsightFlow (RL Experience Buffer)
- `POST /api/v1/insightflow/experience` - Log RL experience data (all authenticated users)
- `GET /api/v1/insightflow/experiences` - Get RL experiences with filters (admin)
- `GET /api/v1/insightflow/stats` - Get RL experience statistics (admin)

### Performance Monitoring
- `GET /api/v1/performance/metrics` - Get performance metrics (admin)
- `GET /api/v1/performance/health` - Get performance health status (admin)
- `POST /api/v1/performance/reset` - Reset performance metrics (admin)

### Database Optimization
- `GET /api/v1/database/stats` - Get database statistics (admin)
- `GET /api/v1/database/collections` - Get collection statistics (admin)
- `GET /api/v1/database/indexes` - Get index information (admin)
- `POST /api/v1/database/indexes` - Create all indexes (admin)
- `GET /api/v1/database/optimize` - Get optimization suggestions (admin)

### Health Check
- `GET /health` - Main API health status
- `GET /health/detailed` - Comprehensive system health
- `GET /ready` - Readiness probe (Kubernetes)
- `GET /live` - Liveness probe (Kubernetes)
- `GET /metrics` - Public performance metrics
- `GET /status` - System component status
- `GET /api/health` - Legacy health status



## 🏢 Architecture

```
artha/
├── backend/
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── services/       # Business logic
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, validation, logging
│   │   └── config/         # Configuration
│   ├── tests/              # Test suites
│   ├── scripts/            # Utilities (seed, backup)
│   └── Dockerfile.prod     # Production image
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # Route pages
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API clients
│   │   └── App.jsx         # Main component
│   └── Dockerfile.prod     # Production image
│
├── docs/
│   ├── DEPLOYMENT.md       # Deployment guide
│   └── PRAVAH_DEPLOYMENT.md # Pravah-specific guide
│
└── docker-compose*.yml     # Dev/prod orchestration
```

## 🧪 Testing

### Run all tests:
```bash
./scripts/run-all-tests.sh
```

### Run specific tests:
```bash
npm run test:ledger      # Ledger hash-chain tests
npm run test:ocr         # OCR pipeline tests
npm run test:gst         # GST filing tests
npm run test:all         # Full coverage
```

### Test Coverage:
- Authentication & Authorization (✓)
- Ledger Hash-Chain Verification (✓)
- Invoice Workflow (✓)
- Expense OCR Pipeline (✓)
- GST Filing Packets (✓)
- Financial Reports (✓)
- Health Checks (✓)

## 🔐 Security Checklist

- [x] JWT authentication with refresh tokens
- [x] Role-based access control
- [x] Input validation & sanitization
- [x] HMAC-based ledger tamper-proofing
- [x] Audit logging for all actions
- [x] Rate limiting
- [x] CORS protection
- [x] Helmet security headers
- [x] Non-root Docker containers
- [x] Secrets management (env-based)

## 📈 Production Readiness

- [x] Multi-container Docker setup
- [x] MongoDB replica set support
- [x] Redis caching layer
- [x] Load balancing ready
- [x] Health check endpoints
- [x] Automated backups
- [x] Comprehensive logging
- [x] Error handling
- [x] Database indexing optimization
- [x] Performance monitoring

## 📏 Features Added in Completion Sprint

### Day 1: Ledger Hash-Chain Hardening ✅
- Full HMAC-SHA256 hash-chain implementation
- Entry-by-entry verification
- Chain segment audit queries
- Tamper detection

### Day 2: Expense OCR Pipeline ✅
- Receipt image processing
- Vendor, date, amount extraction
- Confidence scoring
- Fallback to mock OCR (development)
- Integration with expense creation

### Day 3: GST Filing Packets ✅
- GSTR-1 generation (outward supplies)
- GSTR-3B generation (tax summary)
- CSV export functionality
- Period-based filing packets

### Day 4: CI/CD & Pravah Documentation ✅
- Complete Pravah deployment guide
- Build → Test → Deploy → Verify pipeline
- Secrets management guide
- Health check configuration

### Day 5-6: Testing & Frontend UX ✅
- Full integration test suite
- Ledger integrity status widget
- GST summary & export component
- OCR receipt scanning UI

### Day 7: Polish & Submission ✅
- Comprehensive README
- Test execution scripts
- Documentation review
- Final code quality checks

## 📆 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Full production deployment guide
- **[docs/PRAVAH_DEPLOYMENT.md](docs/PRAVAH_DEPLOYMENT.md)** - Pravah platform setup
- **[API Documentation](#-api-documentation)** - REST API reference
- **[Architecture](#-architecture)** - System design

## 🐛 Troubleshooting

### MongoDB connection issues
```bash
docker-compose -f docker-compose.dev.yml logs mongodb
docker exec artha-mongo-dev mongosh --eval "rs.status()"
```

### Backend won't start
```bash
docker logs artha-backend-dev --tail 100
# Check .env variables are set correctly
```

### Frontend blank/not loading
```bash
# Check browser console for errors
# Verify API URL in .env
# Check CORS settings
```

## 📄 License

Proprietary - BHIV Inc.

## 👥 Team

- **Nilesh** - Architecture & Coordination
- **Ishan** - InsightFlow & Compliance Alignment
- **Akash** - APIs & OCR Integration
- **You** - Full Stack Development

## 📞 Support

For issues and support:
- Create an issue on GitHub
- Email: support@artha.bhiv.in

---

**Last Updated**: December 5, 2025
**Status**: Production Ready v0.1

## 🤖 AI Features Usage

### Smart Receipt Processing
1. Upload receipt in Expenses module
2. Click "Process with AI" button
3. AI extracts vendor, amount, date, category
4. Review and approve the extracted data

### Accounting Guidance
1. Go to Dashboard → BHIV AI Integration widget
2. Ask questions like:
   - "How to record depreciation expense?"
   - "What's the difference between CGST and IGST?"
   - "How to handle advance payments?"
3. Get instant AI-powered guidance

### Document Analysis
1. Use Integration Bridge API
2. Upload financial documents (invoices, contracts, receipts)
3. Get structured data extraction and insights
4. Optionally create journal entries automatically

## 🔗 System Architecture

```
┌───────────────────┐    ┌───────────────────┐
│   ARTHA Frontend  │    │   BHIV Web UI     │
│   (Port 5173)     │    │   (Port 8003)     │
└─────────┬─────────┘    └─────────┬─────────┘
          │                        │
          │                        │
┌─────────┴────────────────────────┴─────────┐
│              Integration Bridge              │
│              (Port 8004)                   │
└─────────┬────────────────────────┬─────────┘
          │                        │
┌─────────┴─────────┐    ┌─────────┴─────────┐
│   ARTHA Backend   │    │   BHIV Core       │
│   (Port 5000)     │    │   (Ports 8001-2)  │
└─────────┬─────────┘    └─────────┬─────────┘
          │                        │
          └──────────┬───────────────┘
                     │
          ┌──────────┴───────────┐
          │   MongoDB + Redis   │
          │   (Shared Storage)  │
          └─────────────────────┘
```

## 🎯 Integration Benefits

### What BHIV Core Adds to ARTHA:
- **AI-Powered Insights**: Natural language queries for financial data
- **Smart Document Processing**: Automated receipt and invoice analysis
- **Intelligent Categorization**: AI suggests expense categories and accounts
- **Compliance Guidance**: Real-time accounting advice and best practices
- **Multi-Modal Processing**: Handle text, images, PDFs, and audio files
- **Learning System**: Adapts to your accounting patterns over time

### Enhanced Workflows:
1. **Receipt → Journal Entry**: Upload receipt → AI extracts data → Auto-create journal entry
2. **Question → Answer**: Ask accounting questions → Get instant expert guidance
3. **Document → Insights**: Upload contracts/invoices → Get structured analysis
4. **Pattern → Optimization**: System learns your preferences → Suggests improvements

---

**Integration Status**: ✅ Complete - ARTHA + BHIV Core fully integrated
**Last Updated**: December 22, 2025