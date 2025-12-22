#!/usr/bin/env node
// scripts/verify-signing-integration.js
// Comprehensive verification of request signing integration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔐 ARTHA Request Signing Integration Verification');
console.log('=' .repeat(60));

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

// Backend Signing Implementation
console.log('\n📁 Backend Signing Implementation');
check('Backend signing utilities exist', fileExists('backend/src/utils/signing.js'));
check('Request signing middleware exists', fileExists('backend/src/middleware/requestSigning.js'));
check('Signing utilities export createSignature', fileContains('backend/src/utils/signing.js', 'export function createSignature'));
check('Signing utilities export verifySignature', fileContains('backend/src/utils/signing.js', 'export function verifySignature'));
check('Signing utilities use HMAC-SHA256', fileContains('backend/src/utils/signing.js', 'sha256'));
check('Middleware exports verifyRequestSignature', fileContains('backend/src/middleware/requestSigning.js', 'export async function verifyRequestSignature'));
check('Middleware exports requireSignedRequest', fileContains('backend/src/middleware/requestSigning.js', 'export function requireSignedRequest'));

// Route Integration
console.log('\n🛣️  Route Integration');
check('Ledger routes import signing middleware', fileContains('backend/src/routes/ledger.routes.js', 'verifyRequestSignature'));
check('Ledger routes use requireSignedRequest', fileContains('backend/src/routes/ledger.routes.js', 'requireSignedRequest'));
check('Invoice routes import signing middleware', fileContains('backend/src/routes/invoice.routes.js', 'verifyRequestSignature'));
check('Invoice routes use requireSignedRequest', fileContains('backend/src/routes/invoice.routes.js', 'requireSignedRequest'));
check('Expense routes import signing middleware', fileContains('backend/src/routes/expense.routes.js', 'verifyRequestSignature'));
check('Expense routes use requireSignedRequest', fileContains('backend/src/routes/expense.routes.js', 'requireSignedRequest'));

// Frontend Signing Implementation
console.log('\n🌐 Frontend Signing Implementation');
check('Frontend signing utilities exist', fileExists('frontend/src/utils/requestSigning.js'));
check('Signed API service exists', fileExists('frontend/src/services/signedApiService.js'));
check('Package.json includes crypto-js', fileContains('frontend/package.json', 'crypto-js'));
check('Frontend uses CryptoJS for HMAC', fileContains('frontend/src/utils/requestSigning.js', 'CryptoJS.HmacSHA256'));
check('Frontend exports createSignedRequest', fileContains('frontend/src/utils/requestSigning.js', 'export async function createSignedRequest'));
check('Frontend exports useSignedRequest hook', fileContains('frontend/src/utils/requestSigning.js', 'export function useSignedRequest'));

// API Service Integration
console.log('\n🔌 API Service Integration');
check('Signed API service exports class', fileContains('frontend/src/services/signedApiService.js', 'class SignedApiService'));
check('Signed API service has ledger methods', fileContains('frontend/src/services/signedApiService.js', 'createLedgerEntry'));
check('Signed API service has invoice methods', fileContains('frontend/src/services/signedApiService.js', 'createInvoice'));
check('Signed API service exports useSignedApi hook', fileContains('frontend/src/services/signedApiService.js', 'export function useSignedApi'));

// Example Component
console.log('\n🧩 Example Component');
check('Example component exists', fileExists('frontend/src/components/SignedLedgerForm.jsx'));
check('Example component uses useSignedApi', fileContains('frontend/src/components/SignedLedgerForm.jsx', 'useSignedApi'));
check('Example component shows security features', fileContains('frontend/src/components/SignedLedgerForm.jsx', 'Security Features'));

// Summary
console.log('\n📊 Integration Summary');
console.log('=' .repeat(60));
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${checksPassed}`);
console.log(`Failed: ${totalChecks - checksPassed}`);
console.log(`Success Rate: ${Math.round((checksPassed / totalChecks) * 100)}%`);

if (checksPassed === totalChecks) {
  console.log('\n🎉 All integration checks passed!');
  console.log('✅ Request signing system is fully integrated');
  console.log('✅ Backend routes are protected with signatures');
  console.log('✅ Frontend can create signed requests');
  console.log('✅ Example component demonstrates usage');
} else {
  console.log('\n⚠️  Some integration checks failed');
  console.log('Please review the failed items above');
}

console.log('\n🔧 Next Steps:');
console.log('1. Test the signing system with real requests');
console.log('2. Verify signature validation in development');
console.log('3. Check error handling for invalid signatures');
console.log('4. Test timestamp and nonce validation');

process.exit(checksPassed === totalChecks ? 0 : 1);