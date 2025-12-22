import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';

let authToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Clear test database
  await User.deleteMany({});
  await ChartOfAccounts.deleteMany({});
  
  // Create test user
  const user = await User.create({
    email: 'routes@artha.local',
    password: 'Test@123456',
    name: 'Routes Integration Test',
    role: 'admin',
  });
  
  // Login to get token
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'routes@artha.local', password: 'Test@123456' });
  
  authToken = loginRes.body.data.token;
  
  // Create test accounts
  await ChartOfAccounts.create([
    { code: '1010', name: 'Cash', type: 'Asset', normalBalance: 'debit' },
    { code: '1100', name: 'Accounts Receivable', type: 'Asset', normalBalance: 'debit' },
    { code: '4000', name: 'Sales Revenue', type: 'Income', normalBalance: 'credit' },
    { code: '6300', name: 'Office Supplies', type: 'Expense', normalBalance: 'debit' },
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Routes Integration with Existing System', () => {
  describe('Enhanced routes work with existing ledger system', () => {
    let invoiceId;
    let expenseId;
    
    it('should create invoice and integrate with ledger', async () => {
      // Create invoice
      const invoiceRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceNumber: 'INT-001',
          customerName: 'Integration Test Corp',
          customerEmail: 'test@integration.com',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            {
              description: 'Integration Testing',
              quantity: 1,
              unitPrice: '500.00',
              amount: '500.00',
            },
          ],
          subtotal: '500.00',
          totalAmount: '500.00',
        });
      
      expect(invoiceRes.status).toBe(201);
      invoiceId = invoiceRes.body.data._id;
      
      // Send invoice (creates ledger entry)
      const sendRes = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(sendRes.status).toBe(200);
      
      // Verify ledger entries were created
      const ledgerRes = await request(app)
        .get('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(ledgerRes.status).toBe(200);
      expect(ledgerRes.body.data.length).toBeGreaterThan(0);
    });
    
    it('should create expense and integrate with ledger', async () => {
      // Create expense
      const expenseRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendor: 'Integration Vendor',
          description: 'Integration test expense',
          category: 'supplies',
          amount: '150.00',
          totalAmount: '150.00',
          paymentMethod: 'card',
        });
      
      expect(expenseRes.status).toBe(201);
      expenseId = expenseRes.body.data._id;
      
      // Approve expense
      const approveRes = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(approveRes.status).toBe(200);
      
      // Record expense (creates ledger entry)
      const recordRes = await request(app)
        .post(`/api/v1/expenses/${expenseId}/record`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(recordRes.status).toBe(200);
      
      // Verify ledger integrity
      const verifyRes = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(true);
    });
  });
  
  describe('Backward compatibility with existing endpoints', () => {
    it('should work with legacy ledger endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/journal-entries')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('should work with legacy health endpoints', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('should work with existing auth endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
  
  describe('Enhanced features work correctly', () => {
    it('should provide invoice statistics', async () => {
      const res = await request(app)
        .get('/api/v1/invoices/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
    
    it('should provide expense statistics', async () => {
      const res = await request(app)
        .get('/api/v1/expenses/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
    
    it('should handle pagination correctly', async () => {
      const res = await request(app)
        .get('/api/v1/invoices?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });
});