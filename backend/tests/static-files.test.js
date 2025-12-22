import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import fs from 'fs';
import path from 'path';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  
  // Ensure uploads directory exists
  const uploadsDir = 'uploads/receipts';
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Create a test file
  const testFilePath = path.join(uploadsDir, 'test-receipt.txt');
  fs.writeFileSync(testFilePath, 'Test receipt content for static serving');
});

afterAll(async () => {
  // Clean up test file
  const testFilePath = 'uploads/receipts/test-receipt.txt';
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  
  await mongoose.connection.close();
});

describe('Static File Serving', () => {
  describe('GET /uploads/*', () => {
    it('should serve uploaded files', async () => {
      const res = await request(app)
        .get('/uploads/receipts/test-receipt.txt');
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('Test receipt content for static serving');
    });
    
    it('should return 404 for non-existent files', async () => {
      const res = await request(app)
        .get('/uploads/receipts/non-existent-file.txt');
      
      expect(res.status).toBe(404);
    });
    
    it('should handle different file types', async () => {
      // Create a JSON test file
      const jsonFilePath = 'uploads/receipts/test-data.json';
      fs.writeFileSync(jsonFilePath, JSON.stringify({ test: 'data' }));
      
      const res = await request(app)
        .get('/uploads/receipts/test-data.json');
      
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      
      // Clean up
      fs.unlinkSync(jsonFilePath);
    });
  });
  
  describe('Security', () => {
    it('should not allow directory traversal', async () => {
      const res = await request(app)
        .get('/uploads/../package.json');
      
      // Should either return 404 or 403, not the actual file
      expect([404, 403]).toContain(res.status);
    });
    
    it('should serve files from uploads directory only', async () => {
      const res = await request(app)
        .get('/uploads/receipts/../../../package.json');
      
      // Should not serve files outside uploads directory
      expect([404, 403]).toContain(res.status);
    });
  });
});

describe('Server Integration', () => {
  it('should maintain existing API functionality', async () => {
    const res = await request(app)
      .get('/health');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('ARTHA API is running');
  });
  
  it('should serve static files without affecting API routes', async () => {
    // Test that API routes still work
    const apiRes = await request(app)
      .get('/api/health');
    
    expect(apiRes.status).toBe(200);
    expect(apiRes.body.success).toBe(true);
    
    // Test that static files work
    const staticRes = await request(app)
      .get('/uploads/receipts/test-receipt.txt');
    
    expect(staticRes.status).toBe(200);
  });
});