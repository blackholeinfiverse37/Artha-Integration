#!/usr/bin/env node

import axios from 'axios';

const testLogin = async () => {
  console.log('🔐 Testing Admin Login Directly');
  console.log('================================');
  
  const credentials = [
    { email: 'admin@artha.local', password: 'Admin@123456', role: 'Admin' },
    { email: 'accountant@artha.local', password: 'Accountant@123', role: 'Accountant' },
    { email: 'user@example.com', password: 'testuser123', role: 'Viewer' }
  ];
  
  for (const cred of credentials) {
    console.log(`\nTesting ${cred.role}: ${cred.email}`);
    console.log('-'.repeat(40));
    
    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: cred.email,
        password: cred.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.success) {
        console.log('✅ Login SUCCESS');
        console.log(`   User: ${response.data.data.user.name}`);
        console.log(`   Role: ${response.data.data.user.role}`);
        console.log(`   Token: ${response.data.data.token ? 'Generated' : 'Missing'}`);
      } else {
        console.log('❌ Login FAILED');
        console.log(`   Response: ${JSON.stringify(response.data)}`);
      }
      
    } catch (error) {
      console.log('💥 Login ERROR');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   Error: Backend server not running on port 5000');
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n🔍 Backend Health Check');
  console.log('========================');
  
  try {
    const healthResponse = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
    console.log('✅ Backend is running');
    console.log(`   Status: ${healthResponse.status}`);
  } catch (error) {
    console.log('❌ Backend health check failed');
    console.log(`   Error: ${error.message}`);
  }
};

testLogin().catch(console.error);