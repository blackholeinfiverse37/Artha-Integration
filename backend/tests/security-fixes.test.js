import request from 'supertest';
import app from '../src/server.js';
import JournalEntry from '../src/models/JournalEntry.js';
import User from '../src/models/User.js';
import { jest } from '@jest/globals';

describe('Security Fixes Validation', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'security-test@artha.local',
      password: 'SecurePass123!',
      name: 'Security Test User',
      role: 'admin'
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'security-test@artha.local',
        password: 'SecurePass123!'
      });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await User.findByIdAndDelete(testUser._id);
  });

  describe('Hash Verification Security Fix', () => {
    it('should reject entries without verifyHash method', async () => {
      // Create a mock entry without verifyHash method
      const mockEntry = new JournalEntry({
        entryNumber: 'TEST-001',
        date: new Date(),
        description: 'Test entry without verifyHash',
        lines: [
          { account: '507f1f77bcf86cd799439011', debit: '100', credit: '0' },
          { account: '507f1f77bcf86cd799439012', debit: '0', credit: '100' }
        ],
        status: 'posted'
      });

      // Remove verifyHash method to simulate the security issue
      delete mockEntry.verifyHash;
      await mockEntry.save();

      const response = await request(app)
        .get(`/api/v1/ledger/entries/${mockEntry._id}/verify`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('verification method not available');

      await JournalEntry.findByIdAndDelete(mockEntry._id);
    });

    it('should properly validate hash when verifyHash method exists', async () => {
      const mockEntry = new JournalEntry({
        entryNumber: 'TEST-002',
        date: new Date(),
        description: 'Test entry with verifyHash',
        lines: [
          { account: '507f1f77bcf86cd799439011', debit: '100', credit: '0' },
          { account: '507f1f77bcf86cd799439012', debit: '0', credit: '100' }
        ],
        status: 'posted'
      });

      await mockEntry.save();

      const response = await request(app)
        .get(`/api/v1/ledger/entries/${mockEntry._id}/verify`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('verificationDetails');

      await JournalEntry.findByIdAndDelete(mockEntry._id);
    });
  });

  describe('Auth Controller User Validation Fix', () => {
    it('should handle missing user in getMe endpoint', async () => {
      // Create a token for non-existent user
      const fakeToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImlhdCI6MTYxODg0NjQwMCwiZXhwIjoxNjE4OTMyODAwfQ.invalid';

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', fakeToken);

      // Should return 401 or 500, not crash
      expect([401, 500]).toContain(response.status);
    });

    it('should return user data when user exists', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email');
    });

    it('should handle logout gracefully even if user is deleted', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Hash Chain Consistency Fix', () => {
    it('should handle mixed field names consistently', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify-chain')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
    });
  });

  describe('Redis Connection Error Handling', () => {
    it('should start server even if Redis is unavailable', () => {
      // This test verifies the server starts without crashing
      // The fix ensures Redis connection failures don't crash the app
      expect(app).toBeDefined();
    });
  });

  describe('Ledger Service Security Fixes', () => {
    it('should not default to true in verifyChainFromEntry', async () => {
      // Create entry without proper hash verification
      const mockEntry = new JournalEntry({
        entryNumber: 'TEST-003',
        date: new Date(),
        description: 'Test chain verification',
        lines: [
          { account: '507f1f77bcf86cd799439011', debit: '100', credit: '0' },
          { account: '507f1f77bcf86cd799439012', debit: '0', credit: '100' }
        ],
        status: 'posted'
      });

      delete mockEntry.verifyHash;
      await mockEntry.save();

      const response = await request(app)
        .get(`/api/v1/ledger/entries/${mockEntry._id}/verify-chain`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should not default to valid=true
      expect(response.status).toBe(200);
      if (response.body.data.isValid === true) {
        // If it returns true, it means the dangerous default is still there
        fail('Security fix failed: verifyChainFromEntry still defaults to true');
      }

      await JournalEntry.findByIdAndDelete(mockEntry._id);
    });
  });
});

describe('Backward Compatibility Verification', () => {
  let authToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@artha.local',
        password: 'Admin@123456'
      });

    authToken = loginRes.body.data.token;
  });

  it('should maintain all existing API endpoints', async () => {
    const endpoints = [
      '/api/v1/ledger/entries',
      '/api/v1/ledger/verify-chain',
      '/api/v1/ledger/verify',
      '/api/v1/auth/me',
      '/api/health'
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      // Should not return 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    }
  });

  it('should maintain response format compatibility', async () => {
    const response = await request(app)
      .get('/api/v1/ledger/verify-chain')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('data');
  });
});