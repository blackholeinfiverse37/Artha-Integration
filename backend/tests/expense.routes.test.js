import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Expense from '../src/models/Expense.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';

let authToken;
let userId;
let expenseId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Clear test database
  await User.deleteMany({});
  await Expense.deleteMany({});
  await ChartOfAccounts.deleteMany({});
  
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
  await ChartOfAccounts.create({
    code: '1010',
    name: 'Cash',
    type: 'Asset',
    normalBalance: 'debit',
  });
  
  await ChartOfAccounts.create({
    code: '6300',
    name: 'Office Supplies',
    type: 'Expense',
    normalBalance: 'debit',
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Expense Routes Integration Tests', () => {
  describe('POST /api/v1/expenses', () => {
    it('should create a new expense', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendor: 'Office Depot',
          description: 'Office supplies purchase',
          category: 'supplies',
          amount: '150.00',
          totalAmount: '150.00',
          paymentMethod: 'credit_card',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vendor).toBe('Office Depot');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.expenseNumber).toMatch(/^EXP-/);
      
      expenseId = res.body.data._id;
    });
    
    it('should reject expense with invalid category', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendor: 'Test Vendor',
          description: 'Invalid category test',
          category: 'invalid_category',
          amount: '100.00',
          totalAmount: '100.00',
          paymentMethod: 'cash',
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/v1/expenses', () => {
    it('should get all expenses', async () => {
      const res = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.expenses)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });
    
    it('should filter expenses by status', async () => {
      const res = await request(app)
        .get('/api/v1/expenses?status=pending')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.expenses.forEach(expense => {
        expect(expense.status).toBe('pending');
      });
    });
  });
  
  describe('GET /api/v1/expenses/:id', () => {
    it('should get single expense', async () => {
      const res = await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(expenseId);
    });
    
    it('should return 404 for non-existent expense', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/expenses/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('POST /api/v1/expenses/:id/approve', () => {
    it('should approve expense', async () => {
      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.approvedBy).toBeDefined();
    });
    
    it('should reject approving already approved expense', async () => {
      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only pending expenses can be approved');
    });
  });
  
  describe('POST /api/v1/expenses/:id/record', () => {
    it('should record expense in ledger', async () => {
      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/record`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('recorded');
      expect(res.body.data.journalEntryId).toBeDefined();
    });
  });
  
  describe('GET /api/v1/expenses/stats', () => {
    it('should get expense statistics', async () => {
      const res = await request(app)
        .get('/api/v1/expenses/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.byStatus).toBeDefined();
      expect(res.body.data.byCategory).toBeDefined();
    });
  });
  
  describe('Authorization Tests', () => {
    it('should reject requests without token', async () => {
      const res = await request(app)
        .get('/api/v1/expenses');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
    
    it('should reject requests with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});