/**
 * Test script for Student Dashboard endpoints
 * Tests the three new endpoints added in Task 5
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  // You'll need to replace these with actual values from your database
  studentId: process.env.TEST_STUDENT_ID || 'test-student-id',
  authToken: process.env.TEST_AUTH_TOKEN || 'test-token'
};

// Helper function to make authenticated requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
        'Content-Type': 'application/json'
      }
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

// Test 1: Get Dashboard Stats
async function testDashboardStats() {
  console.log('\n=== Test 1: Get Dashboard Stats ===');
  const result = await makeRequest(`/api/students/${TEST_CONFIG.studentId}/dashboard-stats`);
  
  if (result.success) {
    console.log('✅ Dashboard stats retrieved successfully');
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    // Validate response structure
    const data = result.data.data;
    const requiredFields = [
      'modulesCompleted',
      'modulesInProgress',
      'averageScore',
      'totalTimeSpent',
      'perfectSections',
      'totalModulesAvailable'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length > 0) {
      console.log('⚠️  Missing fields:', missingFields);
    } else {
      console.log('✅ All required fields present');
    }
  } else {
    console.log('❌ Failed to get dashboard stats');
    console.log('Error:', result.error);
  }
  
  return result.success;
}

// Test 2: Get Recent Activities
async function testRecentActivities() {
  console.log('\n=== Test 2: Get Recent Activities ===');
  const result = await makeRequest(`/api/students/${TEST_CONFIG.studentId}/recent-activities`);
  
  if (result.success) {
    console.log('✅ Recent activities retrieved successfully');
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    // Validate response structure
    const activities = result.data.data;
    if (Array.isArray(activities)) {
      console.log(`✅ Returned ${activities.length} activities (max 5)`);
      
      // Check if activities are sorted by timestamp (descending)
      if (activities.length > 1) {
        let isSorted = true;
        for (let i = 0; i < activities.length - 1; i++) {
          const current = new Date(activities[i].timestamp);
          const next = new Date(activities[i + 1].timestamp);
          if (current < next) {
            isSorted = false;
            break;
          }
        }
        
        if (isSorted) {
          console.log('✅ Activities are sorted by timestamp (descending)');
        } else {
          console.log('⚠️  Activities are NOT sorted correctly');
        }
      }
      
      // Validate activity structure
      if (activities.length > 0) {
        const requiredFields = ['id', 'type', 'title', 'status', 'timestamp'];
        const firstActivity = activities[0];
        const missingFields = requiredFields.filter(field => !(field in firstActivity));
        
        if (missingFields.length > 0) {
          console.log('⚠️  Missing fields in activity:', missingFields);
        } else {
          console.log('✅ Activity structure is valid');
        }
      }
    } else {
      console.log('⚠️  Response is not an array');
    }
  } else {
    console.log('❌ Failed to get recent activities');
    console.log('Error:', result.error);
  }
  
  return result.success;
}

// Test 3: Get Recommended Modules
async function testRecommendedModules() {
  console.log('\n=== Test 3: Get Recommended Modules ===');
  const result = await makeRequest(`/api/students/${TEST_CONFIG.studentId}/recommended-modules`);
  
  if (result.success) {
    console.log('✅ Recommended modules retrieved successfully');
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    // Validate response structure
    const modules = result.data.data;
    if (Array.isArray(modules)) {
      console.log(`✅ Returned ${modules.length} recommended modules (max 10)`);
      
      // Validate module structure
      if (modules.length > 0) {
        const requiredFields = ['id', 'title', 'isPublished'];
        const firstModule = modules[0];
        const missingFields = requiredFields.filter(field => !(field in firstModule));
        
        if (missingFields.length > 0) {
          console.log('⚠️  Missing fields in module:', missingFields);
        } else {
          console.log('✅ Module structure is valid');
        }
        
        // Check if all modules are published
        const allPublished = modules.every(m => m.isPublished === true);
        if (allPublished) {
          console.log('✅ All recommended modules are published');
        } else {
          console.log('⚠️  Some modules are not published');
        }
      }
    } else {
      console.log('⚠️  Response is not an array');
    }
  } else {
    console.log('❌ Failed to get recommended modules');
    console.log('Error:', result.error);
  }
  
  return result.success;
}

// Run all tests
async function runTests() {
  console.log('===========================================');
  console.log('Student Dashboard Endpoints Test Suite');
  console.log('===========================================');
  console.log('Base URL:', BASE_URL);
  console.log('Student ID:', TEST_CONFIG.studentId);
  console.log('===========================================');

  const results = {
    dashboardStats: await testDashboardStats(),
    recentActivities: await testRecentActivities(),
    recommendedModules: await testRecommendedModules()
  };

  console.log('\n===========================================');
  console.log('Test Summary');
  console.log('===========================================');
  console.log('Dashboard Stats:', results.dashboardStats ? '✅ PASS' : '❌ FAIL');
  console.log('Recent Activities:', results.recentActivities ? '✅ PASS' : '❌ FAIL');
  console.log('Recommended Modules:', results.recommendedModules ? '✅ PASS' : '❌ FAIL');
  console.log('===========================================');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  console.log(`\nTotal: ${passedTests}/${totalTests} tests passed`);

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testDashboardStats, testRecentActivities, testRecommendedModules };
