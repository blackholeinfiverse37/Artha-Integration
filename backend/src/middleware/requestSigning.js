// backend/src/middleware/requestSigning.js
// Request Signing Middleware for ARTHA

import logger from '../config/logger.js';
import {
  verifySignature,
  getSigningSecret,
  extractSigningFields,
  createRequestSignatureData,
  isValidNonceFormat,
  isValidTimestamp,
} from '../utils/signing.js';

/**
 * Middleware to verify request signatures
 * Ensures request hasn't been tampered with in transit
 */
export async function verifyRequestSignature(req, res, next) {
  try {
    // Skip signature verification for GET/HEAD/OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Extract signing fields from request
    const { signature, timestamp, nonce, userId, body } = extractSigningFields(req);

    // Validate presence of required fields
    if (!signature || !timestamp || !nonce) {
      logger.warn('[RequestSigning] Missing signature headers', { method: req.method, path: req.path });

      return res.status(401).json({
        success: false,
        message: 'Missing required signature headers',
        code: 'MISSING_SIGNATURE_HEADERS',
        required: [
          'X-Request-Signature (HMAC-SHA256 hex)',
          'X-Request-Timestamp (milliseconds since epoch)',
          'X-Request-Nonce (32 hex characters)',
        ],
      });
    }

    // Validate nonce format
    if (!isValidNonceFormat(nonce)) {
      logger.warn('[RequestSigning] Invalid nonce format', {
        nonce: nonce.substring(0, 8) + '...',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid nonce format',
        code: 'INVALID_NONCE_FORMAT',
        expected: '32 hexadecimal characters',
      });
    }

    // Validate timestamp is recent (within 5 minutes)
    if (!isValidTimestamp(timestamp)) {
      const requestTime = parseInt(timestamp);
      const currentTime = Date.now();
      const timeDiff = Math.abs(currentTime - requestTime);

      logger.warn('[RequestSigning] Timestamp out of range', {
        timeDiff,
        maxAge: 5 * 60 * 1000,
      });

      return res.status(401).json({
        success: false,
        message: 'Request timestamp too old or in future',
        code: 'INVALID_TIMESTAMP',
        maxAgeSeconds: 300,
        timeDifferenceMs: timeDiff,
      });
    }

    // Get signing secret for user
    let secret;
    try {
      secret = await getSigningSecret(userId);
    } catch (error) {
      logger.error('[RequestSigning] Error getting signing secret', { userId });
      return res.status(500).json({
        success: false,
        message: 'Signature verification service error',
        code: 'SIGNING_SERVICE_ERROR',
      });
    }

    // Create data for verification (must match what client signed)
    const dataToVerify = createRequestSignatureData(req);

    // Verify signature
    const isValid = verifySignature(dataToVerify, signature, secret);

    if (!isValid) {
      logger.warn('[RequestSigning] Signature verification failed', {
        userId,
        method: req.method,
        path: req.path,
        timestamp,
        received: signature.substring(0, 8) + '...',
      });

      return res.status(401).json({
        success: false,
        message: 'Request signature verification failed - possible tampering detected',
        code: 'INVALID_SIGNATURE',
        details: 'Request body, timestamp, or nonce appears to have been modified',
      });
    }

    // Signature valid, store in request for later use
    req.signatureValid = true;
    req.signatureData = {
      timestamp: parseInt(timestamp),
      nonce,
      userId,
    };

    logger.info('[RequestSigning] Request signature verified successfully', {
      userId,
      method: req.method,
      path: req.path,
      nonce: nonce.substring(0, 8) + '...',
    });

    next();
  } catch (error) {
    logger.error('[RequestSigning] Middleware error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Signature verification error',
      code: 'SIGNATURE_ERROR',
    });
  }
}

/**
 * Middleware to require signed requests
 * Apply to protected endpoints to ensure signature was verified
 */
export function requireSignedRequest(req, res, next) {
  // Skip for read-only requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check if signature was verified
  if (!req.signatureValid) {
    logger.warn('[RequestSigning] Request requires signature but none was valid', {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });

    return res.status(401).json({
      success: false,
      message: 'This operation requires a cryptographically signed request',
      code: 'SIGNATURE_REQUIRED',
      instructions: {
        description: 'Sign your request using HMAC-SHA256 with these headers:',
        headers: {
          'X-Request-Signature': 'HMAC-SHA256(body+userId+timestamp+nonce, secret)',
          'X-Request-Timestamp': 'Current time in milliseconds (Date.now())',
          'X-Request-Nonce': '32-character random hex string (crypto.randomBytes(16).toString("hex"))',
        },
      },
    });
  }

  next();
}

export default {
  verifyRequestSignature,
  requireSignedRequest,
};