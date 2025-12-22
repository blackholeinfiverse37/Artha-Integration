// backend/src/utils/idempotency.js
// Idempotency Enforcement Utilities

import crypto from 'crypto';
import logger from '../config/logger.js';

export function generateIdempotencyKey(userId, method, path, body) {
  try {
    const canonical = JSON.stringify({ userId, method, path, body });
    const key = crypto.createHash('sha256').update(canonical).digest('hex');
    
    logger.debug('[Idempotency] Key generated', {
      userId, method, path, keyPrefix: key.substring(0, 8),
    });
    
    return key;
  } catch (error) {
    logger.error('[Idempotency] Error generating key', { error: error.message });
    throw error;
  }
}

export function generateClientIdempotencyKey() {
  const bytes = crypto.randomBytes(16);
  const hex = bytes.toString('hex');
  const uuid = [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16),
    ((parseInt(hex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.substring(18, 20),
    hex.substring(20, 32),
  ].join('-');
  
  logger.debug('[Idempotency] Client key generated', { key: uuid });
  return uuid;
}

export function isValidIdempotencyKeyFormat(key) {
  if (!key) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

export function extractIdempotencyKey(req) {
  const key = req.headers['idempotency-key'];
  if (key) {
    logger.debug('[Idempotency] Key extracted from header', {
      keyPrefix: key.substring(0, 8),
    });
  }
  return key || null;
}

export function createCacheKey(userId, idempotencyKey) {
  return `idempotency:${userId}:${idempotencyKey}`;
}

export function createIdempotencyQuery(userId, idempotencyKey, method, path) {
  return { userId, idempotencyKey, method, path };
}

export function createIdempotencyRecord(userId, idempotencyKey, method, path, statusCode, response) {
  return {
    userId,
    idempotencyKey,
    method,
    path,
    statusCode,
    response,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

export function isIdempotencyRecordExpired(record) {
  if (!record.expiresAt) return true;
  return new Date() > new Date(record.expiresAt);
}

export function formatIdempotentResponse(data, idempotencyKey, isRetry = false) {
  return {
    success: data.success,
    data: data.data,
    idempotencyKey,
    isRetry,
    message: isRetry ? 'Returning cached result from previous successful request' : data.message,
  };
}

export default {
  generateIdempotencyKey,
  generateClientIdempotencyKey,
  isValidIdempotencyKeyFormat,
  extractIdempotencyKey,
  createCacheKey,
  createIdempotencyQuery,
  createIdempotencyRecord,
  isIdempotencyRecordExpired,
  formatIdempotentResponse,
};
