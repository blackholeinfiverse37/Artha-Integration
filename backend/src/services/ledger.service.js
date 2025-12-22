import Decimal from 'decimal.js';
import JournalEntry from '../models/JournalEntry.js';
import AccountBalance from '../models/AccountBalance.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';
import cacheService from './cache.service.js';
import { withTransaction, areTransactionsAvailable } from '../config/database.js';

class LedgerService {
  /**
   * Validate double-entry: debits must equal credits
   */
  validateDoubleEntry(lines) {
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    lines.forEach(line => {
      totalDebits = totalDebits.plus(new Decimal(line.debit || 0));
      totalCredits = totalCredits.plus(new Decimal(line.credit || 0));
    });

    if (!totalDebits.equals(totalCredits)) {
      throw new Error(
        `Double-entry validation failed: Debits (${totalDebits.toString()}) != Credits (${totalCredits.toString()})`
      );
    }

    return true;
  }

  /**
   * Validate that each line has only debit OR credit (not both)
   */
  validateLineIntegrity(lines) {
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
  }

  /**
   * Validate that all accounts exist and are active
   */
  async validateAccounts(lines) {
    const accountIds = lines.map(line => line.account);
    const accounts = await ChartOfAccounts.find({
      _id: { $in: accountIds },
      isActive: true,
    });

    if (accounts.length !== accountIds.length) {
      throw new Error('One or more accounts are invalid or inactive');
    }

    return accounts;
  }

  /**
   * Get the previous hash for chain continuity
   */
  async getPreviousHash() {
    const lastEntry = await JournalEntry.findOne({ status: 'posted' })
      .sort({ createdAt: -1 })
      .select('immutable_hash');

    return lastEntry ? lastEntry.immutable_hash : '0';
  }

  /**
   * Create a new journal entry with hash-chain enforcement
   * Note: Validation is now handled by middleware, but keeping internal validations for service-level calls
   */
  async createJournalEntry(entryData, userId) {
    return await withTransaction(async (session) => {
      const { date, description, lines, reference, tags } = entryData;

      // Internal validations (middleware handles API calls)
      this.validateLineIntegrity(lines);
      this.validateDoubleEntry(lines);
      await this.validateAccounts(lines);

      // Get the latest entry to find prevHash and chainPosition
      const lastEntry = await JournalEntry.findOne({ status: 'posted' })
        .sort({ chainPosition: -1 })
        .session(session);

      const prevHash = lastEntry?.hash || lastEntry?.immutable_hash || '0';
      const chainPosition = (lastEntry?.chainPosition ?? -1) + 1;

      // Compute hash for new entry
      const tempEntry = {
        entryNumber: 'TEMP',
        date: date || new Date(),
        description,
        lines,
        reference,
        status: 'draft',
      };
      const hash = JournalEntry.computeHash(tempEntry, prevHash);

      // Create journal entry with hash-chain
      const journalEntry = new JournalEntry({
        date: date || new Date(),
        description,
        lines,
        reference,
        tags,
        status: 'draft',
        prevHash,
        hash,
        chainPosition,
        prev_hash: prevHash, // Legacy field
        immutable_hash: hash, // Legacy field
      });

      await journalEntry.save(session ? { session } : {});
      
      logger.info(`Journal entry created: ${journalEntry.entryNumber}`, {
        hash: journalEntry.hash,
        chainPosition: journalEntry.chainPosition,
        transactionMode: session ? 'with-transaction' : 'without-transaction',
      });

      return journalEntry;
    });
  }

  /**
   * Post a journal entry (move to posted state with chain finalization)
   * Note: Status transition and audit trail validation handled by middleware
   */
  async postJournalEntry(entryId, userId) {
    return await withTransaction(async (session) => {
      const entry = await JournalEntry.findById(entryId).session(session);

      if (!entry) {
        throw new Error('Entry not found');
      }

      if (entry.status === 'posted') {
        throw new Error('Journal entry is already posted');
      }

      if (entry.status === 'voided') {
        throw new Error('Cannot post a voided entry');
      }

      // Verify hash before posting (tamper detection)
      if (entry.verifyHash && !entry.verifyHash()) {
        throw new Error('Entry hash verification failed - possible tampering');
      }

      // Re-validate before posting (internal validation)
      this.validateLineIntegrity(entry.lines);
      this.validateDoubleEntry(entry.lines);

      // Update entry status (immutable_hash will be set in pre-save hook)
      entry.status = 'posted';
      entry.postedBy = userId;
      entry.postedAt = new Date();

      // Audit trail is handled by middleware, but ensure it exists
      if (!entry.auditTrail) entry.auditTrail = [];
      
      // Add posting audit entry if not already added by middleware
      const hasPostAudit = entry.auditTrail.some(audit => 
        audit.action === 'POSTED' && audit.performedBy?.toString() === userId.toString()
      );
      
      if (!hasPostAudit) {
        entry.auditTrail.push({
          action: 'POSTED',
          performedBy: userId,
          timestamp: new Date(),
          details: { 
            prevHash: entry.prevHash || entry.prev_hash, 
            hash: entry.hash || entry.immutable_hash,
            chainPosition: entry.chainPosition
          },
        });
      }
      
      // Hash will be recalculated in pre-save hook
      await entry.save({ session });

      // Update account balances
      await this.updateAccountBalances(entry.lines, session);
      
      // Invalidate related caches
      await cacheService.invalidateLedgerCaches();
      
      logger.info(`Journal entry posted: ${entry.entryNumber}`, {
        hash: entry.hash,
        chainPosition: entry.chainPosition,
        postedBy: userId,
        transactionMode: session ? 'with-transaction' : 'without-transaction',
      });

      return entry;
    });
  }

  /**
   * Update account balances based on journal entry lines
   */
  async updateAccountBalances(lines, session = null) {
    for (const line of lines) {
      const debit = new Decimal(line.debit || 0);
      const credit = new Decimal(line.credit || 0);

      // Find or create account balance with optional session
      const query = AccountBalance.findOne({ account: line.account });
      let accountBalance = session ? await query.session(session) : await query;

      if (!accountBalance) {
        accountBalance = new AccountBalance({
          account: line.account,
          balance: '0',
          debitTotal: '0',
          creditTotal: '0',
        });
      }

      // Update totals
      const currentDebitTotal = new Decimal(accountBalance.debitTotal);
      const currentCreditTotal = new Decimal(accountBalance.creditTotal);

      accountBalance.debitTotal = currentDebitTotal.plus(debit).toString();
      accountBalance.creditTotal = currentCreditTotal.plus(credit).toString();

      // Calculate net balance (debit - credit)
      const netBalance = new Decimal(accountBalance.debitTotal).minus(
        new Decimal(accountBalance.creditTotal)
      );
      accountBalance.balance = netBalance.toString();
      accountBalance.lastUpdated = new Date();

      // Save with optional session
      await accountBalance.save(session ? { session } : {});
    }
  }

  /**
   * Get journal entries with pagination and filters
   */
  async getJournalEntries(filters = {}, pagination = {}) {
    const {
      status,
      dateFrom,
      dateTo,
      account,
      search,
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = pagination;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    if (account) {
      query['lines.account'] = account;
    }

    if (search) {
      query.$or = [
        { entryNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [entries, total] = await Promise.all([
      JournalEntry.find(query)
        .populate('lines.account', 'code name type')
        .populate('postedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      JournalEntry.countDocuments(query),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single journal entry by ID
   */
  async getJournalEntryById(entryId) {
    const entry = await JournalEntry.findById(entryId)
      .populate('lines.account', 'code name type normalBalance')
      .populate('postedBy', 'name email');

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    return entry;
  }

  /**
   * Verify entire ledger chain (Enhanced with static method)
   */
  async verifyLedgerChain() {
    try {
      // Use the new static method for verification
      const result = await JournalEntry.verifyLedgerChain();
      
      const isValid = result.isValid;
      
      logger.info(`Ledger chain verification: ${isValid ? 'VALID' : 'INVALID'}`, {
        totalEntries: result.totalEntries,
        errorCount: result.errors.length,
      });

      return {
        ...result,
        chainLength: result.totalEntries,
        message: isValid
          ? 'Ledger chain is valid and tamper-proof'
          : `Ledger integrity issues detected at ${result.errors.length} point(s)`,
      };
    } catch (error) {
      logger.error('Verify ledger chain error:', error);
      throw error;
    }
  }

  /**
   * Verify chain from specific entry (Enhanced)
   */
  async verifyChainFromEntry(entryId) {
    const entry = await JournalEntry.findById(entryId);
    
    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.verifyChainFromEntry) {
      return await entry.verifyChainFromEntry();
    }

    // SECURITY FIX: Never default to true for hash verification
    if (!entry.verifyHash || typeof entry.verifyHash !== 'function') {
      logger.error('Hash verification method missing for entry:', entry.entryNumber);
      return {
        isValid: false,
        totalEntriesVerified: 0,
        errors: [{
          position: 0,
          entryNumber: entry.entryNumber,
          issue: 'Hash verification method not available - data integrity error'
        }],
      };
    }
    
    return {
      isValid: entry.verifyHash(),
      totalEntriesVerified: 1,
      errors: [],
    };
  }

  /**
   * Get chain statistics
   */
  async getChainStatistics() {
    const stats = await JournalEntry.aggregate([
      {
        $match: { status: 'posted' }
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          maxPosition: { $max: '$chainPosition' },
          minPosition: { $min: '$chainPosition' },
          oldestEntry: { $min: '$createdAt' },
          newestEntry: { $max: '$createdAt' },
        }
      }
    ]);

    const result = stats[0] || {
      totalEntries: 0,
      maxPosition: 0,
      minPosition: 0,
    };

    return {
      totalPostedEntries: result.totalEntries,
      chainLength: result.maxPosition + 1,
      oldestEntry: result.oldestEntry,
      newestEntry: result.newestEntry,
      hasGaps: result.maxPosition !== result.totalEntries - 1,
    };
  }

  /**
   * Get account balances with optional filters
   */
  async getAccountBalances(filters = {}) {
    const { accountType, minBalance, maxBalance, search } = filters;

    const pipeline = [
      {
        $lookup: {
          from: 'chartofaccounts',
          localField: 'account',
          foreignField: '_id',
          as: 'accountDetails',
        },
      },
      {
        $unwind: '$accountDetails',
      },
    ];

    // Add filters
    const matchStage = { 'accountDetails.isActive': true };

    if (accountType) {
      matchStage['accountDetails.type'] = accountType;
    }

    if (search) {
      matchStage.$or = [
        { 'accountDetails.name': { $regex: search, $options: 'i' } },
        { 'accountDetails.code': { $regex: search, $options: 'i' } },
      ];
    }

    pipeline.push({ $match: matchStage });

    // Filter by balance range (convert to number for comparison)
    if (minBalance !== undefined || maxBalance !== undefined) {
      pipeline.push({
        $addFields: {
          balanceNum: { $toDouble: '$balance' },
        },
      });

      const balanceFilter = {};
      if (minBalance !== undefined) balanceFilter.$gte = parseFloat(minBalance);
      if (maxBalance !== undefined) balanceFilter.$lte = parseFloat(maxBalance);

      pipeline.push({
        $match: { balanceNum: balanceFilter },
      });
    }

    // Project final shape
    pipeline.push({
      $project: {
        account: '$accountDetails._id',
        accountCode: '$accountDetails.code',
        accountName: '$accountDetails.name',
        accountType: '$accountDetails.type',
        normalBalance: '$accountDetails.normalBalance',
        balance: 1,
        debitTotal: 1,
        creditTotal: 1,
        lastUpdated: 1,
      },
    });

    // Sort by account code
    pipeline.push({ $sort: { accountCode: 1 } });

    const balances = await AccountBalance.aggregate(pipeline);

    return balances;
  }

  /**
   * Get ledger summary (total assets, liabilities, equity, income, expenses)
   */
  async getLedgerSummary() {
    // Try to get from cache first
    const cached = await cacheService.getCachedLedgerSummary();
    if (cached) {
      return cached;
    }

    const balances = await this.getAccountBalances();

    const summary = {
      assets: new Decimal(0),
      liabilities: new Decimal(0),
      equity: new Decimal(0),
      income: new Decimal(0),
      expenses: new Decimal(0),
    };

    balances.forEach((balance) => {
      const amount = new Decimal(balance.balance);
      const type = balance.accountType.toLowerCase();

      switch (type) {
        case 'asset':
          summary.assets = summary.assets.plus(amount);
          break;
        case 'liability':
          summary.liabilities = summary.liabilities.plus(amount);
          break;
        case 'equity':
          summary.equity = summary.equity.plus(amount);
          break;
        case 'income':
          summary.income = summary.income.plus(amount);
          break;
        case 'expense':
          summary.expenses = summary.expenses.plus(amount);
          break;
      }
    });

    // Calculate net income
    const netIncome = summary.income.minus(summary.expenses);

    // Accounting equation check: Assets = Liabilities + Equity + Net Income
    const leftSide = summary.assets;
    const rightSide = summary.liabilities.plus(summary.equity).plus(netIncome);
    const isBalanced = leftSide.equals(rightSide);

    const result = {
      assets: summary.assets.toString(),
      liabilities: summary.liabilities.toString(),
      equity: summary.equity.toString(),
      income: summary.income.toString(),
      expenses: summary.expenses.toString(),
      netIncome: netIncome.toString(),
      isBalanced,
      balanceDifference: leftSide.minus(rightSide).toString(),
    };

    // Cache the result
    await cacheService.cacheLedgerSummary(result);
    
    return result;
  }

  /**
   * Void a journal entry (mark as voided in chain)
   */
  async voidJournalEntry(entryId, userId, reason) {
    return await withTransaction(async (session) => {
      const entry = await JournalEntry.findById(entryId).session(session);

      if (!entry) {
        throw new Error('Entry not found');
      }

      if (entry.status === 'voided') {
        throw new Error('Entry is already voided');
      }

      if (entry.status !== 'posted') {
        throw new Error('Only posted entries can be voided');
      }

      // Update entry status (voidedAt will be set in pre-save hook)
      entry.status = 'voided';
      entry.voidedBy = userId;
      entry.voidReason = reason;
      entry.voidedAt = new Date();

      // Add audit trail
      if (!entry.auditTrail) entry.auditTrail = [];
      entry.auditTrail.push({
        action: 'VOIDED',
        performedBy: userId,
        timestamp: new Date(),
        details: { 
          reason, 
          originalHash: entry.hash || entry.immutable_hash,
          immutableHash: entry.immutable_hash,
          chainPosition: entry.chainPosition
        },
      });

      await entry.save({ session });

      // Create reversing entry
      const reversingLines = entry.lines.map((line) => ({
        account: line.account,
        debit: line.credit, // Swap debit and credit
        credit: line.debit,
        description: `VOID: ${line.description || ''}`,
      }));

      const reversingEntry = new JournalEntry({
        date: new Date(),
        description: `VOID: ${entry.description} (Reason: ${reason})`,
        lines: reversingLines,
        reference: `VOID-${entry.entryNumber}`,
        status: 'posted',
        postedBy: userId,
        postedAt: new Date(),
        prev_hash: await this.getPreviousHash(),
        immutable_hash: '', // Will be calculated in pre-save hook
      });

      await reversingEntry.save({ session });

      // Update account balances with reversing entry
      await this.updateAccountBalances(reversingLines, session);

      logger.info(`Journal entry voided: ${entry.entryNumber}`, {
        reason,
        hash: entry.hash,
        voidedBy: userId,
        transactionMode: session ? 'with-transaction' : 'without-transaction',
      });

      return { voidedEntry: entry, reversingEntry };
    });
  }

  /**
   * Reverse account balances (for voiding)
   */
  async reverseAccountBalances(entry) {
    return await withTransaction(async (session) => {
      const reversingLines = entry.lines.map(line => ({
        account: line.account,
        debit: line.credit,
        credit: line.debit,
      }));

      await this.updateAccountBalances(reversingLines, session);
    });
  }

  /**
   * Get entry chain segment (for audit)
   */
  async getChainSegment(startPosition, endPosition) {
    try {
      const entries = await JournalEntry.find({
        chainPosition: { $gte: startPosition, $lte: endPosition },
        status: 'posted',
      })
        .sort({ chainPosition: 1 })
        .select('entryNumber chainPosition hash prevHash date description status')
        .exec();

      return entries;
    } catch (error) {
      logger.error('Get chain segment error:', error);
      throw error;
    }
  }

  /**
   * Get audit period entries (Spec v1)
   */
  async getAuditPeriod(startDate, endDate) {
    try {
      const entries = await JournalEntry.getAuditPeriod(startDate, endDate);
      
      logger.info(`Retrieved audit period entries: ${entries.length}`, {
        startDate,
        endDate,
      });
      
      return entries;
    } catch (error) {
      logger.error('Get audit period error:', error);
      throw error;
    }
  }
}

export default new LedgerService();