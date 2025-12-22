// frontend/src/utils/requestSigning.js
// Client-side request signing for ARTHA with idempotency support

import CryptoJS from 'crypto-js';
import { generateClientIdempotencyKey } from './idempotency.js';

/**
 * Generate a cryptographic signature for request
 * This must match the backend implementation
 */
function createSignature(data, secret) {
  // Create canonical string (sorted keys)
  const keys = Object.keys(data).sort();
  const parts = [];

  for (const key of keys) {
    const value = data[key];

    if (value === undefined || value === null) continue;

    let stringValue;
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    parts.push(`${key}=${stringValue}`);
  }

  const canonicalString = parts.join('|');

  // Create HMAC-SHA256 using CryptoJS (browser compatible)
  const hmac = CryptoJS.HmacSHA256(canonicalString, secret).toString(CryptoJS.enc.Hex);

  return hmac;
}

/**
 * Generate a random nonce for replay attack prevention
 */
function generateNonce() {
  // Browser-compatible random bytes generation
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the signing secret for current user
 * Must match backend derivation
 */
function getSigningSecret(userId) {
  const serverSecret = import.meta.env.VITE_SIGNING_SECRET || 'default-secret-key';

  // Use same derivation as backend
  const derivedSecret = CryptoJS.SHA256(userId + ':' + serverSecret).toString(CryptoJS.enc.Hex);

  return derivedSecret;
}

/**
 * Create a signed request to the backend with idempotency support
 */
export async function createSignedRequest(
  method,
  path,
  data,
  authToken,
  userId,
  idempotencyKey = null
) {
  try {
    const timestamp = Date.now().toString();
    const nonce = generateNonce();
    const secret = getSigningSecret(userId);
    
    // Generate idempotency key if not provided for write operations
    const finalIdempotencyKey = idempotencyKey || 
      (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase()) ? 
        generateClientIdempotencyKey() : null);

    // Create signature data (must match backend)
    const signatureData = {
      body: JSON.stringify(data),
      userId: userId,
      timestamp: timestamp,
      nonce: nonce,
    };

    // Create signature
    const signature = createSignature(signatureData, secret);

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'X-Request-Signature': signature,
      'X-Request-Timestamp': timestamp,
      'X-Request-Nonce': nonce,
    };

    // Add idempotency key for write operations
    if (finalIdempotencyKey) {
      headers['Idempotency-Key'] = finalIdempotencyKey;
    }

    // Make request with signature and idempotency headers
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: JSON.stringify(data),
    });

    // Parse response
    const responseData = await response.json();

    // Check for errors
    if (!response.ok) {
      if (responseData.code === 'INVALID_SIGNATURE') {
        throw new Error('Request signature verification failed - possible tampering');
      }
      if (responseData.code === 'MISSING_SIGNATURE_HEADERS') {
        throw new Error('Request signing headers missing');
      }
      if (responseData.code === 'INVALID_TIMESTAMP') {
        throw new Error('Request timestamp invalid or out of range');
      }
      if (responseData.code === 'MISSING_IDEMPOTENCY_KEY') {
        throw new Error('Idempotency key is required');
      }
      if (responseData.code === 'INVALID_IDEMPOTENCY_KEY_FORMAT') {
        throw new Error('Invalid idempotency key format');
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data: responseData,
      idempotencyKey: finalIdempotencyKey,
      isRetry: responseData.isRetry || false,
    };
  } catch (error) {
    console.error('[RequestSigning] Error:', error.message);
    throw error;
  }
}

/**
 * Example: Create a new ledger entry with signature
 */
export async function createLedgerEntry(
  entryData,
  authToken,
  userId
) {
  return createSignedRequest(
    'POST',
    '/ledger/entries',
    entryData,
    authToken,
    userId
  );
}

/**
 * Example: Post an entry to ledger with signature
 */
export async function postLedgerEntry(
  entryId,
  authToken,
  userId
) {
  return createSignedRequest(
    'POST',
    `/ledger/entries/${entryId}/post`,
    {},
    authToken,
    userId
  );
}

/**
 * Example: Update an entry with signature
 */
export async function updateLedgerEntry(
  entryId,
  updates,
  authToken,
  userId
) {
  return createSignedRequest(
    'PUT',
    `/ledger/entries/${entryId}`,
    updates,
    authToken,
    userId
  );
}

/**
 * Example: Delete an entry with signature
 */
export async function deleteLedgerEntry(
  entryId,
  authToken,
  userId
) {
  return createSignedRequest(
    'DELETE',
    `/ledger/entries/${entryId}`,
    {},
    authToken,
    userId
  );
}

/**
 * React Hook for signing requests
 */
export function useSignedRequest(authToken, userId) {
  return {
    post: (path, data) => createSignedRequest('POST', path, data, authToken, userId),
    put: (path, data) => createSignedRequest('PUT', path, data, authToken, userId),
    delete: (path, data) => createSignedRequest('DELETE', path, data || {}, authToken, userId),
    patch: (path, data) => createSignedRequest('PATCH', path, data, authToken, userId),
  };
}

/**
 * Helper function for safe retries with same idempotency key
 */
export async function createSignedRequestWithRetry(
  method,
  path,
  data,
  authToken,
  userId,
  maxRetries = 3
) {
  const idempotencyKey = generateClientIdempotencyKey();
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[Idempotency] Attempt ${attempt}/${maxRetries} for ${method} ${path}`
      );

      const response = await createSignedRequest(
        method,
        path,
        data,
        authToken,
        userId,
        idempotencyKey
      );

      if (response.ok || attempt === maxRetries) {
        return response;
      }

      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error;

      // Wait before retry
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

export default {
  createSignedRequest,
  createSignedRequestWithRetry,
  createLedgerEntry,
  postLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  useSignedRequest,
};