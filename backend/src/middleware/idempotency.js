// backend/src/middleware/idempotency.js
// Idempotency Enforcement Middleware

import logger from '../config/logger.js';
import {
  extractIdempotencyKey,
  isValidIdempotencyKeyFormat,
  isIdempotencyRecordExpired,
} from '../utils/idempotency.js';

export async function enforceIdempotency(req, res, next) {
  try {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const idempotencyKey = extractIdempotencyKey(req);

    if (!idempotencyKey) {
      logger.warn('[Idempotency] Missing Idempotency-Key header', {
        method: req.method, path: req.path, userId: req.user?.id,
      });

      return res.status(400).json({
        success: false,
        message: 'Idempotency-Key header is required for write operations',
        code: 'MISSING_IDEMPOTENCY_KEY',
        instructions: {
          header: 'Idempotency-Key',
          format: 'UUID v4 (36 characters with dashes)',
          example: '550e8400-e29b-41d4-a716-446655440000',
          description: 'Generate once per operation and reuse for retries',
        },
      });
    }

    if (!isValidIdempotencyKeyFormat(idempotencyKey)) {
      logger.warn('[Idempotency] Invalid Idempotency-Key format', {
        keyPrefix: idempotencyKey.substring(0, 8), userId: req.user?.id,
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid Idempotency-Key format',
        code: 'INVALID_IDEMPOTENCY_KEY_FORMAT',
        expected: 'UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)',
      });
    }

    try {
      const IdempotencyRecord = req.app.get('IdempotencyRecord');

      if (!IdempotencyRecord) {
        logger.warn('[Idempotency] IdempotencyRecord model not found in app');
        return next();
      }

      // Use static method to find valid record
      const existing = await IdempotencyRecord.findValidRecord(
        req.user.id,
        idempotencyKey,
        req.method,
        req.path
      );

      if (existing) {
        logger.info('[Idempotency] Returning cached response for duplicate request', {
          userId: req.user.id,
          keyPrefix: idempotencyKey.substring(0, 8),
          method: req.method,
          path: req.path,
          originalTime: existing.createdAt,
        });

        return res.status(existing.statusCode).json({
          success: existing.statusCode >= 200 && existing.statusCode < 300,
          data: existing.response,
          idempotencyKey,
          isRetry: true,
          message: 'Returning cached result from previous successful request',
        });
      }

      req.idempotencyKey = idempotencyKey;
      req.idempotencyTracked = true;

      const originalJson = res.json;
      res.json = function (data) {
        storeIdempotencyRecord(
          req.app,
          req.user.id,
          idempotencyKey,
          req.method,
          req.path,
          res.statusCode,
          data
        ).catch((error) => {
          logger.error('[Idempotency] Failed to store record', { error: error.message });
        });

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('[Idempotency] Error checking idempotency', { error: error.message });
      next();
    }
  } catch (error) {
    logger.error('[Idempotency] Middleware error', { error: error.message });
    next();
  }
}

async function storeIdempotencyRecord(app, userId, idempotencyKey, method, path, statusCode, response) {
  try {
    const IdempotencyRecord = app.get('IdempotencyRecord');

    if (!IdempotencyRecord) {
      logger.debug('[Idempotency] IdempotencyRecord model not available');
      return;
    }

    // Use static method to store result
    await IdempotencyRecord.storeResult(
      userId,
      idempotencyKey,
      method,
      path,
      statusCode,
      response
    );

    logger.debug('[Idempotency] Record stored', {
      userId, keyPrefix: idempotencyKey.substring(0, 8), statusCode,
    });
  } catch (error) {
    logger.error('[Idempotency] Error storing record', { error: error.message });
  }
}

export function requireIdempotencyKey(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (!req.idempotencyTracked) {
    logger.warn('[Idempotency] Idempotency key required but not tracked', {
      method: req.method, path: req.path,
    });

    return res.status(400).json({
      success: false,
      message: 'Idempotency-Key header is required for this operation',
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
  }

  next();
}

export async function cleanupExpiredIdempotencyRecords(req, res, next) {
  try {
    const IdempotencyRecord = req.app.get('IdempotencyRecord');

    if (!IdempotencyRecord) {
      return next();
    }

    const result = await IdempotencyRecord.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    logger.info('[Idempotency] Cleanup completed', {
      deletedCount: result.deletedCount,
    });

    if (req.query.json === 'true') {
      return res.json({
        success: true,
        message: 'Cleanup completed',
        deletedCount: result.deletedCount,
      });
    }

    next();
  } catch (error) {
    logger.error('[Idempotency] Cleanup failed', { error: error.message });
    next();
  }
}

export default {
  enforceIdempotency,
  requireIdempotencyKey,
  cleanupExpiredIdempotencyRecords,
};