import Decimal from 'decimal.js';
import JournalEntry from '../models/JournalEntry.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import logger from '../config/logger.js';

/**
 * Ledger Validation Middleware - Ensures data integrity and compliance
 */

// I1: Double-entry validation
export const validateDoubleEntry = (lines) => {
  let totalDebits = new Decimal(0);
  let totalCredits = new Decimal(0);

  lines.forEach(line => {
    totalDebits = totalDebits.plus(new Decimal(line.debit || 0));
    totalCredits = totalCredits.plus(new Decimal(line.credit || 0));
  });

  if (!totalDebits.equals(totalCredits)) {
    throw new Error(`Double-entry validation failed: Debits (${totalDebits}) != Credits (${totalCredits})`);
  }
  return true;
};

// I2: Line integrity validation
export const validateLineIntegrity = (lines) => {
  lines.forEach((line, index) => {
    const debit = new Decimal(line.debit || 0);
    const credit = new Decimal(line.credit || 0);

    if (!debit.isZero() && !credit.isZero()) {
      throw new Error(`Line ${index + 1}: Cannot have both debit and credit`);
    }
    if (debit.isZero() && credit.isZero()) {
      throw new Error(`Line ${index + 1}: Must have either debit or credit`);
    }
    if (debit.isNegative() || credit.isNegative()) {
      throw new Error(`Line ${index + 1}: Amounts cannot be negative`);
    }
  });
  return true;
};

// I3: Immutability validation (middleware version)
export const validateImmutability = async (req, res, next) => {
  try {
    const entryId = req.params.id;
    const updates = req.body;
    
    if (!entryId) {
      return next();
    }

    const existingEntry = await JournalEntry.findById(entryId);
    if (!existingEntry) {
      return next();
    }

    if (existingEntry.status === 'posted') {
      const immutableFields = ['lines', 'date', 'description', 'reference'];
      const hasImmutableChanges = immutableFields.some(field => 
        updates[field] && JSON.stringify(updates[field]) !== JSON.stringify(existingEntry[field])
      );

      if (hasImmutableChanges) {
        throw new Error('Cannot modify posted entries - ledger immutability violation');
      }
    }
    
    next();
  } catch (error) {
    logger.error('Immutability validation error:', error);
    return res.status(422).json({
      success: false,
      message: error.message,
      type: 'IMMUTABILITY_VIOLATION',
      invariant: 'I3'
    });
  }
};

// Helper function for service layer
export const checkImmutability = async (entryId, updates) => {
  if (!entryId) return true;

  const existingEntry = await JournalEntry.findById(entryId);
  if (!existingEntry) return true;

  if (existingEntry.status === 'posted') {
    const immutableFields = ['lines', 'date', 'description', 'reference'];
    const hasImmutableChanges = immutableFields.some(field => 
      updates[field] && JSON.stringify(updates[field]) !== JSON.stringify(existingEntry[field])
    );

    if (hasImmutableChanges) {
      throw new Error('Cannot modify posted entries - ledger immutability violation');
    }
  }
  return true;
};

// I4: Account validation
export const validateAccounts = async (lines) => {
  const accountIds = lines.map(line => line.account);
  const accounts = await ChartOfAccounts.find({
    _id: { $in: accountIds },
    isActive: true,
  });

  if (accounts.length !== accountIds.length) {
    throw new Error('One or more accounts are invalid or inactive');
  }
  return accounts;
};

// I5: Decimal precision validation (middleware version)
export const validateDecimalAmounts = async (req, res, next) => {
  try {
    const { lines } = req.body;
    
    if (lines && Array.isArray(lines)) {
      lines.forEach((line, index) => {
        try {
          if (line.debit) {
            const debit = new Decimal(line.debit);
            if (debit.decimalPlaces() > 2) {
              throw new Error(`Line ${index + 1}: Debit precision must be max 2 decimal places`);
            }
          }
          if (line.credit) {
            const credit = new Decimal(line.credit);
            if (credit.decimalPlaces() > 2) {
              throw new Error(`Line ${index + 1}: Credit precision must be max 2 decimal places`);
            }
          }
        } catch (error) {
          throw new Error(`Line ${index + 1}: Invalid decimal format - ${error.message}`);
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error('Decimal validation error:', error);
    return res.status(400).json({
      success: false,
      message: error.message,
      type: 'DECIMAL_VALIDATION_ERROR'
    });
  }
};

// Helper function for service layer
export const checkDecimalAmounts = (lines) => {
  lines.forEach((line, index) => {
    try {
      if (line.debit) new Decimal(line.debit);
      if (line.credit) new Decimal(line.credit);
    } catch (error) {
      throw new Error(`Line ${index + 1}: Invalid decimal format`);
    }
  });
  return true;
};

// I6: Status transition validation (middleware version)
export const validateStatusTransition = async (req, res, next) => {
  try {
    const entryId = req.params.id;
    const newStatus = req.body.status;
    
    if (entryId) {
      const entry = await JournalEntry.findById(entryId);
      if (entry) {
        const currentStatus = entry.status;
        
        // Determine new status based on route
        let targetStatus = newStatus;
        if (req.route.path.includes('post')) {
          targetStatus = 'posted';
        } else if (req.route.path.includes('void')) {
          targetStatus = 'voided';
        }
        
        if (targetStatus) {
          const validTransitions = {
            draft: ['posted', 'voided'],
            posted: ['voided'],
            voided: []
          };

          if (!validTransitions[currentStatus]?.includes(targetStatus)) {
            throw new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
          }
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Status transition validation error:', error);
    return res.status(400).json({
      success: false,
      message: error.message,
      type: 'STATUS_TRANSITION_ERROR'
    });
  }
};

// Helper function for service layer
export const checkStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    draft: ['posted', 'voided'],
    posted: ['voided'],
    voided: []
  };

  if (newStatus && !validTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }
  return true;
};

// I7: Audit trail validation (middleware version)
export const validateAuditTrailRequired = async (req, res, next) => {
  try {
    const entryId = req.params.id;
    const userId = req.user._id;
    
    if (!userId) {
      throw new Error('User ID required for audit trail');
    }
    
    // For posting operations, ensure audit trail will be created
    if (entryId) {
      const entry = await JournalEntry.findById(entryId);
      if (entry) {
        // Audit trail will be handled by the controller/service
        req.auditInfo = {
          action: req.route.path.includes('post') ? 'POST' : 'VOID',
          performedBy: userId,
          timestamp: new Date()
        };
      }
    }
    
    next();
  } catch (error) {
    logger.error('Audit trail validation error:', error);
    return res.status(400).json({
      success: false,
      message: error.message,
      type: 'AUDIT_VALIDATION_ERROR'
    });
  }
};

// Helper function for service layer
export const addAuditTrailEntry = (entry, action, userId) => {
  if (['post', 'void'].includes(action)) {
    if (!userId) {
      throw new Error('User ID required for audit trail');
    }
    
    if (!entry.auditTrail) entry.auditTrail = [];
    entry.auditTrail.push({
      action: action.toUpperCase(),
      performedBy: userId,
      timestamp: new Date(),
      details: { status: entry.status }
    });
  }
  return true;
};

// Main validation middleware (works with model pre-validate hook)
export const validateLedgerEntry = async (req, res, next) => {
  try {
    const { lines, status } = req.body;
    const entryId = req.params.id;

    // Basic validations (model will handle comprehensive invariant checking)
    if (lines) {
      validateLineIntegrity(lines);
      validateDoubleEntry(lines);
      validateDecimalAmounts(lines);
      await validateAccounts(lines);
    }

    // I3: Immutability check
    await validateImmutability(entryId, req.body);

    // I6: Status transition
    if (entryId && status) {
      const existing = await JournalEntry.findById(entryId);
      if (existing) {
        validateStatusTransition(existing.status, status);
      }
    }

    next();
  } catch (error) {
    logger.error('Ledger validation error:', error);
    
    // Handle invariant violations from model
    const statusCode = error.invariant ? 422 : 400;
    const errorType = error.invariant ? 'INVARIANT_VIOLATION' : 'VALIDATION_ERROR';
    
    return res.status(statusCode).json({
      success: false,
      message: error.message,
      type: errorType,
      invariant: error.invariant,
      code: error.code,
      details: error.details
    });
  }
};

// Error handler for validation failures
export const handleLedgerValidationErrors = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Ledger validation failed',
      errors: Object.values(error.errors).map(err => err.message),
      type: 'LEDGER_VALIDATION_ERROR'
    });
  }
  
  // Handle invariant violations
  if (error.invariant) {
    return res.status(422).json({
      success: false,
      message: error.message,
      type: 'INVARIANT_VIOLATION',
      invariant: error.invariant,
      code: error.code,
      details: error.details
    });
  }
  
  next(error);
};