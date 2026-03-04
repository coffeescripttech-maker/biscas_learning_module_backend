/**
 * Test script for database utility functions
 * Tests query wrappers, transactions, and prepared statement helpers
 */

const db = require('./src/utils/db');
const database = require('./src/config/database');
const logger = require('./src/utils/logger');

async function testDatabaseUtils() {
  try {
    console.log('=== Testing Database Utility Functions ===\n');

    // Initialize database connection
    console.log('1. Initializing database connection...');
    await database.initialize();
    console.log('✓ Database initialized\n');

    // Test 1: Query wrapper with error handling
    console.log('2. Testing query wrapper...');
    try {
      const result = await db.query('SELECT 1 as test, NOW() as current_time');
      console.log('✓ Query executed successfully:', result);
    } catch (error) {
      console.error('✗ Query failed:', error.message);
    }
    console.log();

    // Test 2: Prepared statement helpers - buildSelect
    console.log('3. Testing buildSelect helper...');
    const selectQuery = db.buildSelect('users', {
      where: { email: 'test@example.com', role: 'student' },
      columns: ['id', 'email', 'role'],
      orderBy: 'created_at DESC',
      limit: 10
    });
    console.log('✓ Built SELECT query:', selectQuery);
    console.log();

    // Test 3: Prepared statement helpers - buildInsert
    console.log('4. Testing buildInsert helper...');
    const insertQuery = db.buildInsert('users', {
      id: 'test-uuid',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'student'
    });
    console.log('✓ Built INSERT query:', insertQuery);
    console.log();

    // Test 4: Prepared statement helpers - buildUpdate
    console.log('5. Testing buildUpdate helper...');
    const updateQuery = db.buildUpdate(
      'users',
      { email: 'newemail@example.com', role: 'teacher' },
      { id: 'test-uuid' }
    );
    console.log('✓ Built UPDATE query:', updateQuery);
    console.log();

    // Test 5: Prepared statement helpers - buildDelete
    console.log('6. Testing buildDelete helper...');
    const deleteQuery = db.buildDelete('users', { id: 'test-uuid' });
    console.log('✓ Built DELETE query:', deleteQuery);
    console.log();

    // Test 6: Transaction support (dry run - no actual changes)
    console.log('7. Testing transaction support...');
    try {
      const result = await db.transaction(async (txQuery) => {
        // Test transaction query
        const testResult = await txQuery('SELECT 1 as tx_test');
        console.log('  - Transaction query executed:', testResult);
        return { success: true, message: 'Transaction test completed' };
      });
      console.log('✓ Transaction completed:', result);
    } catch (error) {
      console.error('✗ Transaction failed:', error.message);
    }
    console.log();

    // Test 7: Error handling with invalid query
    console.log('8. Testing error handling...');
    try {
      await db.query('SELECT * FROM nonexistent_table');
      console.log('✗ Should have thrown an error');
    } catch (error) {
      console.log('✓ Error caught correctly:', error.name, '-', error.code);
    }
    console.log();

    // Test 8: queryOne helper
    console.log('9. Testing queryOne helper...');
    try {
      const row = await db.queryOne('SELECT 1 as test, "single row" as message');
      console.log('✓ queryOne returned:', row);
    } catch (error) {
      console.error('✗ queryOne failed:', error.message);
    }
    console.log();

    console.log('=== All Tests Completed ===\n');

  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('Shutting down database connection...');
    await database.shutdown();
    console.log('✓ Database connection closed');
    process.exit(0);
  }
}

// Run tests
testDatabaseUtils();
