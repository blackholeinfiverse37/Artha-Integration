import express from 'express';
import { body } from 'express-validator';
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  recordExpense,
  deleteReceipt,
  getExpenseStats,
  processReceiptWithAI,
} from '../controllers/expense.controller.js';
import { processReceiptOCR, getOCRStatus } from '../controllers/ocr.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, auditLogger } from '../middleware/security.js';
import { uploadReceipts, handleUploadError } from '../middleware/upload.js';
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

// Validation rules
const expenseValidation = [
  body('category')
    .isIn([
      'travel',
      'meals',
      'supplies',
      'utilities',
      'rent',
      'insurance',
      'marketing',
      'professional_services',
      'equipment',
      'software',
      'other',
    ])
    .withMessage('Valid category required'),
  body('vendor').trim().notEmpty().withMessage('Vendor is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isNumeric().withMessage('Amount is required'),
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

// OCR Routes
router.route('/ocr/status').get(getOCRStatus);
router
  .route('/ocr')
  .post(
    uploadReceipts.single('receipt'),
    handleUploadError,
    processReceiptOCR
  );

// Routes
router.route('/stats').get(cacheMiddleware(900), getExpenseStats);

router
  .route('/')
  .get(cacheMiddleware(300), getExpenses)
  .post(
    requireSignedRequest,
    uploadReceipts.array('receipts', 5),
    handleUploadError,
    expenseValidation,
    validate,
    auditLogger('expense.created', 'Expense'),
    createExpense
  );

router
  .route('/:id')
  .get(cacheMiddleware(600), getExpense)
  .put(
    requireSignedRequest,
    uploadReceipts.array('receipts', 5),
    handleUploadError,
    validate,
    auditLogger('expense.updated', 'Expense'),
    updateExpense
  );

router
  .route('/:id/approve')
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    auditLogger('expense.approved', 'Expense'),
    approveExpense
  );

router
  .route('/:id/reject')
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    auditLogger('expense.rejected', 'Expense'),
    rejectExpense
  );

router
  .route('/:id/record')
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    auditLogger('expense.recorded', 'Expense'),
    recordExpense
  );

router
  .route('/:id/receipts/:receiptId')
  .delete(
    requireSignedRequest,
    deleteReceipt
  );

// BHIV AI Integration
router
  .route('/:id/process-receipt')
  .post(
    requireSignedRequest,
    auditLogger('expense.receipt_processed', 'Expense'),
    processReceiptWithAI
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
        message: 'Expense idempotency cleanup completed',
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