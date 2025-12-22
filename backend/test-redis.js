import redis from 'redis';

async function testRedis() {
  console.log('🔄 Testing Redis connection...\n');

  try {
    // Create Redis client with your credentials
    const client = redis.createClient({
      socket: {
        host: 'redis-17252.c265.us-east-1-2.ec2.cloud.redislabs.com',
        port: 17252
      },
      password: 'gK22JxYlv9HCpBBuNWpizNT1YjBOOoAD'
    });

    // Handle connection events
    client.on('connect', () => {
      console.log('🔗 Redis client connecting...');
    });

    client.on('ready', () => {
      console.log('✅ Redis client ready!');
    });

    client.on('error', (err) => {
      console.log('❌ Redis error:', err.message);
    });

    // Connect to Redis
    await client.connect();

    // Test basic operations
    console.log('\n📝 Testing Redis operations:');
    
    // Set a value
    await client.set('test:key', 'Hello Redis!');
    console.log('✅ SET operation successful');

    // Get the value
    const value = await client.get('test:key');
    console.log(`✅ GET operation successful: ${value}`);

    // Test with JSON data
    const testData = { name: 'Artha', version: '0.1.0', timestamp: new Date().toISOString() };
    await client.set('test:json', JSON.stringify(testData));
    const jsonValue = await client.get('test:json');
    console.log(`✅ JSON operation successful: ${JSON.parse(jsonValue).name}`);

    // Clean up test data
    await client.del('test:key');
    await client.del('test:json');
    console.log('✅ Cleanup successful');

    // Disconnect
    await client.disconnect();
    console.log('\n🎉 Redis connection test completed successfully!');

  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if Redis Cloud service is running');
    console.log('2. Verify host and port are correct');
    console.log('3. Ensure password is valid');
    console.log('4. Check network connectivity');
  }
}

testRedis();