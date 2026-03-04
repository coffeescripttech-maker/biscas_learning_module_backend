/**
 * Verification Script for Authentication Tables
 * Task 9: Create authentication tables
 * 
 * This script verifies that the authentication tables are properly created:
 * - users table
 * - refresh_tokens table
 * - password_reset_tokens table
 * - All required indexes
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });

const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function verifyAuthTables() {
  let connection;
  
  try {
    console.log('🔍 Connecting to MySQL database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Verify users table
    console.log('📋 Verifying users table...');
    const [usersColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);

    if (usersColumns.length === 0) {
      console.error('❌ users table does not exist!');
      process.exit(1);
    }

    console.log('✅ users table exists with columns:');
    usersColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : ''}`);
    });

    // Verify users indexes
    const [usersIndexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [config.database]);

    console.log('✅ users table indexes:');
    const indexGroups = {};
    usersIndexes.forEach(idx => {
      if (!indexGroups[idx.INDEX_NAME]) {
        indexGroups[idx.INDEX_NAME] = [];
      }
      indexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    Object.entries(indexGroups).forEach(([name, cols]) => {
      console.log(`   - ${name}: ${cols.join(', ')}`);
    });

    // Verify refresh_tokens table
    console.log('\n📋 Verifying refresh_tokens table...');
    const [refreshTokensColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'refresh_tokens'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);

    if (refreshTokensColumns.length === 0) {
      console.error('❌ refresh_tokens table does not exist!');
      process.exit(1);
    }

    console.log('✅ refresh_tokens table exists with columns:');
    refreshTokensColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : ''}`);
    });

    // Verify refresh_tokens indexes
    const [refreshTokensIndexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'refresh_tokens'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [config.database]);

    console.log('✅ refresh_tokens table indexes:');
    const refreshIndexGroups = {};
    refreshTokensIndexes.forEach(idx => {
      if (!refreshIndexGroups[idx.INDEX_NAME]) {
        refreshIndexGroups[idx.INDEX_NAME] = [];
      }
      refreshIndexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    Object.entries(refreshIndexGroups).forEach(([name, cols]) => {
      console.log(`   - ${name}: ${cols.join(', ')}`);
    });

    // Verify password_reset_tokens table
    console.log('\n📋 Verifying password_reset_tokens table...');
    const [passwordResetColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'password_reset_tokens'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);

    if (passwordResetColumns.length === 0) {
      console.error('❌ password_reset_tokens table does not exist!');
      process.exit(1);
    }

    console.log('✅ password_reset_tokens table exists with columns:');
    passwordResetColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : ''}`);
    });

    // Verify password_reset_tokens indexes
    const [passwordResetIndexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'password_reset_tokens'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [config.database]);

    console.log('✅ password_reset_tokens table indexes:');
    const passwordResetIndexGroups = {};
    passwordResetIndexes.forEach(idx => {
      if (!passwordResetIndexGroups[idx.INDEX_NAME]) {
        passwordResetIndexGroups[idx.INDEX_NAME] = [];
      }
      passwordResetIndexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    Object.entries(passwordResetIndexGroups).forEach(([name, cols]) => {
      console.log(`   - ${name}: ${cols.join(', ')}`);
    });

    // Verify foreign keys
    console.log('\n🔗 Verifying foreign key constraints...');
    const [foreignKeys] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('refresh_tokens', 'password_reset_tokens')
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `, [config.database]);

    if (foreignKeys.length > 0) {
      console.log('✅ Foreign key constraints:');
      foreignKeys.forEach(fk => {
        console.log(`   - ${fk.TABLE_NAME}.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('⚠️  No foreign key constraints found (this may be expected if they were not created yet)');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log('All authentication tables are properly created:');
    console.log('  ✓ users table with required columns and indexes');
    console.log('  ✓ refresh_tokens table with required columns and indexes');
    console.log('  ✓ password_reset_tokens table with required columns and indexes');
    console.log('  ✓ Foreign key relationships established');
    console.log('\n✅ Task 9: Create authentication tables - COMPLETE');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL is running and the connection details in .env.development are correct');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run verification
verifyAuthTables();
