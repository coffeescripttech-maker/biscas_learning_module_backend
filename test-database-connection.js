/**
 * Test script for database connection module
 * Tests connection pool, retry logic, health check, and graceful shutdown
 */

const db = require('./src/config/database');
const logger = require('./src/utils/logger');

async function testDatabaseConnection() {
  console.log('\n=== Testing Database Connection Module ===\n');
  
  try {
    // Test 1: Initialize database connection
    console.log('Test 1: Initializing database connection...');
    await db.initialize();
    console.log('✓ Database initialized successfully\n');
    
    // Test 2: Health check
    console.log('Test 2: Running health check...');
    const health = await db.healthCheck();
    console.log('Health check result:', JSON.stringify(health, null, 2));
    console.log('✓ Health check completed\n');
    
    // Test 3: Get pool and execute query
    console.log('Test 3: Testing connection pool...');
    const pool = db.getPool();
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('Query result:', rows[0]);
    console.log('✓ Connection pool working\n');
    
    // Test 4: Test connection with retry (should succeed immediately)
    console.log('Test 4: Testing connection with retry logic...');
    await db.testConnection(3, 1000);
    console.log('✓ Connection test with retry successful\n');
    
    // Test 5: Graceful shutdown
    console.log('Test 5: Testing graceful shutdown...');
    await db.shutdown();
    console.log('✓ Graceful shutdown completed\n');
    
    console.log('=== All tests passed! ===\n');
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await db.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await db.shutdown();
  process.exit(0);
});

// Run tests
testDatabaseConnection();
