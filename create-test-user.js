const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    const response = await axios.post(`${API_URL}/auth/register`, {
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher',
      firstName: 'Test',
      lastName: 'Teacher',
      fullName: 'Test Teacher'
    });
    
    console.log('✅ Test user created successfully');
    console.log('   User ID:', response.data.user.id);
    console.log('   Email:', response.data.user.email);
    console.log('   Role:', response.data.user.role);
  } catch (error) {
    if (error.response?.data?.error?.code === 'DB_DUPLICATE_ENTRY') {
      console.log('✅ Test user already exists');
    } else {
      console.error('❌ Failed to create test user:', error.response?.data || error.message);
    }
  }
}

createTestUser();
