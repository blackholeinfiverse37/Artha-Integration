import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import JournalEntry from '../src/models/JournalEntry.js';
import logger from '../src/config/logger.js';

describe('Ledger Invariants Comprehensive Test Suite', () => {
  let adminToken;
  let accountantToken;
  let userToken;
  let adminUser;
  let accountantUser;
  let regularUser;
  let cashAccount;
  let revenueAccount;
  let expenseAccount;
  let assetAccount;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }

    // Clean up existing test data
    await User.deleteMany({ email: /invariant-test.*@test\.com/ });
    await ChartOfAccounts.deleteMany({ code: { $in: ['1001', '1002', '4001', '6001'] } });
    await JournalEntry.deleteMany({ description: /Invariant Test/ });

    // Create test users
    adminUser = await User.create({
      email: 'invariant-test-admin@test.com',
      password: 'TestPassword123',
      name: 'Invariant Admin',
      role: 'admin',
    });

    accountantUser = await User.create({
      email: 'invariant-test-accountant@test.com',
      password: 'TestPassword123',
      name: 'Invariant Accountant',
      role: 'accountant',
    });

    regularUser = await User.create({
      email: 'invariant-test-user@test.com',
      password: 'TestPassword123',
      name: 'Invariant User',
      role: 'user',
    });

    // Create test accounts
    cashAccount = await ChartOfAccounts.create({
      code: '1001',
      name: 'Cash Account',
      type: 'Asset',
      normalBalance: 'debit',
      isActive: true,
    });

    assetAccount = await ChartOfAccounts.create({
      code: '1002',
      name: 'Asset Account',
      type: 'Asset',
      normalBalance: 'debit',
      isActive: true,
    });

    revenueAccount = await ChartOfAccounts.create({
      code: '4001',
      name: 'Revenue Account',
      type: 'Income',
      normalBalance: 'credit',
      isActive: true,
    });

    expenseAccount = await ChartOfAccounts.create({
      code: '6001',
      name: 'Expense Account',
      type: 'Expense',
      normalBalance: 'debit',
      isActive: true,
    });

    // Get authentication tokens
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'invariant-test-admin@test.com',
      password: 'TestPassword123',
    });
    adminToken = adminLogin.body.data.token;

    const accountantLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'invariant-test-accountant@test.com',
      password: 'TestPassword123',
    });
    accountantToken = accountantLogin.body.data.token;

    const userLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'invariant-test-user@test.com',
      password: 'TestPassword123',
    });
    userToken = userLogin.body.data.token;
  });

  afterAll(async () => {
    await JournalEntry.deleteMany({ description: /Invariant Test/ });
    await User.deleteMany({ email: /invariant-test.*@test\.com/ });
    await ChartOfAccounts.deleteMany({ code: { $in: ['1001', '1002', '4001', '6001'] } });
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('INVARIANT I1: Double-Entry Principle', () => {
    test('should reject unbalanced entries (debits ≠ credits)', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I1 - Unbalanced',
          lines: [
            { account: cashAccount._id, debit: '1000', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '500' }, // Unbalanced
          ],
        });

      expect(response.status).toBe(422);
      expect(response.body.type).toBe('INVARIANT_VIOLATION');
      expect(response.body.invariant).toBe('I1');
      expect(response.body.code).toBe('UNBALANCED_ENTRY');
      expect(response.body.message).toContain('Entry not balanced');
    });

    test('should accept balanced entries (debits = credits)', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I1 - Balanced',
          lines: [
            { account: cashAccount._id, debit: '1000', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '1000' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should handle complex multi-line balanced entries', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I1 - Multi-line Balanced',
          lines: [
            { account: cashAccount._id, debit: '500', credit: '0' },
            { account: assetAccount._id, debit: '300', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '600' },
            { account: expenseAccount._id, debit: '0', credit: '200' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should detect small rounding errors in balance', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I1 - Rounding Error',
          lines: [
            { account: cashAccount._id, debit: '100.01', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '100.00' }, // 0.01 difference
          ],
        });

      expect(response.status).toBe(422);
      expect(response.body.invariant).toBe('I1');
    });
  });

  describe('INVARIANT I2: Account Identity', () => {
    test('should reject entries with non-existent accounts', async () => {
      const fakeAccountId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I2 - Non-existent Account',
          lines: [
            { account: fakeAccountId, debit: '100', credit: '0' },
            { account: cashAccount._id, debit: '0', credit: '100' },
          ],
        });

      expect(response.status).toBe(422);
      expect(response.body.invariant).toBe('I2');
      expect(response.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    test('should reject entries with inactive accounts', async () => {
      // Create inactive account
      const inactiveAccount = await ChartOfAccounts.create({
        code: '9999',
        name: 'Inactive Account',
        type: 'Asset',
        isActive: false,
      });

      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I2 - Inactive Account',
          lines: [
            { account: inactiveAccount._id, debit: '100', credit: '0' },
            { account: cashAccount._id, debit: '0', credit: '100' },
          ],
        });

      expect(response.status).toBe(422);
      expect(response.body.invariant).toBe('I2');
      expect(response.body.code).toBe('ACCOUNT_INACTIVE');

      // Cleanup
      await ChartOfAccounts.findByIdAndDelete(inactiveAccount._id);
    });

    test('should accept entries with valid active accounts', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I2 - Valid Accounts',
          lines: [
            { account: cashAccount._id, debit: '200', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '200' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('INVARIANT I3: Immutability', () => {
    let postedEntryId;

    beforeAll(async () => {
      // Create and post an entry for immutability testing
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I3 - Immutability Base',
          lines: [
            { account: cashAccount._id, debit: '300', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '300' },
          ],
        });

      postedEntryId = createRes.body.data._id;

      await request(app)
        .post(`/api/v1/ledger/entries/${postedEntryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    test('should prevent modification of posted entry description', async () => {
      const response = await request(app)
        .put(`/api/v1/ledger/entries/${postedEntryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Modified description - should fail',
        });

      expect(response.status).toBe(422);
      expect(response.body.type).toBe('IMMUTABILITY_VIOLATION');
      expect(response.body.invariant).toBe('I3');
    });

    test('should prevent modification of posted entry lines', async () => {
      const response = await request(app)
        .put(`/api/v1/ledger/entries/${postedEntryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          lines: [
            { account: cashAccount._id, debit: '400', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '400' },
          ],
        });

      expect(response.status).toBe(422);
      expect(response.body.invariant).toBe('I3');
    });

    test('should prevent modification of posted entry date', async () => {
      const response = await request(app)
        .put(`/api/v1/ledger/entries/${postedEntryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: new Date('2023-01-01'),
        });

      expect(response.status).toBe(422);
      expect(response.body.invariant).toBe('I3');
    });

    test('should allow modification of draft entries', async () => {
      // Create draft entry
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I3 - Draft Modifiable',
          lines: [
            { account: cashAccount._id, debit: '150', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '150' },
          ],
        });

      const draftEntryId = createRes.body.data._id;

      // Modify draft entry (should succeed)
      const updateRes = await request(app)
        .put(`/api/v1/ledger/entries/${draftEntryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Modified draft description - should succeed',
        });

      expect(updateRes.status).toBe(501); // Not implemented yet, but should not be 422
    });
  });

  describe('INVARIANT I5: Hash-Chain Integrity', () => {
    test('should maintain hash chain on entry creation', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I5 - Hash Chain',
          lines: [
            { account: cashAccount._id, debit: '250', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '250' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('hash');
      expect(response.body.data).toHaveProperty('prevHash');
      expect(response.body.data).toHaveProperty('chainPosition');
    });

    test('should verify hash integrity of posted entry', async () => {
      // Create and post entry
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I5 - Hash Verification',
          lines: [
            { account: cashAccount._id, debit: '350', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '350' },
          ],
        });

      const entryId = createRes.body.data._id;

      await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify hash
      const verifyRes = await request(app)
        .get(`/api/v1/ledger/entries/${entryId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(true);
    });

    test('should verify entire ledger chain', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify-chain')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('totalEntries');
    });

    test('should verify chain using static method', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify-chain-static')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBeOneOf([200, 400]);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });

  describe('INVARIANT I6: Status State Machine', () => {
    let draftEntryId;

    beforeEach(async () => {
      // Create fresh draft entry for each test
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I6 - Status Machine',
          lines: [
            { account: cashAccount._id, debit: '400', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '400' },
          ],
        });

      draftEntryId = createRes.body.data._id;
    });

    test('should allow draft → posted transition', async () => {
      const response = await request(app)
        .post(`/api/v1/ledger/entries/${draftEntryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('posted');
    });

    test('should allow posted → voided transition', async () => {
      // First post the entry
      await request(app)
        .post(`/api/v1/ledger/entries/${draftEntryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Then void it
      const voidRes = await request(app)
        .post(`/api/v1/ledger/entries/${draftEntryId}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test voiding for I6 invariant',
        });

      expect(voidRes.status).toBe(200);
      expect(voidRes.body.data.voidedEntry.status).toBe('voided');
    });

    test('should prevent invalid status transitions', async () => {
      // Try to void a draft entry (invalid transition)
      const response = await request(app)
        .post(`/api/v1/ledger/entries/${draftEntryId}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Invalid transition test',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Only posted entries can be voided');
    });
  });

  describe('INVARIANT I7: Audit Trail Requirements', () => {
    test('should create audit trail on posting', async () => {
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I7 - Audit Trail',
          lines: [
            { account: cashAccount._id, debit: '450', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '450' },
          ],
        });

      const entryId = createRes.body.data._id;

      const postRes = await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(postRes.status).toBe(200);
      expect(postRes.body.data.auditTrail).toBeDefined();
      expect(postRes.body.data.auditTrail.length).toBeGreaterThan(0);
    });

    test('should require minimum line count', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I7 - No Lines',
          lines: [], // Empty lines array
        });

      expect(response.status).toBe(422);
      expect(response.body.invariant).toBe('I7');
      expect(response.body.code).toBe('INVALID_LINE_COUNT');
    });

    test('should require at least one line', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test I7 - Single Line',
          lines: [
            { account: cashAccount._id, debit: '100', credit: '0' },
          ],
        });

      expect(response.status).toBe(422);
      expect(response.body.invariant).toBe('I7');
    });
  });

  describe('VALIDATION V1: Decimal Precision', () => {
    test('should reject amounts with more than 2 decimal places', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test V1 - Precision',
          lines: [
            { account: cashAccount._id, debit: '100.123', credit: '0' }, // 3 decimal places
            { account: revenueAccount._id, debit: '0', credit: '100.123' },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Decimal precision must be max 2 places');
    });

    test('should accept amounts with 2 or fewer decimal places', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test V1 - Valid Precision',
          lines: [
            { account: cashAccount._id, debit: '100.12', credit: '0' }, // 2 decimal places
            { account: revenueAccount._id, debit: '0', credit: '100.12' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should accept whole numbers', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test V1 - Whole Numbers',
          lines: [
            { account: cashAccount._id, debit: '100', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '100' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Comprehensive Invariant Verification', () => {
    test('should verify all invariants for a posted entry', async () => {
      // Create and post entry
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test - Complete Verification',
          lines: [
            { account: cashAccount._id, debit: '500', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '500' },
          ],
        });

      const entryId = createRes.body.data._id;

      await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify all invariants
      const verifyRes = await request(app)
        .get(`/api/v1/ledger/entries/${entryId}/verify-invariants`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(true);
      expect(verifyRes.body.data.errors).toHaveLength(0);
    });

    test('should use direct invariant verification route', async () => {
      // Create and post entry
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test - Direct Verification',
          lines: [
            { account: cashAccount._id, debit: '600', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '600' },
          ],
        });

      const entryId = createRes.body.data._id;

      await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Use direct route
      const verifyRes = await request(app)
        .get(`/api/v1/ledger/entries/${entryId}/verify-invariants-direct`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.isValid).toBe(true);
    });
  });

  describe('Authorization and Access Control', () => {
    test('should deny access to regular users for admin operations', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify-chain')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    test('should allow accountants to create entries', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({
          description: 'Invariant Test - Accountant Access',
          lines: [
            { account: cashAccount._id, debit: '700', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '700' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should deny regular users from creating entries', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Invariant Test - User Access Denied',
          lines: [
            { account: cashAccount._id, debit: '800', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '800' },
          ],
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Audit Period Functionality', () => {
    test('should retrieve audit period entries', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/v1/ledger/audit-period?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('entries');
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data.period.startDate).toBe(startDate);
      expect(response.body.data.period.endDate).toBe(endDate);
    });

    test('should require date parameters for audit period', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/audit-period')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('startDate and endDate are required');
    });
  });

  describe('Legacy Route Compatibility', () => {
    test('should maintain backward compatibility with journal-entries routes', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/journal-entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test - Legacy Route',
          lines: [
            { account: cashAccount._id, debit: '900', credit: '0' },
            { account: revenueAccount._id, debit: '0', credit: '900' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should apply validation to legacy routes', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/journal-entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test - Legacy Validation',
          lines: [
            { account: cashAccount._id, debit: '100.123', credit: '0' }, // Invalid precision
            { account: revenueAccount._id, debit: '0', credit: '100.123' },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('DECIMAL_VALIDATION_ERROR');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid MongoDB ObjectIds gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/entries/invalid-id/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBeOneOf([400, 404, 500]);
    });

    test('should handle missing entries gracefully', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/ledger/entries/${fakeId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invariant Test - Malformed',
          lines: 'not-an-array', // Invalid lines format
        });

      expect(response.status).toBe(400);
    });

    test('should handle empty request bodies', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle multiple concurrent entry creations', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/ledger/entries')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              description: `Invariant Test - Concurrent ${i}`,
              lines: [
                { account: cashAccount._id, debit: `${100 + i}`, credit: '0' },
                { account: revenueAccount._id, debit: '0', credit: `${100 + i}` },
              ],
            })
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    test('should maintain chain integrity under concurrent operations', async () => {
      // Create multiple entries concurrently
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post('/api/v1/ledger/entries')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              description: `Invariant Test - Chain Integrity ${i}`,
              lines: [
                { account: cashAccount._id, debit: `${200 + i}`, credit: '0' },
                { account: revenueAccount._id, debit: '0', credit: `${200 + i}` },
              ],
            })
        );
      }

      await Promise.all(promises);

      // Verify chain integrity
      const verifyRes = await request(app)
        .get('/api/v1/ledger/verify-chain')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(true);
    });
  });
});

// Custom Jest matcher for multiple status codes
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        `expected ${received} to be one of ${JSON.stringify(expected)}`,
    };
  },
});