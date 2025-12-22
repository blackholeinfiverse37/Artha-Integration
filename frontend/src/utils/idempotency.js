// frontend/src/utils/idempotency.js
// Client-side idempotency utilities

/**
 * Generate a UUID v4 for idempotency key
 */
export function generateIdempotencyKey() {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  // Set version (4) and variant bits
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Alias for consistency with backend naming
 */
export function generateClientIdempotencyKey() {
  const key = generateIdempotencyKey();
  console.log('[Idempotency] Generated client key:', key);
  return key;
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key) {
  if (!key) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

/**
 * Create headers with idempotency key
 */
export function createIdempotentHeaders(idempotencyKey, additionalHeaders = {}) {
  return {
    'Idempotency-Key': idempotencyKey,
    ...additionalHeaders,
  };
}

/**
 * Store idempotency key in localStorage with expiration
 */
export function storeIdempotencyKey(operationId, key) {
  try {
    const storage = {
      key,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    localStorage.setItem(`idempotency:${operationId}`, JSON.stringify(storage));
    console.log('[Idempotency] Key stored:', operationId);
  } catch (error) {
    console.warn('[Idempotency] Failed to store key:', error.message);
  }
}

/**
 * Retrieve stored idempotency key
 */
export function getStoredIdempotencyKey(operationId) {
  try {
    const item = localStorage.getItem(`idempotency:${operationId}`);

    if (!item) return null;

    const storage = JSON.parse(item);

    // Check if expired
    if (Date.now() > storage.expiresAt) {
      localStorage.removeItem(`idempotency:${operationId}`);
      console.log('[Idempotency] Key expired:', operationId);
      return null;
    }

    console.log('[Idempotency] Retrieved stored key:', operationId);
    return storage.key;
  } catch (error) {
    console.warn('[Idempotency] Failed to retrieve key:', error.message);
    return null;
  }
}

/**
 * Clear stored idempotency key
 */
export function clearIdempotencyKey(operationId) {
  try {
    localStorage.removeItem(`idempotency:${operationId}`);
    console.log('[Idempotency] Key cleared:', operationId);
  } catch (error) {
    console.warn('[Idempotency] Failed to clear key:', error.message);
  }
}

/**
 * Alias for consistency
 */
export function clearStoredIdempotencyKey(operationId) {
  return clearIdempotencyKey(operationId);
}

/**
 * React Hook for managing idempotent operations
 */
export function useIdempotentOperation(operationId) {
  return {
    // Get or create key for this operation
    getOrCreateKey: () => {
      let key = getStoredIdempotencyKey(operationId);
      if (!key) {
        key = generateClientIdempotencyKey();
        storeIdempotencyKey(operationId, key);
      }
      return key;
    },

    // Get existing key
    getKey: () => getStoredIdempotencyKey(operationId),

    // Store key
    store: (key) => storeIdempotencyKey(operationId, key),

    // Clear key after success
    clear: () => clearStoredIdempotencyKey(operationId),
  };
}

export default {
  generateIdempotencyKey,
  generateClientIdempotencyKey,
  isValidIdempotencyKey,
  createIdempotentHeaders,
  storeIdempotencyKey,
  getStoredIdempotencyKey,
  clearIdempotencyKey,
  clearStoredIdempotencyKey,
  useIdempotentOperation,
};