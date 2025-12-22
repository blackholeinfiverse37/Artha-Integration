import mongoose from 'mongoose';
import chartOfAccountsService from '../src/services/chartOfAccounts.service.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';

describe('Chart of Accounts Service', () => {
  beforeAll(async () => {
    if (process.env.MONGODB_TEST_URI) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    await ChartOfAccounts.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ChartOfAccounts.deleteMany({});
  });

  describe('createAccount', () => {
    it('should create a new account', async () => {
      const accountData = {
        code: '1000',
        name: 'Cash',
        type: 'Asset',
        normalBalance: 'debit',
        description: 'Cash on hand'
      };

      const account = await chartOfAccountsService.createAccount(accountData);

      expect(account).toBeDefined();
      expect(account.code).toBe('1000');
      expect(account.name).toBe('Cash');
      expect(account.type).toBe('Asset');
      expect(account.isActive).toBe(true);
    });

    it('should reject duplicate account codes', async () => {
      const accountData = {
        code: '1000',
        name: 'Cash',
        type: 'Asset',
        normalBalance: 'debit'
      };

      await chartOfAccountsService.createAccount(accountData);

      await expect(chartOfAccountsService.createAccount(accountData))
        .rejects.toThrow('Account with code 1000 already exists');
    });
  });

  describe('getAllAccounts', () => {
    beforeEach(async () => {
      await ChartOfAccounts.insertMany([
        { code: '1000', name: 'Cash', type: 'Asset', normalBalance: 'debit' },
        { code: '2000', name: 'Accounts Payable', type: 'Liability', normalBalance: 'credit' },
        { code: '3000', name: 'Owner Equity', type: 'Equity', normalBalance: 'credit', isActive: false },
      ]);
    });

    it('should return all accounts', async () => {
      const accounts = await chartOfAccountsService.getAllAccounts();
      expect(accounts).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const accounts = await chartOfAccountsService.getAllAccounts({ type: 'Asset' });
      expect(accounts).toHaveLength(1);
      expect(accounts[0].type).toBe('Asset');
    });

    it('should filter by active status', async () => {
      const accounts = await chartOfAccountsService.getAllAccounts({ isActive: true });
      expect(accounts).toHaveLength(2);
    });

    it('should search by name or code', async () => {
      const accounts = await chartOfAccountsService.getAllAccounts({ search: 'cash' });
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Cash');
    });
  });

  describe('updateAccount', () => {
    let accountId;

    beforeEach(async () => {
      const account = await ChartOfAccounts.create({
        code: '1000',
        name: 'Cash',
        type: 'Asset',
        normalBalance: 'debit'
      });
      accountId = account._id;
    });

    it('should update account details', async () => {
      const updateData = {
        name: 'Cash and Cash Equivalents',
        description: 'Updated description'
      };

      const updatedAccount = await chartOfAccountsService.updateAccount(accountId, updateData);

      expect(updatedAccount.name).toBe('Cash and Cash Equivalents');
      expect(updatedAccount.description).toBe('Updated description');
    });

    it('should reject duplicate codes when updating', async () => {
      await ChartOfAccounts.create({
        code: '2000',
        name: 'Accounts Payable',
        type: 'Liability',
        normalBalance: 'credit'
      });

      await expect(chartOfAccountsService.updateAccount(accountId, { code: '2000' }))
        .rejects.toThrow('Account with code 2000 already exists');
    });
  });

  describe('seedDefaultAccounts', () => {
    it('should seed default accounts when none exist', async () => {
      const result = await chartOfAccountsService.seedDefaultAccounts();

      expect(result.message).toBe('Default accounts seeded successfully');
      expect(result.count).toBeGreaterThan(0);

      const accounts = await ChartOfAccounts.find({});
      expect(accounts.length).toBe(result.count);
    });

    it('should not seed when accounts already exist', async () => {
      await ChartOfAccounts.create({
        code: '1000',
        name: 'Cash',
        type: 'Asset',
        normalBalance: 'debit'
      });

      const result = await chartOfAccountsService.seedDefaultAccounts();

      expect(result.message).toBe('Chart of accounts already exists');
      expect(result.count).toBe(1);
    });
  });

  describe('deactivateAccount', () => {
    let accountId;

    beforeEach(async () => {
      const account = await ChartOfAccounts.create({
        code: '1000',
        name: 'Cash',
        type: 'Asset',
        normalBalance: 'debit'
      });
      accountId = account._id;
    });

    it('should deactivate an account', async () => {
      const deactivatedAccount = await chartOfAccountsService.deactivateAccount(accountId);

      expect(deactivatedAccount.isActive).toBe(false);
    });

    it('should throw error for non-existent account', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(chartOfAccountsService.deactivateAccount(fakeId))
        .rejects.toThrow('Account not found');
    });
  });
});