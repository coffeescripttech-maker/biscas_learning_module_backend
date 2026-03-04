/**
 * Migration Test Script
 * 
 * This script tests the migration by:
 * 1. Running the migration
 * 2. Verifying all tables exist
 * 3. Checking indexes
 * 4. Validating foreign keys
 * 5. Testing basic CRUD operations
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env.development' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'biscas_learning',
  multipleStatements: true
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testMigration() {
  let connection;
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    log('\n🧪 Starting Migration Tests...', 'cyan');
    log('━'.repeat(60), 'cyan');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    log('✅ Connected to database', 'green');
    
    // Test 1: Verify all expected tables exist
    log('\n📋 Test 1: Verifying tables exist...', 'blue');
    const expectedTables = [
      'users', 'refresh_tokens', 'password_reset_tokens', 'profiles',
      'classes', 'class_students', 'lessons', 'lesson_progress',
      'quizzes', 'quiz_questions', 'quiz_assignees', 'quiz_class_assignees', 'quiz_results',
      'activities', 'activity_assignees', 'activity_class_assignees', 'submissions',
      'announcements',
      'vark_module_categories', 'vark_modules', 'vark_module_sections',
      'vark_module_progress', 'vark_module_assignments', 'vark_learning_paths',
      'vark_module_feedback', 'module_completions', 'student_badges',
      'teacher_notifications', 'student_module_submissions', 'file_storage'
    ];
    
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    let allTablesExist = true;
    for (const table of expectedTables) {
      if (tableNames.includes(table)) {
        log(`   ✓ ${table}`, 'green');
      } else {
        log(`   ✗ ${table} - MISSING`, 'red');
        allTablesExist = false;
      }
    }
    
    if (allTablesExist) {
      log(`✅ All ${expectedTables.length} tables exist`, 'green');
      testsPassed++;
    } else {
      log('❌ Some tables are missing', 'red');
      testsFailed++;
    }
    
    // Test 2: Verify indexes
    log('\n📋 Test 2: Verifying indexes...', 'blue');
    const [indexes] = await connection.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, INDEX_NAME
    `, [dbConfig.database]);
    
    log(`   Found ${indexes.length} indexes across all tables`, 'green');
    
    // Check for critical indexes
    const criticalIndexes = [
      { table: 'users', column: 'email' },
      { table: 'profiles', column: 'user_id' },
      { table: 'vark_modules', column: 'created_by' },
      { table: 'vark_module_progress', column: 'student_id' }
    ];
    
    let allIndexesExist = true;
    for (const { table, column } of criticalIndexes) {
      const hasIndex = indexes.some(idx => 
        idx.TABLE_NAME === table && idx.COLUMN_NAME === column
      );
      if (hasIndex) {
        log(`   ✓ Index on ${table}.${column}`, 'green');
      } else {
        log(`   ✗ Missing index on ${table}.${column}`, 'red');
        allIndexesExist = false;
      }
    }
    
    if (allIndexesExist) {
      log('✅ All critical indexes exist', 'green');
      testsPassed++;
    } else {
      log('❌ Some indexes are missing', 'red');
      testsFailed++;
    }
    
    // Test 3: Verify foreign keys
    log('\n📋 Test 3: Verifying foreign keys...', 'blue');
    const [foreignKeys] = await connection.query(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);
    
    log(`   Found ${foreignKeys.length} foreign key constraints`, 'green');
    
    // Check for critical foreign keys
    const criticalFKs = [
      { table: 'profiles', column: 'user_id', ref_table: 'users' },
      { table: 'vark_modules', column: 'created_by', ref_table: 'users' },
      { table: 'vark_module_sections', column: 'module_id', ref_table: 'vark_modules' }
    ];
    
    let allFKsExist = true;
    for (const { table, column, ref_table } of criticalFKs) {
      const hasFK = foreignKeys.some(fk => 
        fk.TABLE_NAME === table && 
        fk.COLUMN_NAME === column && 
        fk.REFERENCED_TABLE_NAME === ref_table
      );
      if (hasFK) {
        log(`   ✓ FK: ${table}.${column} → ${ref_table}`, 'green');
      } else {
        log(`   ✗ Missing FK: ${table}.${column} → ${ref_table}`, 'red');
        allFKsExist = false;
      }
    }
    
    if (allFKsExist) {
      log('✅ All critical foreign keys exist', 'green');
      testsPassed++;
    } else {
      log('❌ Some foreign keys are missing', 'red');
      testsFailed++;
    }
    
    // Test 4: Test basic CRUD operations
    log('\n📋 Test 4: Testing CRUD operations...', 'blue');
    
    try {
      // Generate UUID for test
      const testUserId = '12345678-1234-1234-1234-123456789012';
      const testEmail = `test_${Date.now()}@example.com`;
      
      // Insert test user
      await connection.query(
        'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [testUserId, testEmail, 'test_hash', 'student']
      );
      log('   ✓ INSERT operation successful', 'green');
      
      // Read test user
      const [users] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [testUserId]
      );
      if (users.length === 1 && users[0].email === testEmail) {
        log('   ✓ SELECT operation successful', 'green');
      } else {
        throw new Error('SELECT returned unexpected results');
      }
      
      // Update test user
      await connection.query(
        'UPDATE users SET role = ? WHERE id = ?',
        ['teacher', testUserId]
      );
      const [updatedUsers] = await connection.query(
        'SELECT role FROM users WHERE id = ?',
        [testUserId]
      );
      if (updatedUsers[0].role === 'teacher') {
        log('   ✓ UPDATE operation successful', 'green');
      } else {
        throw new Error('UPDATE did not modify the record');
      }
      
      // Delete test user
      await connection.query('DELETE FROM users WHERE id = ?', [testUserId]);
      const [deletedUsers] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [testUserId]
      );
      if (deletedUsers.length === 0) {
        log('   ✓ DELETE operation successful', 'green');
      } else {
        throw new Error('DELETE did not remove the record');
      }
      
      log('✅ All CRUD operations work correctly', 'green');
      testsPassed++;
      
    } catch (error) {
      log(`❌ CRUD operations failed: ${error.message}`, 'red');
      testsFailed++;
    }
    
    // Test 5: Test CASCADE delete
    log('\n📋 Test 5: Testing CASCADE delete...', 'blue');
    
    try {
      const testUserId = '12345678-1234-1234-1234-123456789013';
      const testProfileId = '12345678-1234-1234-1234-123456789014';
      
      // Insert user and profile
      await connection.query(
        'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [testUserId, `cascade_test_${Date.now()}@example.com`, 'test_hash', 'student']
      );
      
      await connection.query(
        'INSERT INTO profiles (id, user_id, first_name, last_name) VALUES (?, ?, ?, ?)',
        [testProfileId, testUserId, 'Test', 'User']
      );
      
      // Delete user (should cascade to profile)
      await connection.query('DELETE FROM users WHERE id = ?', [testUserId]);
      
      // Check if profile was also deleted
      const [profiles] = await connection.query(
        'SELECT * FROM profiles WHERE id = ?',
        [testProfileId]
      );
      
      if (profiles.length === 0) {
        log('   ✓ CASCADE delete works correctly', 'green');
        log('✅ Foreign key constraints with CASCADE working', 'green');
        testsPassed++;
      } else {
        throw new Error('CASCADE delete did not remove related records');
      }
      
    } catch (error) {
      log(`❌ CASCADE delete test failed: ${error.message}`, 'red');
      testsFailed++;
    }
    
    // Summary
    log('\n' + '━'.repeat(60), 'cyan');
    log('📊 Test Summary', 'cyan');
    log('━'.repeat(60), 'cyan');
    log(`✅ Tests Passed: ${testsPassed}`, 'green');
    if (testsFailed > 0) {
      log(`❌ Tests Failed: ${testsFailed}`, 'red');
    }
    log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`, 'cyan');
    
    if (testsFailed === 0) {
      log('\n🎉 All tests passed! Migration is successful!', 'green');
      log('✅ Database schema is ready for use.\n', 'green');
    } else {
      log('\n⚠️  Some tests failed. Please review the migration.', 'yellow');
      log('Check the errors above and fix any issues.\n', 'yellow');
    }
    
  } catch (error) {
    log('\n❌ Test execution failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`\nStack trace:\n${error.stack}`, 'red');
    }
  } finally {
    if (connection) {
      await connection.end();
      log('🔌 Database connection closed.\n', 'blue');
    }
  }
}

// Run tests
testMigration().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
