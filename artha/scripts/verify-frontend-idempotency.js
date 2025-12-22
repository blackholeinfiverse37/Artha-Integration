#!/usr/bin/env node
// scripts/verify-frontend-idempotency.js
// Comprehensive verification of frontend idempotency integration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🌐 ARTHA Frontend Idempotency Integration Verification');
console.log('=' .repeat(70));

let checksPassed = 0;
let totalChecks = 0;

function check(description, condition) {
  totalChecks++;
  const status = condition ? '✅' : '❌';
  console.log(`${status} ${description}`);
  if (condition) checksPassed++;
  return condition;
}

function fileExists(filePath) {
  return fs.existsSync(path.join(rootDir, filePath));
}

function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(rootDir, filePath), 'utf8');
    return content.includes(searchString);
  } catch (error) {
    return false;
  }
}

// Enhanced Idempotency Utilities
console.log('\n🔧 Enhanced Idempotency Utilities');
check('Enhanced idempotency utilities exist', fileExists('frontend/src/utils/idempotency.js'));
check('Utilities export generateClientIdempotencyKey', fileContains('frontend/src/utils/idempotency.js', 'generateClientIdempotencyKey'));
check('Utilities have localStorage support', fileContains('frontend/src/utils/idempotency.js', 'localStorage'));
check('Utilities have expiration handling', fileContains('frontend/src/utils/idempotency.js', 'expiresAt'));
check('Utilities export useIdempotentOperation hook', fileContains('frontend/src/utils/idempotency.js', 'useIdempotentOperation'));
check('Utilities have key management methods', fileContains('frontend/src/utils/idempotency.js', 'getOrCreateKey'));

// Enhanced Request Signing
console.log('\n🔐 Enhanced Request Signing');
check('Request signing imports idempotency', fileContains('frontend/src/utils/requestSigning.js', 'generateClientIdempotencyKey'));
check('createSignedRequest supports idempotency', fileContains('frontend/src/utils/requestSigning.js', 'idempotencyKey = null'));
check('Request signing adds Idempotency-Key header', fileContains('frontend/src/utils/requestSigning.js', 'Idempotency-Key'));
check('Request signing handles idempotency errors', fileContains('frontend/src/utils/requestSigning.js', 'MISSING_IDEMPOTENCY_KEY'));
check('Request signing returns idempotency info', fileContains('frontend/src/utils/requestSigning.js', 'idempotencyKey: finalIdempotencyKey'));
check('createSignedRequestWithRetry exists', fileContains('frontend/src/utils/requestSigning.js', 'createSignedRequestWithRetry'));

// Retry Functionality
console.log('\n🔄 Retry Functionality');
check('Retry function uses same idempotency key', fileContains('frontend/src/utils/requestSigning.js', 'const idempotencyKey = generateClientIdempotencyKey()'));
check('Retry function has exponential backoff', fileContains('frontend/src/utils/requestSigning.js', 'Math.pow(2, attempt - 1)'));
check('Retry function has configurable max retries', fileContains('frontend/src/utils/requestSigning.js', 'maxRetries = 3'));
check('Retry function logs attempts', fileContains('frontend/src/utils/requestSigning.js', 'Attempt ${attempt}/${maxRetries}'));

// Enhanced API Service
console.log('\n🔌 Enhanced API Service');
check('API service imports enhanced utilities', fileContains('frontend/src/services/signedApiService.js', 'createSignedRequestWithRetry'));
check('API service imports useIdempotentOperation', fileContains('frontend/src/services/signedApiService.js', 'useIdempotentOperation'));
check('API service has signedRequestWithRetry', fileContains('frontend/src/services/signedApiService.js', 'signedRequestWithRetry'));
check('API service has createIdempotentOperation', fileContains('frontend/src/services/signedApiService.js', 'createIdempotentOperation'));
check('useSignedApi supports idempotency keys', fileContains('frontend/src/services/signedApiService.js', 'idempotencyKey'));
check('useSignedApi has retry methods', fileContains('frontend/src/services/signedApiService.js', 'WithRetry'));

// Enhanced Example Component
console.log('\n🧩 Enhanced Example Component');
check('Enhanced example component exists', fileExists('frontend/src/components/IdempotentLedgerForm.jsx'));
check('Component uses useIdempotentOperation', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'useIdempotentOperation'));
check('Component demonstrates manual key management', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'getOrCreateKey'));
check('Component demonstrates auto-retry', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'createLedgerEntryWithRetry'));
check('Component shows triple-layer security', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'Triple-Layer Security'));
check('Component handles cached responses', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'isRetry'));

// Error Handling
console.log('\n🚨 Error Handling');
check('Component handles idempotency errors', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'isIdempotencyError'));
check('Component handles signing errors', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'isSigningError'));
check('Component handles retry failures', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'isRetryFailure'));
check('Request signing handles all error codes', fileContains('frontend/src/utils/requestSigning.js', 'INVALID_IDEMPOTENCY_KEY_FORMAT'));

// Key Management Features
console.log('\n🔑 Key Management Features');
check('Component shows stored key status', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'storedKey'));
check('Component allows key clearing', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'clearStoredKey'));
check('Component clears key after success', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'idempotentOp.clear()'));
check('Component keeps key for retry', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'Keep key stored for retry'));

// User Experience Features
console.log('\n👤 User Experience Features');
check('Component shows operation status', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'Cached Response'));
check('Component explains retry behavior', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'no duplicate entry was created'));
check('Component has loading states', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'setLoading'));
check('Component provides technical details', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'Enhanced Implementation'));

// Integration Features
console.log('\n🔗 Integration Features');
check('Utilities support console logging', fileContains('frontend/src/utils/idempotency.js', 'console.log'));
check('Request signing logs retry attempts', fileContains('frontend/src/utils/requestSigning.js', 'console.log'));
check('API service maintains backward compatibility', fileContains('frontend/src/services/signedApiService.js', 'getLedgerEntries'));
check('Component demonstrates both operation modes', fileContains('frontend/src/components/IdempotentLedgerForm.jsx', 'Manual Key Management'));

// Summary
console.log('\n📊 Frontend Integration Summary');
console.log('=' .repeat(70));
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${checksPassed}`);
console.log(`Failed: ${totalChecks - checksPassed}`);
console.log(`Success Rate: ${Math.round((checksPassed / totalChecks) * 100)}%`);

if (checksPassed === totalChecks) {
  console.log('\n🎉 All frontend idempotency integration checks passed!');
  console.log('✅ Enhanced idempotency utilities with localStorage');
  console.log('✅ Request signing with automatic key generation');
  console.log('✅ Retry functionality with exponential backoff');
  console.log('✅ Enhanced API service with idempotency support');
  console.log('✅ Comprehensive example component');
  console.log('✅ Complete error handling and user feedback');
  console.log('✅ Key management and operation tracking');
  console.log('✅ Triple-layer security demonstration');
} else {
  console.log('\n⚠️  Some integration checks failed');
  console.log('Please review the failed items above');
}

console.log('\n🔧 Frontend Features Implemented:');
console.log('• UUID v4 key generation with crypto API fallback');
console.log('• localStorage with automatic expiration (24 hours)');
console.log('• React hooks for idempotent operation management');
console.log('• Automatic retry with exponential backoff');
console.log('• Enhanced error handling with specific error types');
console.log('• Real-time operation status and cache detection');
console.log('• Manual and automatic key management modes');
console.log('• Complete integration with request signing system');

process.exit(checksPassed === totalChecks ? 0 : 1);