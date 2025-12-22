import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import JournalEntry from '../src/models/JournalEntry.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import logger from '../src/config/logger.js';

describe('Ledger Hash-Chain Verification', () => {
  let adminToken;
  let adminUser;
  let testAccount;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }

    await User.deleteMany({ email: 'chain-test@test.com' });
    await ChartOfAccounts.deleteMany({ code: '1000' });
    await JournalEntry.deleteMany({ description: /Test|Entry|Tamper|Chain/ });

    adminUser = await User.create({
      email: 'chain-test@test.com',
      password: 'TestPassword123',
      name: 'Chain Tester',
      role: 'admin',
    });

    testAccount = await ChartOfAccounts.create({
      code: '1000',
      name: 'Cash',
      type: 'Asset',
      isActive: true,
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'chain-test@test.com',
      password: 'TestPassword123',
    });

    adminToken = response.body.data.token;
  });

  afterAll(async () => {
    await JournalEntry.deleteMany({ description: /Test|Entry|Tamper|Chain/ });
    await User.deleteMany({ email: 'chain-test@test.com' });
    await ChartOfAccounts.deleteMany({ code: '1000' });
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  test('should create entry with correct hash chain', async () => {
    const entryData = {
      date: new Date(),
      description: 'Test entry 1',
      lines: [
        {
          account: testAccount._id,
          debit: '1000',
          credit: '0',
        },
        {
          account: testAccount._id,
          debit: '0',
          credit: '1000',
        },
      ],
    };

    const response = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryData);

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('hash');
    expect(response.body.data).toHaveProperty('prevHash');
    expect(response.body.data.chainPosition).toBeGreaterThanOrEqual(0);

    const entry = await JournalEntry.findById(response.body.data._id);
    expect(entry.verifyHash()).toBe(true);
  });

  test('should maintain chain linkage on second entry', async () => {
    const entry1 = await JournalEntry.create({
      entryNumber: `TEST-${Date.now()}-001`,
      date: new Date(),
      description: 'Chain Entry 1',
      lines: [
        {
          account: testAccount._id,
          debit: '100',
          credit: '0',
        },
        {
          account: testAccount._id,
          debit: '0',
          credit: '100',
        },
      ],
      status: 'posted',
    });

    await entry1.save();

    const entry2Data = {
      entryNumber: `TEST-${Date.now()}-002`,
      date: new Date(),
      description: 'Chain Entry 2',
      lines: [
        {
          account: testAccount._id,
          debit: '200',
          credit: '0',
        },
        {
          account: testAccount._id,
          debit: '0',
          credit: '200',
        },
      ],
    };

    const entry2 = await JournalEntry.create({
      ...entry2Data,
      status: 'posted',
    });

    await entry2.save();

    expect(entry2.prevHash).toBe(entry1.hash);
    expect(entry2.verifyHash()).toBe(true);
    expect(entry1.verifyHash()).toBe(true);
  });

  test('should detect tampered entry', async () => {
    const entry = await JournalEntry.create({
      entryNumber: `TEST-TAMPER-${Date.now()}`,
      date: new Date(),
      description: 'Tamper test',
      lines: [
        {
          account: testAccount._id,
          debit: '500',
          credit: '0',
        },
        {
          account: testAccount._id,
          debit: '0',
          credit: '500',
        },
      ],
      status: 'posted',
    });

    await entry.save();
    const originalHash = entry.hash;

    await JournalEntry.updateOne(
      { _id: entry._id },
      { $set: { 'lines.0.debit': '600' } }
    );

    const tamperedEntry = await JournalEntry.findById(entry._id);
    expect(tamperedEntry.verifyHash()).toBe(false);
    expect(tamperedEntry.hash).toBe(originalHash);
  });

  test('should verify entire ledger chain', async () => {
    const response = await request(app)
      .get('/api/v1/ledger/verify-chain')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('isValid');
    expect(response.body.data).toHaveProperty('totalEntries');
    expect(response.body.data).toHaveProperty('errors');
    expect(Array.isArray(response.body.data.errors)).toBe(true);
  });

  test('should get chain segment', async () => {
    const response = await request(app)
      .get('/api/v1/ledger/chain-segment?startPosition=0&endPosition=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.segment)).toBe(true);
    expect(response.body.data).toHaveProperty('startPosition');
    expect(response.body.data).toHaveProperty('endPosition');
    expect(response.body.data).toHaveProperty('totalInRange');
  });

  test('should verify single entry hash', async () => {
    const entry = await JournalEntry.findOne({ status: 'posted' });

    if (!entry) {
      logger.warn('No posted entry found for single verify test');
      return;
    }

    const response = await request(app)
      .get(`/api/v1/ledger/entries/${entry._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('isValid');
    expect(response.body.data).toHaveProperty('entry');
  });

  test('should reject posting tampered entry', async () => {
    const createRes = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Entry to tamper before posting',
        lines: [
          { account: testAccount._id, debit: '750', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '750' },
        ],
      });

    const entryId = createRes.body.data._id;

    await JournalEntry.updateOne(
      { _id: entryId },
      { $set: { 'lines.0.debit': '850' } }
    );

    const postRes = await request(app)
      .post(`/api/v1/ledger/entries/${entryId}/post`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(postRes.status).toBe(400);
    expect(postRes.body.success).toBe(false);
    expect(postRes.body.message).toContain('tamper');
  });

  test('should maintain backward compatibility with legacy fields', async () => {
    const response = await request(app)
      .post('/api/v1/ledger/entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Legacy compatibility test',
        lines: [
          { account: testAccount._id, debit: '300', credit: '0' },
          { account: testAccount._id, debit: '0', credit: '300' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('hash');
    expect(response.body.data).toHaveProperty('immutable_hash');
    expect(response.body.data.hash).toBe(response.body.data.immutable_hash);
    expect(response.body.data).toHaveProperty('prevHash');
    expect(response.body.data).toHaveProperty('prev_hash');
    expect(response.body.data.prevHash).toBe(response.body.data.prev_hash);
  });

  test('should compute hash correctly using static method', () => {
    const entryData = {
      entryNumber: 'TEST-STATIC',
      date: new Date('2024-01-01'),
      description: 'Static hash test',
      lines: [
        { account: testAccount._id.toString(), debit: '100', credit: '0' },
        { account: testAccount._id.toString(), debit: '0', credit: '100' },
      ],
    };

    const hash1 = JournalEntry.computeHash(entryData, '0');
    const hash2 = JournalEntry.computeHash(entryData, '0');

    expect(hash1).toBe(hash2);
    expect(hash1).toBeTruthy();
    expect(typeof hash1).toBe('string');
  });

  test('should verify chain from specific entry', async () => {
    const entries = await JournalEntry.find({ status: 'posted' })
      .sort({ chainPosition: 1 })
      .limit(1);

    if (entries.length === 0) {
      logger.warn('No posted entries found for chain verification test');
      return;
    }

    const entry = entries[0];
    const result = await entry.verifyChainFromEntry();

    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('verifiedCount');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test('should handle chain segment with invalid range', async () => {
    const response = await request(app)
      .get('/api/v1/ledger/chain-segment?startPosition=100&endPosition=50')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('should return 404 for verify on non-existent entry', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/api/v1/ledger/entries/${fakeId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
