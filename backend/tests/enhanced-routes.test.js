import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Invoice from '../src/models/Invoice.js';
import Expense from '../src/models/Expense.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import AuditLog from '../src/models/AuditLog.js';

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
  await AuditLog.deleteMany({});
  
  // Create test user
  const user = await User.create({
    email: 'enhanced@artha.local',
    password: 'Test@123456',
    name: 'Enhanced Routes Test User',
    role: 'admin',
  });
  userId = user._id;
  
  // Login to get token
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'enhanced@artha.local', password: 'Test@123456' });
  
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

describe('Enhanced Invoice Routes Tests', () => {
  describe('POST /api/v1/invoices with audit logging', () => {
    it('should create invoice and log audit entry', async () => {
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceNumber: 'ENH-INV-001',
          customerName: 'Enhanced Test Corp',
          customerEmail: 'test@enhanced.com',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            {
              description: 'Enhanced Testing Services',
              quantity: 3,
              unitPrice: '300.00',
              amount: '900.00',
            },
          ],
          subtotal: '900.00',
          totalAmount: '900.00',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toBe('ENH-INV-001');
      
      invoiceId = res.body.data._id;
      
      // Check audit log was created
      setTimeout(async () => {
        const auditLog = await AuditLog.findOne({
          action: 'invoice.created',
          entityId: invoiceId,
        });
        expect(auditLog).toBeTruthy();
        expect(auditLog.userId.toString()).toBe(userId.toString());
      }, 100);
    });
    
    it('should validate invoice data properly', async () => {
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          customerName: '',
          invoiceDate: 'invalid-date',
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });
  
  describe('POST /api/v1/invoices/:id/send with audit logging', () => {
    it('should send invoice and log audit entry', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('sent');
      
      // Check audit log was created
      setTimeout(async () => {
        const auditLog = await AuditLog.findOne({
          action: 'invoice.sent',
          entityId: invoiceId,
        });
        expect(auditLog).toBeTruthy();
      }, 100);
    });
  });
  
  describe('POST /api/v1/invoices/:id/payment with validation', () => {
    it('should record payment with proper validation', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: '900.00',
          paymentMethod: 'bank_transfer',
          paymentDate: new Date().toISOString(),
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('paid');
      
      // Check audit log was created
      setTimeout(async () => {
        const auditLog = await AuditLog.findOne({
          action: 'invoice.payment_recorded',
          entityId: invoiceId,
        });
        expect(auditLog).toBeTruthy();
      }, 100);
    });
    
    it('should validate payment method', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: '100.00',
          paymentMethod: 'invalid_method',
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });
});

describe('Enhanced Expense Routes Tests', () => {
  describe('POST /api/v1/expenses with audit logging', () => {
    it('should create expense and log audit entry', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendor: 'Enhanced Test Vendor',
          description: 'Enhanced test expense',
          category: 'supplies',
          amount: '200.00',
          totalAmount: '200.00',
          paymentMethod: 'card',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vendor).toBe('Enhanced Test Vendor');
      
      expenseId = res.body.data._id;
      
      // Check audit log was created
      setTimeout(async () => {
        const auditLog = await AuditLog.findOne({
          action: 'expense.created',
          entityId: expenseId,
        });
        expect(auditLog).toBeTruthy();
        expect(auditLog.userId.toString()).toBe(userId.toString());
      }, 100);
    });
    
    it('should validate expense data properly', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendor: '',
          category: 'invalid_category',
          amount: 'not_a_number',
          paymentMethod: 'invalid_method',
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });
  
  describe('POST /api/v1/expenses/:id/approve with audit logging', () => {
    it('should approve expense and log audit entry', async () => {
      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
      
      // Check audit log was created
      setTimeout(async () => {
        const auditLog = await AuditLog.findOne({
          action: 'expense.approved',
          entityId: expenseId,
        });
        expect(auditLog).toBeTruthy();
      }, 100);
    });
  });
  
  describe('POST /api/v1/expenses/:id/record with audit logging', () => {
    it('should record expense and log audit entry', async () => {
      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/record`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('recorded');
      
      // Check audit log was created
      setTimeout(async () => {
        const auditLog = await AuditLog.findOne({
          action: 'expense.recorded',
          entityId: expenseId,
        });
        expect(auditLog).toBeTruthy();
      }, 100);
    });
  });
});

describe('Route Authorization Tests', () => {
  let viewerToken;
  
  beforeAll(async () => {
    // Create viewer user
    const viewer = await User.create({
      email: 'viewer@artha.local',
      password: 'Test@123456',
      name: 'Viewer User',
      role: 'viewer',
    });
    
    // Login as viewer
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'viewer@artha.local', password: 'Test@123456' });
    
    viewerToken = loginRes.body.data.token;
  });
  
  it('should deny invoice creation for viewer role', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        customerName: 'Test Customer',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        lines: [{ description: 'Test', quantity: 1, unitPrice: '100', amount: '100' }],
      });
    
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
  
  it('should deny expense approval for viewer role', async () => {
    const res = await request(app)
      .post(`/api/v1/expenses/${expenseId}/approve`)
      .set('Authorization', `Bearer ${viewerToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('Audit Logging Verification', () => {
  it('should have created audit logs for all operations', async () => {
    // Wait for async audit logs to be created
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const auditLogs = await AuditLog.find({
      userId: userId,
    }).sort({ timestamp: -1 });
    
    expect(auditLogs.length).toBeGreaterThan(0);
    
    // Check for specific audit log entries
    const actions = auditLogs.map(log => log.action);
    expect(actions).toContain('invoice.created');
    expect(actions).toContain('invoice.sent');
    expect(actions).toContain('invoice.payment_recorded');
    expect(actions).toContain('expense.created');
    expect(actions).toContain('expense.approved');
    expect(actions).toContain('expense.recorded');
  });
});