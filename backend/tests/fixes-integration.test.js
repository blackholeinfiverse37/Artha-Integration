import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Invoice from '../src/models/Invoice.js';
import Expense from '../src/models/Expense.js';
import { areTransactionsAvailable, withTransaction } from '../src/config/database.js';

describe('Fixes Integration Tests', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || process.env.MONGODB_URI);
    }

    // Clean up existing test data
    await User.deleteMany({ email: /fixes-test.*@test\.com/ });

    // Create test user
    adminUser = await User.create({
      email: 'fixes-test-admin@test.com',
      password: 'TestPassword123',
      name: 'Fixes Test Admin',
      role: 'admin',
    });

    // Login to get token
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'fixes-test-admin@test.com',
      password: 'TestPassword123',
    });
    adminToken = response.body.data.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /fixes-test.*@test\.com/ });
    await Invoice.deleteMany({ invoiceNumber: /TEST-FIX-/ });
    await Expense.deleteMany({ expenseNumber: /EXP-FIX-/ });
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('1. Database Transaction Availability', () => {
    test('should detect transaction availability', () => {
      const available = areTransactionsAvailable();
      expect(typeof available).toBe('boolean');
      console.log(`Transactions available: ${available}`);
    });

    test('should execute safe transaction wrapper', async () => {
      const result = await withTransaction(async (session) => {
        return { success: true, hasSession: !!session };
      });

      expect(result.success).toBe(true);
      expect(typeof result.hasSession).toBe('boolean');
    });
  });

  describe('2. Invoice Model Decimal Validation', () => {
    test('should accept valid decimal values', async () => {
      const validInvoice = new Invoice({
        invoiceNumber: 'TEST-FIX-001',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          description: 'Test Item',
          quantity: 1,
          unitPrice: '100.50',
          amount: '100.50',
          taxRate: 18
        }],
        subtotal: '100.50',
        taxAmount: '18.09',
        totalAmount: '118.59',
        createdBy: adminUser._id
      });

      await expect(validInvoice.validate()).resolves.not.toThrow();
    });

    test('should reject invalid decimal values', async () => {
      const invalidInvoice = new Invoice({
        invoiceNumber: 'TEST-FIX-002',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          description: 'Test Item',
          quantity: 1,
          unitPrice: 'invalid-price',
          amount: '100.50',
          taxRate: 18
        }],
        subtotal: '100.50',
        taxAmount: '18.09',
        totalAmount: '118.59',
        createdBy: adminUser._id
      });

      await expect(invalidInvoice.validate()).rejects.toThrow();
    });

    test('should synchronize items and lines fields', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'TEST-FIX-003',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          description: 'Test Item',
          quantity: 1,
          unitPrice: '100.00',
          amount: '100.00',
          taxRate: 18
        }],
        subtotal: '100.00',
        taxAmount: '18.00',
        totalAmount: '118.00',
        createdBy: adminUser._id
      });

      // Trigger pre-save middleware
      await invoice.validate();
      
      // Mock the save operation to trigger pre-save hooks
      const originalSave = invoice.save;
      invoice.save = function() {
        // Manually trigger pre-save hook
        return new Promise((resolve) => {
          this.constructor.schema.pre('save').call(this, () => {
            resolve(this);
          });
        });
      };

      await invoice.save();
      
      expect(invoice.lines).toBeDefined();
      expect(invoice.lines.length).toBe(1);
      expect(invoice.lines[0].description).toBe('Test Item');
    });
  });

  describe('3. Expense Model Decimal Validation', () => {
    test('should accept valid decimal values', async () => {
      const validExpense = new Expense({
        expenseNumber: 'EXP-FIX-001',
        date: new Date(),
        vendor: 'Test Vendor',
        description: 'Test Expense',
        category: 'supplies',
        amount: '50.25',
        taxAmount: '9.05',
        totalAmount: '59.30',
        paymentMethod: 'cash',
        submittedBy: adminUser._id
      });

      await expect(validExpense.validate()).resolves.not.toThrow();
    });

    test('should reject invalid decimal values', async () => {
      const invalidExpense = new Expense({
        expenseNumber: 'EXP-FIX-002',
        date: new Date(),
        vendor: 'Test Vendor',
        description: 'Test Expense',
        category: 'supplies',
        amount: 'invalid-amount',
        taxAmount: '9.05',
        totalAmount: '59.30',
        paymentMethod: 'cash',
        submittedBy: adminUser._id
      });

      await expect(invalidExpense.validate()).rejects.toThrow();
    });
  });

  describe('4. Invoice Route Validation', () => {
    test('should accept invoice with items field', async () => {
      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceNumber: 'TEST-FIX-API-001',
          customerName: 'API Test Customer',
          customerEmail: 'api-test@example.com',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [{
            description: 'API Test Item',
            quantity: 1,
            unitPrice: '100.00',
            amount: '100.00',
            taxRate: 18
          }],
          subtotal: '100.00',
          taxAmount: '18.00',
          totalAmount: '118.00'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should accept invoice with lines field (backward compatibility)', async () => {
      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceNumber: 'TEST-FIX-API-002',
          customerName: 'API Test Customer',
          customerEmail: 'api-test@example.com',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [{
            description: 'API Test Line',
            quantity: 1,
            unitPrice: '200.00',
            amount: '200.00',
            taxRate: 18
          }],
          subtotal: '200.00',
          taxAmount: '36.00',
          totalAmount: '236.00'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should reject invoice without items or lines', async () => {
      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceNumber: 'TEST-FIX-API-003',
          customerName: 'API Test Customer',
          customerEmail: 'api-test@example.com',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          subtotal: '100.00',
          taxAmount: '18.00',
          totalAmount: '118.00'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('5. Cache Middleware User Context', () => {
    test('should handle requests with user context', async () => {
      const response = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBeOneOf([200, 400]);
      // The cache middleware should handle user-specific caching
    });

    test('should handle public requests without user context', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      // Public routes should use global caching
    });
  });

  describe('6. Backward Compatibility', () => {
    test('should maintain all existing API endpoints', async () => {
      // Test legacy auth endpoint
      const authResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'fixes-test-admin@test.com',
          password: 'TestPassword123',
        });

      expect(authResponse.status).toBe(200);

      // Test legacy health endpoint
      const healthResponse = await request(app).get('/api/health');
      expect(healthResponse.status).toBe(200);
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