const axios = require('axios');

async function test() {
  try {
    console.log('Attempting login with direct user...');
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'direct@test.com',
      password: 'password123'
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }
}

test();
