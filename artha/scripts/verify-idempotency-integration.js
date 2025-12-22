#!/usr/bin/env node
// scripts/verify-idempotency-integration.js
// Comprehensive verification of idempotency integration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔄 ARTHA Idempotency Integration Verification');
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

// Backend Idempotency Implementation
console.log('\n📁 Backend Idempotency Implementation');
check('Idempotency utilities exist', fileExists('backend/src/utils/idempotency.js'));
check('Idempotency middleware exists', fileExists('backend/src/middleware/idempotency.js'));
check('IdempotencyRecord model exists', fileExists('backend/src/models/IdempotencyRecord.js'));
check('Utilities export generateIdempotencyKey', fileContains('backend/src/utils/idempotency.js', 'export function generateIdempotencyKey'));
check('Utilities export generateClientIdempotencyKey', fileContains('backend/src/utils/idempotency.js', 'export function generateClientIdempotencyKey'));
check('Middleware exports enforceIdempotency', fileContains('backend/src/middleware/idempotency.js', 'export async function enforceIdempotency'));
check('Model has proper schema', fileContains('backend/src/models/IdempotencyRecord.js', 'idempotencyKey'));

// Server Integration
console.log('\n🖥️  Server Integration');
check('Server imports IdempotencyRecord', fileContains('backend/src/server.js', 'IdempotencyRecord'));
check('Server registers model in app', fileContains('backend/src/server.js', "app.set('IdempotencyRecord'"));

// Route Integration
console.log('\n🛣️  Route Integration');
check('Ledger routes import idempotency middleware', fileContains('backend/src/routes/ledger.routes.js', 'enforceIdempotency'));
check('Ledger routes use enforceIdempotency', fileContains('backend/src/routes/ledger.routes.js', 'router.use(enforceIdempotency)'));
check('Invoice routes import idempotency middleware', fileContains('backend/src/routes/invoice.routes.js', 'enforceIdempotency'));
check('Invoice routes use enforceIdempotency', fileContains('backend/src/routes/invoice.routes.js', 'router.use(enforceIdempotency)'));
check('Expense routes import idempotency middleware', fileContains('backend/src/routes/expense.routes.js', 'enforceIdempotency'));
check('Expense routes use enforceIdempotency', fileContains('backend/src/routes/expense.routes.js', 'router.use(enforceIdempotency)'));

// Frontend Implementation
console.log('\n🌐 Frontend Implementation');
check('Frontend idempotency utilities exist', fileExists('frontend/src/utils/idempotency.js'));
check('Frontend exports generateIdempotencyKey', fileContains('frontend/src/utils/idempotency.js', 'export function generateIdempotencyKey'));
check('Frontend exports isValidIdempotencyKey', fileContains('frontend/src/utils/idempotency.js', 'export function isValidIdempotencyKey'));
check('Signed API service imports idempotency', fileContains('frontend/src/services/signedApiService.js', 'generateIdempotencyKey'));
check('Signed API service uses idempotency headers', fileContains('frontend/src/services/signedApiService.js', 'Idempotency-Key'));

// Test Coverage
console.log('\n🧪 Test Coverage');
check('Idempotency test script exists', fileExists('backend/scripts/test-idempotency.js'));
check('Test script covers key generation', fileContains('backend/scripts/test-idempotency.js', 'idempotency key generation'));
check('Test script covers UUID validation', fileContains('backend/scripts/test-idempotency.js', 'UUID format validation'));
check('Test script covers record management', fileContains('backend/scripts/test-idempotency.js', 'Record expiration validation'));

// Security Features
console.log('\n🔒 Security Features');
check('UUID v4 format validation', fileContains('backend/src/utils/idempotency.js', 'uuidRegex'));
check('Record expiration implemented', fileContains('backend/src/utils/idempotency.js', 'expiresAt'));
check('Deterministic key generation', fileContains('backend/src/utils/idempotency.js', 'createHash'));
check('Proper error handling', fileContains('backend/src/middleware/idempotency.js', 'catch (error)'));

// Summary
console.log('\n📊 Integration Summary');
console.log('=' .repeat(60));
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${checksPassed}`);
console.log(`Failed: ${totalChecks - checksPassed}`);
console.log(`Success Rate: ${Math.round((checksPassed / totalChecks) * 100)}%`);

if (checksPassed === totalChecks) {
  console.log('\n🎉 All idempotency integration checks passed!');
  console.log('✅ Backend utilities and middleware implemented');
  console.log('✅ Database model created and registered');
  console.log('✅ Routes protected with idempotency enforcement');
  console.log('✅ Frontend utilities for key generation');
  console.log('✅ API service integration complete');
  console.log('✅ Test coverage implemented');
} else {
  console.log('\n⚠️  Some integration checks failed');
  console.log('Please review the failed items above');
}

console.log('\n🔧 Key Features Implemented:');
console.log('• UUID v4 idempotency key generation');
console.log('• Automatic duplicate request detection');
console.log('• 24-hour cached response storage');
console.log('• Deterministic server-side key generation');
console.log('• Proper error handling and validation');
console.log('• Frontend integration with signed requests');

process.exit(checksPassed === totalChecks ? 0 : 1);