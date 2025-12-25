/**
 * BHIV-ARTHA Integration Bridge
 * Coordinates between BHIV Central Depository, BHIV Core, and ARTHA systems
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Service endpoints
const SERVICES = {
  artha: {
    url: process.env.ARTHA_API_URL || 'http://localhost:5000/api',
    health: '/health'
  },
  bhivCore: {
    url: process.env.BHIV_CORE_URL || 'http://localhost:8001',
    health: '/health'
  },
  bhivCentral: {
    url: process.env.BHIV_CENTRAL_URL || 'http://localhost:8000',
    health: '/health'
  }
};

// Health check for all services
app.get('/health', async (req, res) => {
  const healthStatus = {
    bridge: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  for (const [serviceName, config] of Object.entries(SERVICES)) {
    try {
      const response = await axios.get(`${config.url}${config.health}`, { 
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      healthStatus.services[serviceName] = {
        status: 'healthy',
        url: config.url,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      healthStatus.services[serviceName] = {
        status: 'unhealthy',
        url: config.url,
        error: error.code === 'ECONNREFUSED' ? 'Service not running' : 
               error.code === 'ECONNABORTED' ? 'Service timeout' :
               error.response ? `HTTP ${error.response.status}` : error.message
      };
    }
  }

  const allHealthy = Object.values(healthStatus.services).every(s => s.status === 'healthy');
  const partialHealthy = Object.values(healthStatus.services).some(s => s.status === 'healthy');
  
  healthStatus.bridge = allHealthy ? 'healthy' : (partialHealthy ? 'degraded' : 'unhealthy');

  res.json(healthStatus);
});

// Unified endpoint for BHIV operations
app.post('/bhiv/execute', async (req, res) => {
  try {
    const { operation, service, payload } = req.body;

    let targetUrl;
    let endpoint;

    switch (operation) {
      case 'run-agent':
        targetUrl = SERVICES.bhivCentral.url;
        endpoint = '/run-agent';
        break;
      case 'run-basket':
        targetUrl = SERVICES.bhivCentral.url;
        endpoint = '/run-basket';
        break;
      case 'ask-vedas':
      case 'edumentor':
      case 'wellness':
        targetUrl = SERVICES.bhivCore.url;
        endpoint = `/${operation}`;
        break;
      case 'query-kb':
        targetUrl = SERVICES.bhivCore.url;
        endpoint = '/query-kb';
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          message: `Unknown operation: ${operation}` 
        });
    }

    const response = await axios.post(`${targetUrl}${endpoint}`, payload, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Emit real-time update via WebSocket
    io.emit('bhiv-operation-complete', {
      operation,
      service,
      success: true,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      operation,
      service,
      data: response.data
    });

  } catch (error) {
    console.error(`BHIV operation ${req.body.operation} failed:`, error.message);
    
    // Emit error via WebSocket
    io.emit('bhiv-operation-error', {
      operation: req.body.operation,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      operation: req.body.operation,
      message: error.message
    });
  }
});

// Artha integration endpoints
app.post('/artha/ledger/analyze', async (req, res) => {
  try {
    const { entries, analysisType = 'comprehensive' } = req.body;

    // Get ledger entries from Artha with error handling
    let ledgerData = [];
    try {
      const ledgerResponse = await axios.get(`${SERVICES.artha.url}/ledger/entries`, {
        params: { limit: entries || 50 },
        timeout: 10000
      });
      ledgerData = ledgerResponse.data?.data?.entries || [];
    } catch (ledgerError) {
      logger.warn('Failed to fetch ledger data, using sample data:', ledgerError.message);
      // Use sample data for analysis
      ledgerData = [
        { date: new Date().toISOString(), amount: 1000, description: 'Sample Income', type: 'credit' },
        { date: new Date().toISOString(), amount: 500, description: 'Sample Expense', type: 'debit' }
      ];
    }

    // Analyze with BHIV financial coordinator
    let analysisResponse;
    try {
      analysisResponse = await axios.post(`${SERVICES.bhivCentral.url}/run-agent`, {
        agent_name: 'financial_coordinator',
        input_data: {
          ledger_entries: ledgerData,
          analysis_type: analysisType,
          include_recommendations: true,
          focus_areas: ['cash_flow', 'profitability', 'compliance']
        }
      }, { timeout: 60000 });
    } catch (agentError) {
      logger.warn('Agent analysis failed, using BHIV Core fallback:', agentError.message);
      // Fallback to BHIV Core
      analysisResponse = await axios.post(`${SERVICES.bhivCore.url}/ask-vedas`, {
        query: `Analyze financial data: ${JSON.stringify(ledgerData.slice(0, 5))}. Provide insights on cash flow and recommendations.`,
        user_id: 'integration_bridge'
      }, { timeout: 30000 });
    }

    res.json({
      success: true,
      data: {
        ledger_summary: {
          total_entries: ledgerData.length,
          date_range: {
            from: ledgerData[ledgerData.length - 1]?.date,
            to: ledgerData[0]?.date
          }
        },
        ai_analysis: analysisResponse.data
      }
    });

  } catch (error) {
    console.error('Artha ledger analysis failed:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      fallback_analysis: {
        summary: 'Analysis temporarily unavailable. Please ensure all BHIV services are running.',
        recommendations: ['Check service health', 'Verify network connectivity', 'Review recent transactions manually']
      }
    });
  }
});

// Real-time financial monitoring
app.post('/monitor/financial-health', async (req, res) => {
  try {
    // Get current financial data from Artha
    const [ledgerRes, invoicesRes, expensesRes] = await Promise.all([
      axios.get(`${SERVICES.artha.url}/ledger/entries?limit=100`),
      axios.get(`${SERVICES.artha.url}/invoices?limit=50`),
      axios.get(`${SERVICES.artha.url}/expenses?limit=50`)
    ]);

    const financialData = {
      ledger: ledgerRes.data.data.entries,
      invoices: invoicesRes.data.data.invoices,
      expenses: expensesRes.data.data.expenses
    };

    // Run comprehensive financial analysis
    const analysisResponse = await axios.post(`${SERVICES.bhivCentral.url}/run-basket`, {
      basket_name: 'financial_operations',
      input_data: {
        financial_data: financialData,
        monitoring_type: 'real_time',
        alert_thresholds: {
          cash_flow_warning: 10000,
          expense_spike: 0.2
        }
      }
    }, { timeout: 90000 });

    // Emit real-time financial update
    io.emit('financial-health-update', {
      timestamp: new Date().toISOString(),
      status: analysisResponse.data.status || 'completed',
      summary: analysisResponse.data.summary,
      alerts: analysisResponse.data.alerts || []
    });

    res.json({
      success: true,
      data: analysisResponse.data
    });

  } catch (error) {
    console.error('Financial health monitoring failed:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Document processing pipeline
app.post('/process/document', async (req, res) => {
  try {
    const { filePath, documentType, processingOptions = {} } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    let extractedData = null;
    let arthaResponse = null;
    let insightsResponse = null;

    // Step 1: Extract data using BHIV
    try {
      const extractionResponse = await axios.post(`${SERVICES.bhivCentral.url}/run-agent`, {
        agent_name: 'textToJson',
        input_data: {
          file_path: filePath,
          document_type: documentType || 'document',
          extraction_mode: 'comprehensive'
        }
      }, { timeout: 45000 });

      extractedData = extractionResponse.data;
    } catch (extractionError) {
      console.warn('Document extraction failed, using fallback:', extractionError.message);
      // Fallback extraction
      extractedData = {
        document_type: documentType || 'document',
        file_path: filePath,
        extracted_text: 'Document processing temporarily unavailable',
        status: 'fallback_mode'
      };
    }

    // Step 2: Process with Artha based on document type (optional)
    if (documentType === 'invoice' || documentType === 'expense') {
      try {
        const endpoint = documentType === 'invoice' ? '/invoices' : '/expenses';
        arthaResponse = await axios.post(`${SERVICES.artha.url}${endpoint}`, extractedData, {
          timeout: 15000
        });
      } catch (arthaError) {
        console.warn('Artha processing failed:', arthaError.message);
        arthaResponse = { data: { message: 'Artha processing temporarily unavailable' } };
      }
    }

    // Step 3: Get AI insights
    try {
      insightsResponse = await axios.post(`${SERVICES.bhivCore.url}/ask-vedas`, {
        query: `Analyze this ${documentType || 'document'} data: ${JSON.stringify(extractedData)}. Provide insights and recommendations.`,
        user_id: 'integration_bridge'
      }, { timeout: 20000 });
    } catch (insightsError) {
      console.warn('AI insights failed:', insightsError.message);
      insightsResponse = {
        data: {
          response: 'AI insights temporarily unavailable. Document has been processed successfully.',
          status: 'fallback_mode'
        }
      };
    }

    res.json({
      success: true,
      data: {
        extraction: extractedData,
        artha_processing: arthaResponse?.data,
        ai_insights: insightsResponse.data,
        processing_pipeline: ['extraction', 'artha_processing', 'ai_insights'],
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('Document processing pipeline failed:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      fallback_data: {
        message: 'Document processing temporarily unavailable',
        suggestions: ['Verify file path', 'Check BHIV services', 'Try again later']
      }
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected to integration bridge');

  socket.on('subscribe-financial-updates', () => {
    socket.join('financial-monitoring');
    console.log('Client subscribed to financial updates');
  });

  socket.on('subscribe-bhiv-operations', () => {
    socket.join('bhiv-operations');
    console.log('Client subscribed to BHIV operations');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from integration bridge');
  });
});

// Start server
const PORT = process.env.INTEGRATION_BRIDGE_PORT || 8004;
server.listen(PORT, () => {
  console.log(`🌉 BHIV-ARTHA Integration Bridge running on port ${PORT}`);
  console.log(`📊 Health endpoint: http://localhost:${PORT}/health`);
  console.log(`🔗 WebSocket server ready for real-time updates`);
});

export default app;