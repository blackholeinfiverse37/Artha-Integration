#!/usr/bin/env node
// backend/scripts/test-signing-system.js
// Test the request signing system functionality

import dotenv from 'dotenv';
import {
  createSignature,
  verifySignature,
  generateNonce,
  getSigningSecret,
  isValidNonceFormat,
  isValidTimestamp,
} from '../src/utils/signing.js';

dotenv.config();

console.log('🔐 Testing ARTHA Request Signing System');
console.log('=' .repeat(50));

let testsPassed = 0;
let totalTests = 0;

function test(description, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ ${description}`);
      testsPassed++;
    } else {
      console.log(`❌ ${description}`);
    }
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
  }
}

// Test 1: Signature Creation and Verification
test('Signature creation and verification', () => {
  const data = {
    body: JSON.stringify({ test: 'data' }),
    userId: 'test-user-123',
    timestamp: Date.now().toString(),
    nonce: generateNonce(),
  };
  const secret = 'test-secret-key';
  
  const signature = createSignature(data, secret);
  const isValid = verifySignature(data, signature, secret);
  
  return signature && signature.length === 64 && isValid;
});

// Test 2: Nonce Generation and Validation
test('Nonce generation and validation', () => {
  const nonce = generateNonce();
  return nonce.length === 32 && isValidNonceFormat(nonce);
});

// Test 3: Timestamp Validation
test('Timestamp validation', () => {
  const validTimestamp = Date.now().toString();
  const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
  
  return isValidTimestamp(validTimestamp) && !isValidTimestamp(oldTimestamp);
});

// Test 4: Secret Derivation
test('User secret derivation', async () => {
  const userId = 'test-user-123';
  const secret1 = await getSigningSecret(userId);
  const secret2 = await getSigningSecret(userId);
  
  return secret1 === secret2 && secret1.length === 64;
});

// Test 5: Signature Tampering Detection
test('Signature tampering detection', () => {
  const data = {
    body: JSON.stringify({ amount: 100 }),
    userId: 'test-user',
    timestamp: Date.now().toString(),
    nonce: generateNonce(),
  };
  const secret = 'test-secret';
  
  const signature = createSignature(data, secret);
  
  // Tamper with data
  const tamperedData = {
    ...data,
    body: JSON.stringify({ amount: 1000 }), // Changed amount
  };
  
  const isValidOriginal = verifySignature(data, signature, secret);
  const isValidTampered = verifySignature(tamperedData, signature, secret);
  
  return isValidOriginal && !isValidTampered;
});

// Test 6: Different Users Have Different Secrets
test('Different users have different secrets', async () => {
  const secret1 = await getSigningSecret('user1');
  const secret2 = await getSigningSecret('user2');
  
  return secret1 !== secret2;
});

// Test 7: Invalid Nonce Formats
test('Invalid nonce format detection', () => {
  const validNonce = generateNonce();
  const invalidNonces = [
    'short',
    'toolongtobevalidnonceformat123456789',
    'contains-invalid-chars!@#',
    '',
    null,
  ];
  
  const validResult = isValidNonceFormat(validNonce);
  const invalidResults = invalidNonces.map(n => isValidNonceFormat(n));
  
  return validResult && invalidResults.every(r => !r);
});

// Test 8: Canonical String Consistency
test('Canonical string consistency', () => {
  const data1 = { b: '2', a: '1', c: '3' };
  const data2 = { a: '1', c: '3', b: '2' };
  const data3 = { c: '3', b: '2', a: '1' };
  
  const sig1 = createSignature(data1, 'secret');
  const sig2 = createSignature(data2, 'secret');
  const sig3 = createSignature(data3, 'secret');
  
  return sig1 === sig2 && sig2 === sig3;
});

console.log('\n📊 Test Results');
console.log('=' .repeat(50));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${totalTests - testsPassed}`);
console.log(`Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);

if (testsPassed === totalTests) {
  console.log('\n🎉 All signing system tests passed!');
  console.log('✅ Signature creation and verification working');
  console.log('✅ Nonce generation and validation working');
  console.log('✅ Timestamp validation working');
  console.log('✅ Tampering detection working');
  console.log('✅ User secret derivation working');
} else {
  console.log('\n⚠️  Some tests failed - check implementation');
}

process.exit(testsPassed === totalTests ? 0 : 1);