const axios = require('axios');

async function test() {
  try {
    console.log('Attempting registration...');
    const response = await axios.post('http://localhost:3001/api/auth/register', {
      email: 'simple@test.com',
      password: 'password123',
      firstName: 'Simple',
      lastName: 'Test',
      role: 'teacher'
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }
}

test();
