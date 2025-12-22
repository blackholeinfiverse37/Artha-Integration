import request from 'supertest';
import app from '../src/server.js';
import performanceService from '../src/services/performance.service.js';
import { requestTimer, memoryMonitor } from '../src/middleware/performance.js';

describe('Performance Monitoring', () => {
  describe('Performance Service', () => {
    beforeEach(() => {
      performanceService.resetMetrics();
    });

    it('should record request metrics', () => {
      performanceService.recordRequest(500, 200);
      performanceService.recordRequest(1500, 404);
      
      const metrics = performanceService.getMetrics();
      
      expect(metrics.requests.total).toBe(2);
      expect(metrics.requests.slow).toBe(1);
      expect(metrics.requests.errors).toBe(1);
      expect(metrics.responseTime.min).toBe(500);
      expect(metrics.responseTime.max).toBe(1500);
    });

    it('should record memory usage', () => {
      const mockMemUsage = {
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 30 * 1024 * 1024,
        external: 5 * 1024 * 1024,
      };

      performanceService.recordMemoryUsage(mockMemUsage);
      
      const metrics = performanceService.getMetrics();
      
      expect(metrics.memory.peak).toBe(30);
    });

    it('should calculate health status correctly', () => {
      // Record some normal requests
      performanceService.recordRequest(200, 200);
      performanceService.recordRequest(300, 200);
      
      const healthStatus = performanceService.getHealthStatus();
      
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.issues).toHaveLength(0);
    });

    it('should detect performance issues', () => {
      // Record many slow requests
      for (let i = 0; i < 10; i++) {
        performanceService.recordRequest(1500, 200);
      }
      
      // Record one normal request
      performanceService.recordRequest(200, 200);
      
      const healthStatus = performanceService.getHealthStatus();
      
      expect(healthStatus.status).toBe('warning');
      expect(healthStatus.issues).toContain('High percentage of slow requests');
    });

    it('should reset metrics', () => {
      performanceService.recordRequest(500, 200);
      performanceService.resetMetrics();
      
      const metrics = performanceService.getMetrics();
      
      expect(metrics.requests.total).toBe(0);
      expect(metrics.responseTime.min).toBe(0);
    });
  });

  describe('Performance Middleware', () => {
    it('should time requests', (done) => {
      const req = { method: 'GET', originalUrl: '/test' };
      const res = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            // Simulate response finish after 100ms
            setTimeout(callback, 100);
          }
        }),
      };
      const next = jest.fn();

      requestTimer(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Wait for the finish event
      setTimeout(() => {
        expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
        done();
      }, 150);
    });
  });

  describe('Performance API Endpoints', () => {
    let authToken;
    let adminUserId;

    beforeAll(async () => {
      // Create admin user and get token
      const User = (await import('../src/models/User.js')).default;
      
      const adminUser = await User.create({
        email: 'admin@performance.test',
        password: 'Admin@123456',
        name: 'Performance Admin',
        role: 'admin',
      });
      
      adminUserId = adminUser._id;
      
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@performance.test',
          password: 'Admin@123456',
        });
      
      authToken = loginRes.body.data.token;
    });

    afterAll(async () => {
      const User = (await import('../src/models/User.js')).default;
      await User.findByIdAndDelete(adminUserId);
    });

    it('should get performance metrics', async () => {
      const res = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('requests');
      expect(res.body.data).toHaveProperty('memory');
    });

    it('should get performance health status', async () => {
      const res = await request(app)
        .get('/api/v1/performance/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('issues');
      expect(res.body.data).toHaveProperty('metrics');
    });

    it('should reset performance metrics', async () => {
      const res = await request(app)
        .post('/api/v1/performance/reset')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reset successfully');
    });

    it('should require admin role', async () => {
      // Create non-admin user
      const User = (await import('../src/models/User.js')).default;
      
      const viewerUser = await User.create({
        email: 'viewer@performance.test',
        password: 'Viewer@123456',
        name: 'Performance Viewer',
        role: 'viewer',
      });
      
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'viewer@performance.test',
          password: 'Viewer@123456',
        });
      
      const viewerToken = loginRes.body.data.token;
      
      const res = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      
      // Cleanup
      await User.findByIdAndDelete(viewerUser._id);
    });
  });
});