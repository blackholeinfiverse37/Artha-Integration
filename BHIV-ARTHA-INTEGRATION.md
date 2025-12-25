# BHIV-ARTHA Integration Guide

## Overview

This integration connects the ARTHA accounting system with the BHIV AI ecosystem, providing intelligent financial analysis, document processing, and business insights through a comprehensive multi-agent system.

## Architecture

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

## Components

### 1. BHIV Central Depository (Port 8000)
- **Main API**: Multi-agent orchestration system
- **Agents**: Financial coordinator, cashflow analyzer, law agent, text-to-JSON converter
- **Baskets**: Pre-configured multi-agent workflows
- **Admin Panel**: http://localhost:8000/docs

### 2. BHIV Core (Port 8001)
- **Simple API**: Knowledge-based AI services
- **Endpoints**: ask-vedas, edumentor, wellness, query-kb
- **Documentation**: http://localhost:8001/docs

### 3. Integration Bridge (Port 8004)
- **Coordination Layer**: Routes requests between systems
- **Real-time Updates**: WebSocket support for live monitoring
- **Health Monitoring**: http://localhost:8004/health

### 4. ARTHA Backend Integration
- **Enhanced BHIV Service**: Unified access to all BHIV capabilities
- **New Endpoints**: Agent execution, basket workflows, financial analysis
- **Fallback Support**: Graceful degradation when services are unavailable

## Quick Start

### 1. Start All Services
```bash
# Run the comprehensive startup script
start-integrated-system.bat
```

This will start:
- BHIV Core (Port 8001)
- BHIV Central Depository (Port 8000)
- Integration Bridge (Port 8004)
- ARTHA Backend (Port 5000)
- ARTHA Frontend (Port 5173)

### 2. Verify Integration
```bash
# Run comprehensive integration tests
python test-bhiv-artha-integration.py
```

### 3. Access Services
- **ARTHA Frontend**: http://localhost:5173
- **BHIV Central Admin**: http://localhost:8000/docs
- **BHIV Core Docs**: http://localhost:8001/docs
- **Integration Health**: http://localhost:8004/health

## API Endpoints

### ARTHA BHIV Integration Endpoints

#### Basic Endpoints
- `GET /api/v1/bhiv/status` - Get BHIV system status
- `POST /api/v1/bhiv/guidance` - Get AI accounting guidance
- `POST /api/v1/bhiv/analyze-receipt` - Analyze expense receipts

#### Enhanced Endpoints
- `GET /api/v1/bhiv/agents` - List available BHIV agents
- `GET /api/v1/bhiv/baskets` - List available agent baskets
- `POST /api/v1/bhiv/run-agent` - Execute specific agent
- `POST /api/v1/bhiv/run-basket` - Execute agent workflow
- `POST /api/v1/bhiv/financial-analysis` - Get AI financial analysis
- `POST /api/v1/bhiv/cashflow-analysis` - Get cashflow insights
- `POST /api/v1/bhiv/legal-guidance` - Get legal advice

### Integration Bridge Endpoints

#### Core Operations
- `GET /health` - Bridge and service health status
- `POST /bhiv/execute` - Unified BHIV operation execution

#### Specialized Workflows
- `POST /artha/ledger/analyze` - Analyze ARTHA ledger with AI
- `POST /monitor/financial-health` - Real-time financial monitoring
- `POST /process/document` - Complete document processing pipeline

## Available BHIV Agents

### Financial Agents
- **financial_coordinator**: Comprehensive financial analysis
- **cashflow_analyzer**: Cash flow analysis and projections
- **auto_diagnostics**: Automated financial health checks

### Document Processing Agents
- **textToJson**: Extract structured data from documents
- **image_agent**: Process images and receipts
- **archive_agent**: Document archival and retrieval

### Advisory Agents
- **law_agent**: Legal guidance and compliance
- **goal_recommender**: Business goal recommendations
- **workflow**: Process optimization

### Knowledge Agents
- **gurukul**: Educational content and training
- **vedic_quiz_agent**: Interactive learning
- **sanskrit_parser**: Ancient text analysis

## Agent Baskets (Workflows)

### Financial Operations
- **financial_operations**: Complete financial analysis workflow
- **Cashflow + Law agent**: Combined financial and legal analysis
- **coordinator_test**: Financial coordination testing

### Document Processing
- **text_to_json_test**: Document extraction testing
- **multi_agent_test**: Multi-step document processing

### Monitoring
- **finance_daily_check**: Daily financial health monitoring
- **workflow_optimizer**: Process optimization analysis

## Usage Examples

### 1. Run Financial Analysis
```javascript
// Via ARTHA API
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

### 2. Process Document
```javascript
// Via Integration Bridge
const response = await fetch('http://localhost:8004/process/document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filePath: '/path/to/invoice.pdf',
    documentType: 'invoice'
  })
});
```

### 3. Execute Agent Basket
```javascript
// Via ARTHA API
const response = await fetch('/api/v1/bhiv/run-basket', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    basketName: 'financial_operations',
    inputData: {
      financial_data: data,
      analysis_type: 'comprehensive'
    }
  })
});
```

## Environment Configuration

Add to your `.env` file:

```env
# BHIV Integration
BHIV_INTEGRATION_ENABLED=true
BHIV_SIMPLE_API_URL=http://localhost:8001
BHIV_MCP_BRIDGE_URL=http://localhost:8002
BHIV_CENTRAL_DEPOSITORY_URL=http://localhost:8000
BHIV_AGENT_RUNNER_URL=http://localhost:8000
INTEGRATION_BRIDGE_PORT=8004

# Redis (for BHIV Central Depository)
REDIS_HOST=localhost
REDIS_PORT=6379

# MongoDB (for BHIV Central Depository)
MONGO_URI=mongodb://localhost:27017/bhiv_central
```

## Troubleshooting

### Common Issues

1. **Services Not Starting**
   - Ensure all dependencies are installed
   - Check port availability
   - Run `start-integrated-system.bat`

2. **Integration Tests Failing**
   - Verify all services are running
   - Check network connectivity
   - Review service logs

3. **Agent Execution Errors**
   - Ensure BHIV Central Depository is running
   - Check agent availability via `/agents` endpoint
   - Verify input data format

### Health Checks

```bash
# Check individual services
curl http://localhost:8000/health  # BHIV Central
curl http://localhost:8001/health  # BHIV Core
curl http://localhost:8004/health  # Integration Bridge
curl http://localhost:5000/api/health  # ARTHA Backend
```

### Log Locations
- ARTHA Backend: `backend/logs/`
- BHIV Central: Console output
- BHIV Core: Console output
- Integration Bridge: Console output

## Advanced Features

### Real-time Monitoring
The integration bridge provides WebSocket support for real-time updates:

```javascript
const socket = io('http://localhost:8004');
socket.on('financial-health-update', (data) => {
  console.log('Financial update:', data);
});
```

### Service Priority
The integration uses intelligent service routing:
- **Agent Tasks**: BHIV Central Depository (primary)
- **Knowledge Queries**: BHIV Core (primary)
- **Document Processing**: BHIV Central Depository (primary)

### Fallback Mechanisms
- Automatic failover between BHIV services
- Graceful degradation when services are unavailable
- Comprehensive error handling and logging

## Support

For issues or questions:
1. Check the integration test results
2. Review service health endpoints
3. Examine service logs
4. Verify environment configuration

The integration is designed to be robust and self-healing, with comprehensive monitoring and fallback capabilities to ensure reliable operation.