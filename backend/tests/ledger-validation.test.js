import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import JournalEntry from '../src/models/JournalEntry.js';

describe('Ledger Validation Middleware Integration', () => {
  let adminToken;
  let testAccount;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }

    // Clean up
    await User.deleteMany({ email: 'validation-test@test.com' });
    await ChartOfAccounts.deleteMany({ code: '9999' });
    await JournalEntry.deleteMany({ description: /Validation Test/ });

    // Create test user and account
    const adminUser = await User.create({
      email: 'validation-test@test.com',
      password: 'TestPassword123',
      name: 'Validation Tester',
      role: 'admin',
    });

    testAccount = await ChartOfAccounts.create({
      code: '9999',
      name: 'Test Account',
      type: 'Asset',
      isActive: true,
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'validation-test@test.com',
      password: 'TestPassword123',
    });

    adminToken = response.body.data.token;
  });

  afterAll(async () => {
    await JournalEntry.deleteMany({ description: /Validation Test/ });
    await User.deleteMany({ email: 'validation-test@test.com' });
    await ChartOfAccounts.deleteMany({ code: '9999' });
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  test('should validate double-entry requirement', async () => {
    const response = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Validation Test - Unbalanced',
        lines: [
          { account: testAccount._id, debit: '100', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '50' }, // Unbalanced
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Double-entry validation failed');
  });

  test('should validate line integrity', async () => {
    const response = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Validation Test - Both debit and credit',
        lines: [
          { account: testAccount._id, debit: '100', credit: '100' }, // Invalid
          { account: testAccount._id, debit: '0', credit: '100' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Cannot have both debit and credit');
  });

  test('should prevent modification of posted entries', async () => {
    // Create and post an entry
    const createRes = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Validation Test - Immutability',
        lines: [
          { account: testAccount._id, debit: '100', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '100' },
        ],
      });

    const entryId = createRes.body.data._id;

    await request(app)
      .post(`/api/v1/ledger/entries/${entryId}/post`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Try to modify posted entry
    const updateRes = await request(app)
      .put(`/api/v1/ledger/entries/${entryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Modified description',
        lines: [
          { account: testAccount._id, debit: '200', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '200' },
        ],
      });

    expect(updateRes.status).toBe(400);
    expect(updateRes.body.message).toContain('immutability violation');
  });

  test('should create valid entry with audit trail', async () => {
    const response = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Validation Test - Valid Entry',
        lines: [
          { account: testAccount._id, debit: '100', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '100' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('hash');
    expect(response.body.data).toHaveProperty('chainPosition');
    expect(response.body.data).toHaveProperty('immutable_hash');
    expect(response.body.data.status).toBe('draft');
  });

  test('should set immutable_hash when posting entry', async () => {
    // Create entry
    const createRes = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Validation Test - Immutable Hash',
        lines: [
          { account: testAccount._id, debit: '75', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '75' },
        ],
      });

    const entryId = createRes.body.data._id;

    // Post entry
    const postRes = await request(app)
      .post(`/api/v1/ledger/entries/${entryId}/post`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(postRes.status).toBe(200);
    expect(postRes.body.data.status).toBe('posted');
    expect(postRes.body.data).toHaveProperty('immutable_hash');
    expect(postRes.body.data).toHaveProperty('postedAt');
  });

  test('should maintain backward compatibility with legacy routes', async () => {
    const response = await request(app)
      .post('/api/v1/ledger/journal-entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Validation Test - Legacy Route',
        lines: [
          { account: testAccount._id, debit: '50', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '50' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('hash');
  });

  test('should validate decimal precision (max 2 places)', async () => {
    const response = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Validation Test - Precision',
        lines: [
          { account: testAccount._id, debit: '100.123', credit: '0' }, // Invalid precision
          { account: testAccount._id, debit: '0', credit: '100.123' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Decimal precision must be max 2 places');
  });

  test('should verify all invariants for entry', async () => {
    // Create and post an entry
    const createRes = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Invariant Test Entry',
        lines: [
          { account: testAccount._id, debit: '25', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '25' },
        ],
      });

    const entryId = createRes.body.data._id;

    await request(app)
      .post(`/api/v1/ledger/entries/${entryId}/post`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Verify invariants
    const verifyRes = await request(app)
      .get(`/api/v1/ledger/entries/${entryId}/verify-invariants`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data).toHaveProperty('isValid');
    expect(verifyRes.body.data).toHaveProperty('errors');
    expect(verifyRes.body.data.isValid).toBe(true);
  });

  test('should handle invariant violations with proper error codes', async () => {
    const response = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Invariant Violation Test',
        lines: [], // Empty lines - violates I7
      });

    expect(response.status).toBe(422);
    expect(response.body.type).toBe('INVARIANT_VIOLATION');
    expect(response.body.invariant).toBe('I7');
    expect(response.body.code).toBe('INVALID_LINE_COUNT');
  });

  test('should verify chain using static method', async () => {
    const response = await request(app)
      .get('/api/v1/ledger/verify-chain-static')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('isValid');
    expect(response.body.data).toHaveProperty('totalEntries');
    expect(response.body.data).toHaveProperty('errors');
    expect(response.body.data).toHaveProperty('lastHash');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data.method).toBe('static');
  });

  test('should get audit period entries', async () => {
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    const response = await request(app)
      .get(`/api/v1/ledger/audit-period?startDate=${startDate}&endDate=${endDate}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('entries');
    expect(response.body.data).toHaveProperty('period');
    expect(response.body.data).toHaveProperty('count');
    expect(response.body.data.period.startDate).toBe(startDate);
    expect(response.body.data.period.endDate).toBe(endDate);
    expect(Array.isArray(response.body.data.entries)).toBe(true);
  });

  test('should require date parameters for audit period', async () => {
    const response = await request(app)
      .get('/api/v1/ledger/audit-period')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('startDate and endDate are required');
  });

  test('should validate decimal precision in middleware', async () => {
    const response = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Decimal Precision Test',
        lines: [
          { account: testAccount._id, debit: '100.1234', credit: '0' }, // Too many decimals
          { account: testAccount._id, debit: '0', credit: '100.1234' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.type).toBe('DECIMAL_VALIDATION_ERROR');
    expect(response.body.message).toContain('precision must be max 2 decimal places');
  });

  test('should use direct invariant verification route', async () => {
    // Create and post an entry first
    const createRes = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Direct Invariant Test',
        lines: [
          { account: testAccount._id, debit: '30', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '30' },
        ],
      });

    const entryId = createRes.body.data._id;

    await request(app)
      .post(`/api/v1/ledger/entries/${entryId}/post`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Test direct route
    const response = await request(app)
      .get(`/api/v1/ledger/entries/${entryId}/verify-invariants-direct`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('isValid');
    expect(response.body.data.isValid).toBe(true);
  });

  test('should use direct chain verification route', async () => {
    const response = await request(app)
      .get('/api/v1/ledger/verify-chain-direct')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBeOneOf([200, 400]);
    expect(response.body).toHaveProperty('success');
    expect(response.body.data).toHaveProperty('isValid');
    expect(response.body.data).toHaveProperty('totalEntries');
  });

  test('should prevent immutability violations in middleware', async () => {
    // Create and post an entry
    const createRes = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Immutability Middleware Test',
        lines: [
          { account: testAccount._id, debit: '40', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '40' },
        ],
      });

    const entryId = createRes.body.data._id;

    await request(app)
      .post(`/api/v1/ledger/entries/${entryId}/post`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Try to update posted entry (should fail)
    const updateRes = await request(app)
      .put(`/api/v1/ledger/entries/${entryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Modified description',
        lines: [
          { account: testAccount._id, debit: '50', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '50' },
        ],
      });

    expect(updateRes.status).toBe(422);
    expect(updateRes.body.type).toBe('IMMUTABILITY_VIOLATION');
    expect(updateRes.body.invariant).toBe('I3');
  });
});