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

export default router;