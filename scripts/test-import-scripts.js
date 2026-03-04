/**
 * Test Import Scripts
 * 
 * This script tests the import functionality without actually importing data.
 * It verifies that all prerequisites are met and scripts can run successfully.
 * 
 * Usage:
 *   node scripts/test-import-scripts.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const { initialize: initializeDatabase, healthCheck } = require('../src/config/database');
const logger = require('../src/utils/logger');

// Configuration
const EXPORT_DIR = path.join(__dirname, '../exports');

/**
 * Test results tracker
 */
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Run a test
 * @param {string} name - Test name
 * @param {Function} testFn - Test function (async)
 */
async function runTest(name, testFn) {
  testResults.total++;
  console.log(`\n🧪 Testing: ${name}`);
  
  try {
    await testFn();
    console.log(`   ✅ PASSED`);
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', error: error.message });
  }
}

/**
 * Test 1: Environment Variables
 */
async function testEnvironmentVariables() {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  console.log(`   Found all required environment variables`);
}

/**
 * Test 2: Database Connection
 */
async function testDatabaseConnection() {
  await initializeDatabase();
  const health = await healthCheck();
  
  if (health.status !== 'ok') {
    throw new Error(`Database health check failed: ${health.message}`);
  }
  
  console.log(`   Database connection successful`);
  console.log(`   Response time: ${health.responseTime}`);
}

/**
 * Test 3: Export Directory Structure
 */
async function testExportDirectoryStructure() {
  const requiredDirs = [
    path.join(EXPORT_DIR, 'data'),
    path.join(EXPORT_DIR, 'auth'),
    path.join(EXPORT_DIR, 'storage')
  ];
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Export directory not found: ${dir}`);
    }
  }
  
  console.log(`   All export directories exist`);
}

/**
 * Test 4: Data Export Files
 */
async function testDataExportFiles() {
  const dataDir = path.join(EXPORT_DIR, 'data');
  
  // Check for summary file
  const summaryFile = path.join(dataDir, '_export_summary.json');
  if (!fs.existsSync(summaryFile)) {
    throw new Error('Export summary not found. Run export-supabase-data.js first.');
  }
  
  // Check for at least one table export
  const files = fs.readdirSync(dataDir);
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('_'));
  
  if (jsonFiles.length === 0) {
    throw new Error('No table export files found. Run export-supabase-data.js first.');
  }
  
  console.log(`   Found ${jsonFiles.length} table export files`);
}

/**
 * Test 5: Auth Export Files
 */
async function testAuthExportFiles() {
  const authDir = path.join(EXPORT_DIR, 'auth');
  
  const requiredFiles = [
    'users_for_migration.json',
    '_auth_export_summary.json'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(authDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Auth export file not found: ${file}. Run export-supabase-auth.js first.`);
    }
  }
  
  // Check user count
  const usersFile = path.join(authDir, 'users_for_migration.json');
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  
  console.log(`   Found ${users.length} users to import`);
}

/**
 * Test 6: Storage Export Files
 */
async function testStorageExportFiles() {
  const storageDir = path.join(EXPORT_DIR, 'storage');
  
  const mappingFile = path.join(storageDir, '_url_mapping.json');
  if (!fs.existsSync(mappingFile)) {
    console.log(`   ⚠️  URL mapping not found (optional if no files)`);
    return;
  }
  
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
  console.log(`   Found ${mapping.length} files to import`);
}

/**
 * Test 7: Database Tables Exist
 */
async function testDatabaseTables() {
  const db = require('../src/utils/db');
  
  const requiredTables = [
    'users',
    'profiles',
    'password_reset_tokens',
    'refresh_tokens'
  ];
  
  for (const table of requiredTables) {
    try {
      await db.query(`SELECT 1 FROM ${table} LIMIT 1`);
    } catch (error) {
      throw new Error(`Table ${table} does not exist. Run database migration first.`);
    }
  }
  
  console.log(`   All required tables exist`);
}

/**
 * Test 8: Import Script Files Exist
 */
async function testImportScriptFiles() {
  const requiredScripts = [
    'import-supabase-data.js',
    'import-auth-users.js',
    'import-storage-files.js',
    'verify-data-integrity.js',
    'send-password-resets.js'
  ];
  
  for (const script of requiredScripts) {
    const scriptPath = path.join(__dirname, script);
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Import script not found: ${script}`);
    }
  }
  
  console.log(`   All import scripts exist`);
}

/**
 * Test 9: Email Configuration (Optional)
 */
async function testEmailConfiguration() {
  const emailVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM'];
  const missing = emailVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log(`   ⚠️  Email configuration incomplete (optional for testing)`);
    console.log(`   Missing: ${missing.join(', ')}`);
    return;
  }
  
  console.log(`   Email configuration complete`);
}

/**
 * Test 10: Storage Configuration
 */
async function testStorageConfiguration() {
  const storageType = process.env.STORAGE_TYPE || 'local';
  
  if (storageType === 'local') {
    const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '../uploads');
    
    // Check if directory exists or can be created
    if (!fs.existsSync(storagePath)) {
      try {
        fs.mkdirSync(storagePath, { recursive: true });
        console.log(`   Created local storage directory: ${storagePath}`);
      } catch (error) {
        throw new Error(`Cannot create storage directory: ${error.message}`);
      }
    } else {
      console.log(`   Local storage directory exists: ${storagePath}`);
    }
  } else if (storageType === 's3') {
    const s3Vars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'];
    const missing = s3Vars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing S3 configuration: ${missing.join(', ')}`);
    }
    
    console.log(`   S3 configuration complete`);
  } else {
    throw new Error(`Invalid STORAGE_TYPE: ${storageType} (must be 'local' or 's3')`);
  }
}

/**
 * Test 11: Data Transformation Functions
 */
async function testDataTransformationFunctions() {
  const { convertUuid, convertTimestamp, convertJson } = require('./import-supabase-data');
  
  // Test UUID conversion
  const uuid = '550e8400-e29b-41d4-a716-446655440000';
  const convertedUuid = convertUuid(uuid);
  if (convertedUuid !== uuid) {
    throw new Error('UUID conversion failed');
  }
  
  // Test timestamp conversion
  const timestamp = '2025-01-14T10:30:00.000Z';
  const convertedTimestamp = convertTimestamp(timestamp);
  if (!convertedTimestamp.includes('2025-01-14')) {
    throw new Error('Timestamp conversion failed');
  }
  
  // Test JSON conversion
  const obj = { key: 'value' };
  const convertedJson = convertJson(obj);
  if (convertedJson !== '{"key":"value"}') {
    throw new Error('JSON conversion failed');
  }
  
  console.log(`   Data transformation functions working correctly`);
}

/**
 * Test 12: Password Hashing
 */
async function testPasswordHashing() {
  const { hashPassword } = require('./import-auth-users');
  
  const password = 'test-password-123';
  const hash = await hashPassword(password);
  
  if (!hash || hash.length < 50) {
    throw new Error('Password hashing failed');
  }
  
  console.log(`   Password hashing working correctly`);
}

/**
 * Display summary
 */
function displaySummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`📈 Success rate: ${successRate}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed tests:');
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`   - ${t.name}: ${t.error}`);
      });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('✅ All tests passed! Ready to run import scripts.');
    console.log('='.repeat(60));
    console.log('\n📝 Next steps:');
    console.log('   1. node scripts/import-supabase-data.js');
    console.log('   2. node scripts/import-auth-users.js');
    console.log('   3. node scripts/import-storage-files.js');
    console.log('   4. node scripts/verify-data-integrity.js');
    console.log('   5. node scripts/send-password-resets.js\n');
  } else {
    console.log('❌ Some tests failed. Fix issues before running import.');
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      TEST IMPORT SCRIPTS                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    console.log('\n🚀 Running import readiness tests...\n');
    
    // Run all tests
    await runTest('Environment Variables', testEnvironmentVariables);
    await runTest('Database Connection', testDatabaseConnection);
    await runTest('Export Directory Structure', testExportDirectoryStructure);
    await runTest('Data Export Files', testDataExportFiles);
    await runTest('Auth Export Files', testAuthExportFiles);
    await runTest('Storage Export Files', testStorageExportFiles);
    await runTest('Database Tables', testDatabaseTables);
    await runTest('Import Script Files', testImportScriptFiles);
    await runTest('Email Configuration', testEmailConfiguration);
    await runTest('Storage Configuration', testStorageConfiguration);
    await runTest('Data Transformation Functions', testDataTransformationFunctions);
    await runTest('Password Hashing', testPasswordHashing);
    
    // Display summary
    displaySummary();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    logger.error('Fatal error during testing', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  runTest,
  testResults
};
