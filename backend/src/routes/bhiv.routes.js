import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import bhivService from '../services/bhiv.service.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get BHIV system status
router.get('/status', protect, async (req, res) => {
  try {
    const status = await bhivService.checkHealth();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('BHIV status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get accounting guidance from BHIV
router.post('/guidance', protect, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }
    
    const guidance = await bhivService.getAccountingGuidance(query);
    
    if (!guidance) {
      return res.status(503).json({ 
        success: false, 
        message: 'BHIV service unavailable' 
      });
    }
    
    res.json({ success: true, data: guidance });
  } catch (error) {
    logger.error('BHIV guidance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process document with BHIV
router.post('/process-document', protect, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { filePath, documentType } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, message: 'File path is required' });
    }
    
    const result = await bhivService.processDocument(filePath, documentType);
    
    if (!result) {
      return res.status(503).json({ 
        success: false, 
        message: 'BHIV document processing unavailable' 
      });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('BHIV document processing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Analyze expense receipt with BHIV
router.post('/analyze-receipt', protect, async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, message: 'File path is required' });
    }
    
    const analysis = await bhivService.analyzeExpenseReceipt(filePath);
    
    if (!analysis) {
      return res.status(503).json({ 
        success: false, 
        message: 'BHIV receipt analysis unavailable' 
      });
    }
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('BHIV receipt analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// NEW ENHANCED ENDPOINTS

// Get available BHIV agents
router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await bhivService.getAvailableAgents();
    res.json({ success: true, data: { agents, count: agents.length } });
  } catch (error) {
    logger.error('BHIV agents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get available BHIV baskets
router.get('/baskets', protect, async (req, res) => {
  try {
    const baskets = await bhivService.getAvailableBaskets();
    res.json({ success: true, data: { baskets, count: baskets.length } });
  } catch (error) {
    logger.error('BHIV baskets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Run specific BHIV agent
router.post('/run-agent', protect, async (req, res) => {
  try {
    const { agentName, inputData, options = {} } = req.body;
    
    if (!agentName) {
      return res.status(400).json({ success: false, message: 'Agent name is required' });
    }
    
    const result = await bhivService.runAgent(agentName, inputData, options);
    
    if (!result) {
      // Try fallback with simple guidance
      const fallbackResult = await bhivService.getAccountingGuidance(
        `Execute ${agentName} with data: ${JSON.stringify(inputData)}`
      );
      
      if (fallbackResult) {
        return res.json({ 
          success: true, 
          data: {
            ...fallbackResult,
            agent_name: agentName,
            execution_mode: 'fallback',
            message: 'Agent executed via fallback mechanism'
          }
        });
      }
      
      return res.status(503).json({ 
        success: false, 
        message: 'BHIV agent execution unavailable',
        agent_name: agentName,
        troubleshooting: {
          message: 'Agent execution failed',
          suggestions: [
            'Check if BHIV Central Depository is running on port 8000',
            'Verify agent name is correct',
            'Ensure input data format is valid'
          ]
        }
      });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('BHIV agent execution error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      agent_name: req.body.agentName
    });
  }
});

// Run BHIV basket (multi-agent workflow)
router.post('/run-basket', protect, async (req, res) => {
  try {
    const { basketName, inputData, options = {} } = req.body;
    
    if (!basketName) {
      return res.status(400).json({ success: false, message: 'Basket name is required' });
    }
    
    const result = await bhivService.runBasket(basketName, inputData, options);
    
    if (!result) {
      return res.status(503).json({ 
        success: false, 
        message: 'BHIV basket execution unavailable' 
      });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('BHIV basket execution error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get financial analysis using BHIV AI
router.post('/financial-analysis', protect, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ success: false, message: 'Financial data is required' });
    }
    
    const analysis = await bhivService.getFinancialAnalysis(data);
    
    if (!analysis) {
      // Provide fallback analysis
      const fallbackAnalysis = {
        status: 'fallback_mode',
        message: 'AI analysis temporarily unavailable',
        basic_analysis: {
          data_received: Object.keys(data).length > 0,
          timestamp: new Date().toISOString(),
          recommendations: [
            'Review your financial data manually',
            'Check cash flow trends',
            'Monitor expense patterns',
            'Ensure BHIV services are running for detailed AI analysis'
          ]
        }
      };
      
      return res.json({ 
        success: true, 
        data: fallbackAnalysis,
        warning: 'Using fallback analysis - full AI analysis unavailable'
      });
    }
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('BHIV financial analysis error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      troubleshooting: {
        message: 'Financial analysis failed',
        suggestions: [
          'Verify BHIV services are running',
          'Check data format',
          'Try with smaller dataset'
        ]
      }
    });
  }
});

// Get cashflow analysis using BHIV AI
router.post('/cashflow-analysis', protect, async (req, res) => {
  try {
    const { transactions } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ success: false, message: 'Transactions array is required' });
    }
    
    const analysis = await bhivService.getCashflowAnalysis(transactions);
    
    if (!analysis) {
      return res.status(503).json({ 
        success: false, 
        message: 'BHIV cashflow analysis unavailable' 
      });
    }
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('BHIV cashflow analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get legal guidance using BHIV AI
router.post('/legal-guidance', protect, async (req, res) => {
  try {
    const { query, context = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Legal query is required' });
    }
    
    const guidance = await bhivService.getLegalGuidance(query, context);
    
    if (!guidance) {
      return res.status(503).json({ 
        success: false, 
        message: 'BHIV legal guidance unavailable' 
      });
    }
    
    res.json({ success: true, data: guidance });
  } catch (error) {
    logger.error('BHIV legal guidance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;