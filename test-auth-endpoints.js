/**
 * Test script for authentication endpoints
 * This script tests the basic authentication flow
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  firstName: 'Test',
  lastName: 'User',
  role: 'student'
};

let accessToken = '';
let refreshToken = '';

async function testRegister() {
  console.log('\n=== Testing Registration ===');
  try {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    console.log('✓ Registration successful');
    console.log('User ID:', response.data.user.id);
    console.log('Email:', response.data.user.email);
    console.log('Role:', response.data.user.role);
    
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    
    return true;
  } catch (error) {
    if (error.response?.data?.error?.code === 'DB_DUPLICATE_ENTRY') {
      console.log('✓ User already exists (expected if running multiple times)');
      return false; // Will need to login instead
    }
    console.error('✗ Registration failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n=== Testing Login ===');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✓ Login successful');
    console.log('User ID:', response.data.user.id);
    console.log('Email:', response.data.user.email);
    
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetMe() {
  console.log('\n=== Testing Get Current User ===');
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    console.log('✓ Get current user successful');
    console.log('User:', response.data.user.email);
    console.log('Profile:', response.data.profile ? 'Present' : 'Not created');
    return true;
  } catch (error) {
    console.error('✗ Get current user failed:', error.response?.data || error.message);
    return false;
  }
}

async function testRefreshToken() {
  console.log('\n=== Testing Token Refresh ===');
  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });
    console.log('✓ Token refresh successful');
    
    // Update tokens
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    
    return true;
  } catch (error) {
    console.error('✗ Token refresh failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInvalidToken() {
  console.log('\n=== Testing Invalid Token ===');
  try {
    await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid-token'
      }
    });
    console.error('✗ Should have failed with invalid token');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Invalid token correctly rejected');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testLogout() {
  console.log('\n=== Testing Logout ===');
  try {
    await axios.post(`${API_URL}/auth/logout`, {
      refreshToken: refreshToken
    });
    console.log('✓ Logout successful');
    return true;
  } catch (error) {
    console.error('✗ Logout failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting authentication endpoint tests...');
  console.log('API URL:', API_URL);
  
  let results = {
    passed: 0,
    failed: 0
  };
  
  // Test registration
  const registered = await testRegister();
  if (registered) {
    results.passed++;
  } else {
    // If registration failed (user exists), try login
    const loggedIn = await testLogin();
    if (loggedIn) {
      results.passed++;
    } else {
      results.failed++;
      console.log('\n❌ Cannot proceed without valid credentials');
      return;
    }
  }
  
  // Test get current user
  if (await testGetMe()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test token refresh
  if (await testRefreshToken()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test invalid token
  if (await testInvalidToken()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test logout
  if (await testLogout()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);
  
  if (results.failed === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed');
  }
}

// Check if axios is installed
try {
  require.resolve('axios');
} catch (e) {
  console.error('Error: axios is not installed');
  console.error('Please run: npm install axios');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
