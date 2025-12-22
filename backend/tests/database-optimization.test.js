import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import databaseService from '../src/services/database.service.js';

describe('Database Optimization', () => {
  let authToken;
  let adminUserId;

  beforeAll(async () => {
    // Create admin user and get token
    const User = (await import('../src/models/User.js')).default;
    
    const adminUser = await User.create({
      email: 'admin@database.test',
      password: 'Admin@123456',
      name: 'Database Admin',
      role: 'admin',
    });
    
    adminUserId = adminUser._id;
    
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@database.test',
        password: 'Admin@123456',
      });
    
    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    const User = (await import('../src/models/User.js')).default;
    await User.findByIdAndDelete(adminUserId);
  });

  describe('Database Service', () => {
    it('should get database statistics', async () => {
      const stats = await databaseService.getDatabaseStats();
      
      expect(stats).toHaveProperty('collections');
      expect(stats).toHaveProperty('dataSize');
      expect(stats).toHaveProperty('storageSize');
      expect(stats).toHaveProperty('indexSize');
      expect(stats).toHaveProperty('objects');
      expect(typeof stats.collections).toBe('number');
    });

    it('should get collection statistics', async () => {
      const stats = await databaseService.getCollectionStats();
      
      expect(Array.isArray(stats)).toBe(true);
      if (stats.length > 0) {
        expect(stats[0]).toHaveProperty('name');
        expect(stats[0]).toHaveProperty('count');
        expect(stats[0]).toHaveProperty('size');
      }
    });

    it('should get index information', async () => {
      const indexInfo = await databaseService.getIndexInfo();
      
      expect(typeof indexInfo).toBe('object');
      // Should have at least the users collection
      expect(Object.keys(indexInfo).length).toBeGreaterThan(0);
    });

    it('should suggest optimizations', async () => {
      const suggestions = await databaseService.suggestOptimizations();
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('message');
      });
    });

    it('should create all indexes', async () => {
      const results = await databaseService.createAllIndexes();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      results.forEach(result => {
        expect(result).toHaveProperty('model');
        expect(result).toHaveProperty('status');
        expect(['success', 'error']).toContain(result.status);
      });
    });
  });

  describe('Database API Endpoints', () => {
    it('should get database statistics', async () => {
      const res = await request(app)
        .get('/api/v1/database/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('collections');
      expect(res.body.data).toHaveProperty('dataSize');
    });

    it('should get collection statistics', async () => {
      const res = await request(app)
        .get('/api/v1/database/collections')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get index information', async () => {
      const res = await request(app)
        .get('/api/v1/database/indexes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data).toBe('object');
    });

    it('should get optimization suggestions', async () => {
      const res = await request(app)
        .get('/api/v1/database/optimize')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create indexes', async () => {
      const res = await request(app)
        .post('/api/v1/database/indexes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.message).toContain('Index creation completed');
    });

    it('should require admin role', async () => {
      // Create non-admin user
      const User = (await import('../src/models/User.js')).default;
      
      const viewerUser = await User.create({
        email: 'viewer@database.test',
        password: 'Viewer@123456',
        name: 'Database Viewer',
        role: 'viewer',
      });
      
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'viewer@database.test',
          password: 'Viewer@123456',
        });
      
      const viewerToken = loginRes.body.data.token;
      
      const res = await request(app)
        .get('/api/v1/database/stats')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      
      // Cleanup
      await User.findByIdAndDelete(viewerUser._id);
    });
  });

  describe('Index Creation Script', () => {
    it('should have proper model indexes defined', () => {
      const models = mongoose.models;
      
      // Check that models have indexes defined
      expect(models.User).toBeDefined();
      expect(models.ChartOfAccounts).toBeDefined();
      expect(models.JournalEntry).toBeDefined();
      expect(models.Invoice).toBeDefined();
      expect(models.Expense).toBeDefined();
      
      // Verify some key indexes exist in schema
      const userIndexes = models.User.schema.indexes();
      expect(userIndexes.length).toBeGreaterThan(0);
      
      const journalIndexes = models.JournalEntry.schema.indexes();
      expect(journalIndexes.length).toBeGreaterThan(0);
    });
  });
});