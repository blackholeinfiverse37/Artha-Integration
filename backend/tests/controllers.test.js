import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Invoice from '../src/models/Invoice.js';
import Expense from '../src/models/Expense.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';

let authToken;
let userId;
let invoiceId;
let expenseId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Clear test database
  await User.deleteMany({});
  await Invoice.deleteMany({});
  await Expense.deleteMany({});
  await ChartOfAccounts.deleteMany({});
  
  // Create test user
  const user = await User.create({
    email: 'controller@artha.local',
    password: 'Test@123456',
    name: 'Controller Test User',
    role: 'admin',
  });
  userId = user._id;
  
  // Login to get token
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'controller@artha.local', password: 'Test@123456' });
  
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

describe('Invoice Controller Tests', () => {
  describe('POST /api/v1/invoices (createInvoice)', () => {
    it('should create invoice using controller', async () => {
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceNumber: 'CTRL-INV-001',
          customerName: 'Controller Test Corp',
          customerEmail: 'test@controller.com',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              description: 'Controller Testing Services',
              quantity: 5,
              unitPrice: '200.00',
              amount: '1000.00',
            },
          ],
          subtotal: '1000.00',
          totalAmount: '1000.00',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toBe('CTRL-INV-001');
      expect(res.body.data.status).toBe('draft');
      
      invoiceId = res.body.data._id;
    });
  });
  
  describe('GET /api/v1/invoices (getInvoices)', () => {
    it('should get invoices using controller', async () => {
      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });
  
  describe('GET /api/v1/invoices/:id (getInvoice)', () => {
    it('should get single invoice using controller', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(invoiceId);
    });
  });
  
  describe('GET /api/v1/invoices/stats (getInvoiceStats)', () => {
    it('should get invoice stats using controller', async () => {
      const res = await request(app)
        .get('/api/v1/invoices/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});

describe('Expense Controller Tests', () => {
  describe('POST /api/v1/expenses (createExpense)', () => {
    it('should create expense using controller', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendor: 'Controller Test Vendor',
          description: 'Controller test expense',
          category: 'supplies',
          amount: '150.00',
          totalAmount: '150.00',
          paymentMethod: 'credit_card',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vendor).toBe('Controller Test Vendor');
      expect(res.body.data.status).toBe('pending');
      
      expenseId = res.body.data._id;
    });
  });
  
  describe('GET /api/v1/expenses (getExpenses)', () => {
    it('should get expenses using controller', async () => {
      const res = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });
  
  describe('GET /api/v1/expenses/:id (getExpense)', () => {
    it('should get single expense using controller', async () => {
      const res = await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(expenseId);
    });
  });
  
  describe('POST /api/v1/expenses/:id/approve (approveExpense)', () => {
    it('should approve expense using controller', async () => {
      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
    });
  });
  
  describe('POST /api/v1/expenses/:id/record (recordExpense)', () => {
    it('should record expense using controller', async () => {
      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/record`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('recorded');
      expect(res.body.data.journalEntryId).toBeDefined();
    });
  });
  
  describe('GET /api/v1/expenses/stats (getExpenseStats)', () => {
    it('should get expense stats using controller', async () => {
      const res = await request(app)
        .get('/api/v1/expenses/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.byStatus).toBeDefined();
      expect(res.body.data.byCategory).toBeDefined();
    });
  });
});

describe('Controller Error Handling', () => {
  it('should handle invalid invoice ID gracefully', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/invoices/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
  
  it('should handle invalid expense ID gracefully', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/expenses/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
  
  it('should handle validation errors in invoice creation', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        // Missing required fields
        customerName: 'Test',
      });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
  
  it('should handle validation errors in expense creation', async () => {
    const res = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        // Missing required fields
        vendor: 'Test',
      });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});