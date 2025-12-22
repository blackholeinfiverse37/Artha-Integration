import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Invoice from '../src/models/Invoice.js';
import Expense from '../src/models/Expense.js';
import gstFilingService from '../src/services/gstFiling.service.js';
import Decimal from 'decimal.js';

describe('GST Filing Packet Generation', () => {
  let adminToken;
  let adminUser;
  const testPeriod = '2025-02';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }

    await User.deleteMany({ email: 'gst-test@test.com' });
    await Invoice.deleteMany({ invoiceNumber: /^TEST-INV/ });
    await Expense.deleteMany({ vendor: 'Test Vendor' });

    adminUser = await User.create({
      email: 'gst-test@test.com',
      password: 'TestPassword123',
      name: 'GST Tester',
      role: 'admin',
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'gst-test@test.com',
      password: 'TestPassword123',
    });

    adminToken = response.body.data.token;

    await Invoice.create({
      invoiceNumber: 'TEST-INV-001',
      invoiceDate: new Date('2025-02-05'),
      dueDate: new Date('2025-02-20'),
      customerName: 'Test Customer',
      totalAmount: '10000',
      taxAmount: '1800',
      taxRate: 18,
      status: 'sent',
      lines: [
        {
          description: 'Test service',
          quantity: 1,
          unitPrice: '10000',
          taxRate: 18,
        },
      ],
    });

    await Expense.create({
      date: new Date('2025-02-10'),
      vendor: 'Test Vendor',
      amount: '5000',
      taxAmount: '900',
      category: 'supplies',
      status: 'recorded',
      description: 'Test expense',
      paymentMethod: 'cash',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'gst-test@test.com' });
    await Invoice.deleteMany({ invoiceNumber: /^TEST-INV/ });
    await Expense.deleteMany({ vendor: 'Test Vendor' });
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  test('should generate GSTR-1 filing packet', async () => {
    const packet = await gstFilingService.generateGSTR1FilingPacket(testPeriod);

    expect(packet).toHaveProperty('period', testPeriod);
    expect(packet).toHaveProperty('filingType', 'GSTR-1');
    expect(packet).toHaveProperty('supplies');
    expect(packet).toHaveProperty('summary');

    expect(parseFloat(packet.summary.totalTaxCollected)).toBeGreaterThan(0);
  });

  test('should generate GSTR-3B filing packet', async () => {
    const packet = await gstFilingService.generateGSTR3BFilingPacket(testPeriod);

    expect(packet).toHaveProperty('period', testPeriod);
    expect(packet).toHaveProperty('filingType', 'GSTR-3B');
    expect(packet).toHaveProperty('outwardSupplies');
    expect(packet).toHaveProperty('inwardSupplies');
    expect(packet).toHaveProperty('netLiability');
  });

  test('should get GST summary', async () => {
    const summary = await gstFilingService.getGSTSummary(testPeriod);

    expect(summary).toHaveProperty('period', testPeriod);
    expect(summary).toHaveProperty('gstr1Summary');
    expect(summary).toHaveProperty('gstr3bNetLiability');
    expect(summary).toHaveProperty('combined');
  });

  test('should verify GSTR-3B net liability calculation', async () => {
    const packet = await gstFilingService.generateGSTR3BFilingPacket(testPeriod);

    const outwardTax = new Decimal(packet.outwardSupplies.totalTax);
    const inwardCredit = new Decimal(packet.inwardSupplies.totalInputCredit);
    const expectedNet = outwardTax.minus(inwardCredit);

    const netPayable = new Decimal(packet.netLiability.totalPayable);

    expect(Math.abs(netPayable.minus(expectedNet).toNumber())).toBeLessThan(0.01);
  });

  test('GET /api/v1/gst/summary should return summary', async () => {
    const response = await request(app)
      .get(`/api/v1/gst/summary?period=${testPeriod}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('combined');
  });

  test('GET /api/v1/gst/filing-packet/gstr-1 should return packet', async () => {
    const response = await request(app)
      .get(`/api/v1/gst/filing-packet/gstr-1?period=${testPeriod}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.filingType).toBe('GSTR-1');
  });

  test('GET /api/v1/gst/filing-packet/gstr-3b should return packet', async () => {
    const response = await request(app)
      .get(`/api/v1/gst/filing-packet/gstr-3b?period=${testPeriod}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.filingType).toBe('GSTR-3B');
  });

  test('should reject invalid period format', async () => {
    const response = await request(app)
      .get('/api/v1/gst/summary?period=invalid')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/v1/gst/summary?period=${testPeriod}`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('should determine supply type correctly', () => {
    const invoice = {
      isExport: false,
      isConsumer: false,
    };

    const supplyType = gstFilingService.determineSupplyType(invoice);
    expect(supplyType).toBe('b2b_intrastate');
  });
});
