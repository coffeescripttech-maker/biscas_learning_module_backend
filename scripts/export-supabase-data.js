/**
 * Supabase Data Export Script
 * 
 * This script exports all data from Supabase PostgreSQL database to JSON files.
 * It handles pagination for large tables and exports in batches to avoid memory issues.
 * 
 * Requirements: 2.1, 2.7
 * 
 * Usage:
 *   node scripts/export-supabase-data.js
 * 
 * Environment Variables Required:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from root .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPORT_DIR = path.join(__dirname, '../exports/data');
const PAGE_SIZE = 1000; // Number of records per batch
const DELAY_BETWEEN_BATCHES = 100; // ms delay to avoid rate limiting

// Tables to export (in order to respect foreign key dependencies)
const TABLES_TO_EXPORT = [
  // Core tables first
  'profiles',
  
  // Class management
  'classes',
  'class_students',
  
  // Lessons
  'lessons',
  'lesson_progress',
  
  // Quizzes
  'quizzes',
  'quiz_questions',
  'quiz_assignees',
  'quiz_class_assignees',
  'quiz_results',
  
  // Activities
  'activities',
  'activity_assignees',
  'activity_class_assignees',
  'submissions',
  
  // Announcements
  'announcements',
  
  // VARK modules
  'vark_module_categories',
  'vark_modules',
  'vark_module_sections',
  'vark_module_progress',
  'vark_module_assignments',
  'vark_learning_paths',
  'vark_module_feedback',
  
  // Completions and badges
  'module_completions',
  'student_badges',
  
  // Notifications
  'teacher_notifications',
  
  // Submissions
  'student_module_submissions',
  
  // File storage
  'file_storage',
  'files'
];

// Initialize Supabase client
let supabase;

/**
 * Initialize the Supabase client
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

  console.log('✅ Supabase client initialized');
  console.log(`   URL: ${SUPABASE_URL}`);
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
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Export a single table with pagination
 * @param {string} tableName - Name of the table to export
 * @returns {Promise<Object>} Export statistics
 */
async function exportTable(tableName) {
  console.log(`\n📦 Exporting table: ${tableName}`);
  
  let allData = [];
  let page = 0;
  let hasMore = true;
  let totalRecords = 0;

  try {
    while (hasMore) {
      const startRange = page * PAGE_SIZE;
      const endRange = startRange + PAGE_SIZE - 1;

      console.log(`   Fetching records ${startRange} to ${endRange}...`);

      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(startRange, endRange);

      if (error) {
        // If table doesn't exist, skip it
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`   ⚠️  Table ${tableName} does not exist in Supabase, skipping...`);
          return { tableName, records: 0, skipped: true };
        }
        throw error;
      }

      // Store total count on first iteration
      if (page === 0 && count !== null) {
        totalRecords = count;
        console.log(`   Total records in table: ${totalRecords}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allData = allData.concat(data);
      console.log(`   ✓ Fetched ${data.length} records (total so far: ${allData.length})`);

      // Check if we have more data
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      }

      page++;

      // Add delay between batches to avoid rate limiting
      if (hasMore) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // Write data to JSON file
    const filename = path.join(EXPORT_DIR, `${tableName}.json`);
    fs.writeFileSync(filename, JSON.stringify(allData, null, 2));

    console.log(`   ✅ Exported ${allData.length} records to ${tableName}.json`);

    return {
      tableName,
      records: allData.length,
      filename,
      skipped: false
    };

  } catch (error) {
    console.error(`   ❌ Error exporting ${tableName}:`, error.message);
    return {
      tableName,
      records: 0,
      error: error.message,
      skipped: false
    };
  }
}

/**
 * Export all tables
 */
async function exportAllTables() {
  console.log('\n🚀 Starting Supabase data export...');
  console.log(`   Export directory: ${EXPORT_DIR}`);
  console.log(`   Page size: ${PAGE_SIZE} records`);
  console.log(`   Tables to export: ${TABLES_TO_EXPORT.length}`);

  const startTime = Date.now();
  const results = [];

  for (const tableName of TABLES_TO_EXPORT) {
    const result = await exportTable(tableName);
    results.push(result);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 EXPORT SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => !r.error && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => r.error);
  const totalRecords = successful.reduce((sum, r) => sum + r.records, 0);

  console.log(`\n✅ Successfully exported: ${successful.length} tables`);
  console.log(`⚠️  Skipped (not found): ${skipped.length} tables`);
  console.log(`❌ Failed: ${failed.length} tables`);
  console.log(`📝 Total records exported: ${totalRecords.toLocaleString()}`);
  console.log(`⏱️  Duration: ${duration} seconds`);

  // Show details for each table
  console.log('\n📋 Details by table:');
  results.forEach(result => {
    if (result.skipped) {
      console.log(`   ⚠️  ${result.tableName.padEnd(35)} - SKIPPED (not found)`);
    } else if (result.error) {
      console.log(`   ❌ ${result.tableName.padEnd(35)} - ERROR: ${result.error}`);
    } else {
      console.log(`   ✓  ${result.tableName.padEnd(35)} - ${result.records.toLocaleString().padStart(8)} records`);
    }
  });

  // Save summary to file
  const summaryFilename = path.join(EXPORT_DIR, '_export_summary.json');
  const summary = {
    exportDate: new Date().toISOString(),
    duration: `${duration} seconds`,
    totalTables: TABLES_TO_EXPORT.length,
    successfulTables: successful.length,
    skippedTables: skipped.length,
    failedTables: failed.length,
    totalRecords,
    results
  };

  fs.writeFileSync(summaryFilename, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Summary saved to: _export_summary.json`);

  console.log('\n' + '='.repeat(60));
  console.log('✨ Export complete!');
  console.log('='.repeat(60) + '\n');

  return summary;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         SUPABASE DATA EXPORT SCRIPT                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    initializeSupabase();
    ensureExportDirectory();
    await exportAllTables();

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
  exportTable,
  exportAllTables
};
