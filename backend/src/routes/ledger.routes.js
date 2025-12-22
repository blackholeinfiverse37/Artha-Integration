import express from 'express';
import { body } from 'express-validator';
import {
  createEntry,
  postEntry,
  getEntries,
  getEntry,
  voidEntry,
  getBalances,
  getSummary,
  verifyChain,
  verifyChainFromEntry,
  getChainStats,
  verifyLedgerChain,
  verifyChainStatic,
  getChainSegment,
  verifySingleEntry,
  verifyImmutability,
  verifyInvariants,
  getAuditPeriod,
  createJournalEntry,
  postJournalEntry,
} from '../controllers/ledger.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, auditLogger } from '../middleware/security.js';
import { cacheMiddleware } from '../middleware/cache.js';
import {
  validateLedgerEntry,
  validateImmutability,
  validateStatusTransition,
  validateAuditTrailRequired,
  validateDecimalAmounts,
  handleLedgerValidationErrors,
} from '../middleware/ledgerValidation.js';
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
const createEntryValidation = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('lines').isArray({ min: 2 }).withMessage('At least 2 lines required'),
  body('lines.*.account').isMongoId().withMessage('Valid account ID required'),
  body('lines.*.debit').optional().isNumeric().withMessage('Debit must be a number'),
  body('lines.*.credit').optional().isNumeric().withMessage('Credit must be a number'),
];

const voidEntryValidation = [
  body('reason').trim().notEmpty().withMessage('Reason for voiding is required'),
];

// All routes require authentication
router.use(protect);

// Apply request signing verification to all routes
router.use(verifyRequestSignature);

// Apply idempotency enforcement to all routes
router.use(enforceIdempotency);

// Routes with enhanced validation
router
  .route('/entries')
  .get(cacheMiddleware(300), getEntries)
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    createEntryValidation,
    validate,
    validateDecimalAmounts,
    validateLedgerEntry,
    auditLogger('journal_entry.created', 'JournalEntry'),
    createEntry
  );

router
  .route('/entries/:id')
  .get(getEntry)
  .put(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    validateImmutability,
    validateDecimalAmounts,
    handleLedgerValidationErrors,
    // updateJournalEntry - controller method to be added
    (req, res) => res.status(501).json({ success: false, message: 'Update not implemented yet' })
  )
  .delete(
    authorize('admin'),
    requireSignedRequest,
    validateImmutability,
    handleLedgerValidationErrors,
    // deleteJournalEntry - controller method to be added
    (req, res) => res.status(501).json({ success: false, message: 'Delete not implemented yet' })
  );

router
  .route('/entries/:id/post')
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    validateAuditTrailRequired,
    validateStatusTransition,
    auditLogger('journal_entry.posted', 'JournalEntry'),
    postEntry
  );

router
  .route('/entries/:id/void')
  .post(
    authorize('accountant', 'admin'),
    requireSignedRequest,
    voidEntryValidation,
    validate,
    auditLogger('journal_entry.voided', 'JournalEntry'),
    voidEntry
  );

router.route('/balances').get(cacheMiddleware(600), getBalances);

router.route('/summary').get(cacheMiddleware(300), getSummary);

router.route('/verify').get(authorize('admin'), verifyChain);

// Enhanced hash-chain endpoints
router.route('/entries/:id/verify-chain').get(authorize('admin'), verifyChainFromEntry);
router.route('/chain-stats').get(authorize('admin'), cacheMiddleware(300), getChainStats);
router.route('/verify-chain').get(authorize('admin'), verifyLedgerChain);
router.route('/chain-segment').get(authorize('admin'), getChainSegment);
router.route('/entries/:id/verify').get(verifySingleEntry);
router.route('/entries/:id/verify-immutability').get(authorize('admin'), verifyImmutability);
router.route('/entries/:id/verify-invariants').get(authorize('admin'), verifyInvariants);

// Spec v1: New static method routes
router.route('/verify-chain-static').get(authorize('admin'), verifyChainStatic);
router.route('/audit-period').get(authorize('admin'), getAuditPeriod);

// Spec v1: Direct route handlers for invariants and chain verification
router.get(
  '/entries/:id/verify-invariants-direct',
  protect,
  authorize('admin'),
  async (req, res) => {
    try {
      const JournalEntry = (await import('../models/JournalEntry.js')).default;
      const entry = await JournalEntry.findById(req.params.id);
      if (!entry) {
        return res.status(404).json({ success: false, message: 'Not found' });
      }
      const result = await entry.verifyAllInvariants();
      return res.status(result.isValid ? 200 : 400).json({
        success: result.isValid,
        data: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get(
  '/verify-chain-direct', 
  protect,
  authorize('admin'),
  async (req, res) => {
    try {
      const JournalEntry = (await import('../models/JournalEntry.js')).default;
      const result = await JournalEntry.verifyLedgerChain();
      return res.status(result.isValid ? 200 : 400).json({
        success: result.isValid,
        data: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Legacy routes for backward compatibility with enhanced validation
router.get('/journal-entries', getEntries);
router.post('/journal-entries', 
  authorize('accountant', 'admin'), 
  requireSignedRequest,
  createEntryValidation, 
  validate, 
  validateDecimalAmounts,
  validateLedgerEntry, 
  auditLogger('journal_entry.created', 'JournalEntry'), 
  createEntry
);
router.get('/journal-entries/:id', getEntry);
router.post('/journal-entries/:id/post', 
  authorize('accountant', 'admin'), 
  requireSignedRequest,
  validateAuditTrailRequired,
  validateStatusTransition,
  auditLogger('journal_entry.posted', 'JournalEntry'), 
  postEntry
);
router.post('/journal-entries/:id/void', 
  authorize('accountant', 'admin'), 
  requireSignedRequest,
  voidEntryValidation, 
  validate, 
  auditLogger('journal_entry.voided', 'JournalEntry'), 
  voidEntry
);
router.get('/verify-chain', authorize('admin'), verifyChain);

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
        message: 'Cleanup completed',
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      logger.error('[Idempotency] Cleanup failed', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: error.message,
      });
    }
  }
);

// Add validation error handler
router.use(handleLedgerValidationErrors);

export default router;