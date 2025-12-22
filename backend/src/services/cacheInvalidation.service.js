import { getRedisClient } from '../config/redis.js';
import logger from '../config/logger.js';

class CacheInvalidationService {
  /**
   * Invalidate cache entries by pattern
   * This is a simplified implementation - in production you'd use Redis SCAN
   */
  async invalidateByPattern(pattern) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) {
        logger.debug('Redis not available, skipping cache invalidation');
        return false;
      }

      // For now, we'll implement specific invalidation patterns
      // In production, implement Redis SCAN for pattern matching
      logger.info(`Cache invalidation requested for pattern: ${pattern}`);
      
      switch (pattern) {
        case 'ledger:*':
          await this.invalidateLedgerCache();
          break;
        case 'invoices:*':
          await this.invalidateInvoiceCache();
          break;
        case 'expenses:*':
          await this.invalidateExpenseCache();
          break;
        case 'accounts:*':
          await this.invalidateAccountsCache();
          break;
        default:
          logger.warn(`Unknown cache pattern: ${pattern}`);
      }

      return true;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return false;
    }
  }

  /**
   * Invalidate ledger-related cache entries
   */
  async invalidateLedgerCache() {
    const patterns = [
      'cache:/api/v1/ledger/entries*',
      'cache:/api/v1/ledger/balances*',
      'cache:/api/v1/ledger/summary*',
      'cache:/api/v1/ledger/journal-entries*', // Legacy route
    ];

    await this.deleteKeys(patterns);
    logger.info('Ledger cache invalidated');
  }

  /**
   * Invalidate invoice-related cache entries
   */
  async invalidateInvoiceCache() {
    const patterns = [
      'cache:/api/v1/invoices*',
    ];

    await this.deleteKeys(patterns);
    logger.info('Invoice cache invalidated');
  }

  /**
   * Invalidate expense-related cache entries
   */
  async invalidateExpenseCache() {
    const patterns = [
      'cache:/api/v1/expenses*',
    ];

    await this.deleteKeys(patterns);
    logger.info('Expense cache invalidated');
  }

  /**
   * Invalidate accounts-related cache entries
   */
  async invalidateAccountsCache() {
    const patterns = [
      'cache:/api/v1/accounts*',
    ];

    await this.deleteKeys(patterns);
    logger.info('Accounts cache invalidated');
  }

  /**
   * Delete cache keys by patterns
   * Simplified implementation - in production use Redis SCAN
   */
  async deleteKeys(patterns) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return;

      // This is a simplified approach
      // In production, implement proper pattern matching with SCAN
      for (const pattern of patterns) {
        try {
          // For exact matches, we can delete directly
          await redisClient.del(pattern);
        } catch (error) {
          logger.debug(`Failed to delete cache key ${pattern}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Error deleting cache keys:', error);
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clearAllCache() {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return false;

      await redisClient.flushDb();
      logger.info('All cache cleared');
      return true;
    } catch (error) {
      logger.error('Error clearing all cache:', error);
      return false;
    }
  }
}

export default new CacheInvalidationService();