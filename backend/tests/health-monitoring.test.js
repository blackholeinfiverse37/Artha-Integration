import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';

describe('Health Check & Monitoring Endpoints', () => {
  describe('Basic Health Endpoints', () => {
    it('should return basic health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('ARTHA API is running');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('uptime');
      expect(typeof res.body.uptime).toBe('number');
    });

    it('should return detailed health status', async () => {
      const res = await request(app).get('/health/detailed');

      expect(res.status).toBeOneOf([200, 503]);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      
      if (res.body.data) {
        expect(res.body.data).toHaveProperty('timestamp');
        expect(res.body.data).toHaveProperty('uptime');
        expect(res.body.data).toHaveProperty('environment');
        expect(res.body.data).toHaveProperty('components');
      }
    });

    it('should return readiness status', async () => {
      const res = await request(app).get('/ready');

      expect(res.status).toBeOneOf([200, 503]);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
      
      if (mongoose.connection.readyState === 1) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Service is ready');
      }
    });

    it('should return liveness status', async () => {
      const res = await request(app).get('/live');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Service is alive');
    });
  });

  describe('Monitoring Endpoints', () => {
    it('should return public metrics', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('memory');
      expect(res.body.data).toHaveProperty('requests');
      expect(res.body.data).toHaveProperty('responseTime');
      
      // Check memory structure
      expect(res.body.data.memory).toHaveProperty('heapUsed');
      expect(typeof res.body.data.memory.heapUsed).toBe('number');
      
      // Check requests structure
      expect(res.body.data.requests).toHaveProperty('total');
      expect(res.body.data.requests).toHaveProperty('errorPercentage');
      
      // Check response time structure
      expect(res.body.data.responseTime).toHaveProperty('avg');
    });

    it('should return system status', async () => {
      const res = await request(app).get('/status');

      expect(res.status).toBeOneOf([200, 503]);
      expect(res.body).toHaveProperty('success');
      expect(res.body.data).toHaveProperty('database');
      expect(res.body.data).toHaveProperty('redis');
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('environment');
      expect(res.body.data).toHaveProperty('version');
      
      // Check database status
      expect(['connected', 'disconnected']).toContain(res.body.data.database);
      
      // Check redis status
      expect(['connected', 'disabled', 'error']).toContain(res.body.data.redis);
      
      // Check uptime is a number
      expect(typeof res.body.data.uptime).toBe('number');
    });
  });

  describe('Legacy Health Endpoints', () => {
    it('should maintain legacy API health endpoint', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBeOneOf([200, 503]);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
      
      // Should contain enhanced health data
      if (res.body.data) {
        expect(res.body.data).toHaveProperty('timestamp');
        expect(res.body.data).toHaveProperty('uptime');
      }
    });
  });

  describe('Kubernetes Probes', () => {
    it('should handle readiness probe correctly when database is connected', async () => {
      // Ensure database is connected for this test
      if (mongoose.connection.readyState === 1) {
        const res = await request(app).get('/ready');
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Service is ready');
      }
    });

    it('should always respond to liveness probe', async () => {
      const res = await request(app).get('/live');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Service is alive');
    });
  });

  describe('Error Handling', () => {
    it('should handle health check errors gracefully', async () => {
      // This test ensures the endpoints don't crash on errors
      const endpoints = ['/health', '/health/detailed', '/ready', '/live', '/metrics', '/status'];
      
      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        
        // Should not return 500 errors for health endpoints
        expect(res.status).not.toBe(500);
        expect(res.body).toHaveProperty('success');
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should have consistent response format across health endpoints', async () => {
      const endpoints = [
        { path: '/health', shouldHaveData: false },
        { path: '/health/detailed', shouldHaveData: true },
        { path: '/ready', shouldHaveData: false },
        { path: '/live', shouldHaveData: false },
        { path: '/metrics', shouldHaveData: true },
        { path: '/status', shouldHaveData: true },
      ];
      
      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint.path);
        
        // All endpoints should have success and message
        expect(res.body).toHaveProperty('success');
        expect(typeof res.body.success).toBe('boolean');
        
        // Some endpoints should have data
        if (endpoint.shouldHaveData && res.body.success) {
          expect(res.body).toHaveProperty('data');
        }
      }
    });
  });
});