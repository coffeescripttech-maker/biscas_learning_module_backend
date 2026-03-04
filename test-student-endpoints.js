/**
 * Test script for student management endpoints
 * Tests the complete CRUD operations for students
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test data
let authToken = '';
let createdStudentId = '';

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null) => {
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      data
    };
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};

// Test functions
async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  const result = await makeRequest('GET', '/health');
  
  if (result.success) {
    console.log('✓ Health check passed');
    console.log('  Status:', result.data.status);
    console.log('  Environment:', result.data.environment);
  } else {
    console.log('✗ Health check failed:', result.error);
  }
  
  return result.success;
}

async function testTeacherLogin() {
  console.log('\n=== Testing Teacher Login ===');
  
  // First, try to register a teacher account
  const registerResult = await makeRequest('POST', '/api/auth/register', {
    email: 'teacher.test@example.com',
    password: 'password123',
    role: 'teacher',
    firstName: 'Test',
    lastName: 'Teacher'
  });
  
  if (registerResult.success) {
    console.log('✓ Teacher account created');
    authToken = registerResult.data.accessToken;
    return true;
  }
  
  // If registration fails (account exists), try to login
  const loginResult = await makeRequest('POST', '/api/auth/login', {
    email: 'teacher.test@example.com',
    password: 'password123'
  });
  
  if (loginResult.success) {
    console.log('✓ Teacher login successful');
    authToken = loginResult.data.accessToken;
    return true;
  }
  
  console.log('✗ Teacher authentication failed:', loginResult.error);
  return false;
}

async function testCreateStudent() {
  console.log('\n=== Testing Create Student ===');
  
  const studentData = {
    email: `student.${Date.now()}@example.com`,
    password: 'student123',
    firstName: 'John',
    middleName: 'M',
    lastName: 'Doe',
    gradeLevel: 'Grade 7',
    learningStyle: 'visual',
    preferredModules: ['module1', 'module2']
  };
  
  const result = await makeRequest('POST', '/api/students', studentData);
  
  if (result.success) {
    console.log('✓ Student created successfully');
    console.log('  Student ID:', result.data.data.id);
    console.log('  Email:', result.data.data.email);
    console.log('  Name:', result.data.data.profile.fullName);
    createdStudentId = result.data.data.id;
  } else {
    console.log('✗ Create student failed:', result.error);
  }
  
  return result.success;
}

async function testGetStudents() {
  console.log('\n=== Testing Get Students ===');
  
  const result = await makeRequest('GET', '/api/students?page=1&limit=10');
  
  if (result.success) {
    console.log('✓ Get students successful');
    console.log('  Total students:', result.data.pagination.total);
    console.log('  Students on page:', result.data.data.length);
  } else {
    console.log('✗ Get students failed:', result.error);
  }
  
  return result.success;
}

async function testGetStudentById() {
  console.log('\n=== Testing Get Student By ID ===');
  
  if (!createdStudentId) {
    console.log('⊘ Skipping - no student ID available');
    return true;
  }
  
  const result = await makeRequest('GET', `/api/students/${createdStudentId}`);
  
  if (result.success) {
    console.log('✓ Get student by ID successful');
    console.log('  Student:', result.data.data.profile.fullName);
    console.log('  Email:', result.data.data.email);
    console.log('  Grade:', result.data.data.profile.gradeLevel);
  } else {
    console.log('✗ Get student by ID failed:', result.error);
  }
  
  return result.success;
}

async function testUpdateStudent() {
  console.log('\n=== Testing Update Student ===');
  
  if (!createdStudentId) {
    console.log('⊘ Skipping - no student ID available');
    return true;
  }
  
  const updates = {
    gradeLevel: 'Grade 8',
    learningStyle: 'kinesthetic'
  };
  
  const result = await makeRequest('PUT', `/api/students/${createdStudentId}`, updates);
  
  if (result.success) {
    console.log('✓ Update student successful');
    console.log('  Updated grade:', result.data.data.profile.gradeLevel);
    console.log('  Updated learning style:', result.data.data.profile.learningStyle);
  } else {
    console.log('✗ Update student failed:', result.error);
  }
  
  return result.success;
}

async function testSearchStudents() {
  console.log('\n=== Testing Search Students ===');
  
  const result = await makeRequest('GET', '/api/students?search=Doe');
  
  if (result.success) {
    console.log('✓ Search students successful');
    console.log('  Results found:', result.data.data.length);
  } else {
    console.log('✗ Search students failed:', result.error);
  }
  
  return result.success;
}

async function testFilterByGradeLevel() {
  console.log('\n=== Testing Filter By Grade Level ===');
  
  const result = await makeRequest('GET', '/api/students?gradeLevel=Grade%208');
  
  if (result.success) {
    console.log('✓ Filter by grade level successful');
    console.log('  Results found:', result.data.data.length);
  } else {
    console.log('✗ Filter by grade level failed:', result.error);
  }
  
  return result.success;
}

async function testBulkImport() {
  console.log('\n=== Testing Bulk Import ===');
  
  const students = [
    {
      email: `bulk1.${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Bulk',
      lastName: 'Student1',
      gradeLevel: 'Grade 7'
    },
    {
      email: `bulk2.${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Bulk',
      lastName: 'Student2',
      gradeLevel: 'Grade 8'
    }
  ];
  
  const result = await makeRequest('POST', '/api/students/bulk-import', { students });
  
  if (result.success || result.status === 207) {
    console.log('✓ Bulk import completed');
    console.log('  Created:', result.data.data.created);
    console.log('  Failed:', result.data.data.failed.length);
  } else {
    console.log('✗ Bulk import failed:', result.error);
  }
  
  return result.success || result.status === 207;
}

async function testDeleteStudent() {
  console.log('\n=== Testing Delete Student ===');
  
  if (!createdStudentId) {
    console.log('⊘ Skipping - no student ID available');
    return true;
  }
  
  const result = await makeRequest('DELETE', `/api/students/${createdStudentId}`);
  
  if (result.success) {
    console.log('✓ Delete student successful');
  } else {
    console.log('✗ Delete student failed:', result.error);
  }
  
  return result.success;
}

async function testUnauthorizedAccess() {
  console.log('\n=== Testing Unauthorized Access ===');
  
  // Temporarily remove auth token
  const tempToken = authToken;
  authToken = '';
  
  const result = await makeRequest('GET', '/api/students');
  
  // Restore auth token
  authToken = tempToken;
  
  if (!result.success && result.status === 401) {
    console.log('✓ Unauthorized access properly blocked');
  } else {
    console.log('✗ Unauthorized access test failed - should have been blocked');
  }
  
  return !result.success && result.status === 401;
}

// Run all tests
async function runTests() {
  console.log('========================================');
  console.log('Student Management Endpoints Test Suite');
  console.log('========================================');
  console.log('API URL:', API_URL);
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Teacher Login', fn: testTeacherLogin },
    { name: 'Create Student', fn: testCreateStudent },
    { name: 'Get Students', fn: testGetStudents },
    { name: 'Get Student By ID', fn: testGetStudentById },
    { name: 'Update Student', fn: testUpdateStudent },
    { name: 'Search Students', fn: testSearchStudents },
    { name: 'Filter By Grade Level', fn: testFilterByGradeLevel },
    { name: 'Bulk Import', fn: testBulkImport },
    { name: 'Unauthorized Access', fn: testUnauthorizedAccess },
    { name: 'Delete Student', fn: testDeleteStudent }
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`Total: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('========================================\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
