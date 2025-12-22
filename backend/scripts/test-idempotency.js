#!/usr/bin/env node
// backend/scripts/test-idempotency.js
// Test idempotency system functionality

import dotenv from 'dotenv';
import {
  generateIdempotencyKey,
  generateClientIdempotencyKey,
  isValidIdempotencyKeyFormat,
  extractIdempotencyKey,
  createCacheKey,
  createIdempotencyQuery,
  createIdempotencyRecord,
  isIdempotencyRecordExpired,
} from '../src/utils/idempotency.js';

dotenv.config();

console.log('🔄 Testing ARTHA Idempotency System');
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

// Test 1: Idempotency Key Generation
test('Server-side idempotency key generation', () => {
  const key1 = generateIdempotencyKey('user1', 'POST', '/api/test', { data: 'test' });
  const key2 = generateIdempotencyKey('user1', 'POST', '/api/test', { data: 'test' });
  const key3 = generateIdempotencyKey('user1', 'POST', '/api/test', { data: 'different' });
  
  return key1 === key2 && key1 !== key3 && key1.length === 64;
});

// Test 2: Client UUID Generation
test('Client UUID v4 generation', () => {
  const uuid = generateClientIdempotencyKey();
  return uuid.length === 36 && uuid.includes('-') && isValidIdempotencyKeyFormat(uuid);
});

// Test 3: UUID Format Validation
test('UUID format validation', () => {
  const validUuid = generateClientIdempotencyKey();
  const invalidUuids = [
    'invalid-uuid',
    '12345678-1234-1234-1234-123456789012', // wrong version
    '12345678-1234-5234-1234-123456789012', // wrong version
    '',
    null,
  ];
  
  const validResult = isValidIdempotencyKeyFormat(validUuid);
  const invalidResults = invalidUuids.map(u => isValidIdempotencyKeyFormat(u));
  
  return validResult && invalidResults.every(r => !r);
});

// Test 4: Header Extraction
test('Header extraction from request', () => {
  const mockReq = {
    headers: {
      'idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      'other-header': 'value',
    },
  };
  
  const extracted = extractIdempotencyKey(mockReq);
  return extracted === '550e8400-e29b-41d4-a716-446655440000';
});

// Test 5: Cache Key Creation
test('Cache key creation', () => {
  const cacheKey = createCacheKey('user123', '550e8400-e29b-41d4-a716-446655440000');
  return cacheKey === 'idempotency:user123:550e8400-e29b-41d4-a716-446655440000';
});

// Test 6: Query Object Creation
test('Idempotency query creation', () => {
  const query = createIdempotencyQuery('user1', 'uuid-key', 'POST', '/api/test');
  return query.userId === 'user1' && 
         query.idempotencyKey === 'uuid-key' && 
         query.method === 'POST' && 
         query.path === '/api/test';
});

// Test 7: Record Creation
test('Idempotency record creation', () => {
  const record = createIdempotencyRecord(
    'user1', 
    'uuid-key', 
    'POST', 
    '/api/test', 
    200, 
    { success: true }
  );
  
  return record.userId === 'user1' && 
         record.statusCode === 200 && 
         record.response.success === true &&
         record.createdAt instanceof Date &&
         record.expiresAt instanceof Date;
});

// Test 8: Record Expiration Check
test('Record expiration validation', () => {
  const freshRecord = {
    expiresAt: new Date(Date.now() + 60000), // 1 minute from now
  };
  
  const expiredRecord = {
    expiresAt: new Date(Date.now() - 60000), // 1 minute ago
  };
  
  const noExpiryRecord = {};
  
  return !isIdempotencyRecordExpired(freshRecord) && 
         isIdempotencyRecordExpired(expiredRecord) &&
         isIdempotencyRecordExpired(noExpiryRecord);
});

// Test 9: Deterministic Key Generation
test('Deterministic key generation consistency', () => {
  const data = { userId: 'test', method: 'POST', path: '/api', body: { amount: 100 } };
  
  const key1 = generateIdempotencyKey(data.userId, data.method, data.path, data.body);
  const key2 = generateIdempotencyKey(data.userId, data.method, data.path, data.body);
  const key3 = generateIdempotencyKey(data.userId, data.method, data.path, { amount: 200 });
  
  return key1 === key2 && key1 !== key3;
});

console.log('\n📊 Test Results');
console.log('=' .repeat(50));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${totalTests - testsPassed}`);
console.log(`Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);

if (testsPassed === totalTests) {
  console.log('\n🎉 All idempotency tests passed!');
  console.log('✅ Key generation working correctly');
  console.log('✅ UUID validation working');
  console.log('✅ Header extraction working');
  console.log('✅ Record management working');
  console.log('✅ Expiration logic working');
} else {
  console.log('\n⚠️  Some tests failed - check implementation');
}

process.exit(testsPassed === totalTests ? 0 : 1);