import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Invoice from '../src/models/Invoice.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';

describe('Invoice API', () => {
  let authToken;
  let userId;
  let testInvoice;

  beforeAll(async () => {
    // Create test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    });
    userId = user._id;

    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginRes.body.token;

    // Create required accounts
    await ChartOfAccounts.create([
      { code: '1010', name: 'Cash', type: 'Asset', normalBalance: 'Debit' },
      { code: '1100', name: 'Accounts Receivable', type: 'Asset', normalBalance: 'Debit' },
      { code: '4000', name: 'Sales Revenue', type: 'Income', normalBalance: 'Credit' },
    ]);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Invoice.deleteMany({});
    await ChartOfAccounts.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/v1/invoices', () => {
    it('should create a new invoice', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-001',
        customerName: 'Test Customer',
        customerEmail: 'customer@example.com',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            description: 'Test Item',
            quantity: 2,
            unitPrice: '100.00',
            amount: '200.00',
          },
        ],
        subtotal: '200.00',
        taxRate: 10,
        taxAmount: '20.00',
        totalAmount: '220.00',
      };

      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toBe('INV-001');
      expect(res.body.data.status).toBe('draft');

      testInvoice = res.body.data;
    });
  });

  describe('GET /api/v1/invoices', () => {
    it('should get all invoices', async () => {
      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoices).toHaveLength(1);
    });
  });

  describe('GET /api/v1/invoices/:id', () => {
    it('should get a single invoice', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toBe('INV-001');
    });
  });

  describe('POST /api/v1/invoices/:id/send', () => {
    it('should send an invoice', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${testInvoice._id}/send`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('sent');
    });
  });

  describe('GET /api/v1/invoices/stats', () => {
    it('should get invoice statistics', async () => {
      const res = await request(app)
        .get('/api/v1/invoices/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sent.count).toBe(1);
    });
  });
});