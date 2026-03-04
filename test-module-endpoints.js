/**
 * Test script for Module API endpoints
 * 
 * This script tests the VARK module endpoints to ensure they work correctly.
 * 
 * Prerequisites:
 * - MySQL database must be running
 * - Database schema must be created (run migrations)
 * - Server must be running on port 3001
 * 
 * Usage:
 *   node test-module-endpoints.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test credentials (use existing teacher account or create one)
const TEST_TEACHER = {
  email: 'teacher@test.com',
  password: 'password123'
};

let authToken = '';
let testModuleId = '';

/**
 * Helper function to make authenticated requests
 */
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
      error: error.response?.data || error.message
    };
  }
}

/**
 * Test 1: Login as teacher
 */
async function testLogin() {
  console.log('\n=== Test 1: Login as Teacher ===');
  
  const result = await apiRequest('POST', '/auth/login', TEST_TEACHER);
  
  if (result.success && result.data.accessToken) {
    authToken = result.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   User: ${result.data.user.email} (${result.data.user.role})`);
    return true;
  } else {
    console.log('❌ Login failed:', result.error);
    return false;
  }
}

/**
 * Test 2: Create a new module
 */
async function testCreateModule() {
  console.log('\n=== Test 2: Create Module ===');
  
  const moduleData = {
    title: 'Test Module - Cell Division',
    description: 'A comprehensive module about cell division for Grade 7 students',
    difficultyLevel: 'beginner',
    estimatedDurationMinutes: 45,
    learningObjectives: [
      'Understand the process of mitosis',
      'Identify the stages of cell division',
      'Explain the importance of cell division'
    ],
    contentStructure: {
      sections: [
        { id: 'intro', title: 'Introduction', type: 'text' },
        { id: 'video', title: 'Cell Division Video', type: 'video' },
        { id: 'quiz', title: 'Quick Check', type: 'assessment' }
      ]
    },
    targetLearningStyles: ['visual', 'reading_writing'],
    isPublished: false
  };
  
  const result = await apiRequest('POST', '/modules', moduleData);
  
  if (result.success && result.data.data) {
    testModuleId = result.data.data.id;
    console.log('✅ Module created successfully');
    console.log(`   Module ID: ${testModuleId}`);
    console.log(`   Title: ${result.data.data.title}`);
    return true;
  } else {
    console.log('❌ Module creation failed:', result.error);
    return false;
  }
}

/**
 * Test 3: Get all modules
 */
async function testGetModules() {
  console.log('\n=== Test 3: Get All Modules ===');
  
  const result = await apiRequest('GET', '/modules?page=1&limit=10');
  
  if (result.success && result.data.data) {
    console.log('✅ Retrieved modules successfully');
    console.log(`   Total modules: ${result.data.pagination.total}`);
    console.log(`   Modules on this page: ${result.data.data.length}`);
    return true;
  } else {
    console.log('❌ Get modules failed:', result.error);
    return false;
  }
}

/**
 * Test 4: Get module by ID
 */
async function testGetModuleById() {
  console.log('\n=== Test 4: Get Module by ID ===');
  
  if (!testModuleId) {
    console.log('⚠️  Skipping - no test module ID available');
    return false;
  }
  
  const result = await apiRequest('GET', `/modules/${testModuleId}`);
  
  if (result.success && result.data.data) {
    console.log('✅ Retrieved module successfully');
    console.log(`   Title: ${result.data.data.title}`);
    console.log(`   Difficulty: ${result.data.data.difficultyLevel}`);
    console.log(`   Published: ${result.data.data.isPublished}`);
    return true;
  } else {
    console.log('❌ Get module by ID failed:', result.error);
    return false;
  }
}

/**
 * Test 5: Update module
 */
async function testUpdateModule() {
  console.log('\n=== Test 5: Update Module ===');
  
  if (!testModuleId) {
    console.log('⚠️  Skipping - no test module ID available');
    return false;
  }
  
  const updates = {
    description: 'Updated description for cell division module',
    difficultyLevel: 'intermediate',
    isPublished: true
  };
  
  const result = await apiRequest('PUT', `/modules/${testModuleId}`, updates);
  
  if (result.success && result.data.data) {
    console.log('✅ Module updated successfully');
    console.log(`   New difficulty: ${result.data.data.difficultyLevel}`);
    console.log(`   Published: ${result.data.data.isPublished}`);
    return true;
  } else {
    console.log('❌ Update module failed:', result.error);
    return false;
  }
}

/**
 * Test 6: Import module from JSON
 */
async function testImportModule() {
  console.log('\n=== Test 6: Import Module from JSON ===');
  
  const jsonData = {
    title: 'Imported Module - Photosynthesis',
    description: 'Module about photosynthesis imported from JSON',
    difficulty_level: 'beginner',
    estimated_duration_minutes: 30,
    learning_objectives: [
      'Understand the process of photosynthesis',
      'Identify the components needed for photosynthesis'
    ],
    content_structure: {
      sections: [
        { id: 'intro', title: 'What is Photosynthesis?', type: 'text' }
      ]
    }
  };
  
  const result = await apiRequest('POST', '/modules/import', jsonData);
  
  if (result.success && result.data.data) {
    console.log('✅ Module imported successfully');
    console.log(`   Module ID: ${result.data.data.id}`);
    console.log(`   Title: ${result.data.data.title}`);
    return true;
  } else {
    console.log('❌ Import module failed:', result.error);
    return false;
  }
}

/**
 * Test 7: Search modules
 */
async function testSearchModules() {
  console.log('\n=== Test 7: Search Modules ===');
  
  const result = await apiRequest('GET', '/modules?search=cell&page=1&limit=10');
  
  if (result.success && result.data.data) {
    console.log('✅ Search completed successfully');
    console.log(`   Found ${result.data.data.length} modules matching "cell"`);
    return true;
  } else {
    console.log('❌ Search modules failed:', result.error);
    return false;
  }
}

/**
 * Test 8: Filter modules by difficulty
 */
async function testFilterModules() {
  console.log('\n=== Test 8: Filter Modules by Difficulty ===');
  
  const result = await apiRequest('GET', '/modules?difficultyLevel=beginner&page=1&limit=10');
  
  if (result.success && result.data.data) {
    console.log('✅ Filter completed successfully');
    console.log(`   Found ${result.data.data.length} beginner modules`);
    return true;
  } else {
    console.log('❌ Filter modules failed:', result.error);
    return false;
  }
}

/**
 * Test 9: Delete module
 */
async function testDeleteModule() {
  console.log('\n=== Test 9: Delete Module ===');
  
  if (!testModuleId) {
    console.log('⚠️  Skipping - no test module ID available');
    return false;
  }
  
  const result = await apiRequest('DELETE', `/modules/${testModuleId}`);
  
  if (result.success) {
    console.log('✅ Module deleted successfully');
    return true;
  } else {
    console.log('❌ Delete module failed:', result.error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         VARK Module API Endpoints Test Suite              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Create Module', fn: testCreateModule },
    { name: 'Get All Modules', fn: testGetModules },
    { name: 'Get Module by ID', fn: testGetModuleById },
    { name: 'Update Module', fn: testUpdateModule },
    { name: 'Import Module', fn: testImportModule },
    { name: 'Search Modules', fn: testSearchModules },
    { name: 'Filter Modules', fn: testFilterModules },
    { name: 'Delete Module', fn: testDeleteModule }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please check the output above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
