import ocrService from '../services/ocr.service.js';
import logger from '../config/logger.js';
import fs from 'fs';

// @desc    Process receipt OCR
// @route   POST /api/v1/expenses/ocr
// @access  Private
export const processReceiptOCR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt file uploaded',
      });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Only image files (JPEG, PNG, WebP) are supported',
      });
    }

    const result = await ocrService.processReceiptFile(req.file.path);

    if (!result.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Failed to process receipt',
        error: result.error,
      });
    }

    if (result.data.confidence < 50) {
      logger.warn('Low confidence OCR result, deleting file', {
        file: req.file.filename,
        confidence: result.data.confidence,
      });
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        ...result.data,
        fileName: req.file.filename,
        filePath: req.file.path,
      },
    });
  } catch (error) {
    logger.error('Process receipt OCR error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get OCR status/health
// @route   GET /api/v1/expenses/ocr/status
// @access  Private
export const getOCRStatus = async (req, res) => {
  try {
    const ocrEnabled = process.env.OCR_ENABLED !== 'false';

    res.json({
      success: true,
      data: {
        ocrEnabled,
        status: ocrEnabled ? 'ready' : 'disabled',
        message: ocrEnabled
          ? 'OCR service is available'
          : 'OCR service is disabled (using mock extraction)',
      },
    });
  } catch (error) {
    logger.error('Get OCR status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
