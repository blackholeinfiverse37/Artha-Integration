import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import JournalEntry from '../src/models/JournalEntry.js';
import AccountBalance from '../src/models/AccountBalance.js';

let authToken;
let userId;
let cashAccountId;
let capitalAccountId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Clear test database
  await User.deleteMany({});
  await ChartOfAccounts.deleteMany({});
  await JournalEntry.deleteMany({});
  await AccountBalance.deleteMany({});
  
  // Create test user
  const user = await User.create({
    email: 'test@artha.local',
    password: 'Test@123456',
    name: 'Test User',
    role: 'admin',
  });
  userId = user._id;
  
  // Login to get token
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'test@artha.local', password: 'Test@123456' });
  
  authToken = loginRes.body.data.token;
  
  // Create test accounts
  const cash = await ChartOfAccounts.create({
    code: '1000',
    name: 'Cash',
    type: 'Asset',
    normalBalance: 'debit',
  });
  cashAccountId = cash._id;
  
  const capital = await ChartOfAccounts.create({
    code: '3000',
    name: "Owner's Capital",
    type: 'Equity',
    normalBalance: 'credit',
  });
  capitalAccountId = capital._id;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Ledger API Tests', () => {
  describe('POST /api/v1/ledger/entries', () => {
    it('should create a valid journal entry', async () => {
      const res = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test entry',
          lines: [
            { account: cashAccountId, debit: '1000', credit: '0' },
            { account: capitalAccountId, debit: '0', credit: '1000' },
          ],
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.entryNumber).toMatch(/^JE-/);
      expect(res.body.data.immutable_hash).toBeDefined();
    });
    
    it('should reject entry with unbalanced debits/credits', async () => {
      const res = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Invalid entry',
          lines: [
            { account: cashAccountId, debit: '1000', credit: '0' },
            { account: capitalAccountId, debit: '0', credit: '500' },
          ],
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Double-entry validation failed');
    });
    
    it('should reject entry with less than 2 lines', async () => {
      const res = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Invalid entry',
          lines: [{ account: cashAccountId, debit: '1000', credit: '0' }],
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject entry with both debit and credit on same line', async () => {
      const res = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Invalid entry',
          lines: [
            { account: cashAccountId, debit: '1000', credit: '500' },
            { account: capitalAccountId, debit: '0', credit: '1500' },
          ],
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot have both debit and credit');
    });

    it('should reject entry with negative amounts', async () => {
      const res = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Invalid entry',
          lines: [
            { account: cashAccountId, debit: '-1000', credit: '0' },
            { account: capitalAccountId, debit: '0', credit: '-1000' },
          ],
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Amounts cannot be negative');
    });
  });
  
  describe('POST /api/v1/ledger/entries/:id/post', () => {
    it('should post a draft entry', async () => {
      // Create draft entry
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Entry to post',
          lines: [
            { account: cashAccountId, debit: '500', credit: '0' },
            { account: capitalAccountId, debit: '0', credit: '500' },
          ],
        });
      
      const entryId = createRes.body.data._id;
      
      // Post the entry
      const postRes = await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(postRes.status).toBe(200);
      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.status).toBe('posted');
      expect(postRes.body.data.postedBy).toBeDefined();
      expect(postRes.body.data.postedAt).toBeDefined();
    });

    it('should reject posting already posted entry', async () => {
      // Create and post entry
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Entry to post twice',
          lines: [
            { account: cashAccountId, debit: '300', credit: '0' },
            { account: capitalAccountId, debit: '0', credit: '300' },
          ],
        });
      
      const entryId = createRes.body.data._id;
      
      // Post the entry first time
      await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Try to post again
      const postRes = await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(postRes.status).toBe(400);
      expect(postRes.body.success).toBe(false);
      expect(postRes.body.message).toContain('already posted');
    });
  });
  
  describe('GET /api/v1/ledger/entries', () => {
    it('should get all journal entries', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
    });
    
    it('should filter entries by status', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/entries?status=posted')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((entry) => {
        expect(entry.status).toBe('posted');
      });
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/entries?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should support search functionality', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/entries?search=Test')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/ledger/entries/:id', () => {
    it('should get single journal entry', async () => {
      // Create entry first
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Single entry test',
          lines: [
            { account: cashAccountId, debit: '200', credit: '0' },
            { account: capitalAccountId, debit: '0', credit: '200' },
          ],
        });
      
      const entryId = createRes.body.data._id;
      
      const res = await request(app)
        .get(`/api/v1/ledger/entries/${entryId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(entryId);
      expect(res.body.data.lines).toBeDefined();
      expect(res.body.data.lines.length).toBe(2);
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/ledger/entries/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/ledger/entries/:id/void', () => {
    it('should void a posted entry', async () => {
      // Create and post entry
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Entry to void',
          lines: [
            { account: cashAccountId, debit: '100', credit: '0' },
            { account: capitalAccountId, debit: '0', credit: '100' },
          ],
        });
      
      const entryId = createRes.body.data._id;
      
      await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Void the entry
      const voidRes = await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/void`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test void' });
      
      expect(voidRes.status).toBe(200);
      expect(voidRes.body.success).toBe(true);
      expect(voidRes.body.data.voidedEntry.status).toBe('voided');
      expect(voidRes.body.data.reversingEntry).toBeDefined();
    });

    it('should reject voiding without reason', async () => {
      const createRes = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Entry to void without reason',
          lines: [
            { account: cashAccountId, debit: '50', credit: '0' },
            { account: capitalAccountId, debit: '0', credit: '50' },
          ],
        });
      
      const entryId = createRes.body.data._id;
      
      await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const voidRes = await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/void`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(voidRes.status).toBe(400);
      expect(voidRes.body.success).toBe(false);
    });
  });
  
  describe('GET /api/v1/ledger/balances', () => {
    it('should get account balances', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/balances')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter balances by account type', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/balances?accountType=Asset')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((balance) => {
        expect(balance.accountType).toBe('Asset');
      });
    });
  });
  
  describe('GET /api/v1/ledger/summary', () => {
    it('should get ledger summary', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/summary')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('assets');
      expect(res.body.data).toHaveProperty('liabilities');
      expect(res.body.data).toHaveProperty('equity');
      expect(res.body.data).toHaveProperty('income');
      expect(res.body.data).toHaveProperty('expenses');
      expect(res.body.data).toHaveProperty('netIncome');
      expect(res.body.data).toHaveProperty('isBalanced');
      expect(res.body.data).toHaveProperty('balanceDifference');
    });
  });
  
  describe('GET /api/v1/ledger/verify', () => {
    it('should verify ledger chain integrity', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isValid');
      expect(res.body.data).toHaveProperty('totalEntries');
      expect(Array.isArray(res.body.data.errors)).toBe(true);
    });
  });

  // Test legacy endpoints for backward compatibility
  describe('Legacy Endpoints Compatibility', () => {
    it('should work with legacy journal-entries endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/journal-entries')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should work with legacy verify-chain endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/verify-chain')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isValid');
    });
  });

  // Test authorization
  describe('Authorization Tests', () => {
    it('should reject requests without token', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/entries');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject requests with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/entries')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});