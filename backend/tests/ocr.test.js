import request from 'supertest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import app from '../src/server.js';
import User from '../src/models/User.js';
import ocrService from '../src/services/ocr.service.js';

describe('Expense OCR Pipeline', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI);
    }

    await User.deleteMany({ email: 'ocr-test@test.com' });

    adminUser = await User.create({
      email: 'ocr-test@test.com',
      password: 'TestPassword123',
      name: 'OCR Tester',
      role: 'admin',
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'ocr-test@test.com',
      password: 'TestPassword123',
    });

    adminToken = response.body.data.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'ocr-test@test.com' });
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  test('should extract vendor from receipt text', () => {
    const mockText = `
      COMPANY: ABC Store
      Invoice: INV-001
      Amount: $100
    `;

    const vendor = ocrService.extractVendor(mockText);
    expect(vendor).toBeDefined();
    expect(vendor.length > 0).toBe(true);
  });

  test('should extract amount from receipt text', () => {
    const mockText = `
      Total Amount: $1500
      Tax: $270
    `;

    const amount = ocrService.extractAmount(mockText);
    expect(parseFloat(amount)).toBe(1500);
  });

  test('should extract date from receipt text', () => {
    const mockText = `
      Date: 2025-02-05
      Invoice Date: 05/02/2025
    `;

    const date = ocrService.extractDate(mockText);
    expect(date).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  test('should extract tax amount from receipt text', () => {
    const mockText = `
      Subtotal: $1000
      GST (18%): $180
      Total: $1180
    `;

    const tax = ocrService.extractTaxAmount(mockText);
    expect(parseFloat(tax)).toBe(180);
  });

  test('should calculate confidence score', () => {
    const mockText = `
      Vendor: XYZ Store
      Date: 2025-02-05
      Amount: $500
      Tax: $90
      Invoice: INV-100
    `;

    const confidence = ocrService.calculateConfidence(mockText);
    expect(confidence).toBeGreaterThan(50);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  test('should parse receipt text to structured data', async () => {
    const mockText = `
      STORE: ACME Corp
      Invoice Number: INV-2025-500
      Date: 02-05-2025
      
      ITEMS:
      - Supplies: $400
      - Shipping: $100
      
      Subtotal: $500
      Tax (18%): $90
      Total: $590
    `;

    const parsed = await ocrService.parseReceiptText(mockText);

    expect(parsed).toHaveProperty('vendor');
    expect(parsed).toHaveProperty('date');
    expect(parsed).toHaveProperty('amount');
    expect(parsed).toHaveProperty('taxAmount');
    expect(parsed).toHaveProperty('confidence');
  });

  test('should process receipt file', async () => {
    const testDir = path.join(process.cwd(), 'uploads', 'receipts');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const testFilePath = path.join(testDir, 'test-receipt.jpg');
    fs.writeFileSync(testFilePath, Buffer.from('fake image data'));

    try {
      const result = await ocrService.processReceiptFile(testFilePath);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('vendor');
      expect(result.data).toHaveProperty('amount');
      expect(result.data).toHaveProperty('confidence');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('should return OCR status', async () => {
    const response = await request(app)
      .get('/api/v1/expenses/ocr/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('ocrEnabled');
    expect(response.body.data).toHaveProperty('status');
  });

  test('should fail gracefully when OCR is unavailable', async () => {
    const result = await ocrService.mockOCRExtraction('/fake/path');
    expect(result).toBeDefined();
    expect(typeof result === 'string').toBe(true);
  });

  test('should require authentication for OCR endpoint', async () => {
    const response = await request(app).get('/api/v1/expenses/ocr/status');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
