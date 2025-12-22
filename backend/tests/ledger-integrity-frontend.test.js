import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import JournalEntry from '../src/models/JournalEntry.js';

describe('Ledger Integrity Frontend Integration', () => {
  let adminToken;
  let adminUser;
  let testAccount;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || process.env.MONGODB_URI);
    }

    // Clean up
    await User.deleteMany({ email: 'frontend-test@test.com' });
    await ChartOfAccounts.deleteMany({ code: '9999' });
    await JournalEntry.deleteMany({ description: /Frontend Test/ });

    // Create test user
    adminUser = await User.create({
      email: 'frontend-test@test.com',
      password: 'TestPassword123',
      name: 'Frontend Tester',
      role: 'admin',
    });

    // Create test account
    testAccount = await ChartOfAccounts.create({
      code: '9999',
      name: 'Test Account',
      type: 'Asset',
      normalBalance: 'debit',
      isActive: true,
    });

    // Login
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'frontend-test@test.com',
      password: 'TestPassword123',
    });

    adminToken = response.body.data.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'frontend-test@test.com' });
    await ChartOfAccounts.deleteMany({ code: '9999' });
    await JournalEntry.deleteMany({ description: /Frontend Test/ });
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('Verification Endpoints for Frontend Component', () => {
    test('GET /api/v1/ledger/verify should return verification status', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('totalEntries');
      expect(response.body.data).toHaveProperty('errors');
      expect(Array.isArray(response.body.data.errors)).toBe(true);
    });

    test('GET /api/v1/ledger/verify-chain should return legacy verification status', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify-chain')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('totalEntries');
      expect(response.body.data).toHaveProperty('errors');
    });

    test('GET /api/v1/ledger/chain-stats should return chain statistics', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/chain-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPostedEntries');
      expect(response.body.data).toHaveProperty('chainLength');
      expect(response.body.data).toHaveProperty('hasGaps');
    });

    test('should handle verification with actual journal entries', async () => {
      // Create a test journal entry
      const entryResponse = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Frontend Test Entry',
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
        });

      expect(entryResponse.status).toBe(201);
      const entryId = entryResponse.body.data._id;

      // Post the entry
      await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify the chain
      const verifyResponse = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data.isValid).toBe(true);
      expect(verifyResponse.body.data.totalEntries).toBeGreaterThan(0);
    });

    test('GET /api/v1/ledger/entries/:id/verify should verify single entry', async () => {
      // Create and post an entry first
      const entryResponse = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Frontend Single Verify Test',
          lines: [
            {
              account: testAccount._id,
              debit: '50',
              credit: '0',
            },
            {
              account: testAccount._id,
              debit: '0',
              credit: '50',
            },
          ],
        });

      const entryId = entryResponse.body.data._id;

      await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify single entry
      const verifyResponse = await request(app)
        .get(`/api/v1/ledger/entries/${entryId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data).toHaveProperty('isValid');
      expect(verifyResponse.body.data).toHaveProperty('hash');
      expect(verifyResponse.body.data).toHaveProperty('computedHash');
      expect(verifyResponse.body.data.isValid).toBe(true);
    });

    test('should handle chain segment requests', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/chain-segment?startPosition=0&endPosition=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('segment');
      expect(response.body.data).toHaveProperty('range');
      expect(Array.isArray(response.body.data.segment)).toBe(true);
    });

    test('should require admin role for verification endpoints', async () => {
      // Create a viewer user
      const viewerUser = await User.create({
        email: 'viewer-test@test.com',
        password: 'TestPassword123',
        name: 'Viewer User',
        role: 'viewer',
      });

      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: 'viewer-test@test.com',
        password: 'TestPassword123',
      });

      const viewerToken = loginResponse.body.data.token;

      // Try to access admin-only verification endpoint
      const response = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await User.deleteMany({ email: 'viewer-test@test.com' });
    });

    test('should return consistent data format for frontend component', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      const data = response.body.data;
      
      // Check required fields for frontend component
      expect(typeof data.isValid).toBe('boolean');
      expect(typeof data.totalEntries).toBe('number');
      expect(Array.isArray(data.errors)).toBe(true);
      
      // Optional fields that component can handle
      if (data.chainLength !== undefined) {
        expect(typeof data.chainLength).toBe('number');
      }
      
      if (data.lastHash !== undefined) {
        expect(typeof data.lastHash).toBe('string');
      }
      
      if (data.message !== undefined) {
        expect(typeof data.message).toBe('string');
      }
    });
  });
});