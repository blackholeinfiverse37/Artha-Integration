import request from 'supertest';
import app from '../src/server.js';

describe('Server', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('ARTHA API is running');
      expect(response.body.version).toBe('0.1.0');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Legacy Routes', () => {
    it('should access legacy health endpoint', async () => {
      const response = await request(app)
        .get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers['x-artha-trace-id']).toBeDefined();
    });
  });
});