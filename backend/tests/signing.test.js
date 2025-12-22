/**
 * Request Signing System Tests
 * Tests for cryptographic request verification
 */

import {
  createSignature,
  verifySignature,
  createCanonicalString,
  generateNonce,
  getSigningSecret,
  isValidNonceFormat,
  isValidTimestamp,
} from '../src/utils/signing.js';
import {
  verifyRequestSignature,
  requireSignedRequest,
} from '../src/middleware/requestSigning.js';

describe('Request Signing System', () => {
  
  describe('Signing Utilities', () => {
    test('should create consistent signatures', () => {
      const data = { userId: 'test123', body: '{"test": true}', timestamp: '1640995200000' };
      const secret = 'test-secret';
      
      const sig1 = createSignature(data, secret);
      const sig2 = createSignature(data, secret);
      
      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should verify valid signatures', () => {
      const data = { userId: 'test123', body: '{"amount": 1000}' };
      const secret = 'test-secret';
      
      const signature = createSignature(data, secret);
      const isValid = verifySignature(data, signature, secret);
      
      expect(isValid).toBe(true);
    });

    test('should reject invalid signatures', () => {
      const data = { userId: 'test123', body: '{"amount": 1000}' };
      const secret = 'test-secret';
      
      const signature = createSignature(data, secret);
      const tamperedData = { ...data, body: '{"amount": 2000}' };
      const isValid = verifySignature(tamperedData, signature, secret);
      
      expect(isValid).toBe(false);
    });

    test('should create canonical strings consistently', () => {
      const data1 = { b: 'second', a: 'first', c: 'third' };
      const data2 = { a: 'first', c: 'third', b: 'second' };
      
      const canonical1 = createCanonicalString(data1);
      const canonical2 = createCanonicalString(data2);
      
      expect(canonical1).toBe(canonical2);
      expect(canonical1).toBe('a=first|b=second|c=third');
    });

    test('should generate valid nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[a-f0-9]{32}$/);
      expect(nonce2).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should validate nonce format', () => {
      expect(isValidNonceFormat('abcdef1234567890abcdef1234567890')).toBe(true);
      expect(isValidNonceFormat('invalid')).toBe(false);
      expect(isValidNonceFormat('ABCDEF1234567890abcdef1234567890')).toBe(false); // uppercase
      expect(isValidNonceFormat('')).toBe(false);
    });

    test('should validate timestamps', () => {
      const now = Date.now();
      const recent = now - 60000; // 1 minute ago
      const old = now - 600000; // 10 minutes ago
      
      expect(isValidTimestamp(now.toString())).toBe(true);
      expect(isValidTimestamp(recent.toString())).toBe(true);
      expect(isValidTimestamp(old.toString())).toBe(false);
    });

    test('should derive user secrets consistently', async () => {
      const userId = 'user123';
      
      const secret1 = await getSigningSecret(userId);
      const secret2 = await getSigningSecret(userId);
      
      expect(secret1).toBe(secret2);
      expect(secret1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Request Signing Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        method: 'POST',
        path: '/api/test',
        headers: {},
        body: { test: 'data' },
        user: { id: 'user123' }
      };
      
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      
      mockNext = jest.fn();
    });

    test('should skip verification for GET requests', async () => {
      mockReq.method = 'GET';
      
      await verifyRequestSignature(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject requests without signature headers', async () => {
      await verifyRequestSignature(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'MISSING_SIGNATURE_HEADERS'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject invalid nonce format', async () => {
      mockReq.headers = {
        'x-request-signature': 'valid-signature',
        'x-request-timestamp': Date.now().toString(),
        'x-request-nonce': 'invalid'
      };
      
      await verifyRequestSignature(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INVALID_NONCE_FORMAT'
        })
      );
    });

    test('should reject old timestamps', async () => {
      const oldTimestamp = Date.now() - 600000; // 10 minutes ago
      
      mockReq.headers = {
        'x-request-signature': 'valid-signature',
        'x-request-timestamp': oldTimestamp.toString(),
        'x-request-nonce': generateNonce()
      };
      
      await verifyRequestSignature(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INVALID_TIMESTAMP'
        })
      );
    });

    test('should require signed requests for protected endpoints', () => {
      mockReq.signatureValid = false;
      
      requireSignedRequest(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'SIGNATURE_REQUIRED'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should allow signed requests', () => {
      mockReq.signatureValid = true;
      
      requireSignedRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete signing workflow', async () => {
      const userId = 'user123';
      const requestData = {
        body: JSON.stringify({ amount: 1000, description: 'Test payment' }),
        userId,
        timestamp: Date.now().toString(),
        nonce: generateNonce()
      };
      
      // Get user secret
      const secret = await getSigningSecret(userId);
      
      // Create signature
      const signature = createSignature(requestData, secret);
      
      // Verify signature
      const isValid = verifySignature(requestData, signature, secret);
      
      expect(isValid).toBe(true);
    });

    test('should detect tampering in request body', async () => {
      const userId = 'user123';
      const originalData = {
        body: JSON.stringify({ amount: 1000 }),
        userId,
        timestamp: Date.now().toString(),
        nonce: generateNonce()
      };
      
      const secret = await getSigningSecret(userId);
      const signature = createSignature(originalData, secret);
      
      // Tamper with body
      const tamperedData = {
        ...originalData,
        body: JSON.stringify({ amount: 2000 })
      };
      
      const isValid = verifySignature(tamperedData, signature, secret);
      expect(isValid).toBe(false);
    });
  });
});

console.log('✅ Request Signing Tests Ready');
console.log('📊 Test Coverage:');
console.log('  ✓ Signature Creation & Verification');
console.log('  ✓ Canonical String Generation');
console.log('  ✓ Nonce & Timestamp Validation');
console.log('  ✓ Middleware Integration');
console.log('  ✓ Tamper Detection');
console.log('  ✓ Complete Workflow Testing');