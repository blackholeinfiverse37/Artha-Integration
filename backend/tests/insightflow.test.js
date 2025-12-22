import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import RLExperience from '../src/models/RLExperience.js';

let authToken;
let adminToken;
let userId;
let adminId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Clear test database
  await User.deleteMany({});
  await RLExperience.deleteMany({});
  
  // Create test users
  const user = await User.create({
    email: 'rl@artha.local',
    password: 'Test@123456',
    name: 'RL Test User',
    role: 'viewer',
  });
  userId = user._id;
  
  const admin = await User.create({
    email: 'rladmin@artha.local',
    password: 'Test@123456',
    name: 'RL Admin User',
    role: 'admin',
  });
  adminId = admin._id;
  
  // Login to get tokens
  const userLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'rl@artha.local', password: 'Test@123456' });
  
  const adminLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'rladmin@artha.local', password: 'Test@123456' });
  
  authToken = userLoginRes.body.data.token;
  adminToken = adminLoginRes.body.data.token;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('InsightFlow RL Experience System', () => {
  describe('POST /api/v1/insightflow/experience', () => {
    it('should log RL experience successfully', async () => {
      const experienceData = {
        sessionId: 'test-session-001',
        state: {
          screen: 'invoice_create',
          fields_filled: ['customer', 'amount'],
          progress: 0.6,
        },
        action: 'click_save',
        reward: 10,
        nextState: {
          screen: 'invoice_success',
          invoice_created: true,
        },
        isTerminal: true,
        metadata: {
          duration: 2500,
          errorOccurred: false,
          userRole: 'viewer',
        },
      };
      
      const res = await request(app)
        .post('/api/v1/insightflow/experience')
        .set('Authorization', `Bearer ${authToken}`)
        .send(experienceData);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBe('test-session-001');
      expect(res.body.data.action).toBe('click_save');
      expect(res.body.data.reward).toBe(10);
      expect(res.body.data.userId.toString()).toBe(userId.toString());
    });
    
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/insightflow/experience')
        .send({
          sessionId: 'test-session-002',
          state: { screen: 'test' },
          action: 'test_action',
          reward: 5,
          nextState: { screen: 'test_result' },
        });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
    
    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/insightflow/experience')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: 'test-session-003',
          // Missing required fields
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/v1/insightflow/experiences', () => {
    beforeAll(async () => {
      // Create test experiences
      await RLExperience.create([
        {
          sessionId: 'test-session-004',
          userId: userId,
          state: { screen: 'expense_create' },
          action: 'fill_vendor',
          reward: 5,
          nextState: { screen: 'expense_create', vendor_filled: true },
          metadata: { duration: 1000, errorOccurred: false, userRole: 'viewer' },
        },
        {
          sessionId: 'test-session-005',
          userId: userId,
          state: { screen: 'ledger_view' },
          action: 'apply_filter',
          reward: 3,
          nextState: { screen: 'ledger_view', filtered: true },
          metadata: { duration: 800, errorOccurred: false, userRole: 'viewer' },
        },
      ]);
    });
    
    it('should get experiences for admin', async () => {
      const res = await request(app)
        .get('/api/v1/insightflow/experiences')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
    
    it('should deny access for non-admin users', async () => {
      const res = await request(app)
        .get('/api/v1/insightflow/experiences')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
    
    it('should filter experiences by sessionId', async () => {
      const res = await request(app)
        .get('/api/v1/insightflow/experiences?sessionId=test-session-004')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach(exp => {
        expect(exp.sessionId).toBe('test-session-004');
      });
    });
    
    it('should filter experiences by action', async () => {
      const res = await request(app)
        .get('/api/v1/insightflow/experiences?action=fill_vendor')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach(exp => {
        expect(exp.action).toBe('fill_vendor');
      });
    });
    
    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/insightflow/experiences?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });
  
  describe('GET /api/v1/insightflow/stats', () => {
    it('should get experience statistics for admin', async () => {
      const res = await request(app)
        .get('/api/v1/insightflow/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actionStats).toBeDefined();
      expect(res.body.data.rewardStats).toBeDefined();
      expect(res.body.data.errorStats).toBeDefined();
    });
    
    it('should deny access for non-admin users', async () => {
      const res = await request(app)
        .get('/api/v1/insightflow/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
    
    it('should support date filtering', async () => {
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();
      
      const res = await request(app)
        .get(`/api/v1/insightflow/stats?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

describe('InsightFlow Service Tests', () => {
  const insightflowService = require('../src/services/insightflow.service.js').default;
  
  describe('calculateReward', () => {
    it('should calculate positive rewards for successful actions', async () => {
      const reward = insightflowService.calculateReward('invoice.created', {
        errorOccurred: false,
        duration: 2000,
      });
      
      expect(reward).toBe(10);
    });
    
    it('should calculate negative rewards for errors', async () => {
      const reward = insightflowService.calculateReward('validation.error', {
        errorOccurred: true,
        duration: 1000,
      });
      
      expect(reward).toBe(-10); // -5 base + -5 for error
    });
    
    it('should penalize slow actions', async () => {
      const reward = insightflowService.calculateReward('invoice.created', {
        errorOccurred: false,
        duration: 6000, // > 5 seconds
      });
      
      expect(reward).toBe(8); // 10 base - 2 for slow action
    });
    
    it('should handle unknown actions', async () => {
      const reward = insightflowService.calculateReward('unknown.action', {
        errorOccurred: false,
        duration: 1000,
      });
      
      expect(reward).toBe(0);
    });
  });
});

describe('RL Experience Model Tests', () => {
  it('should create RL experience with all fields', async () => {
    const experienceData = {
      sessionId: 'model-test-session',
      userId: userId,
      state: { screen: 'test', progress: 0.5 },
      action: 'test_action',
      reward: 15,
      nextState: { screen: 'test_result', completed: true },
      isTerminal: true,
      metadata: {
        duration: 1500,
        errorOccurred: false,
        userRole: 'viewer',
      },
    };
    
    const experience = await RLExperience.create(experienceData);
    
    expect(experience.sessionId).toBe('model-test-session');
    expect(experience.userId.toString()).toBe(userId.toString());
    expect(experience.action).toBe('test_action');
    expect(experience.reward).toBe(15);
    expect(experience.isTerminal).toBe(true);
    expect(experience.metadata.duration).toBe(1500);
  });
  
  it('should require mandatory fields', async () => {
    try {
      await RLExperience.create({
        sessionId: 'incomplete-session',
        // Missing required fields
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
    }
  });
  
  it('should have proper indexes', async () => {
    const indexes = await RLExperience.collection.getIndexes();
    const indexNames = Object.keys(indexes);
    
    expect(indexNames).toContain('sessionId_1_createdAt_-1');
    expect(indexNames).toContain('userId_1_createdAt_-1');
  });
});