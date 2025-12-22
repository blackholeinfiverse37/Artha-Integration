import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import fs from 'fs';
import path from 'path';

let authToken;
let userId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Clear test database
  await User.deleteMany({});
  await ChartOfAccounts.deleteMany({});
  
  // Create test user
  const user = await User.create({
    email: 'final@artha.local',
    password: 'Test@123456',
    name: 'Final Integration Test',
    role: 'admin',
  });
  userId = user._id;
  
  // Login to get token
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'final@artha.local', password: 'Test@123456' });
  
  authToken = loginRes.body.data.token;
  
  // Create test accounts
  await ChartOfAccounts.create([
    { code: '1010', name: 'Cash', type: 'Asset', normalBalance: 'debit' },
    { code: '1100', name: 'Accounts Receivable', type: 'Asset', normalBalance: 'debit' },
    { code: '4000', name: 'Sales Revenue', type: 'Income', normalBalance: 'credit' },
    { code: '6300', name: 'Office Supplies', type: 'Expense', normalBalance: 'debit' },
  ]);
  
  // Ensure uploads directory exists
  const uploadsDir = 'uploads/receipts';
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Final System Integration Test', () => {
  describe('Complete workflow with all new features', () => {
    let invoiceId;
    let expenseId;
    
    it('should handle complete invoice workflow', async () => {
      // 1. Create invoice
      const invoiceRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceNumber: 'FINAL-001',
          customerName: 'Final Test Corp',
          customerEmail: 'test@final.com',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            {
              description: 'Final Integration Test',
              quantity: 1,
              unitPrice: '1000.00',
              amount: '1000.00',
            },
          ],
          subtotal: '1000.00',
          totalAmount: '1000.00',
        });
      
      expect(invoiceRes.status).toBe(201);
      expect(invoiceRes.body.success).toBe(true);
      invoiceId = invoiceRes.body.data._id;
      
      // 2. Send invoice
      const sendRes = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(sendRes.status).toBe(200);
      expect(sendRes.body.data.status).toBe('sent');
      
      // 3. Record payment
      const paymentRes = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: '1000.00',
          paymentMethod: 'bank_transfer',
          paymentDate: new Date().toISOString(),
        });
      
      expect(paymentRes.status).toBe(200);
      expect(paymentRes.body.data.status).toBe('paid');
      
      // 4. Get invoice statistics
      const statsRes = await request(app)
        .get('/api/v1/invoices/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.success).toBe(true);
    });
    
    it('should handle complete expense workflow with file upload', async () => {
      // Create a test receipt file
      const testFilePath = path.join(__dirname, 'test-receipt.txt');
      fs.writeFileSync(testFilePath, 'Test receipt for final integration');
      
      // 1. Create expense with receipt
      const expenseRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vendor', 'Final Test Vendor')
        .field('description', 'Final integration test expense')
        .field('category', 'supplies')
        .field('amount', '500.00')
        .field('totalAmount', '500.00')
        .field('paymentMethod', 'card')
        .attach('receipts', testFilePath);
      
      expect(expenseRes.status).toBe(201);
      expect(expenseRes.body.success).toBe(true);
      expect(expenseRes.body.data.receipts).toHaveLength(1);
      expenseId = expenseRes.body.data._id;
      
      // 2. Approve expense
      const approveRes = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('approved');
      
      // 3. Record expense
      const recordRes = await request(app)
        .post(`/api/v1/expenses/${expenseId}/record`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(recordRes.status).toBe(200);
      expect(recordRes.body.data.status).toBe('recorded');
      
      // 4. Get expense statistics
      const statsRes = await request(app)
        .get('/api/v1/expenses/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.success).toBe(true);
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
    });
    
    it('should handle InsightFlow RL experience logging', async () => {
      // Log an RL experience
      const experienceRes = await request(app)
        .post('/api/v1/insightflow/experience')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: 'final-test-session',
          state: {
            screen: 'final_test',
            workflow: 'complete',
          },
          action: 'complete_workflow',
          reward: 50,
          nextState: {
            screen: 'success',
            completed: true,
          },
          isTerminal: true,
          metadata: {
            duration: 5000,
            errorOccurred: false,
            userRole: 'admin',
          },
        });
      
      expect(experienceRes.status).toBe(201);
      expect(experienceRes.body.success).toBe(true);
      
      // Get experience statistics
      const statsRes = await request(app)
        .get('/api/v1/insightflow/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.success).toBe(true);
    });
    
    it('should serve uploaded files via static serving', async () => {
      // Get the expense with receipt
      const expenseRes = await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(expenseRes.status).toBe(200);
      const receipt = expenseRes.body.data.receipts[0];
      
      // Try to access the uploaded file
      const fileRes = await request(app)
        .get(`/uploads/receipts/${receipt.filename}`);
      
      expect(fileRes.status).toBe(200);
    });
  });
  
  describe('System integrity after all operations', () => {
    it('should maintain ledger integrity', async () => {
      const verifyRes = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(true);
    });
    
    it('should show correct ledger summary', async () => {
      const summaryRes = await request(app)
        .get('/api/v1/ledger/summary')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.isBalanced).toBe(true);
    });
    
    it('should maintain all legacy endpoints', async () => {
      // Test legacy health endpoint
      const healthRes = await request(app).get('/api/health');
      expect(healthRes.status).toBe(200);
      
      // Test legacy ledger endpoint
      const ledgerRes = await request(app)
        .get('/api/v1/ledger/journal-entries')
        .set('Authorization', `Bearer ${authToken}`);
      expect(ledgerRes.status).toBe(200);
      
      // Test main health endpoint
      const mainHealthRes = await request(app).get('/health');
      expect(mainHealthRes.status).toBe(200);
    });
  });
  
  describe('Performance and reliability', () => {
    it('should handle concurrent requests', async () => {
      const promises = [];
      
      // Create multiple concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/health')
        );
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
    
    it('should handle error cases gracefully', async () => {
      // Test invalid route
      const invalidRes = await request(app)
        .get('/api/v1/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(invalidRes.status).toBe(404);
      expect(invalidRes.body.success).toBe(false);
      
      // Test unauthorized access
      const unauthorizedRes = await request(app)
        .get('/api/v1/invoices');
      
      expect(unauthorizedRes.status).toBe(401);
      expect(unauthorizedRes.body.success).toBe(false);
    });
  });
});