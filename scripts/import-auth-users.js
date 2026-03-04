/**
 * Authentication Users Import Script
 * 
 * This script imports user accounts from Supabase Auth export into MySQL.
 * It creates users with temporary passwords and generates password reset tokens.
 * 
 * Requirements: 3.2, 3.3
 * 
 * Usage:
 *   node scripts/import-auth-users.js
 * 
 * Environment Variables Required:
 *   DB_HOST - MySQL host
 *   DB_PORT - MySQL port
 *   DB_USER - MySQL user
 *   DB_PASSWORD - MySQL password
 *   DB_NAME - MySQL database name
 *   JWT_SECRET - JWT secret for token generation
 * 
 * Features:
 *   - Creates users in MySQL users table
 *   - Hashes temporary passwords with bcrypt
 *   - Generates password reset tokens
 *   - Creates password reset records
 *   - Tracks import statistics
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

// Import database utilities
const db = require('../src/utils/db');
const { initialize: initializeDatabase } = require('../src/config/database');
const logger = require('../src/utils/logger');

// Configuration
const EXPORT_DIR = path.join(__dirname, '../exports/auth');
const BCRYPT_ROUNDS = 10;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate a secure password reset token
 * @returns {string} - Secure token
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Load users from export file
 * @returns {Array} - Array of user objects
 */
function loadExportedUsers() {
  const filename = path.join(EXPORT_DIR, 'users_for_migration.json');
  
  if (!fs.existsSync(filename)) {
    throw new Error(`Export file not found: ${filename}`);
  }
  
  try {
    const content = fs.readFileSync(filename, 'utf8');
    const users = JSON.parse(content);
    
    if (!Array.isArray(users)) {
      throw new Error('Invalid export format: expected array of users');
    }
    
    return users;
  } catch (error) {
    throw new Error(`Failed to load users export: ${error.message}`);
  }
}

/**
 * Check if user already exists in database
 * @param {string} email - User email
 * @returns {Promise<boolean>} - True if user exists
 */
async function userExists(email) {
  try {
    const result = await db.queryOne(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    return result !== null;
  } catch (error) {
    logger.error('Error checking if user exists', {
      email,
      error: error.message
    });
    return false;
  }
}

/**
 * Create a user in the database
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user info
 */
async function createUser(userData) {
  const {
    id,
    email,
    role,
    emailVerified,
    createdAt,
    lastSignIn,
    passwordMigration
  } = userData;
  
  try {
    // Hash the temporary password
    const passwordHash = await hashPassword(passwordMigration.tempPassword);
    
    // Convert timestamps
    const createdAtFormatted = createdAt ? new Date(createdAt).toISOString().slice(0, 19).replace('T', ' ') : null;
    const lastLoginFormatted = lastSignIn ? new Date(lastSignIn).toISOString().slice(0, 19).replace('T', ' ') : null;
    
    // Insert user
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, email_verified, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        email,
        passwordHash,
        role,
        emailVerified ? 1 : 0,
        createdAtFormatted,
        lastLoginFormatted
      ]
    );
    
    logger.info('User created', { userId: id, email, role });
    
    return {
      userId: id,
      email,
      role,
      success: true
    };
  } catch (error) {
    logger.error('Failed to create user', {
      email,
      error: error.message,
      code: error.code
    });
    
    return {
      userId: id,
      email,
      role,
      success: false,
      error: error.message
    };
  }
}

/**
 * Create password reset token for a user
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {Promise<Object>} - Reset token info
 */
async function createPasswordResetToken(userId, email) {
  try {
    const token = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS);
    
    const expiresAtFormatted = expiresAt.toISOString().slice(0, 19).replace('T', ' ');
    
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
       VALUES (?, ?, ?, ?)`,
      [userId, token, expiresAtFormatted, 0]
    );
    
    logger.info('Password reset token created', { userId, email });
    
    return {
      userId,
      email,
      token,
      expiresAt: expiresAtFormatted,
      success: true
    };
  } catch (error) {
    logger.error('Failed to create password reset token', {
      userId,
      email,
      error: error.message
    });
    
    return {
      userId,
      email,
      success: false,
      error: error.message
    };
  }
}

/**
 * Import all users
 * @param {Array} users - Array of user objects
 * @returns {Promise<Object>} - Import statistics
 */
async function importUsers(users) {
  console.log(`\n📦 Importing ${users.length} users...`);
  
  const results = {
    total: users.length,
    created: 0,
    skipped: 0,
    failed: 0,
    resetTokensCreated: 0,
    resetTokensFailed: 0,
    users: []
  };
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const progress = `[${i + 1}/${users.length}]`;
    
    console.log(`   ${progress} Processing ${user.email}...`);
    
    // Check if user already exists
    if (await userExists(user.email)) {
      console.log(`   ${progress} ⚠️  User already exists, skipping`);
      results.skipped++;
      results.users.push({
        email: user.email,
        status: 'skipped',
        reason: 'already_exists'
      });
      continue;
    }
    
    // Create user
    const createResult = await createUser(user);
    
    if (!createResult.success) {
      console.log(`   ${progress} ❌ Failed to create user: ${createResult.error}`);
      results.failed++;
      results.users.push({
        email: user.email,
        status: 'failed',
        error: createResult.error
      });
      continue;
    }
    
    console.log(`   ${progress} ✓ User created`);
    results.created++;
    
    // Create password reset token
    const tokenResult = await createPasswordResetToken(user.id, user.email);
    
    if (tokenResult.success) {
      console.log(`   ${progress} ✓ Password reset token created`);
      results.resetTokensCreated++;
      results.users.push({
        email: user.email,
        status: 'success',
        userId: user.id,
        resetToken: tokenResult.token,
        resetTokenExpires: tokenResult.expiresAt
      });
    } else {
      console.log(`   ${progress} ⚠️  Failed to create reset token: ${tokenResult.error}`);
      results.resetTokensFailed++;
      results.users.push({
        email: user.email,
        status: 'partial',
        userId: user.id,
        warning: 'User created but reset token failed'
      });
    }
  }
  
  return results;
}

/**
 * Generate password reset email list
 * @param {Object} results - Import results
 * @returns {Array} - Array of email data
 */
function generateEmailList(results) {
  const emailList = [];
  
  for (const user of results.users) {
    if (user.status === 'success' && user.resetToken) {
      emailList.push({
        email: user.email,
        resetToken: user.resetToken,
        resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${user.resetToken}`,
        expiresAt: user.resetTokenExpires
      });
    }
  }
  
  return emailList;
}

/**
 * Save import results
 * @param {Object} results - Import results
 */
function saveResults(results) {
  // Save detailed results
  const resultsFilename = path.join(EXPORT_DIR, '_import_results.json');
  fs.writeFileSync(resultsFilename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to: _import_results.json`);
  
  // Generate and save email list
  const emailList = generateEmailList(results);
  const emailListFilename = path.join(EXPORT_DIR, '_password_reset_emails.json');
  fs.writeFileSync(emailListFilename, JSON.stringify(emailList, null, 2));
  console.log(`📧 Password reset email list saved to: _password_reset_emails.json`);
  
  // Generate CSV for easy viewing
  const csvContent = [
    'Email,Status,Reset Token,Reset URL,Expires At',
    ...emailList.map(item => 
      `${item.email},success,${item.resetToken},${item.resetUrl},${item.expiresAt}`
    )
  ].join('\n');
  
  const csvFilename = path.join(EXPORT_DIR, '_password_reset_emails.csv');
  fs.writeFileSync(csvFilename, csvContent);
  console.log(`📄 CSV export saved to: _password_reset_emails.csv`);
}

/**
 * Display summary
 * @param {Object} results - Import results
 * @param {number} duration - Duration in seconds
 */
function displaySummary(results, duration) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 USER IMPORT SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Users created: ${results.created}`);
  console.log(`⚠️  Users skipped: ${results.skipped}`);
  console.log(`❌ Users failed: ${results.failed}`);
  console.log(`🔑 Reset tokens created: ${results.resetTokensCreated}`);
  console.log(`⚠️  Reset tokens failed: ${results.resetTokensFailed}`);
  console.log(`⏱️  Duration: ${duration} seconds`);
  
  // Show breakdown by role
  const byRole = {};
  results.users.forEach(user => {
    // We don't have role in results, but we can count statuses
    byRole[user.status] = (byRole[user.status] || 0) + 1;
  });
  
  console.log('\n📋 Status breakdown:');
  Object.entries(byRole).forEach(([status, count]) => {
    console.log(`   ${status.padEnd(15)}: ${count}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ User import complete!');
  console.log('='.repeat(60));
  
  console.log('\n📝 NEXT STEPS:');
  console.log('   1. Review _import_results.json for any errors');
  console.log('   2. Send password reset emails using:');
  console.log('      node scripts/send-password-resets.js');
  console.log('   3. Monitor user password reset completion');
  console.log('   4. Provide support for users who need help\n');
}

/**
 * Verify database connection
 */
async function verifyConnection() {
  console.log('\n🔍 Verifying database connection...');
  
  try {
    await initializeDatabase();
    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Verify export files exist
 */
function verifyExportFiles() {
  console.log('\n🔍 Verifying export files...');
  
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`);
    console.error('\nPlease run the auth export script first:');
    console.error('  node scripts/export-supabase-auth.js');
    return false;
  }
  
  const requiredFile = path.join(EXPORT_DIR, 'users_for_migration.json');
  if (!fs.existsSync(requiredFile)) {
    console.error(`❌ Required file not found: users_for_migration.json`);
    console.error('\nPlease run the auth export script first:');
    console.error('  node scripts/export-supabase-auth.js');
    return false;
  }
  
  console.log('✅ Export files found');
  return true;
}

/**
 * Verify required tables exist
 */
async function verifyTables() {
  console.log('\n🔍 Verifying database tables...');
  
  try {
    // Check users table
    await db.query('SELECT 1 FROM users LIMIT 1');
    console.log('✅ users table exists');
    
    // Check password_reset_tokens table
    await db.query('SELECT 1 FROM password_reset_tokens LIMIT 1');
    console.log('✅ password_reset_tokens table exists');
    
    return true;
  } catch (error) {
    console.error('❌ Required tables not found:', error.message);
    console.error('\nPlease run the database migration script first:');
    console.error('  node scripts/run-migration.js');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      AUTHENTICATION USERS IMPORT SCRIPT                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Verify prerequisites
    if (!verifyExportFiles()) {
      process.exit(1);
    }
    
    if (!await verifyConnection()) {
      process.exit(1);
    }
    
    if (!await verifyTables()) {
      process.exit(1);
    }
    
    // Load users
    console.log('\n📂 Loading exported users...');
    const users = loadExportedUsers();
    console.log(`✅ Loaded ${users.length} users from export`);
    
    // Display warning
    console.log('\n⚠️  WARNING: This will import users into MySQL database');
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Users to import: ${users.length}`);
    console.log('\n   This operation will:');
    console.log('   - Create user accounts with temporary passwords');
    console.log('   - Generate password reset tokens (valid for 24 hours)');
    console.log('   - Skip users that already exist');
    console.log('   - Prepare data for sending password reset emails');
    
    // Start import
    const startTime = Date.now();
    const results = await importUsers(users);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Save results
    saveResults(results);
    
    // Display summary
    displaySummary(results, duration);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    logger.error('Fatal error during user import', {
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
  importUsers,
  createUser,
  createPasswordResetToken,
  generateResetToken,
  hashPassword
};
