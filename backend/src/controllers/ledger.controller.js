import ledgerService from '../services/ledger.service.js';
import JournalEntry from '../models/JournalEntry.js';
import logger from '../config/logger.js';
import { validateAuditTrailRequired } from '../middleware/ledgerValidation.js';

// @desc    Create journal entry
// @route   POST /api/v1/ledger/entries
// @access  Private (accountant, admin)
export const createEntry = async (req, res) => {
  try {
    const entry = await ledgerService.createJournalEntry(req.body, req.user._id);

    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error('Create entry error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Post journal entry
// @route   POST /api/v1/ledger/entries/:id/post
// @access  Private (accountant, admin)
export const postEntry = async (req, res) => {
  try {
    // Get entry for audit trail validation
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found',
      });
    }

    // Validate audit trail requirements
    validateAuditTrailRequired(entry, 'post', req.user._id);
    
    const postedEntry = await ledgerService.postJournalEntry(req.params.id, req.user._id);

    res.json({
      success: true,
      data: postedEntry,
    });
  } catch (error) {
    logger.error('Post entry error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get journal entries
// @route   GET /api/v1/ledger/entries
// @access  Private
export const getEntries = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      account: req.query.account,
      search: req.query.search,
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'date',
      sortOrder: req.query.sortOrder || 'desc',
    };

    const result = await ledgerService.getJournalEntries(filters, pagination);

    res.json({
      success: true,
      data: result.entries,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get entries error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single journal entry
// @route   GET /api/v1/ledger/entries/:id
// @access  Private
export const getEntry = async (req, res) => {
  try {
    const entry = await ledgerService.getJournalEntryById(req.params.id);

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error('Get entry error:', error);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Void journal entry
// @route   POST /api/v1/ledger/entries/:id/void
// @access  Private (accountant, admin)
export const voidEntry = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason for voiding is required',
      });
    }

    // Get entry for audit trail validation
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found',
      });
    }

    // Validate audit trail requirements
    validateAuditTrailRequired(entry, 'void', req.user._id);

    const result = await ledgerService.voidJournalEntry(req.params.id, req.user._id, reason);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Void entry error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get account balances
// @route   GET /api/v1/ledger/balances
// @access  Private
export const getBalances = async (req, res) => {
  try {
    const filters = {
      accountType: req.query.accountType,
      minBalance: req.query.minBalance,
      maxBalance: req.query.maxBalance,
      search: req.query.search,
    };

    const balances = await ledgerService.getAccountBalances(filters);

    res.json({
      success: true,
      data: balances,
    });
  } catch (error) {
    logger.error('Get balances error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get ledger summary
// @route   GET /api/v1/ledger/summary
// @access  Private
export const getSummary = async (req, res) => {
  try {
    const summary = await ledgerService.getLedgerSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify ledger chain integrity
// @route   GET /api/v1/ledger/verify
// @access  Private (admin)
export const verifyChain = async (req, res) => {
  try {
    const result = await ledgerService.verifyLedgerChain();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Verify chain error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify chain from specific entry
// @route   GET /api/v1/ledger/entries/:id/verify-chain
// @access  Private (admin)
export const verifyChainFromEntry = async (req, res) => {
  try {
    const result = await ledgerService.verifyChainFromEntry(req.params.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Verify chain from entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get chain statistics
// @route   GET /api/v1/ledger/chain-stats
// @access  Private (admin)
export const getChainStats = async (req, res) => {
  try {
    const stats = await ledgerService.getChainStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get chain stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify entire ledger chain (Enhanced with static method)
// @route   GET /api/v1/ledger/verify-chain
// @access  Private (admin)
export const verifyLedgerChain = async (req, res) => {
  try {
    const result = await ledgerService.verifyLedgerChain();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Verify chain error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify ledger chain using static method (Spec v1)
// @route   GET /api/v1/ledger/verify-chain-static
// @access  Private (admin)
export const verifyChainStatic = async (req, res) => {
  try {
    const result = await JournalEntry.verifyLedgerChain();

    res.json({
      success: true,
      data: {
        ...result,
        method: 'static',
        message: result.isValid
          ? 'Ledger chain verified using static method'
          : 'Chain verification failed using static method',
      },
    });
  } catch (error) {
    logger.error('Verify chain static error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get chain segment for audit
// @route   GET /api/v1/ledger/chain-segment
// @access  Private (admin)
export const getChainSegment = async (req, res) => {
  try {
    const { startPosition = 0, endPosition = 100 } = req.query;

    if (isNaN(startPosition) || isNaN(endPosition)) {
      return res.status(400).json({
        success: false,
        message: 'startPosition and endPosition must be numbers',
      });
    }

    const segment = await ledgerService.getChainSegment(
      parseInt(startPosition),
      parseInt(endPosition)
    );

    res.json({
      success: true,
      data: {
        segment,
        range: { 
          startPosition: parseInt(startPosition), 
          endPosition: parseInt(endPosition) 
        },
        count: segment.length,
      },
    });
  } catch (error) {
    logger.error('Get chain segment error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify single entry hash
// @route   GET /api/v1/ledger/entries/:id/verify
// @access  Private
export const verifySingleEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found',
      });
    }

    // SECURITY FIX: Never default to true for hash verification
    if (!entry.verifyHash || typeof entry.verifyHash !== 'function') {
      logger.error('Hash verification method missing for entry:', entry.entryNumber);
      return res.status(500).json({
        success: false,
        message: 'Entry hash verification method not available - data integrity error',
        data: {
          entryNumber: entry.entryNumber,
          error: 'VERIFICATION_METHOD_MISSING'
        }
      });
    }

    // Standardize field names for consistency
    const prevHashValue = entry.prevHash || entry.prev_hash || '0';
    const isValid = entry.verifyHash();
    const computedHash = JournalEntry.computeHash(entry.toObject(), prevHashValue);

    // Spec v1: Verify immutability for posted entries
    let immutabilityCheck = { isValid: true, message: 'Not applicable' };
    if (entry.status === 'posted' && entry.validateImmutability) {
      immutabilityCheck = entry.validateImmutability();
    }

    res.json({
      success: true,
      data: {
        entryNumber: entry.entryNumber,
        hash: entry.hash || entry.immutable_hash,
        computedHash,
        isValid,
        chainPosition: entry.chainPosition,
        prevHash: entry.prevHash || entry.prev_hash,
        status: entry.status,
        immutabilityCheck,
        message: isValid && immutabilityCheck.isValid
          ? 'Entry hash and immutability verified' 
          : 'Entry verification failed - possible tampering',
      },
    });
  } catch (error) {
    logger.error('Verify entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify entry immutability (Spec v1)
// @route   GET /api/v1/ledger/entries/:id/verify-immutability
// @access  Private (admin)
export const verifyImmutability = async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found',
      });
    }

    if (entry.status !== 'posted') {
      return res.json({
        success: true,
        data: {
          entryNumber: entry.entryNumber,
          status: entry.status,
          message: 'Immutability check only applies to posted entries',
          isValid: true
        },
      });
    }

    const immutabilityCheck = entry.validateImmutability();

    res.json({
      success: true,
      data: {
        entryNumber: entry.entryNumber,
        status: entry.status,
        ...immutabilityCheck,
      },
    });
  } catch (error) {
    logger.error('Verify immutability error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify all invariants for entry (Spec v1)
// @route   GET /api/v1/ledger/entries/:id/verify-invariants
// @access  Private (admin)
export const verifyInvariants = async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found',
      });
    }

    const verification = await entry.verifyAllInvariants();

    res.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    logger.error('Verify invariants error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get audit period entries (Spec v1)
// @route   GET /api/v1/ledger/audit-period
// @access  Private (admin)
export const getAuditPeriod = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const entries = await ledgerService.getAuditPeriod(startDate, endDate);

    res.json({
      success: true,
      data: {
        entries,
        period: { startDate, endDate },
        count: entries.length,
      },
    });
  } catch (error) {
    logger.error('Get audit period error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Legacy alias for backward compatibility
export const createJournalEntry = createEntry;
export const postJournalEntry = postEntry;