import mongoose from 'mongoose';
import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

async function testConnections() {
  console.log('🔍 Testing all connections...\n');

  // Test MongoDB
  console.log('1. Testing MongoDB Atlas connection...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas: Connected successfully');
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    await mongoose.disconnect();
  } catch (error) {
    console.log('❌ MongoDB Atlas: Connection failed');
    console.log(`   Error: ${error.message}`);
  }

  // Test Redis
  console.log('\n2. Testing Redis Cloud connection...');
  try {
    const client = redis.createClient({
      socket: {
        host: 'redis-17252.c265.us-east-1-2.ec2.cloud.redislabs.com',
        port: 17252
      },
      password: 'gK22JxYlv9HCpBBuNWpizNT1YjBOOoAD'
    });
    
    client.on('error', (err) => {
      console.log('❌ Redis Cloud: Connection failed');
      console.log(`   Error: ${err.message}`);
    });

    await client.connect();
    const result = await client.ping();
    console.log('✅ Redis Cloud: Connected successfully');
    console.log(`   Response: ${result}`);
    await client.disconnect();
  } catch (error) {
    console.log('❌ Redis Cloud: Connection failed');
    console.log(`   Error: ${error.message}`);
  }

  // Test JWT Secret
  console.log('\n3. Testing JWT configuration...');
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    console.log('✅ JWT Secret: Valid length');
  } else {
    console.log('❌ JWT Secret: Too short (minimum 32 characters)');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length >= 32) {
    console.log('✅ JWT Refresh Secret: Valid length');
  } else {
    console.log('❌ JWT Refresh Secret: Too short (minimum 32 characters)');
  }

  if (process.env.HMAC_SECRET && process.env.HMAC_SECRET.length >= 32) {
    console.log('✅ HMAC Secret: Valid length');
  } else {
    console.log('❌ HMAC Secret: Too short (minimum 32 characters)');
  }

  // Test Environment Variables
  console.log('\n4. Testing environment configuration...');
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'CORS_ORIGIN'
  ];

  let allVarsPresent = true;
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allVarsPresent = false;
    }
  });

  console.log('\n📊 Connection Test Summary:');
  console.log('================================');
  console.log(`MongoDB Atlas: ${process.env.MONGODB_URI ? 'Configured' : 'Missing'}`);
  console.log(`Redis Cloud: ${process.env.REDIS_URL ? 'Configured' : 'Missing'}`);
  console.log(`JWT Security: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`Environment: ${allVarsPresent ? 'Complete' : 'Incomplete'}`);
  
  console.log('\n🚀 Ready to start server with: npm run dev');
  process.exit(0);
}

testConnections().catch(console.error);