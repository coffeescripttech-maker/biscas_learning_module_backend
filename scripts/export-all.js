/**
 * Master Export Script
 * 
 * This script runs all export scripts in sequence:
 * 1. Export Supabase data (tables)
 * 2. Export authentication data
 * 3. Export storage files
 * 
 * Usage:
 *   node scripts/export-all.js
 * 
 * Options:
 *   --data-only    : Export only database tables
 *   --auth-only    : Export only authentication data
 *   --storage-only : Export only storage files
 */

const path = require('path');
const fs = require('fs');

// Import export modules
const { exportAllTables } = require('./export-supabase-data');
const { exportUsersWithStrategy } = require('./export-supabase-auth');
const { exportAllBuckets } = require('./export-supabase-storage');

// Parse command line arguments
const args = process.argv.slice(2);
const dataOnly = args.includes('--data-only');
const authOnly = args.includes('--auth-only');
const storageOnly = args.includes('--storage-only');

// If no specific flag, export all
const exportAll = !dataOnly && !authOnly && !storageOnly;

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           SUPABASE COMPLETE EXPORT SCRIPT                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const results = {
    data: null,
    auth: null,
    storage: null,
    errors: []
  };

  try {
    // Export database tables
    if (exportAll || dataOnly) {
      console.log('\n' + '='.repeat(60));
      console.log('STEP 1: EXPORTING DATABASE TABLES');
      console.log('='.repeat(60));
      
      try {
        results.data = await exportAllTables();
        console.log('✅ Database export completed successfully');
      } catch (error) {
        console.error('❌ Database export failed:', error.message);
        results.errors.push({ step: 'data', error: error.message });
      }
    }

    // Export authentication data
    if (exportAll || authOnly) {
      console.log('\n' + '='.repeat(60));
      console.log('STEP 2: EXPORTING AUTHENTICATION DATA');
      console.log('='.repeat(60));
      
      try {
        results.auth = await exportUsersWithStrategy();
        console.log('✅ Authentication export completed successfully');
      } catch (error) {
        console.error('❌ Authentication export failed:', error.message);
        results.errors.push({ step: 'auth', error: error.message });
      }
    }

    // Export storage files
    if (exportAll || storageOnly) {
      console.log('\n' + '='.repeat(60));
      console.log('STEP 3: EXPORTING STORAGE FILES');
      console.log('='.repeat(60));
      
      try {
        results.storage = await exportAllBuckets();
        console.log('✅ Storage export completed successfully');
      } catch (error) {
        console.error('❌ Storage export failed:', error.message);
        results.errors.push({ step: 'storage', error: error.message });
      }
    }

    const endTime = Date.now();
    const totalDuration = ((endTime - startTime) / 1000).toFixed(2);

    // Generate final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPLETE EXPORT SUMMARY');
    console.log('='.repeat(60));

    if (results.data) {
      console.log(`\n✅ DATABASE TABLES:`);
      console.log(`   Tables exported: ${results.data.successfulTables}`);
      console.log(`   Total records: ${results.data.totalRecords.toLocaleString()}`);
    }

    if (results.auth) {
      console.log(`\n✅ AUTHENTICATION:`);
      console.log(`   Users exported: ${results.auth.statistics.totalUsers}`);
      console.log(`   Email verified: ${results.auth.statistics.emailVerified}`);
    }

    if (results.storage) {
      console.log(`\n✅ STORAGE FILES:`);
      console.log(`   Buckets exported: ${results.storage.successfulBuckets}`);
      console.log(`   Files downloaded: ${results.storage.totalFiles}`);
      console.log(`   Total size: ${results.storage.totalSize}`);
    }

    if (results.errors.length > 0) {
      console.log(`\n⚠️  ERRORS ENCOUNTERED: ${results.errors.length}`);
      results.errors.forEach(err => {
        console.log(`   - ${err.step}: ${err.error}`);
      });
    }

    console.log(`\n⏱️  Total duration: ${totalDuration} seconds`);

    // Save master summary
    const masterSummary = {
      exportDate: new Date().toISOString(),
      totalDuration: `${totalDuration} seconds`,
      results,
      exportDirectories: {
        data: 'server/exports/data/',
        auth: 'server/exports/auth/',
        storage: 'server/exports/storage/'
      },
      nextSteps: [
        '1. Review all export summaries in each directory',
        '2. Verify data integrity',
        '3. Run import scripts to migrate to MySQL',
        '4. Test the migrated data',
        '5. Update application to use new backend'
      ]
    };

    const summaryPath = path.join(__dirname, '../exports/_master_export_summary.json');
    
    // Ensure exports directory exists
    const exportsDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    fs.writeFileSync(summaryPath, JSON.stringify(masterSummary, null, 2));
    console.log(`\n💾 Master summary saved to: exports/_master_export_summary.json`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ COMPLETE EXPORT FINISHED!');
    console.log('='.repeat(60));
    console.log('\n📁 Export locations:');
    console.log('   - Database: server/exports/data/');
    console.log('   - Auth: server/exports/auth/');
    console.log('   - Storage: server/exports/storage/');
    console.log('\n📄 Next: Review the export summaries and run import scripts\n');

    // Exit with error code if there were errors
    if (results.errors.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Fatal error during export:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
