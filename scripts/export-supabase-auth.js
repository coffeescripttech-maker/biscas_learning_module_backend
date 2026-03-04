/**
 * Supabase Authentication Data Export Script
 * 
 * This script exports user authentication data from Supabase Auth.
 * It includes documentation for password migration strategy.
 * 
 * Requirements: 3.2, 3.3
 * 
 * Usage:
 *   node scripts/export-supabase-auth.js
 * 
 * Environment Variables Required:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 * 
 * PASSWORD MIGRATION STRATEGY:
 * ============================
 * 
 * Supabase uses bcrypt for password hashing, which is compatible with our system.
 * However, we cannot directly export password hashes from Supabase Auth.
 * 
 * Options:
 * 1. Force password reset for all users (RECOMMENDED)
 *    - Export user emails and metadata
 *    - Create accounts with temporary passwords
 *    - Send password reset emails to all users
 *    - Users set new passwords on first login
 * 
 * 2. Manual password migration (if Supabase provides export)
 *    - Export password hashes if available
 *    - Import directly into MySQL users table
 *    - Verify hash format compatibility
 * 
 * This script implements Option 1 (force password reset).
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from root .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPORT_DIR = path.join(__dirname, '../exports/auth');
const PAGE_SIZE = 1000; // Number of users per batch

// Initialize Supabase client
let supabase;

/**
 * Initialize the Supabase client with admin privileges
 */
function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Supabase admin client initialized');
}

/**
 * Create export directory if it doesn't exist
 */
function ensureExportDirectory() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    console.log(`✅ Created export directory: ${EXPORT_DIR}`);
  }
}

/**
 * Generate a secure temporary password
 * @returns {string} Temporary password
 */
function generateTempPassword() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Export all users from Supabase Auth
 * @returns {Promise<Array>} Array of user objects
 */
async function exportAuthUsers() {
  console.log('\n📦 Exporting Supabase Auth users...');

  try {
    const allUsers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`   Fetching page ${page}...`);

      // Use Supabase Admin API to list users
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: PAGE_SIZE
      });

      if (error) {
        throw error;
      }

      if (!data || !data.users || data.users.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`   ✓ Fetched ${data.users.length} users`);
      allUsers.push(...data.users);

      // Check if we have more pages
      hasMore = data.users.length === PAGE_SIZE;
      page++;
    }

    console.log(`   ✅ Total users exported: ${allUsers.length}`);
    return allUsers;

  } catch (error) {
    console.error('   ❌ Error exporting auth users:', error.message);
    throw error;
  }
}

/**
 * Transform Supabase auth user to our format
 * @param {Object} supabaseUser - Supabase auth user object
 * @returns {Object} Transformed user object
 */
function transformAuthUser(supabaseUser) {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    emailVerified: supabaseUser.email_confirmed_at !== null,
    role: supabaseUser.user_metadata?.role || 'student',
    createdAt: supabaseUser.created_at,
    lastSignIn: supabaseUser.last_sign_in_at,
    
    // Metadata
    metadata: {
      phone: supabaseUser.phone,
      appMetadata: supabaseUser.app_metadata,
      userMetadata: supabaseUser.user_metadata
    },
    
    // Password migration info
    passwordMigration: {
      strategy: 'force_reset',
      tempPassword: generateTempPassword(),
      requiresReset: true,
      note: 'User must reset password on first login to new system'
    }
  };
}

/**
 * Export users with migration strategy
 */
async function exportUsersWithStrategy() {
  console.log('\n🚀 Starting Supabase Auth export...');
  console.log(`   Export directory: ${EXPORT_DIR}`);

  const startTime = Date.now();

  try {
    // Export raw auth users
    const rawUsers = await exportAuthUsers();

    // Transform users for migration
    console.log('\n🔄 Transforming user data for migration...');
    const transformedUsers = rawUsers.map(transformAuthUser);

    // Save raw users
    const rawFilename = path.join(EXPORT_DIR, 'supabase_auth_users_raw.json');
    fs.writeFileSync(rawFilename, JSON.stringify(rawUsers, null, 2));
    console.log(`   ✅ Raw users saved to: supabase_auth_users_raw.json`);

    // Save transformed users
    const transformedFilename = path.join(EXPORT_DIR, 'users_for_migration.json');
    fs.writeFileSync(transformedFilename, JSON.stringify(transformedUsers, null, 2));
    console.log(`   ✅ Transformed users saved to: users_for_migration.json`);

    // Generate password reset list (emails only)
    const passwordResetList = transformedUsers.map(u => ({
      email: u.email,
      tempPassword: u.passwordMigration.tempPassword
    }));

    const resetListFilename = path.join(EXPORT_DIR, 'password_reset_list.json');
    fs.writeFileSync(resetListFilename, JSON.stringify(passwordResetList, null, 2));
    console.log(`   ✅ Password reset list saved to: password_reset_list.json`);

    // Generate CSV for easy viewing
    const csvContent = [
      'Email,Temp Password,Role,Email Verified,Created At',
      ...transformedUsers.map(u => 
        `${u.email},${u.passwordMigration.tempPassword},${u.role},${u.emailVerified},${u.createdAt}`
      )
    ].join('\n');

    const csvFilename = path.join(EXPORT_DIR, 'users_migration.csv');
    fs.writeFileSync(csvFilename, csvContent);
    console.log(`   ✅ CSV export saved to: users_migration.csv`);

    // Generate statistics
    const stats = {
      totalUsers: transformedUsers.length,
      byRole: {},
      emailVerified: transformedUsers.filter(u => u.emailVerified).length,
      emailUnverified: transformedUsers.filter(u => !u.emailVerified).length
    };

    // Count by role
    transformedUsers.forEach(u => {
      stats.byRole[u.role] = (stats.byRole[u.role] || 0) + 1;
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 AUTH EXPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ Total users exported: ${stats.totalUsers}`);
    console.log(`📧 Email verified: ${stats.emailVerified}`);
    console.log(`⚠️  Email unverified: ${stats.emailUnverified}`);
    console.log('\n👥 Users by role:');
    Object.entries(stats.byRole).forEach(([role, count]) => {
      console.log(`   ${role.padEnd(15)}: ${count}`);
    });
    console.log(`\n⏱️  Duration: ${duration} seconds`);

    // Save summary
    const summary = {
      exportDate: new Date().toISOString(),
      duration: `${duration} seconds`,
      statistics: stats,
      passwordMigrationStrategy: {
        method: 'force_reset',
        description: 'All users will receive temporary passwords and must reset on first login',
        steps: [
          '1. Import users into MySQL with temporary passwords',
          '2. Send password reset emails to all users',
          '3. Users click reset link and set new password',
          '4. Users can then login with new password'
        ]
      },
      files: {
        raw: 'supabase_auth_users_raw.json',
        transformed: 'users_for_migration.json',
        resetList: 'password_reset_list.json',
        csv: 'users_migration.csv'
      }
    };

    const summaryFilename = path.join(EXPORT_DIR, '_auth_export_summary.json');
    fs.writeFileSync(summaryFilename, JSON.stringify(summary, null, 2));
    console.log(`\n💾 Summary saved to: _auth_export_summary.json`);

    // Generate migration instructions
    const instructions = `
PASSWORD MIGRATION INSTRUCTIONS
================================

STRATEGY: Force Password Reset (Recommended)
--------------------------------------------

Since Supabase password hashes cannot be directly exported, we will use
a temporary password approach with forced password reset.

STEPS:
------

1. IMPORT USERS TO MYSQL
   - Use the import script with users_for_migration.json
   - Each user will be created with a temporary password
   - Temporary passwords are stored in password_reset_list.json

2. SEND PASSWORD RESET EMAILS
   - Use the email service to send reset emails to all users
   - Include instructions for setting new password
   - Provide support contact for issues

3. USER FIRST LOGIN
   - Users receive email with reset link
   - Users click link and set new password
   - Users can then login normally

4. MONITORING
   - Track password reset completion rate
   - Send reminder emails after 7 days
   - Provide manual reset option for support

SECURITY NOTES:
---------------
- Temporary passwords are cryptographically secure (32 hex characters)
- Temporary passwords are only valid for 24 hours
- Password reset tokens expire after use
- All passwords are hashed with bcrypt (10 rounds)

FILES GENERATED:
----------------
- supabase_auth_users_raw.json     : Raw Supabase auth data (backup)
- users_for_migration.json         : Transformed data for import
- password_reset_list.json         : Email + temp password mapping
- users_migration.csv              : Human-readable format
- _auth_export_summary.json        : Export statistics and metadata

NEXT STEPS:
-----------
1. Review the exported data
2. Run the import script: node scripts/import-auth-users.js
3. Send password reset emails: node scripts/send-password-resets.js
4. Monitor user migration progress

For questions or issues, refer to the migration documentation.
`;

    const instructionsFilename = path.join(EXPORT_DIR, 'MIGRATION_INSTRUCTIONS.txt');
    fs.writeFileSync(instructionsFilename, instructions);
    console.log(`📄 Migration instructions saved to: MIGRATION_INSTRUCTIONS.txt`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ Auth export complete!');
    console.log('='.repeat(60));
    console.log('\n⚠️  IMPORTANT: Keep password_reset_list.json secure!');
    console.log('   It contains temporary passwords for all users.\n');

    return summary;

  } catch (error) {
    console.error('\n❌ Fatal error during auth export:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      SUPABASE AUTHENTICATION DATA EXPORT SCRIPT            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    initializeSupabase();
    ensureExportDirectory();
    await exportUsersWithStrategy();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  exportAuthUsers,
  exportUsersWithStrategy,
  transformAuthUser
};
