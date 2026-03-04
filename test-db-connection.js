/**
 * Database Connection Test Script
 * 
 * This script tests the connection to your MySQL database
 * and provides detailed diagnostics.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function testDatabaseConnection() {
  logSection('🔍 DATABASE CONNECTION TEST');
  
  // Display configuration
  logSection('📋 Configuration');
  log(`Host:     ${process.env.DB_HOST}`, 'cyan');
  log(`Port:     ${process.env.DB_PORT}`, 'cyan');
  log(`Database: ${process.env.DB_NAME}`, 'cyan');
  log(`User:     ${process.env.DB_USER}`, 'cyan');
  log(`SSL:      ${process.env.DB_SSL}`, 'cyan');
  
  let connection = null;
  
  try {
    // Test 1: Create connection
    logSection('🔌 Test 1: Creating Connection');
    log('Attempting to connect...', 'yellow');
    
    const config = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000 // 10 seconds
    };
    
    // Add SSL if enabled
    if (process.env.DB_SSL === 'true') {
      config.ssl = {
        rejectUnauthorized: true
      };
    }
    
    const startTime = Date.now();
    connection = await mysql.createConnection(config);
    const connectionTime = Date.now() - startTime;
    
    log(`✅ Connection established in ${connectionTime}ms`, 'green');
    
    // Test 2: Simple query
    logSection('📊 Test 2: Simple Query (SELECT 1)');
    log('Executing query...', 'yellow');
    
    const queryStart = Date.now();
    const [rows] = await connection.query('SELECT 1 as test');
    const queryTime = Date.now() - queryStart;
    
    log(`✅ Query executed successfully in ${queryTime}ms`, 'green');
    log(`Result: ${JSON.stringify(rows)}`, 'cyan');
    
    // Test 3: Database version
    logSection('🔢 Test 3: Database Version');
    log('Fetching MySQL version...', 'yellow');
    
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    log(`✅ MySQL Version: ${versionRows[0].version}`, 'green');
    
    // Test 4: Check database exists
    logSection('🗄️  Test 4: Database Existence');
    log(`Checking if database '${process.env.DB_NAME}' exists...`, 'yellow');
    
    const [dbRows] = await connection.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [process.env.DB_NAME]
    );
    
    if (dbRows.length > 0) {
      log(`✅ Database '${process.env.DB_NAME}' exists`, 'green');
    } else {
      log(`❌ Database '${process.env.DB_NAME}' does NOT exist`, 'red');
      log(`   You need to create it first!`, 'yellow');
    }
    
    // Test 5: List tables
    logSection('📋 Test 5: List Tables');
    log('Fetching tables...', 'yellow');
    
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length > 0) {
      log(`✅ Found ${tables.length} tables:`, 'green');
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        log(`   ${index + 1}. ${tableName}`, 'cyan');
      });
    } else {
      log(`⚠️  No tables found in database`, 'yellow');
      log(`   You may need to run migrations`, 'yellow');
    }
    
    // Test 6: Check critical tables
    logSection('🔍 Test 6: Check Critical Tables');
    const criticalTables = ['users', 'profiles', 'vark_modules', 'classes'];
    
    for (const tableName of criticalTables) {
      const [tableExists] = await connection.query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [process.env.DB_NAME, tableName]
      );
      
      if (tableExists[0].count > 0) {
        // Get row count
        const [rowCount] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        log(`✅ ${tableName}: ${rowCount[0].count} rows`, 'green');
      } else {
        log(`❌ ${tableName}: NOT FOUND`, 'red');
      }
    }
    
    // Test 7: Connection pool test
    logSection('🏊 Test 7: Connection Pool Test');
    log('Creating connection pool...', 'yellow');
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0
    });
    
    const poolConnection = await pool.getConnection();
    log('✅ Pool connection acquired', 'green');
    
    await poolConnection.query('SELECT 1');
    log('✅ Pool query executed', 'green');
    
    poolConnection.release();
    log('✅ Pool connection released', 'green');
    
    await pool.end();
    log('✅ Pool closed', 'green');
    
    // Test 8: Performance test
    logSection('⚡ Test 8: Performance Test');
    log('Running 10 queries...', 'yellow');
    
    const times = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await connection.query('SELECT 1');
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    log(`✅ Average query time: ${avgTime.toFixed(2)}ms`, 'green');
    log(`   Min: ${minTime}ms, Max: ${maxTime}ms`, 'cyan');
    
    // Final summary
    logSection('✅ CONNECTION TEST SUMMARY');
    log('All tests passed successfully!', 'green');
    log('Your database connection is working correctly.', 'green');
    
    return true;
    
  } catch (error) {
    logSection('❌ CONNECTION TEST FAILED');
    log(`Error: ${error.message}`, 'red');
    log(`Code: ${error.code}`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('\n💡 Troubleshooting:', 'yellow');
      log('   - Check if MySQL server is running', 'yellow');
      log('   - Verify the host and port are correct', 'yellow');
      log('   - Check firewall settings', 'yellow');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('\n💡 Troubleshooting:', 'yellow');
      log('   - Verify username and password are correct', 'yellow');
      log('   - Check user has proper permissions', 'yellow');
      log('   - Ensure user can connect from your IP', 'yellow');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      log('\n💡 Troubleshooting:', 'yellow');
      log('   - Database does not exist', 'yellow');
      log('   - Create it with: CREATE DATABASE biscas_learning;', 'yellow');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      log('\n💡 Troubleshooting:', 'yellow');
      log('   - Check your internet connection', 'yellow');
      log('   - Verify the database host is correct', 'yellow');
      log('   - Check if database is accessible from your network', 'yellow');
      log('   - For AWS RDS: Check security group allows your IP', 'yellow');
    }
    
    log('\n📋 Current Configuration:', 'cyan');
    log(`   DB_HOST=${process.env.DB_HOST}`, 'cyan');
    log(`   DB_PORT=${process.env.DB_PORT}`, 'cyan');
    log(`   DB_NAME=${process.env.DB_NAME}`, 'cyan');
    log(`   DB_USER=${process.env.DB_USER}`, 'cyan');
    
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
      log('\n🔌 Connection closed', 'cyan');
    }
  }
}

// Run the test
testDatabaseConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
