require('dotenv').config();
const User = require('./src/models/User');

async function test() {
  try {
    console.log('Creating user directly...');
    const user = await User.create({
      email: 'direct@test.com',
      password: 'password123',
      role: 'teacher'
    });
    console.log('Success! User created:', user.toJSON());
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

test();
