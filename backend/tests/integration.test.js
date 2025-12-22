import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import JournalEntry from '../src/models/JournalEntry.js';
import Invoice from '../src/models/Invoice.js';
import Expense from '../src/models/Expense.js';
import logger from '../src/config/logger.js';

describe('ARTHA v0.1 - Complete Integration Tests', () => {
  let adminToken;
  let accountantToken;
  let adminUser;
  let accountantUser;
  let cashAccount;
  let revenueAccount;
  let arAccount;
  let expenseAccount;
  const testPeriod = '2025-02';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || process.env.MONGODB_URI);
    }

    // Clean up existing test data
    await User.deleteMany({ email: /integration-.*@test\.com/ });
    await ChartOfAccounts.deleteMany({ code: { $in: ['1010', '1100', '4000', '6300'] } });

    // Create test users
    adminUser = await User.create({
      email: 'integration-admin@test.com',
      password: 'TestPassword123',
      name: 'Integration Admin',
      role: 'admin',
    });

    accountantUser = await User.create({
      email: 'integration-accountant@test.com',
      password: 'TestPassword123',
      name: 'Integration Accountant',
      role: 'accountant',
    });

    // Create test accounts
    cashAccount = await ChartOfAccounts.create({
      code: '1010',
      name: 'Cash',
      type: 'Asset',
      normalBalance: 'debit',
      isActive: true,
    });

    arAccount = await ChartOfAccounts.create({
      code: '1100',
      name: 'Accounts Receivable',
      type: 'Asset',
      normalBalance: 'debit',
      isActive: true,
    });

    revenueAccount = await ChartOfAccounts.create({
      code: '4000',
      name: 'Sales Revenue',
      type: 'Income',
      normalBalance: 'credit',
      isActive: true,
    });

    expenseAccount = await ChartOfAccounts.create({
      code: '6300',
      name: 'Office Supplies',
      type: 'Expense',
      normalBalance: 'debit',
      isActive: true,
    });

    // Login as admin
    let response = await request(app).post('/api/v1/auth/login').send({
      email: 'integration-admin@test.com',
      password: 'TestPassword123',
    });
    adminToken = response.body.data.token;

    // Login as accountant
    response = await request(app).post('/api/v1/auth/login').send({
      email: 'integration-accountant@test.com',
      password: 'TestPassword123',
    });
    accountantToken = response.body.data.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /integration-.*@test\.com/ });
    await ChartOfAccounts.deleteMany({ code: { $in: ['1010', '1100', '4000', '6300'] } });
    await JournalEntry.deleteMany({});
    await Invoice.deleteMany({});
    await Expense.deleteMany({});
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('1. Authentication Flow', () => {
    test('should register new user', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@test.com',
        password: 'NewPassword123',
        name: 'New User',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email');
    });

    test('should login and return JWT token', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'integration-admin@test.com',
        password: 'TestPassword123',
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('token');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'integration-admin@test.com',
        password: 'WrongPassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should get current user', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('integration-admin@test.com');
    });
  });

  describe('2. Ledger & Hash-Chain Flow', () => {
    let entryId;

    test('should create journal entry with hash chain', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: new Date(),
          description: 'Test journal entry',
          lines: [
            {
              account: cashAccount._id,
              debit: '1000',
              credit: '0',
            },
            {
              account: revenueAccount._id,
              debit: '0',
              credit: '1000',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('hash');
      expect(response.body.data).toHaveProperty('prevHash');
      expect(response.body.data).toHaveProperty('chainPosition');
      entryId = response.body.data._id;
    });

    test('should post journal entry and update hash chain', async () => {
      const response = await request(app)
        .post(`/api/v1/ledger/entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('posted');
    });

    test('should verify ledger chain integrity', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('totalEntries');
    });

    test('should verify single entry hash', async () => {
      const response = await request(app)
        .get(`/api/v1/ledger/entries/${entryId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isValid');
    });

    test('should get ledger summary', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('assets');
      expect(response.body.data).toHaveProperty('isBalanced');
    });

    test('should get account balances', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/balances')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('3. Invoice Workflow', () => {
    let invoiceId;

    test('should create invoice in draft status', async () => {
      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceNumber: `INV-TEST-${Date.now()}`,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          customerName: 'Test Customer',
          customerEmail: 'customer@test.com',
          items: [
            {
              description: 'Test service',
              quantity: 1,
              unitPrice: '1000',
              amount: '1000',
              taxRate: 18,
            },
          ],
          subtotal: '1000',
          taxAmount: '180',
          totalAmount: '1180',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('draft');
      invoiceId = response.body.data._id;
    });

    test('should send invoice (create AR entry)', async () => {
      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('sent');
    });

    test('should record payment', async () => {
      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '1180',
          paymentMethod: 'bank_transfer',
          reference: 'NEFT-12345',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('paid');
    });

    test('should get invoice details', async () => {
      const response = await request(app)
        .get(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.invoiceNumber).toBeDefined();
    });

    test('should get invoice stats', async () => {
      const response = await request(app)
        .get('/api/v1/invoices/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('4. Expense Workflow with OCR', () => {
    let expenseId;

    test('should create expense', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: new Date(),
          vendor: 'Test Vendor',
          category: 'supplies',
          description: 'Test expense',
          amount: '500',
          taxAmount: '90',
          totalAmount: '590',
          paymentMethod: 'card',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('pending');
      expenseId = response.body.data._id;
    });

    test('should get OCR status', async () => {
      const response = await request(app)
        .get('/api/v1/expenses/ocr/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('ocrEnabled');
    });

    test('should approve expense', async () => {
      const response = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('approved');
    });

    test('should record expense (create ledger entry)', async () => {
      const response = await request(app)
        .post(`/api/v1/expenses/${expenseId}/record`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('recorded');
    });

    test('should get expense stats', async () => {
      const response = await request(app)
        .get('/api/v1/expenses/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('byStatus');
    });
  });

  describe('5. GST Filing Packets', () => {
    test('should generate GSTR-1 filing packet', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/filing-packet/gstr-1?period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.filingType).toBe('GSTR-1');
      expect(response.body.data).toHaveProperty('supplies');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('should generate GSTR-3B filing packet', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/filing-packet/gstr-3b?period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.filingType).toBe('GSTR-3B');
      expect(response.body.data).toHaveProperty('outwardSupplies');
      expect(response.body.data).toHaveProperty('netLiability');
    });

    test('should get GST summary', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/summary?period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('combined');
      expect(response.body.data).toHaveProperty('gstr1Summary');
      expect(response.body.data).toHaveProperty('gstr3bNetLiability');
    });
  });

  describe('6. Chart of Accounts', () => {
    test('should get all accounts', async () => {
      const response = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should get single account', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/${cashAccount._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.code).toBe('1010');
    });
  });

  describe('7. Health Checks & Monitoring', () => {
    test('should return basic health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return detailed health status', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('services');
    });

    test('should return readiness status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('success');
    });

    test('should return liveness status', async () => {
      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('8. Authorization & Access Control', () => {
    test('should deny access without token', async () => {
      const response = await request(app).get('/api/v1/ledger/entries');

      expect(response.status).toBe(401);
    });

    test('should accept valid token', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBeOneOf([200, 400]);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/entries')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(response.status).toBe(401);
    });

    test('admin should access protected routes', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test('accountant should access their routes', async () => {
      const response = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(response.status).toBeOneOf([200, 400]);
    });
  });

  describe('9. Legacy Route Compatibility', () => {
    test('should support legacy auth routes', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'integration-admin@test.com',
        password: 'TestPassword123',
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('token');
    });

    test('should support legacy health route', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('10. Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/ledger/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing lines',
        });

      expect(response.status).toBeOneOf([400, 500]);
    });

    test('should handle invalid IDs', async () => {
      const response = await request(app)
        .get('/api/v1/invoices/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBeOneOf([400, 404, 500]);
    });
  });
});

// Custom matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        `expected ${received} to be one of ${JSON.stringify(expected)}`,
    };
  },
});
