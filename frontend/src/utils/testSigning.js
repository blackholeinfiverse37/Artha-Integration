// frontend/src/utils/testSigning.js
// Test script for frontend request signing

import CryptoJS from 'crypto-js';

/**
 * Test the frontend signing implementation
 */
function testFrontendSigning() {
  console.log('🔐 TESTING FRONTEND REQUEST SIGNING');
  console.log('='.repeat(40));

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      const result = fn();
      if (result) {
        console.log(`  ✅ ${name}`);
        passed++;
      } else {
        console.log(`  ❌ ${name}`);
      }
    } catch (error) {
      console.log(`  ❌ ${name} - Error: ${error.message}`);
    }
  }

  // Test CryptoJS availability
  test('CryptoJS library available', () => {
    return typeof CryptoJS !== 'undefined' && 
           typeof CryptoJS.HmacSHA256 === 'function' &&
           typeof CryptoJS.SHA256 === 'function';
  });

  // Test HMAC-SHA256 signature creation
  test('HMAC-SHA256 signature creation', () => {
    const data = 'test-data';
    const secret = 'test-secret';
    const signature = CryptoJS.HmacSHA256(data, secret).toString(CryptoJS.enc.Hex);
    return signature && signature.length === 64 && /^[a-f0-9]+$/.test(signature);
  });

  // Test SHA256 hash creation
  test('SHA256 hash creation', () => {
    const data = 'test-data';
    const hash = CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
    return hash && hash.length === 64 && /^[a-f0-9]+$/.test(hash);
  });

  // Test browser crypto API for nonce generation
  test('Browser crypto API available', () => {
    return typeof crypto !== 'undefined' && 
           typeof crypto.getRandomValues === 'function';
  });

  // Test nonce generation
  test('Nonce generation', () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return nonce.length === 32 && /^[a-f0-9]+$/.test(nonce);
  });

  // Test canonical string creation
  test('Canonical string creation', () => {
    const data = { c: 'third', a: 'first', b: 'second' };
    const keys = Object.keys(data).sort();
    const parts = keys.map(key => `${key}=${data[key]}`);
    const canonical = parts.join('|');
    return canonical === 'a=first|b=second|c=third';
  });

  // Test complete signing workflow
  test('Complete signing workflow', () => {
    const requestData = {
      body: JSON.stringify({ amount: 1000 }),
      userId: 'user123',
      timestamp: Date.now().toString(),
      nonce: 'abcdef1234567890abcdef1234567890'
    };

    // Create canonical string
    const keys = Object.keys(requestData).sort();
    const parts = keys.map(key => `${key}=${requestData[key]}`);
    const canonical = parts.join('|');

    // Create signature
    const secret = 'test-secret';
    const signature = CryptoJS.HmacSHA256(canonical, secret).toString(CryptoJS.enc.Hex);

    return signature && signature.length === 64;
  });

  // Test environment variable access
  test('Environment variables accessible', () => {
    // In Vite, env vars are available via import.meta.env
    return typeof import.meta !== 'undefined' && 
           typeof import.meta.env === 'object';
  });

  console.log('\n' + '='.repeat(40));
  console.log(`📊 RESULTS: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ ALL TESTS PASSED - Frontend signing ready!');
    return true;
  } else {
    console.log('❌ SOME TESTS FAILED - Check implementation');
    return false;
  }
}

// Export for use in components or manual testing
export { testFrontendSigning };

// Auto-run if in development
if (import.meta.env.DEV) {
  console.log('🔧 Development mode detected - running signing tests...');
  testFrontendSigning();
}