// backend/src/utils/signing.js
// Request Signing Utilities for ARTHA

import crypto from 'crypto';
import logger from '../config/logger.js';

const SIGNING_ALGORITHM = 'sha256';
const SIGNATURE_ENCODING = 'hex';

/**
 * Generate a cryptographic signature for request verification
 */
export function createSignature(data, secret) {
  try {
    if (!data || !secret) {
      throw new Error('Data and secret are required for signing');
    }

    const canonicalString = createCanonicalString(data);
    const hmac = crypto
      .createHmac(SIGNING_ALGORITHM, secret)
      .update(canonicalString)
      .digest(SIGNATURE_ENCODING);

    logger.debug('[Signing] Signature created', {
      dataKeys: Object.keys(data),
      algorithm: SIGNING_ALGORITHM,
    });

    return hmac;
  } catch (error) {
    logger.error('[Signing] Error creating signature', { error: error.message });
    throw error;
  }
}

/**
 * Verify a signature matches the data
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifySignature(data, signature, secret) {
  try {
    if (!data || !signature || !secret) {
      throw new Error('Data, signature, and secret are required');
    }

    const computedSignature = createSignature(data, secret);

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signature)
    );

    logger.debug('[Signing] Signature verification', {
      isValid,
      receivedLength: signature.length,
      computedLength: computedSignature.length,
    });

    return isValid;
  } catch (error) {
    logger.warn('[Signing] Signature verification failed', { error: error.message });
    return false;
  }
}

/**
 * Create canonical string representation of data for signing
 */
export function createCanonicalString(data) {
  const keys = Object.keys(data).sort();
  const parts = [];
  
  for (const key of keys) {
    const value = data[key];

    if (value === undefined || value === null) {
      continue;
    }

    let stringValue;
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    parts.push(`${key}=${stringValue}`);
  }

  const canonical = parts.join('|');
  logger.debug('[Signing] Canonical string created', { length: canonical.length });

  return canonical;
}

/**
 * Generate a nonce (random value to prevent replay attacks)
 */
export function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get secret key for user
 */
export async function getSigningSecret(userId) {
  try {
    const serverSecret = process.env.SIGNING_SECRET || 'default-secret-key';

    const derivedSecret = crypto
      .createHash('sha256')
      .update(userId + ':' + serverSecret)
      .digest('hex');

    logger.debug('[Signing] Secret derived for user', { userId });

    return derivedSecret;
  } catch (error) {
    logger.error('[Signing] Error deriving signing secret', { error: error.message });
    throw error;
  }
}

/**
 * Extract signing fields from request
 */
export function extractSigningFields(req) {
  const signature = req.headers['x-request-signature'];
  const timestamp = req.headers['x-request-timestamp'];
  const nonce = req.headers['x-request-nonce'];
  const userId = req.user?.id;

  return {
    signature,
    timestamp,
    nonce,
    userId,
    body: req.body,
  };
}

/**
 * Create data object for signing verification
 */
export function createRequestSignatureData(req) {
  return {
    body: JSON.stringify(req.body),
    userId: req.user?.id,
    timestamp: req.headers['x-request-timestamp'],
    nonce: req.headers['x-request-nonce'],
  };
}

/**
 * Validate nonce format
 */
export function isValidNonceFormat(nonce) {
  if (!nonce) return false;
  return /^[a-f0-9]{32}$/.test(nonce);
}

/**
 * Validate timestamp format and age
 */
export function isValidTimestamp(timestamp, maxAgeMs = 5 * 60 * 1000) {
  try {
    const requestTime = parseInt(timestamp);
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - requestTime);

    if (timeDiff > maxAgeMs) {
      logger.warn('[Signing] Timestamp validation failed', {
        age: timeDiff,
        maxAge: maxAgeMs,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('[Signing] Timestamp validation error', { error: error.message });
    return false;
  }
}

export default {
  createSignature,
  verifySignature,
  createCanonicalString,
  generateNonce,
  getSigningSecret,
  extractSigningFields,
  createRequestSignatureData,
  isValidNonceFormat,
  isValidTimestamp,
};