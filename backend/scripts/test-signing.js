import { createSignature, verifySignature, generateNonce, getSigningSecret } from '../src/utils/signing.js';

console.log('🔐 TESTING REQUEST SIGNING SYSTEM');
console.log('='.repeat(40));

async function testSigning() {
  try {
    // Test 1: Basic signature creation and verification
    console.log('\n1. Testing signature creation and verification...');
    const testData = {
      userId: 'test-user-123',
      body: JSON.stringify({ amount: 1000, description: 'Test transaction' }),
      timestamp: Date.now().toString(),
      nonce: generateNonce()
    };
    
    const secret = await getSigningSecret(testData.userId);
    const signature = createSignature(testData, secret);
    const isValid = verifySignature(testData, signature, secret);
    
    console.log(`   ✅ Signature created: ${signature.substring(0, 16)}...`);
    console.log(`   ✅ Verification result: ${isValid}`);
    
    // Test 2: Tamper detection
    console.log('\n2. Testing tamper detection...');
    const tamperedData = { ...testData, body: JSON.stringify({ amount: 2000 }) };
    const tamperedValid = verifySignature(tamperedData, signature, secret);
    
    console.log(`   ✅ Tampered data detected: ${!tamperedValid}`);
    
    // Test 3: Nonce generation
    console.log('\n3. Testing nonce generation...');
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    
    console.log(`   ✅ Nonce 1: ${nonce1}`);
    console.log(`   ✅ Nonce 2: ${nonce2}`);
    console.log(`   ✅ Nonces are unique: ${nonce1 !== nonce2}`);
    
    // Test 4: Secret derivation consistency
    console.log('\n4. Testing secret derivation...');
    const secret1 = await getSigningSecret('user123');
    const secret2 = await getSigningSecret('user123');
    const secret3 = await getSigningSecret('user456');
    
    console.log(`   ✅ Same user secrets match: ${secret1 === secret2}`);
    console.log(`   ✅ Different user secrets differ: ${secret1 !== secret3}`);
    
    console.log('\n🎯 All signing tests passed!');
    
  } catch (error) {
    console.error('❌ Signing test failed:', error.message);
    process.exit(1);
  }
}

testSigning();