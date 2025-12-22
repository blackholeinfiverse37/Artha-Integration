import mongoose from 'mongoose';
import ledgerService from '../src/services/ledger.service.js';
import JournalEntry from '../src/models/JournalEntry.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import AccountBalance from '../src/models/AccountBalance.js';

describe('Ledger Service', () => {
  let cashAccount, revenueAccount, userId;

  beforeAll(async () => {
    if (process.env.MONGODB_TEST_URI) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }

    // Create test accounts
    cashAccount = await ChartOfAccounts.create({
      code: '1000',
      name: 'Cash',
      type: 'Asset',
      normalBalance: 'debit'
    });

    revenueAccount = await ChartOfAccounts.create({
      code: '4000',
      name: 'Revenue',
      type: 'Income',
      normalBalance: 'credit'
    });

    userId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await JournalEntry.deleteMany({});
    await ChartOfAccounts.deleteMany({});
    await AccountBalance.deleteMany({});
    await mongoose.connection.close();
  });

  describe('validateDoubleEntry', () => {
    it('should pass for balanced entries', () => {
      const lines = [
        { debit: '100', credit: '0' },
        { debit: '0', credit: '100' }
      ];
      expect(() => ledgerService.validateDoubleEntry(lines)).not.toThrow();
    });

    it('should fail for unbalanced entries', () => {
      const lines = [
        { debit: '100', credit: '0' },
        { debit: '0', credit: '50' }
      ];
      expect(() => ledgerService.validateDoubleEntry(lines)).toThrow('Double-entry validation failed');
    });
  });

  describe('createJournalEntry', () => {
    it('should create a valid journal entry', async () => {
      const entryData = {
        description: 'Test entry',
        lines: [
          { account: cashAccount._id, debit: '100', credit: '0' },
          { account: revenueAccount._id, debit: '0', credit: '100' }
        ]
      };

      const entry = await ledgerService.createJournalEntry(entryData, userId);
      
      expect(entry).toBeDefined();
      expect(entry.status).toBe('draft');
      expect(entry.immutable_hash).toBeDefined();
      expect(entry.entryNumber).toMatch(/^JE-\d{8}-\d{4}$/);
    });

    it('should reject unbalanced entries', async () => {
      const entryData = {
        description: 'Unbalanced entry',
        lines: [
          { account: cashAccount._id, debit: '100', credit: '0' },
          { account: revenueAccount._id, debit: '0', credit: '50' }
        ]
      };

      await expect(ledgerService.createJournalEntry(entryData, userId))
        .rejects.toThrow('Double-entry validation failed');
    });
  });

  describe('postJournalEntry', () => {
    it('should post a draft entry and update balances', async () => {
      const entryData = {
        description: 'Post test entry',
        lines: [
          { account: cashAccount._id, debit: '200', credit: '0' },
          { account: revenueAccount._id, debit: '0', credit: '200' }
        ]
      };

      const entry = await ledgerService.createJournalEntry(entryData, userId);
      const postedEntry = await ledgerService.postJournalEntry(entry._id, userId);

      expect(postedEntry.status).toBe('posted');
      expect(postedEntry.postedBy).toEqual(userId);
      expect(postedEntry.postedAt).toBeDefined();

      // Check account balances
      const cashBalance = await AccountBalance.findOne({ account: cashAccount._id });
      const revenueBalance = await AccountBalance.findOne({ account: revenueAccount._id });

      expect(cashBalance.balance).toBe('200');
      expect(revenueBalance.balance).toBe('-200'); // Credit balance for income account
    });
  });

  describe('verifyLedgerChain', () => {
    it('should verify chain integrity', async () => {
      const verification = await ledgerService.verifyLedgerChain();
      
      expect(verification.isValid).toBe(true);
      expect(verification.errors).toHaveLength(0);
      expect(verification.totalEntries).toBeGreaterThan(0);
    });
  });
});