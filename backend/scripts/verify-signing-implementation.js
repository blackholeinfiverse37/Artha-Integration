import { createSignature, verifySignature, generateNonce, isValidNonceFormat, isValidTimestamp } from '../src/utils/signing.js';

console.log('🔐 VERIFYING REQUEST SIGNING IMPLEMENTATION');
console.log('='.repeat(50));

async function verifyImplementation() {
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

  console.log('\n📊 Signature Creation & Verification:');
  
  test('Should create consistent signatures', () => {
    const data = { userId: 'test123', body: '{"test": true}' };
    const secret = 'test-secret';
    const sig1 = createSignature(data, secret);
    const sig2 = createSignature(data, secret);
    return sig1 === sig2 && /^[a-f0-9]{64}$/.test(sig1);
  });

  test('Should verify valid signatures', () => {
    const data = { userId: 'test123', body: '{"amount": 1000}' };
    const secret = 'test-secret';
    const signature = createSignature(data, secret);
    return verifySignature(data, signature, secret);
  });

  test('Should reject invalid signatures', () => {
    const data = { userId: 'test123', body: '{"amount": 1000}' };
    const secret = 'test-secret';
    const signature = createSignature(data, secret);
    const tamperedData = { ...data, body: '{"amount": 2000}' };
    return !verifySignature(tamperedData, signature, secret);
  });

  console.log('\n🔢 Nonce Generation & Validation:');
  
  test('Should generate valid nonces', () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    return nonce1 !== nonce2 && 
           /^[a-f0-9]{32}$/.test(nonce1) && 
           /^[a-f0-9]{32}$/.test(nonce2);
  });

  test('Should validate nonce format', () => {
    return isValidNonceFormat('abcdef1234567890abcdef1234567890') &&
           !isValidNonceFormat('invalid') &&
           !isValidNonceFormat('ABCDEF1234567890abcdef1234567890');
  });

  console.log('\n⏰ Timestamp Validation:');
  
  test('Should validate recent timestamps', () => {
    const now = Date.now();
    const recent = now - 60000; // 1 minute ago
    return isValidTimestamp(now.toString()) && 
           isValidTimestamp(recent.toString());
  });

  test('Should reject old timestamps', () => {
    const old = Date.now() - 600000; // 10 minutes ago
    return !isValidTimestamp(old.toString());
  });

  console.log('\n🔒 Error Handling:');
  
  test('Should handle missing data gracefully', () => {
    try {
      createSignature(null, 'secret');
      return false;
    } catch (error) {
      return true;
    }
  });

  test('Should handle verification errors gracefully', () => {
    return !verifySignature(null, 'sig', 'secret') &&
           !verifySignature({}, null, 'secret') &&
           !verifySignature({}, 'sig', null);
  });

  console.log('\n🎯 Integration Test:');
  
  test('Should handle complete workflow', () => {
    const requestData = {
      body: JSON.stringify({ amount: 1000, description: 'Test payment' }),
      userId: 'user123',
      timestamp: Date.now().toString(),
      nonce: generateNonce()
    };
    
    const secret = 'user-secret-key';
    const signature = createSignature(requestData, secret);
    return verifySignature(requestData, signature, secret);
  });

  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESULTS: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ ALL TESTS PASSED - Request signing system is working correctly!');
    return true;
  } else {
    console.log('❌ SOME TESTS FAILED - Please check the implementation');
    return false;
  }
}

verifyImplementation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  });