import axios from 'axios';

async function testBackendConnection() {
  console.log('🔍 Testing ARTHA Backend Connection...\n');
  
  const tests = [
    { name: 'Health Check', url: 'http://localhost:5000/api/health' },
    { name: 'API Base', url: 'http://localhost:5000/api/v1' },
    { name: 'Auth Endpoint', url: 'http://localhost:5000/api/v1/auth/login', method: 'POST' }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}: ${test.url}`);
      
      if (test.method === 'POST') {
        // Just test if endpoint exists (will return 400 for missing data, but that's OK)
        await axios.post(test.url, {}, { timeout: 5000 });
      } else {
        const response = await axios.get(test.url, { timeout: 5000 });
        console.log(`✅ ${test.name}: Status ${response.status}`);
        if (response.data) {
          console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      }
    } catch (error) {
      if (error.response) {
        console.log(`⚠️  ${test.name}: Status ${error.response.status} (endpoint exists)`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name}: Connection refused - Backend not running`);
      } else {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }
  
  console.log('🔧 Quick Fix Commands:');
  console.log('1. Start backend: cd backend && npm run dev');
  console.log('2. Check if port 5000 is in use: netstat -ano | findstr :5000');
  console.log('3. Kill existing process: taskkill /F /PID <PID>');
}

testBackendConnection().catch(console.error);