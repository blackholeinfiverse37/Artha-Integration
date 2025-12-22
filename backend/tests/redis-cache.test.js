import { cacheGet, cacheSet, cacheDel, connectRedis } from '../src/config/redis.js';
import cacheService from '../src/services/cache.service.js';
import { cacheMiddleware } from '../src/middleware/cache.js';

// Mock Redis for testing
jest.mock('../src/config/redis.js', () => ({
  connectRedis: jest.fn(),
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheDel: jest.fn(),
  cacheFlush: jest.fn(),
}));

describe('Redis Cache Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Middleware', () => {
    it('should only cache GET requests', async () => {
      const req = { method: 'POST', originalUrl: '/api/test' };
      const res = {};
      const next = jest.fn();

      const middleware = cacheMiddleware(3600);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(cacheGet).not.toHaveBeenCalled();
    });

    it('should return cached data if available', async () => {
      const cachedData = { success: true, data: 'cached' };
      cacheGet.mockResolvedValue(cachedData);

      const req = { method: 'GET', originalUrl: '/api/test' };
      const res = { json: jest.fn() };
      const next = jest.fn();

      const middleware = cacheMiddleware(3600);
      await middleware(req, res, next);

      expect(cacheGet).toHaveBeenCalledWith('cache:/api/test');
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    it('should cache response data', async () => {
      cacheGet.mockResolvedValue(null);
      cacheSet.mockResolvedValue(true);

      const req = { method: 'GET', originalUrl: '/api/test' };
      const originalJson = jest.fn();
      const res = { json: originalJson };
      const next = jest.fn();

      const middleware = cacheMiddleware(3600);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();

      // Simulate response
      const responseData = { success: true, data: 'test' };
      res.json(responseData);

      expect(originalJson).toHaveBeenCalledWith(responseData);
      expect(cacheSet).toHaveBeenCalledWith('cache:/api/test', responseData, 3600);
    });
  });

  describe('Cache Service', () => {
    it('should generate proper cache keys', () => {
      const key = cacheService.generateKey('ledger', 'entries', 'user123');
      expect(key).toBe('artha:ledger:entries:user:user123');
    });

    it('should cache and retrieve ledger summary', async () => {
      const mockData = { assets: '1000', liabilities: '500' };
      cacheGet.mockResolvedValue(mockData);

      const result = await cacheService.getCachedLedgerSummary();
      expect(result).toEqual(mockData);
      expect(cacheGet).toHaveBeenCalledWith('artha:ledger:summary:');
    });

    it('should cache ledger summary with proper TTL', async () => {
      const mockData = { assets: '1000', liabilities: '500' };
      cacheSet.mockResolvedValue(true);

      await cacheService.cacheLedgerSummary(mockData);
      expect(cacheSet).toHaveBeenCalledWith('artha:ledger:summary:', mockData, 300);
    });

    it('should handle cache errors gracefully', async () => {
      cacheGet.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.getCachedLedgerSummary();
      expect(result).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate ledger caches', async () => {
      const result = await cacheService.invalidateLedgerCaches();
      expect(result).toBeTruthy();
    });

    it('should invalidate invoice caches', async () => {
      const result = await cacheService.invalidateInvoiceCaches();
      expect(result).toBeTruthy();
    });

    it('should invalidate expense caches', async () => {
      const result = await cacheService.invalidateExpenseCaches();
      expect(result).toBeTruthy();
    });
  });

  describe('Production Environment Check', () => {
    it('should only connect to Redis in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Test non-production environment
      process.env.NODE_ENV = 'development';
      const devResult = await connectRedis();
      expect(devResult).toBeNull();
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});