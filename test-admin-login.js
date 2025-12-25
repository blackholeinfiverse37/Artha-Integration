import axios from 'axios';

async function testAdminLogin() {
  console.log('🔍 Testing Admin Login Directly...\n');
  
  const credentials = {
    email: 'admin@artha.local',
    password: 'Admin@123456'
  };
  
  try {
    console.log('Attempting login with:', credentials.email);
    
    const response = await axios.post('http://localhost:5000/api/v1/auth/login', credentials, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.token) {
      console.log('\n🎉 Admin login working correctly!');
      console.log('Token received:', response.data.data.token.substring(0, 20) + '...');
      console.log('User data:', response.data.data.user);
    }
    
  } catch (error) {
    console.log('❌ Login failed!');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received:', error.message);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testAdminLogin().catch(console.error);