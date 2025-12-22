import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Expense from '../src/models/Expense.js';
import path from 'path';
import fs from 'fs';

let authToken;
let userId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Clear test database
  await User.deleteMany({});
  await Expense.deleteMany({});
  
  // Create test user
  const user = await User.create({
    email: 'test@artha.local',
    password: 'Test@123456',
    name: 'Test User',
    role: 'admin',
  });
  userId = user._id;
  
  // Login to get token
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'test@artha.local', password: 'Test@123456' });
  
  authToken = loginRes.body.data.token;
});

afterAll(async () => {
  // Clean up uploaded files
  const uploadsDir = 'uploads/receipts';
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(uploadsDir, file));
    });
  }
  
  await mongoose.connection.close();
});

describe('File Upload Middleware Tests', () => {
  describe('POST /api/v1/expenses with file upload', () => {
    it('should create expense with receipt upload', async () => {
      // Create a test file
      const testFilePath = path.join(__dirname, 'test-receipt.txt');
      fs.writeFileSync(testFilePath, 'Test receipt content');
      
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vendor', 'Test Vendor')
        .field('description', 'Test expense with receipt')
        .field('category', 'supplies')
        .field('amount', '100.00')
        .field('totalAmount', '100.00')
        .field('paymentMethod', 'cash')
        .attach('receipts', testFilePath);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipts).toHaveLength(1);
      expect(res.body.data.receipts[0].filename).toMatch(/^receipt-/);
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
    });
    
    it('should reject invalid file types', async () => {
      // Create a test file with invalid extension
      const testFilePath = path.join(__dirname, 'test-receipt.exe');
      fs.writeFileSync(testFilePath, 'Invalid file content');
      
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vendor', 'Test Vendor')
        .field('description', 'Test expense with invalid file')
        .field('category', 'supplies')
        .field('amount', '100.00')
        .field('totalAmount', '100.00')
        .field('paymentMethod', 'cash')
        .attach('receipts', testFilePath);
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid file type');
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
    });
    
    it('should handle multiple file uploads', async () => {
      // Create test files
      const testFile1 = path.join(__dirname, 'test-receipt1.txt');
      const testFile2 = path.join(__dirname, 'test-receipt2.txt');
      fs.writeFileSync(testFile1, 'Test receipt 1');
      fs.writeFileSync(testFile2, 'Test receipt 2');
      
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vendor', 'Test Vendor')
        .field('description', 'Test expense with multiple receipts')
        .field('category', 'supplies')
        .field('amount', '200.00')
        .field('totalAmount', '200.00')
        .field('paymentMethod', 'cash')
        .attach('receipts', testFile1)
        .attach('receipts', testFile2);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipts).toHaveLength(2);
      
      // Clean up test files
      fs.unlinkSync(testFile1);
      fs.unlinkSync(testFile2);
    });
    
    it('should create expense without files', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendor: 'Test Vendor',
          description: 'Test expense without receipt',
          category: 'supplies',
          amount: '50.00',
          totalAmount: '50.00',
          paymentMethod: 'cash',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipts).toHaveLength(0);
    });
  });
  
  describe('Upload Error Handling', () => {
    it('should handle file size limit exceeded', async () => {
      // Create a large test file (>10MB)
      const testFilePath = path.join(__dirname, 'large-file.txt');
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      fs.writeFileSync(testFilePath, largeContent);
      
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vendor', 'Test Vendor')
        .field('description', 'Test expense with large file')
        .field('category', 'supplies')
        .field('amount', '100.00')
        .field('totalAmount', '100.00')
        .field('paymentMethod', 'cash')
        .attach('receipts', testFilePath);
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('File size exceeds 10MB limit');
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
    });
  });
});