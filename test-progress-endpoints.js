/**
 * Test script for Progress API endpoints
 * 
 * This script tests the progress tracking endpoints to ensure they work correctly.
 * 
 * Prerequisites:
 * - Server must be running (npm start)
 * - Database must be set up with test data
 * - You must have a valid auth token
 * 
 * Usage:
 * node test-progress-endpoints.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_EMAIL = 'teacher@test.com';
const TEST_PASSWORD = 'password123';

let authToken = '';
let testStudentId = '';
let testModuleId = '';
let testProgressId = '';

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Test functions
async function testLogin() {
  console.log('\n=== Testing Login ===');
  const result = await apiRequest('POST', '/api/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (result.success && result.data.accessToken) {
    authToken = result.data.accessToken;
    console.log('✅ Login successful');
    console.log('Token:', authToken.substring(0, 20) + '...');
    return true;
  } else {
    console.log('❌ Login failed:', result.error);
    return false;
  }
}

async function getTestStudentAndModule() {
  console.log('\n=== Getting Test Student and Module ===');
  
  // Get a student
  const studentsResult = await apiRequest('GET', '/api/students?limit=1');
  if (studentsResult.success && studentsResult.data.data.length > 0) {
    testStudentId = studentsResult.data.data[0].id;
    console.log('✅ Found test student:', testStudentId);
  } else {
    console.log('❌ No students found');
    return false;
  }

  // Get a module
  const modulesResult = await apiRequest('GET', '/api/modules?limit=1');
  if (modulesResult.success && modulesResult.data.data.length > 0) {
    testModuleId = modulesResult.data.data[0].id;
    console.log('✅ Found test module:', testModuleId);
  } else {
    console.log('❌ No modules found');
    return false;
  }

  return true;
}

async function testCreateProgress() {
  console.log('\n=== Testing Create Progress ===');
  const progressData = {
    studentId: testStudentId,
    moduleId: testModuleId,
    status: 'in_progress',
    progressPercentage: 25,
    timeSpentMinutes: 15,
    completedSections: ['section-1', 'section-2'],
    assessmentScores: {
      quiz1: 85,
      quiz2: 90
    }
  };

  const result = await apiRequest('POST', '/api/progress', progressData);

  if (result.success) {
    testProgressId = result.data.data.id;
    console.log('✅ Progress created successfully');
    console.log('Progress ID:', testProgressId);
    console.log('Data:', JSON.stringify(result.data.data, null, 2));
    return true;
  } else {
    console.log('❌ Create progress failed:', result.error);
    // If it already exists, try to get it
    if (result.error?.error?.code === 'DB_DUPLICATE_ENTRY') {
      console.log('Progress already exists, fetching existing record...');
      const getResult = await apiRequest('GET', `/api/progress/student/${testStudentId}/module/${testModuleId}`);
      if (getResult.success) {
        testProgressId = getResult.data.data.id;
        console.log('✅ Found existing progress:', testProgressId);
        return true;
      }
    }
    return false;
  }
}

async function testGetProgressByStudent() {
  console.log('\n=== Testing Get Progress by Student ===');
  const result = await apiRequest('GET', `/api/progress/student/${testStudentId}`);

  if (result.success) {
    console.log('✅ Get progress by student successful');
    console.log('Total records:', result.data.pagination?.total || result.data.data.length);
    console.log('First record:', JSON.stringify(result.data.data[0], null, 2));
    return true;
  } else {
    console.log('❌ Get progress by student failed:', result.error);
    return false;
  }
}

async function testGetProgressByModule() {
  console.log('\n=== Testing Get Progress by Module ===');
  const result = await apiRequest('GET', `/api/progress/module/${testModuleId}`);

  if (result.success) {
    console.log('✅ Get progress by module successful');
    console.log('Total records:', result.data.pagination?.total || result.data.data.length);
    if (result.data.data.length > 0) {
      console.log('First record:', JSON.stringify(result.data.data[0], null, 2));
    }
    return true;
  } else {
    console.log('❌ Get progress by module failed:', result.error);
    return false;
  }
}

async function testGetProgressByStudentAndModule() {
  console.log('\n=== Testing Get Progress by Student and Module ===');
  const result = await apiRequest('GET', `/api/progress/student/${testStudentId}/module/${testModuleId}`);

  if (result.success) {
    console.log('✅ Get progress by student and module successful');
    console.log('Data:', JSON.stringify(result.data.data, null, 2));
    return true;
  } else {
    console.log('❌ Get progress by student and module failed:', result.error);
    return false;
  }
}

async function testUpdateProgress() {
  console.log('\n=== Testing Update Progress ===');
  const updates = {
    status: 'in_progress',
    progressPercentage: 50,
    timeSpentMinutes: 30,
    completedSections: ['section-1', 'section-2', 'section-3']
  };

  const result = await apiRequest('PUT', `/api/progress/${testProgressId}`, updates);

  if (result.success) {
    console.log('✅ Update progress successful');
    console.log('Updated data:', JSON.stringify(result.data.data, null, 2));
    return true;
  } else {
    console.log('❌ Update progress failed:', result.error);
    return false;
  }
}

async function testUpdateProgressByStudentAndModule() {
  console.log('\n=== Testing Update Progress by Student and Module ===');
  const updates = {
    status: 'completed',
    progressPercentage: 100,
    timeSpentMinutes: 60,
    completedAt: new Date().toISOString()
  };

  const result = await apiRequest('PUT', `/api/progress/student/${testStudentId}/module/${testModuleId}`, updates);

  if (result.success) {
    console.log('✅ Update progress by student and module successful');
    console.log('Updated data:', JSON.stringify(result.data.data, null, 2));
    return true;
  } else {
    console.log('❌ Update progress by student and module failed:', result.error);
    return false;
  }
}

async function testGetStudentStats() {
  console.log('\n=== Testing Get Student Stats ===');
  const result = await apiRequest('GET', `/api/progress/student/${testStudentId}/stats`);

  if (result.success) {
    console.log('✅ Get student stats successful');
    console.log('Stats:', JSON.stringify(result.data.data, null, 2));
    return true;
  } else {
    console.log('❌ Get student stats failed:', result.error);
    return false;
  }
}

async function testGetModuleStats() {
  console.log('\n=== Testing Get Module Stats ===');
  const result = await apiRequest('GET', `/api/progress/module/${testModuleId}/stats`);

  if (result.success) {
    console.log('✅ Get module stats successful');
    console.log('Stats:', JSON.stringify(result.data.data, null, 2));
    return true;
  } else {
    console.log('❌ Get module stats failed:', result.error);
    return false;
  }
}

async function testGetProgressById() {
  console.log('\n=== Testing Get Progress by ID ===');
  const result = await apiRequest('GET', `/api/progress/${testProgressId}`);

  if (result.success) {
    console.log('✅ Get progress by ID successful');
    console.log('Data:', JSON.stringify(result.data.data, null, 2));
    return true;
  } else {
    console.log('❌ Get progress by ID failed:', result.error);
    return false;
  }
}

async function testDeleteProgress() {
  console.log('\n=== Testing Delete Progress ===');
  const result = await apiRequest('DELETE', `/api/progress/${testProgressId}`);

  if (result.success) {
    console.log('✅ Delete progress successful');
    return true;
  } else {
    console.log('❌ Delete progress failed:', result.error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('=================================================');
  console.log('Progress API Endpoints Test Suite');
  console.log('=================================================');
  console.log('API Base URL:', API_BASE_URL);

  try {
    // Login first
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      return;
    }

    // Get test data
    const hasTestData = await getTestStudentAndModule();
    if (!hasTestData) {
      console.log('\n❌ Cannot proceed without test student and module');
      return;
    }

    // Run tests
    await testCreateProgress();
    await testGetProgressByStudent();
    await testGetProgressByModule();
    await testGetProgressByStudentAndModule();
    await testGetStudentStats();
    await testGetModuleStats();
    await testGetProgressById();
    await testUpdateProgress();
    await testUpdateProgressByStudentAndModule();
    
    // Cleanup - delete test progress
    await testDeleteProgress();

    console.log('\n=================================================');
    console.log('Test Suite Complete!');
    console.log('=================================================');
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
}

// Run the tests
runTests();
