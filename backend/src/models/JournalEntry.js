import mongoose from 'mongoose';
import crypto from 'crypto';
import Decimal from 'decimal.js';
import logger from '../config/logger.js';

const journalLineSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts',
    required: true,
  },
  debit: {
    type: String,
    default: '0',
    validate: {
      validator: function(v) {
        try {
          new Decimal(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid decimal value for debit'
    },
  },
  credit: {
    type: String,
    default: '0',
    validate: {
      validator: function(v) {
        try {
          new Decimal(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid decimal value for credit'
    },
  },
  description: String,
}, { _id: false });

const journalEntrySchema = new mongoose.Schema({
  entryNumber: {
    type: String,
    unique: true,
    // Format: JE-YYYYMMDD-XXXX
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  description: {
    type: String,
    required: true,
  },
  lines: {
    type: [journalLineSchema],
    validate: {
      validator: function(lines) {
        return lines && lines.length >= 2;
      },
      message: 'Journal entry must have at least 2 lines',
    },
  },
  reference: {
    type: String,
    // External reference: invoice number, expense ID, etc.
  },
  status: {
    type: String,
    enum: ['draft', 'posted', 'voided'],
    default: 'draft',
    index: true,
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  postedAt: Date,
  // Spec v1: Voiding information
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'User who voided this entry',
  },
  voidReason: {
    type: String,
    maxlength: 500,
    description: 'Reason for voiding entry',
  },
  voidedAt: {
    type: Date,
    description: 'Timestamp when entry was voided',
  },
  
  // Enhanced hash-chain fields
  prevHash: {
    type: String,
    default: '0',
    index: true,
  },
  hash: {
    type: String,
    index: true,
  },
  chainPosition: {
    type: Number,
    default: 0,
    index: true,
  },
  hashTimestamp: {
    type: Date,
    default: Date.now,
  },
  
  // Spec v1: Immutability markers
  immutable_hash: {
    type: String,
    description: 'HMAC signature of immutable fields (added on post)',
  },
  prev_hash: {
    type: String,
    default: '0',
  },
  immutable_chain_valid: {
    type: Boolean,
    default: true,
  },
  
  // Approval workflow
  approvals: [{
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    comment: String,
  }],
  
  // Audit trail
  auditTrail: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: mongoose.Schema.Types.Mixed,
  }],
  
  // Metadata
  tags: [String],
  attachments: [String],
  
  // Spec v1: Version for optimistic locking
  __v: {
    type: Number,
    select: false,
  },
}, {
  timestamps: true,
  versionKey: '__v',
});

// Additional indexes for performance
journalEntrySchema.index({ entryNumber: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ date: -1 });
journalEntrySchema.index({ status: 1, date: -1 });
journalEntrySchema.index({ 'lines.account': 1 });
journalEntrySchema.index({ 'lines.account': 1, date: -1 });
journalEntrySchema.index({ postedBy: 1 });
journalEntrySchema.index({ reference: 1 });
journalEntrySchema.index({ tags: 1 });

// Hash-chain indexes
journalEntrySchema.index({ chainPosition: 1, status: 1 });
journalEntrySchema.index({ hash: 1, prevHash: 1 });
journalEntrySchema.index({ prevHash: 1 });

// Static method to compute hash for an entry
journalEntrySchema.statics.computeHash = function(entryData, prevHash = '0') {
  // Stable field ordering for hash computation
  const stableData = {
    entryNumber: entryData.entryNumber,
    date: entryData.date?.toISOString ? entryData.date.toISOString() : new Date(entryData.date).toISOString(),
    description: entryData.description,
    lines: (entryData.lines || [])
      .map(line => ({
        account: line.account?.toString(),
        debit: line.debit || '0',
        credit: line.credit || '0',
      }))
      .sort((a, b) => a.account.localeCompare(b.account)),
    status: entryData.status,
    reference: entryData.reference || '',
    prevHash: prevHash,
  };

  const payload = JSON.stringify(stableData);
  const hmacSecret = process.env.HMAC_SECRET || 'dev_secret';

  return crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
};

// Instance method to verify hash
journalEntrySchema.methods.verifyHash = function() {
  const computedHash = this.constructor.computeHash(this.toObject(), this.prevHash);
  return computedHash === this.hash;
};

// Spec v1: Compute immutable hash for posted entries
journalEntrySchema.methods.computeImmutableHash = function() {
  if (this.status !== 'posted') {
    return null;
  }
  
  const immutableFields = {
    entryNumber: this.entryNumber,
    date: this.date.toISOString(),
    description: this.description,
    lines: this.lines.map(line => ({
      account: line.account.toString(),
      debit: line.debit,
      credit: line.credit,
      description: line.description || ''
    })),
    reference: this.reference || '',
    postedAt: this.postedAt?.toISOString(),
    postedBy: this.postedBy?.toString()
  };
  
  const payload = JSON.stringify(immutableFields);
  const hmacSecret = process.env.HMAC_SECRET || 'dev_secret';
  
  return crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
};

// Spec v1: Validate immutability
journalEntrySchema.methods.validateImmutability = function() {
  if (this.status !== 'posted' || !this.immutable_hash) {
    return { isValid: true, message: 'Entry not posted or no immutable hash' };
  }
  
  const computedHash = this.computeImmutableHash();
  const isValid = computedHash === this.immutable_hash;
  
  return {
    isValid,
    message: isValid ? 'Immutability verified' : 'Immutability violation detected',
    expected: this.immutable_hash,
    computed: computedHash
  };
};

// Instance method to verify entire chain from this entry back to genesis
journalEntrySchema.methods.verifyChainFromEntry = async function() {
  const JournalEntry = this.constructor;
  const errors = [];
  let currentEntry = this;

  // Start from this entry and walk backwards
  for (let i = 0; i < 1000; i++) {
    if (!currentEntry.verifyHash()) {
      errors.push({
        position: currentEntry.chainPosition,
        entryNumber: currentEntry.entryNumber,
        issue: 'Hash mismatch',
        expected: currentEntry.hash,
        computed: JournalEntry.computeHash(currentEntry.toObject(), currentEntry.prevHash),
      });
      break;
    }

    // If at genesis (prevHash is '0'), we've verified the chain
    if (currentEntry.prevHash === '0') {
      return {
        isValid: errors.length === 0,
        totalEntriesVerified: i + 1,
        errors,
      };
    }

    // Find previous entry
    currentEntry = await JournalEntry.findOne({ hash: currentEntry.prevHash });

    if (!currentEntry) {
      errors.push({
        position: i,
        issue: 'Previous entry not found',
        prevHash: currentEntry?.prevHash,
      });
      break;
    }
  }

  return {
    isValid: false,
    totalEntriesVerified: 1000,
    errors,
  };
};

// Legacy method for backward compatibility
journalEntrySchema.methods.calculateHash = function() {
  const payload = {
    entryNumber: this.entryNumber || 'TEMP',
    date: this.date.toISOString(),
    description: this.description,
    lines: this.lines,
    prev_hash: this.prev_hash || this.prevHash,
    status: this.status,
  };
  
  const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET || 'default-secret');
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

// Spec v1: Verify all invariants
journalEntrySchema.methods.verifyAllInvariants = async function () {
  const errors = [];

  try {
    // I1: Double-Entry
    let totalDebit = new Decimal('0');
    let totalCredit = new Decimal('0');

    for (const line of this.lines || []) {
      totalDebit = totalDebit.plus(line.debit || '0');
      totalCredit = totalCredit.plus(line.credit || '0');
    }

    if (!totalDebit.equals(totalCredit)) {
      errors.push({
        invariant: 'I1',
        rule: 'Double-Entry Principle',
        violation: `Debits (${totalDebit}) ≠ Credits (${totalCredit})`,
      });
    }

    // I2: Account Identity
    const ChartOfAccounts = mongoose.model('ChartOfAccounts');
    for (let i = 0; i < (this.lines?.length || 0); i++) {
      const line = this.lines[i];
      const account = await ChartOfAccounts.findById(line.account);
      
      if (!account) {
        errors.push({
          invariant: 'I2',
          violation: `Line ${i + 1}: Account not found`,
        });
      } else if (!account.isActive) {
        errors.push({
          invariant: 'I2',
          violation: `Line ${i + 1}: Account inactive`,
        });
      }
    }

    // I3: Immutability
    if (this.status === 'posted' && this.isModified && this.isModified()) {
      errors.push({
        invariant: 'I3',
        violation: 'Posted entries cannot be modified',
      });
    }

    // I5: Hash-Chain
    if (this.status === 'posted' && !this.verifyHash()) {
      errors.push({
        invariant: 'I5',
        violation: 'Hash mismatch or chain broken',
      });
    }

    // I6: Status Machine
    if (!['draft', 'posted', 'voided'].includes(this.status)) {
      errors.push({
        invariant: 'I6',
        violation: `Invalid status: ${this.status}`,
      });
    }

    // I7: Audit Trail
    if (this.status === 'posted' && (!this.auditTrail || this.auditTrail.length === 0)) {
      errors.push({
        invariant: 'I7',
        violation: 'Posted entries must have audit trail',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      entryNumber: this.entryNumber,
      status: this.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{ invariant: 'SYSTEM', violation: error.message }],
    };
  }
};

// Spec v1: Add audit entry helper
journalEntrySchema.methods.addAuditEntry = function (action, performedBy, details = {}) {
  if (!this.auditTrail) {
    this.auditTrail = [];
  }

  this.auditTrail.push({
    action,
    performedBy,
    timestamp: new Date(),
    details,
  });

  return this;
};

// Spec v1: Static method for comprehensive ledger chain verification
journalEntrySchema.statics.verifyLedgerChain = async function () {
  try {
    const entries = await this.find({ status: 'posted' })
      .sort({ chainPosition: 1 })
      .exec();

    let expectedPrevHash = '0';
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (entry.prevHash !== expectedPrevHash) {
        errors.push({
          chainPosition: i,
          entryNumber: entry.entryNumber,
          error: `prevHash mismatch: expected ${expectedPrevHash}, got ${entry.prevHash}`,
        });
      }

      const computedHash = this.computeHash(entry.toObject(), entry.prevHash);
      if (computedHash !== entry.hash) {
        errors.push({
          chainPosition: i,
          entryNumber: entry.entryNumber,
          error: 'Hash mismatch',
        });
      }

      expectedPrevHash = entry.hash;
    }

    return {
      isValid: errors.length === 0,
      totalEntries: entries.length,
      errors,
      lastHash: expectedPrevHash,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      isValid: false,
      totalEntries: 0,
      errors: [{ error: error.message }],
    };
  }
};

// Spec v1: Static method for audit period retrieval
journalEntrySchema.statics.getAuditPeriod = async function (startDate, endDate) {
  return await this.find({
    status: 'posted',
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  })
    .sort({ date: 1, chainPosition: 1 })
    .exec();
};

// Spec v1: Pre-validate hook for invariant checking
journalEntrySchema.pre('validate', async function (next) {
  try {
    logger.debug('[JournalEntry.validate] Starting validation', {
      entryNumber: this.entryNumber,
      status: this.status,
    });

    // ============ INVARIANT I1: Double-Entry Check ============
    let totalDebit = new Decimal('0');
    let totalCredit = new Decimal('0');

    if (!this.lines || this.lines.length === 0) {
      const error = new Error('Entry must have at least one line [INVARIANT I7]');
      error.invariant = 'I7';
      error.code = 'INVALID_LINE_COUNT';
      throw error;
    }

    for (const line of this.lines) {
      const debit = new Decimal(line.debit || '0');
      const credit = new Decimal(line.credit || '0');

      if (debit.decimalPlaces() > 2 || credit.decimalPlaces() > 2) {
        const error = new Error('Decimal precision must be max 2 places (paise) [VALIDATION V1]');
        error.code = 'INVALID_PRECISION';
        throw error;
      }

      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);
    }

    if (!totalDebit.equals(totalCredit)) {
      const error = new Error(
        `Entry not balanced: Debits (${totalDebit}) ≠ Credits (${totalCredit}) [INVARIANT I1]`
      );
      error.invariant = 'I1';
      error.code = 'UNBALANCED_ENTRY';
      error.details = {
        totalDebits: totalDebit.toString(),
        totalCredits: totalCredit.toString(),
      };
      throw error;
    }

    // ============ INVARIANT I2: Account Identity ============
    const ChartOfAccounts = mongoose.model('ChartOfAccounts');
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const account = await ChartOfAccounts.findById(line.account);

      if (!account) {
        const error = new Error(`Line ${i + 1}: Account ${line.account} not found [INVARIANT I2]`);
        error.invariant = 'I2';
        error.code = 'ACCOUNT_NOT_FOUND';
        throw error;
      }

      if (!account.isActive) {
        const error = new Error(`Line ${i + 1}: Account is inactive [INVARIANT I2]`);
        error.invariant = 'I2';
        error.code = 'ACCOUNT_INACTIVE';
        throw error;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Spec v1: Enhanced pre-save hook with invariant validation
journalEntrySchema.pre('save', async function(next) {
  try {
    // Generate entry number for new entries
    if (this.isNew && !this.entryNumber) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await mongoose.model('JournalEntry').countDocuments({
        entryNumber: new RegExp(`^JE-${dateStr}`)
      });
      this.entryNumber = `JE-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    }
    
    // Set chain position for new entries
    if (this.isNew) {
      const lastEntry = await mongoose.model('JournalEntry')
        .findOne({ status: 'posted' })
        .sort({ chainPosition: -1 })
        .select('chainPosition hash');
      
      this.chainPosition = lastEntry ? lastEntry.chainPosition + 1 : 0;
      this.prevHash = lastEntry ? lastEntry.hash : '0';
      this.prev_hash = this.prevHash; // Backward compatibility
    }
    
    // ============ INVARIANT I3: Immutability Check ============
    if (!this.isNew && this.isModified()) {
      const original = await this.constructor.findById(this._id);

      if (original && original.status === 'posted') {
        const modifiedPaths = this.modifiedPaths();
        const immutableFields = ['lines', 'description', 'entryNumber', 'date'];
        const attemptedMutation = modifiedPaths.some((path) =>
          immutableFields.some((field) => path.startsWith(field))
        );

        if (attemptedMutation) {
          const error = new Error(
            `Cannot modify posted entries [INVARIANT I3 - Immutability]`
          );
          error.invariant = 'I3';
          error.code = 'IMMUTABILITY_VIOLATION';
          throw error;
        }
      }
    }

    // ============ INVARIANT I6: Status State Machine ============
    if (this.isModified('status')) {
      const original = await this.constructor.findById(this._id);
      const currentStatus = original?.status || 'draft';
      const newStatus = this.status;

      const validTransitions = {
        draft: ['posted', 'draft'],
        posted: ['voided'],
        voided: [],
      };

      const allowed = validTransitions[currentStatus] || [];

      if (!allowed.includes(newStatus)) {
        const error = new Error(
          `Invalid status transition: ${currentStatus} → ${newStatus} [INVARIANT I6]`
        );
        error.invariant = 'I6';
        error.code = 'INVALID_STATE_TRANSITION';
        throw error;
      }
    }
    
    // Calculate hash after entryNumber is set
    if (this.isNew || this.isModified('status') || this.isModified('lines')) {
      this.hash = this.constructor.computeHash(this.toObject(), this.prevHash);
      this.hashTimestamp = new Date();
      
      // Backward compatibility
      this.prev_hash = this.prevHash;
    }
    
    // Spec v1: Set immutable hash when posting
    if (this.isModified('status') && this.status === 'posted') {
      this.immutable_hash = this.computeImmutableHash();
      if (!this.postedAt) {
        this.postedAt = new Date();
      }
    }
    
    // Spec v1: Set voiding timestamp
    if (this.isModified('status') && this.status === 'voided') {
      if (!this.voidedAt) {
        this.voidedAt = new Date();
      }
    }
    
    next();
  } catch (error) {
    logger.error('JournalEntry pre-save error:', error);
    next(error);
  }
});

// Spec v1: Post-save hook for logging
journalEntrySchema.post('save', function(doc) {
  if (doc.status === 'posted') {
    logger.info(`Journal entry posted: ${doc.entryNumber}`, {
      chainPosition: doc.chainPosition,
      hash: doc.hash,
      immutableHash: doc.immutable_hash
    });
  }
  
  if (doc.status === 'voided') {
    logger.info(`Journal entry voided: ${doc.entryNumber}`, {
      reason: doc.voidReason,
      voidedBy: doc.voidedBy,
      voidedAt: doc.voidedAt
    });
  }
});

export default mongoose.model('JournalEntry', journalEntrySchema);