import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import CompanySettings from '../src/models/CompanySettings.js';
import Invoice from '../src/models/Invoice.js';

describe('GST Frontend Integration Tests', () => {
  let adminToken;
  let accountantToken;
  let adminUser;
  let accountantUser;
  const testPeriod = '2024-12';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || process.env.MONGODB_URI);
    }

    // Clean up existing test data
    await User.deleteMany({ email: /gst-frontend-.*@test\.com/ });
    await CompanySettings.deleteMany({});
    await Invoice.deleteMany({ customerName: /GST Test/ });

    // Create test users
    adminUser = await User.create({
      email: 'gst-frontend-admin@test.com',
      password: 'TestPassword123',
      name: 'GST Admin',
      role: 'admin',
    });

    accountantUser = await User.create({
      email: 'gst-frontend-accountant@test.com',
      password: 'TestPassword123',
      name: 'GST Accountant',
      role: 'accountant',
    });

    // Create company settings with GSTIN
    await CompanySettings.create({
      _id: 'company_settings',
      companyName: 'Test Company',
      gstin: '27AABCU9603R1ZM',
      pan: 'AABCU9603R',
      gstSettings: {
        isRegistered: true,
        filingFrequency: 'monthly'
      }
    });

    // Login users
    let response = await request(app).post('/api/v1/auth/login').send({
      email: 'gst-frontend-admin@test.com',
      password: 'TestPassword123',
    });
    adminToken = response.body.data.token;

    response = await request(app).post('/api/v1/auth/login').send({
      email: 'gst-frontend-accountant@test.com',
      password: 'TestPassword123',
    });
    accountantToken = response.body.data.token;

    // Create test invoices for GST calculations
    await Invoice.create({
      invoiceNumber: 'GST-TEST-001',
      invoiceDate: new Date('2024-12-01'),
      customerName: 'GST Test Customer 1',
      customerGSTIN: '29AABCU9603R1ZX',
      items: [{
        description: 'Test Service',
        quantity: 1,
        unitPrice: '10000',
        amount: '10000',
        taxRate: 18
      }],
      subtotal: '10000',
      taxAmount: '1800',
      totalAmount: '11800',
      status: 'sent',
      createdBy: adminUser._id
    });

    await Invoice.create({
      invoiceNumber: 'GST-TEST-002',
      invoiceDate: new Date('2024-12-15'),
      customerName: 'GST Test Customer 2',
      items: [{
        description: 'Test Product',
        quantity: 2,
        unitPrice: '5000',
        amount: '10000',
        taxRate: 18
      }],
      subtotal: '10000',
      taxAmount: '1800',
      totalAmount: '11800',
      status: 'sent',
      createdBy: adminUser._id
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /gst-frontend-.*@test\.com/ });
    await CompanySettings.deleteMany({});
    await Invoice.deleteMany({ customerName: /GST Test/ });
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('GST Summary Endpoint', () => {
    test('GET /api/v1/gst/summary should return GST summary for period', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/summary?period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('combined');
      expect(response.body.data).toHaveProperty('gstr1Summary');
      expect(response.body.data).toHaveProperty('gstr3bNetLiability');
    });

    test('should require valid period format', async () => {
      const response = await request(app)
        .get('/api/v1/gst/summary?period=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('YYYY-MM format');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/summary?period=${testPeriod}`);

      expect(response.status).toBe(401);
    });

    test('should require accountant or admin role', async () => {
      // Create viewer user
      const viewerUser = await User.create({
        email: 'gst-viewer@test.com',
        password: 'TestPassword123',
        name: 'GST Viewer',
        role: 'viewer',
      });

      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: 'gst-viewer@test.com',
        password: 'TestPassword123',
      });

      const viewerToken = loginResponse.body.data.token;

      const response = await request(app)
        .get(`/api/v1/gst/summary?period=${testPeriod}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await User.deleteMany({ email: 'gst-viewer@test.com' });
    });

    test('accountant should have access to GST summary', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/summary?period=${testPeriod}`)
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GST Filing Packet Endpoints', () => {
    test('GET /api/v1/gst/filing-packet/gstr-1 should return GSTR-1 packet', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/filing-packet/gstr-1?period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filingType', 'GSTR-1');
      expect(response.body.data).toHaveProperty('supplies');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('GET /api/v1/gst/filing-packet/gstr-3b should return GSTR-3B packet', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/filing-packet/gstr-3b?period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filingType', 'GSTR-3B');
      expect(response.body.data).toHaveProperty('outwardSupplies');
      expect(response.body.data).toHaveProperty('netLiability');
    });

    test('should validate period format for filing packets', async () => {
      const response = await request(app)
        .get('/api/v1/gst/filing-packet/gstr-1?period=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('YYYY-MM format');
    });
  });

  describe('GST Export Endpoint', () => {
    test('GET /api/v1/gst/filing-packet/export should export GSTR-1 as CSV', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/filing-packet/export?type=gstr-1&period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/octet-stream');
    });

    test('GET /api/v1/gst/filing-packet/export should export GSTR-3B as CSV', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/filing-packet/export?type=gstr-3b&period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/octet-stream');
    });

    test('should validate export type', async () => {
      const response = await request(app)
        .get(`/api/v1/gst/filing-packet/export?type=invalid&period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Type must be gstr-1 or gstr-3b');
    });

    test('should validate period format for export', async () => {
      const response = await request(app)
        .get('/api/v1/gst/filing-packet/export?type=gstr-1&period=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('YYYY-MM format');
    });
  });

  describe('GST Data Consistency', () => {
    test('summary data should be consistent with filing packets', async () => {
      // Get summary
      const summaryResponse = await request(app)
        .get(`/api/v1/gst/summary?period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Get GSTR-1 packet
      const gstr1Response = await request(app)
        .get(`/api/v1/gst/filing-packet/gstr-1?period=${testPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryResponse.status).toBe(200);
      expect(gstr1Response.status).toBe(200);

      const summary = summaryResponse.body.data;
      const gstr1 = gstr1Response.body.data;

      // Verify data consistency
      expect(summary.gstr1Summary).toBeDefined();
      expect(gstr1.summary).toBeDefined();
    });

    test('should handle period with no data gracefully', async () => {
      const emptyPeriod = '2023-01'; // Period with no invoices

      const response = await request(app)
        .get(`/api/v1/gst/summary?period=${emptyPeriod}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GST Return Generation', () => {
    test('POST /api/v1/gst/gstr1/generate should generate GSTR-1', async () => {
      const response = await request(app)
        .post('/api/v1/gst/gstr1/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 12,
          year: 2024
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('returnType', 'GSTR1');
    });

    test('POST /api/v1/gst/gstr3b/generate should generate GSTR-3B', async () => {
      const response = await request(app)
        .post('/api/v1/gst/gstr3b/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 12,
          year: 2024
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('returnType', 'GSTR3B');
    });

    test('should validate month and year for generation', async () => {
      const response = await request(app)
        .post('/api/v1/gst/gstr1/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Month and year are required');
    });
  });

  describe('GST Returns List', () => {
    test('GET /api/v1/gst/returns should return GST returns list', async () => {
      const response = await request(app)
        .get('/api/v1/gst/returns')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter returns by type', async () => {
      const response = await request(app)
        .get('/api/v1/gst/returns?returnType=GSTR1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter returns by status', async () => {
      const response = await request(app)
        .get('/api/v1/gst/returns?status=draft')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GSTIN Validation', () => {
    test('POST /api/v1/gst/validate-gstin should validate GSTIN', async () => {
      const response = await request(app)
        .post('/api/v1/gst/validate-gstin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gstin: '27AABCU9603R1ZM'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid', true);
    });

    test('should reject invalid GSTIN format', async () => {
      const response = await request(app)
        .post('/api/v1/gst/validate-gstin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gstin: 'INVALID'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid', false);
    });

    test('should require GSTIN parameter', async () => {
      const response = await request(app)
        .post('/api/v1/gst/validate-gstin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('GSTIN is required');
    });
  });
});