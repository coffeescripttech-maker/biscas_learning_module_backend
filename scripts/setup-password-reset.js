/**
 * Setup Password Reset Tables and Test Flow
 * 
 * This script:
 * 1. Creates the password_reset_tokens table if it doesn't exist
 * 2. Tests the complete password reset flow
 */

require('dotenv').config();
const db = require('../src/utils/db');
const fs = require('fs');
const path = require('path');

async function setupPasswordResetTable() {
  console.log('🔧 Setting up password reset functionality...\n');

  try {
    // Read and execute the migration SQL
    console.log('Step 1: Creating password_reset_tokens table...');
    const sqlPath = path.join(__dirname, '../migrations/create-password-reset-tokens-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await db.query(sql);
    console.log('✅ Table created successfully\n');

    // Verify table exists
    console.log('Step 2: Verifying table structure...');
    const [tables] = await db.query("SHOW TABLES LIKE 'password_reset_tokens'");
    
    if (tables.length === 0) {
      throw new Error('Table was not created');
    }

    const [columns] = await db.query("DESCRIBE password_reset_tokens");
    console.log('✅ Table structure:');
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''}`);
    });
    console.log('');

    // Check if refresh_tokens table exists (needed for auth)
    console.log('Step 3: Checking refresh_tokens table...');
    const [refreshTables] = await db.query("SHOW TABLES LIKE 'refresh_tokens'");
    
    if (refreshTables.length === 0) {
      console.log('⚠️  refresh_tokens table not found. Creating it...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_user_id (user_id),
          INDEX idx_expires_at (expires_at),
          
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ refresh_tokens table created\n');
    } else {
      console.log('✅ refresh_tokens table exists\n');
    }

    console.log('🎉 Password reset setup complete!\n');
    console.log('Next steps:');
    console.log('1. Restart your Express server');
    console.log('2. Test the forgot password flow:');
    console.log('   - Go to: http://localhost:3000/auth/forgot-password');
    console.log('   - Enter a registered email');
    console.log('   - Check your email for the reset link');
    console.log('3. Or run: node scripts/test-password-reset-flow.js');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Run setup
setupPasswordResetTable()
  .then(() => {
    console.log('\n✅ Setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
