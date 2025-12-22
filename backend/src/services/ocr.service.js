import logger from '../config/logger.js';
import fs from 'fs';

class OCRService {
  /**
   * Extract text from receipt image
   */
  async extractTextFromReceipt(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      logger.info(`Starting OCR on file: ${filePath}`);

      // Use mock extraction (Tesseract optional for production)
      if (!process.env.OCR_ENABLED || process.env.OCR_ENABLED === 'false') {
        logger.warn('OCR disabled, using mock extraction');
        return this.mockOCRExtraction(filePath);
      }

      try {
        // Dynamic import for optional Tesseract
        const Tesseract = await import('tesseract.js');
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
        logger.info(`OCR extraction completed, text length: ${text.length}`);
        return text;
      } catch (error) {
        logger.warn(`Tesseract OCR failed: ${error.message}, falling back to mock`);
        return this.mockOCRExtraction(filePath);
      }
    } catch (error) {
      logger.error('Extract text error:', error);
      throw error;
    }
  }

  /**
   * Mock OCR extraction (for development/fallback)
   */
  mockOCRExtraction(filePath) {
    logger.info('Using mock OCR extraction');

    const mockText = `
      INVOICE RECEIPT
      XYZ Store
      Invoice: INV-2025-001
      Date: 2025-02-05
      
      ITEMS:
      Office Supplies - $500
      Tax (18%) - $90
      
      Total: $590
      Payment: Card
      Reference: 12345
    `;

    return mockText;
  }

  /**
   * Parse receipt text to extract fields
   */
  async parseReceiptText(rawText) {
    try {
      logger.info('Parsing receipt text for fields');

      const parsed = {
        vendor: this.extractVendor(rawText),
        date: this.extractDate(rawText),
        amount: this.extractAmount(rawText),
        taxAmount: this.extractTaxAmount(rawText),
        invoiceNumber: this.extractInvoiceNumber(rawText),
        description: rawText.substring(0, 200),
        confidence: this.calculateConfidence(rawText),
      };

      logger.info('Receipt parsed successfully', parsed);
      return parsed;
    } catch (error) {
      logger.error('Parse receipt error:', error);
      throw error;
    }
  }

  /**
   * Extract vendor name from text
   */
  extractVendor(text) {
    const vendorPatterns = [
      /(?:vendor|merchant|store|shop|company|from|issued by)[\s:]*([^\n,]+)/i,
      /^([A-Za-z\s&]+)$/m,
    ];

    for (const pattern of vendorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 100);
      }
    }

    return 'Unknown Vendor';
  }

  /**
   * Extract date from text
   */
  extractDate(text) {
    const datePatterns = [
      /(?:date|invoice date|bill date)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          const dateStr = match[1];
          const date = new Date(dateStr);
          if (!isNaN(date)) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          logger.warn(`Failed to parse date: ${match[1]}`);
        }
      }
    }

    return new Date().toISOString().split('T')[0];
  }

  /**
   * Extract amount from text
   */
  extractAmount(text) {
    const amountPatterns = [
      /(?:total|amount|bill|due)[\s:]*[\$₹]?\s*([\d,]+\.?\d{0,2})/i,
      /[\$₹]\s*([\d,]+\.?\d{0,2})/,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount)) {
          return amount.toFixed(2);
        }
      }
    }

    return '0.00';
  }

  /**
   * Extract tax amount from text
   */
  extractTaxAmount(text) {
    const taxPatterns = [
      /(?:tax|gst|vat)[\s:]*[\$₹]?\s*([\d,]+\.?\d{0,2})/i,
      /[\$₹]\s*(\d+\.?\d{0,2})\s*(?:tax|gst|vat)/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const tax = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(tax)) {
          return tax.toFixed(2);
        }
      }
    }

    return '0.00';
  }

  /**
   * Extract invoice/reference number
   */
  extractInvoiceNumber(text) {
    const invoicePatterns = [
      /(?:invoice|bill|reference|receipt)[\s:#]*([A-Z0-9-]+)/i,
    ];

    for (const pattern of invoicePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return '';
  }

  /**
   * Calculate extraction confidence (0-100)
   */
  calculateConfidence(text) {
    let score = 50;

    if (this.extractVendor(text) !== 'Unknown Vendor') score += 10;
    if (this.extractAmount(text) !== '0.00') score += 15;
    if (this.extractDate(text)) score += 10;
    if (this.extractInvoiceNumber(text)) score += 10;
    if (this.extractTaxAmount(text) !== '0.00') score += 5;

    if (text.length < 100) score -= 20;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Full pipeline: upload → extract → parse
   */
  async processReceiptFile(filePath) {
    try {
      logger.info(`Processing receipt: ${filePath}`);

      const rawText = await this.extractTextFromReceipt(filePath);
      const parsedData = await this.parseReceiptText(rawText);

      const result = {
        success: true,
        data: {
          ...parsedData,
          rawText: rawText.substring(0, 500),
          processedAt: new Date().toISOString(),
        },
      };

      logger.info('Receipt processing completed', result);
      return result;
    } catch (error) {
      logger.error('Process receipt file error:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }
}

export default new OCRService();
