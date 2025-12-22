import express from 'express';
import { body } from 'express-validator';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  sendInvoice,
  recordPayment,
  cancelInvoice,
  getInvoiceStats,
} from '../controllers/invoice.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, auditLogger } from '../middleware/security.js';
import { cacheMiddleware } from '../middleware/cache.js';
import {
  verifyRequestSignature,
  requireSignedRequest,
} from '../middleware/requestSigning.js';
import {
  enforceIdempotency,
  requireIdempotencyKey,
} from '../middleware/idempotency.js';

const router = express.Router();

// Validation rules with support for both items and lines
const invoiceValidation = [
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('invoiceDate').isISO8601().withMessage('Valid invoice date required'),
  body('dueDate').isISO8601().withMessage('Valid due date required'),
  // Support both items and lines for backward compatibility
  body().custom((value, { req }) => {
    const hasItems = req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0;
    const hasLines = req.body.lines && Array.isArray(req.body.lines) && req.body.lines.length > 0;
    
    if (!hasItems && !hasLines) {
      throw new Error('At least 1 line item required (use either items or lines field)');
    }
    return true;
  }),
  // Validate monetary fields as numeric strings
  body('subtotal').optional().isString().matches(/^\d+(\.\d{1,2})?$/).withMessage('Invalid subtotal format'),
  body('totalAmount').optional().isString().matches(/^\d+(\.\d{1,2})?$/).withMessage('Invalid total amount format'),
  body('taxAmount').optional().isString().matches(/^\d+(\.\d{1,2})?$/).withMessage('Invalid tax amount format'),
];

const paymentValidation = [
  body('amount').isNumeric().withMessage('Payment amount is required'),
  body('paymentMethod')
    .isIn(['cash', 'bank_transfer', 'check', 'card', 'upi', 'other'])
    .withMessage('Valid payment method required'),
];

// All routes require authentication
router.use(protect);

// Apply request signing verification
router.use(verifyRequestSignature);

// Apply idempotency enforcement
router.use(enforceIdempotency);

// Routes
router.route('/stats').get(cacheMiddleware(900), getInvoiceStats);

router
  .route('/')
  .get(cacheMiddleware(300), getInvoices)
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    invoiceValidation,
    validate,
    auditLogger('invoice.created', 'Invoice'),
    createInvoice
  );

router
  .route('/:id')
  .get(cacheMiddleware(600), getInvoice)
  .put(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    validate,
    auditLogger('invoice.updated', 'Invoice'),
    updateInvoice
  );

router
  .route('/:id/send')
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    auditLogger('invoice.sent', 'Invoice'),
    sendInvoice
  );

router
  .route('/:id/payment')
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    paymentValidation,
    validate,
    auditLogger('invoice.payment_recorded', 'Invoice'),
    recordPayment
  );

router
  .route('/:id/cancel')
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    auditLogger('invoice.cancelled', 'Invoice'),
    cancelInvoice
  );

// Admin cleanup endpoint for expired idempotency records
router.get(
  '/admin/idempotency/cleanup',
  protect,
  authorize('admin'),
  async (req, res) => {
    try {
      const IdempotencyRecord = req.app.get('IdempotencyRecord');
      if (!IdempotencyRecord) {
        return res.status(500).json({
          success: false,
          message: 'IdempotencyRecord model not available',
        });
      }

      const result = await IdempotencyRecord.cleanupExpired();
      return res.json({
        success: true,
        message: 'Invoice idempotency cleanup completed',
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: error.message,
      });
    }
  }
);

export default router;