#!/usr/bin/env node
// backend/scripts/test-enhanced-idempotency.js
// Test enhanced idempotency system with database integration

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import IdempotencyRecord from '../src/models/IdempotencyRecord.js';
import logger from '../src/config/logger.js';

dotenv.config();

console.log('🔄 Testing Enhanced ARTHA Idempotency System');
console.log('=' .repeat(60));

let testsPassed = 0;
let totalTests = 0;

function test(description, testFn) {
  totalTests++;
  return testFn()
    .then((result) => {
      if (result) {
        console.log(`✅ ${description}`);
        testsPassed++;
      } else {
        console.log(`❌ ${description}`);
      }
    })
    .catch((error) => {
      console.log(`❌ ${description} - Error: ${error.message}`);
    });
}

async function runTests() {
  try {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artha_test');
    console.log('Connected to MongoDB for testing');

    // Clean up any existing test records
    await IdempotencyRecord.deleteMany({ userId: 'test-user-123' });

    // Test 1: Model Creation and Validation
    await test('Model creation with valid data', async () => {
      const record = new IdempotencyRecord({
        userId: new mongoose.Types.ObjectId(),
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
        method: 'POST',
        path: '/api/v1/ledger/entries',
        statusCode: 201,
        response: { success: true, data: { id: 'test' } },
      });

      await record.save();
      return record._id && record.isValid();
    });

    // Test 2: Static Method - Store Result
    await test('Static method storeResult', async () => {
      const userId = new mongoose.Types.ObjectId();
      const result = await IdempotencyRecord.storeResult(
        userId,
        '550e8400-e29b-41d4-a716-446655440001',
        'POST',
        '/api/v1/invoices',
        200,
        { success: true, invoiceId: 'inv-123' }
      );

      return result && result.userId.equals(userId) && result.statusCode === 200;
    });

    // Test 3: Static Method - Find Valid Record
    await test('Static method findValidRecord', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // Store a record first
      await IdempotencyRecord.storeResult(
        userId,
        '550e8400-e29b-41d4-a716-446655440002',
        'POST',
        '/api/v1/expenses',
        201,
        { success: true, expenseId: 'exp-123' }
      );

      // Find the record
      const found = await IdempotencyRecord.findValidRecord(
        userId,
        '550e8400-e29b-41d4-a716-446655440002',
        'POST',
        '/api/v1/expenses'
      );

      return found && found.response.expenseId === 'exp-123';
    });

    // Test 4: Record Expiration
    await test('Record expiration handling', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // Create expired record
      const expiredRecord = new IdempotencyRecord({
        userId,
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440003',
        method: 'POST',
        path: '/api/v1/test',
        statusCode: 200,
        response: { test: true },
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
      });

      await expiredRecord.save();

      // Try to find it - should return null because it's expired
      const found = await IdempotencyRecord.findValidRecord(
        userId,
        '550e8400-e29b-41d4-a716-446655440003',
        'POST',
        '/api/v1/test'
      );

      return found === null;
    });

    // Test 5: Cleanup Expired Records
    await test('Cleanup expired records', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // Create multiple expired records
      const expiredRecords = [];
      for (let i = 0; i < 3; i++) {
        expiredRecords.push({
          userId,
          idempotencyKey: `expired-key-${i}`,
          method: 'POST',
          path: '/api/v1/test',
          statusCode: 200,
          response: { test: i },
          expiresAt: new Date(Date.now() - 60000),
        });
      }

      await IdempotencyRecord.insertMany(expiredRecords);

      // Run cleanup
      const result = await IdempotencyRecord.cleanupExpired();

      return result.deletedCount >= 3;
    });

    // Test 6: Unique Constraint
    await test('Unique constraint enforcement', async () => {
      const userId = new mongoose.Types.ObjectId();
      const key = '550e8400-e29b-41d4-a716-446655440004';

      // Create first record
      await IdempotencyRecord.storeResult(
        userId,
        key,
        'POST',
        '/api/v1/test',
        200,
        { first: true }
      );

      // Try to create duplicate - should update, not create new
      await IdempotencyRecord.storeResult(
        userId,
        key,
        'POST',
        '/api/v1/test',
        201,
        { second: true }
      );

      // Should only have one record with updated data
      const records = await IdempotencyRecord.find({ userId, idempotencyKey: key });
      return records.length === 1 && records[0].response.second === true;
    });

    // Test 7: Different Users Isolation
    await test('User isolation', async () => {
      const user1 = new mongoose.Types.ObjectId();
      const user2 = new mongoose.Types.ObjectId();
      const key = '550e8400-e29b-41d4-a716-446655440005';

      // Create records for both users with same key
      await IdempotencyRecord.storeResult(user1, key, 'POST', '/api/v1/test', 200, { user: 1 });
      await IdempotencyRecord.storeResult(user2, key, 'POST', '/api/v1/test', 200, { user: 2 });

      // Each user should find only their own record
      const record1 = await IdempotencyRecord.findValidRecord(user1, key, 'POST', '/api/v1/test');
      const record2 = await IdempotencyRecord.findValidRecord(user2, key, 'POST', '/api/v1/test');

      return record1.response.user === 1 && record2.response.user === 2;
    });

    // Test 8: Instance Methods
    await test('Instance methods functionality', async () => {
      const record = new IdempotencyRecord({
        userId: new mongoose.Types.ObjectId(),
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440006',
        method: 'POST',
        path: '/api/v1/test',
        statusCode: 201,
        response: { created: true },
      });

      await record.save();

      const responseData = record.getResponse();
      const isValid = record.isValid();

      return responseData.statusCode === 201 && 
             responseData.response.created === true && 
             isValid === true;
    });

    console.log('\n📊 Enhanced Test Results');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${totalTests - testsPassed}`);
    console.log(`Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);

    if (testsPassed === totalTests) {
      console.log('\n🎉 All enhanced idempotency tests passed!');
      console.log('✅ Database model working correctly');
      console.log('✅ Static methods functioning');
      console.log('✅ Record expiration handling');
      console.log('✅ Cleanup operations working');
      console.log('✅ Unique constraints enforced');
      console.log('✅ User isolation maintained');
    } else {
      console.log('\n⚠️  Some tests failed - check implementation');
    }

    // Cleanup test data
    await IdempotencyRecord.deleteMany({ 
      idempotencyKey: { $regex: /^(550e8400|expired-key)/ } 
    });

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }

  process.exit(testsPassed === totalTests ? 0 : 1);
}

runTests();