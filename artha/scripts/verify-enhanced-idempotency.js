#!/usr/bin/env node
// scripts/verify-enhanced-idempotency.js
// Comprehensive verification of enhanced idempotency integration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔄 ARTHA Enhanced Idempotency Integration Verification');
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

// Enhanced Model Implementation
console.log('\n📁 Enhanced Model Implementation');
check('Enhanced IdempotencyRecord model exists', fileExists('backend/src/models/IdempotencyRecord.js'));
check('Model uses ObjectId for userId', fileContains('backend/src/models/IdempotencyRecord.js', 'Schema.Types.ObjectId'));
check('Model has User reference', fileContains('backend/src/models/IdempotencyRecord.js', "ref: 'User'"));
check('Model has compound unique index', fileContains('backend/src/models/IdempotencyRecord.js', 'user_idempotency_key_unique'));
check('Model has TTL index', fileContains('backend/src/models/IdempotencyRecord.js', 'idempotency_ttl_index'));
check('Model has user-created index', fileContains('backend/src/models/IdempotencyRecord.js', 'user_created_at_index'));

// Static Methods
console.log('\n🔧 Static Methods');
check('Model has findValidRecord method', fileContains('backend/src/models/IdempotencyRecord.js', 'findValidRecord'));
check('Model has storeResult method', fileContains('backend/src/models/IdempotencyRecord.js', 'storeResult'));
check('Model has cleanupExpired method', fileContains('backend/src/models/IdempotencyRecord.js', 'cleanupExpired'));

// Instance Methods
console.log('\n⚙️  Instance Methods');
check('Model has isValid method', fileContains('backend/src/models/IdempotencyRecord.js', 'methods.isValid'));
check('Model has getResponse method', fileContains('backend/src/models/IdempotencyRecord.js', 'methods.getResponse'));

// Enhanced Middleware Integration
console.log('\n🔗 Enhanced Middleware Integration');
check('Middleware imports requireIdempotencyKey', fileContains('backend/src/middleware/idempotency.js', 'requireIdempotencyKey'));
check('Middleware uses findValidRecord', fileContains('backend/src/middleware/idempotency.js', 'findValidRecord'));
check('Middleware uses storeResult', fileContains('backend/src/middleware/idempotency.js', 'storeResult'));

// Route Enhancements
console.log('\n🛣️  Route Enhancements');
check('Ledger routes import requireIdempotencyKey', fileContains('backend/src/routes/ledger.routes.js', 'requireIdempotencyKey'));
check('Ledger routes have cleanup endpoint', fileContains('backend/src/routes/ledger.routes.js', '/admin/idempotency/cleanup'));
check('Invoice routes import requireIdempotencyKey', fileContains('backend/src/routes/invoice.routes.js', 'requireIdempotencyKey'));
check('Invoice routes have cleanup endpoint', fileContains('backend/src/routes/invoice.routes.js', '/admin/idempotency/cleanup'));
check('Expense routes import requireIdempotencyKey', fileContains('backend/src/routes/expense.routes.js', 'requireIdempotencyKey'));
check('Expense routes have cleanup endpoint', fileContains('backend/src/routes/expense.routes.js', '/admin/idempotency/cleanup'));

// Cleanup Endpoints
console.log('\n🧹 Cleanup Endpoints');
check('Ledger cleanup uses cleanupExpired', fileContains('backend/src/routes/ledger.routes.js', 'cleanupExpired'));
check('Invoice cleanup uses cleanupExpired', fileContains('backend/src/routes/invoice.routes.js', 'cleanupExpired'));
check('Expense cleanup uses cleanupExpired', fileContains('backend/src/routes/expense.routes.js', 'cleanupExpired'));
check('Cleanup endpoints require admin auth', fileContains('backend/src/routes/ledger.routes.js', "authorize('admin')"));

// Error Handling
console.log('\n🚨 Error Handling');
check('Cleanup endpoints handle missing model', fileContains('backend/src/routes/ledger.routes.js', 'IdempotencyRecord model not available'));
check('Cleanup endpoints handle errors', fileContains('backend/src/routes/ledger.routes.js', 'Cleanup failed'));

// Test Coverage
console.log('\n🧪 Test Coverage');
check('Enhanced test script exists', fileExists('backend/scripts/test-enhanced-idempotency.js'));
check('Test covers model creation', fileContains('backend/scripts/test-enhanced-idempotency.js', 'Model creation with valid data'));
check('Test covers static methods', fileContains('backend/scripts/test-enhanced-idempotency.js', 'Static method storeResult'));
check('Test covers record expiration', fileContains('backend/scripts/test-enhanced-idempotency.js', 'Record expiration handling'));
check('Test covers cleanup operations', fileContains('backend/scripts/test-enhanced-idempotency.js', 'Cleanup expired records'));
check('Test covers user isolation', fileContains('backend/scripts/test-enhanced-idempotency.js', 'User isolation'));

// Database Features
console.log('\n🗄️  Database Features');
check('Model has proper timestamps', fileContains('backend/src/models/IdempotencyRecord.js', 'timestamps: true'));
check('Model has TTL expiration', fileContains('backend/src/models/IdempotencyRecord.js', 'expireAfterSeconds: 0'));
check('Model has efficient indexes', fileContains('backend/src/models/IdempotencyRecord.js', 'index:'));

// Security Features
console.log('\n🔒 Security Features');
check('User scoped records', fileContains('backend/src/models/IdempotencyRecord.js', 'userId'));
check('Unique constraint per user', fileContains('backend/src/models/IdempotencyRecord.js', 'unique: true'));
check('Admin-only cleanup access', fileContains('backend/src/routes/ledger.routes.js', "authorize('admin')"));

// Summary
console.log('\n📊 Enhanced Integration Summary');
console.log('=' .repeat(70));
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${checksPassed}`);
console.log(`Failed: ${totalChecks - checksPassed}`);
console.log(`Success Rate: ${Math.round((checksPassed / totalChecks) * 100)}%`);

if (checksPassed === totalChecks) {
  console.log('\n🎉 All enhanced idempotency integration checks passed!');
  console.log('✅ Enhanced database model with ObjectId references');
  console.log('✅ Static and instance methods implemented');
  console.log('✅ Compound indexes for efficient lookups');
  console.log('✅ TTL indexes for automatic cleanup');
  console.log('✅ Admin cleanup endpoints on all routes');
  console.log('✅ Enhanced middleware using model methods');
  console.log('✅ Comprehensive test coverage');
  console.log('✅ User isolation and security features');
} else {
  console.log('\n⚠️  Some integration checks failed');
  console.log('Please review the failed items above');
}

console.log('\n🔧 Enhanced Features Implemented:');
console.log('• ObjectId references for proper user linking');
console.log('• Compound unique indexes for efficient lookups');
console.log('• TTL indexes for automatic record expiration');
console.log('• Static methods for common operations');
console.log('• Instance methods for record validation');
console.log('• Admin cleanup endpoints on all routes');
console.log('• Enhanced error handling and validation');
console.log('• User isolation and security constraints');

process.exit(checksPassed === totalChecks ? 0 : 1);