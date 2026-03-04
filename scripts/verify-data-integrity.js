/**
 * Data Integrity Verification Script
 * 
 * This script verifies data integrity after migration from Supabase to MySQL.
 * It compares row counts, checks foreign key relationships, and validates data.
 * 
 * Requirements: 2.4
 * 
 * Usage:
 *   node scripts/verify-data-integrity.js
 * 
 * Environment Variables Required:
 *   DB_HOST - MySQL host
 *   DB_PORT - MySQL port
 *   DB_USER - MySQL user
 *   DB_PASSWORD - MySQL password
 *   DB_NAME - MySQL database name
 * 
 * Features:
 *   - Compares row counts between export and MySQL
 *   - Verifies foreign key relationships
 *   - Checks for data corruption
 *   - Validates data types and formats
 *   - Generates detailed verification report
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

// Import database utilities
const db = require('../src/utils/db');
const { initialize: initializeDatabase } = require('../src/config/database');
const logger = require('../src/utils/logger');

// Configuration
const EXPORT_DIR = path.join(__dirname, '../exports/data');

// Tables to verify (same order as import)
const TABLES_TO_VERIFY = [
  'profiles',
  'classes',
  'class_students',
  'lessons',
  'lesson_progress',
  'quizzes',
  'quiz_questions',
  'quiz_assignees',
  'quiz_class_assignees',
  'quiz_results',
  'activities',
  'activity_assignees',
  'activity_class_assignees',
  'submissions',
  'announcements',
  'vark_module_categories',
  'vark_modules',
  'vark_module_sections',
  'vark_module_progress',
  'vark_module_assignments',
  'vark_learning_paths',
  'vark_module_feedback',
  'module_completions',
  'student_badges',
  'teacher_notifications',
  'student_module_submissions',
  'file_storage',
  'files'
];

// Foreign key relationships to verify
const FOREIGN_KEY_CHECKS = [
  {
    name: 'profiles.user_id → users.id',
    table: 'profiles',
    column: 'user_id',
    referencedTable: 'users',
    referencedColumn: 'id'
  },
  {
    name: 'classes.teacher_id → users.id',
    table: 'classes',
    column: 'teacher_id',
    referencedTable: 'users',
    referencedColumn: 'id'
  },
  {
    name: 'class_students.class_id → classes.id',
    table: 'class_students',
    column: 'class_id',
    referencedTable: 'classes',
    referencedColumn: 'id'
  },
  {
    name: 'class_students.student_id → profiles.id',
    table: 'class_students',
    column: 'student_id',
    referencedTable: 'profiles',
    referencedColumn: 'id'
  },
  {
    name: 'vark_modules.created_by → users.id',
    table: 'vark_modules',
    column: 'created_by',
    referencedTable: 'users',
    referencedColumn: 'id'
  },
  {
    name: 'vark_module_sections.module_id → vark_modules.id',
    table: 'vark_module_sections',
    column: 'module_id',
    referencedTable: 'vark_modules',
    referencedColumn: 'id'
  },
  {
    name: 'vark_module_progress.student_id → profiles.id',
    table: 'vark_module_progress',
    column: 'student_id',
    referencedTable: 'profiles',
    referencedColumn: 'id'
  },
  {
    name: 'vark_module_progress.module_id → vark_modules.id',
    table: 'vark_module_progress',
    column: 'module_id',
    referencedTable: 'vark_modules',
    referencedColumn: 'id'
  }
];

/**
 * Load export summary
 * @returns {Object} - Export summary data
 */
function loadExportSummary() {
  const filename = path.join(EXPORT_DIR, '_export_summary.json');
  
  if (!fs.existsSync(filename)) {
    console.log('⚠️  Export summary not found, will skip row count comparison');
    return null;
  }
  
  try {
    const content = fs.readFileSync(filename, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.log('⚠️  Failed to load export summary:', error.message);
    return null;
  }
}

/**
 * Get row count from MySQL table
 * @param {string} tableName - Table name
 * @returns {Promise<number>} - Row count
 */
async function getTableRowCount(tableName) {
  try {
    const result = await db.queryOne(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return result ? result.count : 0;
  } catch (error) {
    logger.error('Failed to get row count', {
      table: tableName,
      error: error.message
    });
    return -1; // Indicate error
  }
}

/**
 * Verify row counts match between export and MySQL
 * @param {Object} exportSummary - Export summary data
 * @returns {Promise<Object>} - Verification results
 */
async function verifyRowCounts(exportSummary) {
  console.log('\n📊 Verifying row counts...');
  
  const results = {
    total: 0,
    matched: 0,
    mismatched: 0,
    errors: 0,
    tables: []
  };
  
  for (const tableName of TABLES_TO_VERIFY) {
    const progress = `[${results.total + 1}/${TABLES_TO_VERIFY.length}]`;
    console.log(`   ${progress} Checking ${tableName}...`);
    
    // Get MySQL count
    const mysqlCount = await getTableRowCount(tableName);
    
    if (mysqlCount === -1) {
      console.log(`   ${progress} ❌ Error getting count`);
      results.errors++;
      results.tables.push({
        tableName,
        status: 'error',
        error: 'Failed to query table'
      });
      results.total++;
      continue;
    }
    
    // Get export count if available
    let exportCount = null;
    if (exportSummary && exportSummary.results) {
      const exportResult = exportSummary.results.find(r => r.tableName === tableName);
      if (exportResult && !exportResult.skipped) {
        exportCount = exportResult.records;
      }
    }
    
    // Compare counts
    if (exportCount === null) {
      console.log(`   ${progress} ⚠️  No export data (MySQL: ${mysqlCount} rows)`);
      results.tables.push({
        tableName,
        status: 'no_export_data',
        mysqlCount,
        exportCount: null
      });
    } else if (mysqlCount === exportCount) {
      console.log(`   ${progress} ✓ Matched (${mysqlCount} rows)`);
      results.matched++;
      results.tables.push({
        tableName,
        status: 'matched',
        mysqlCount,
        exportCount
      });
    } else {
      console.log(`   ${progress} ❌ Mismatch (MySQL: ${mysqlCount}, Export: ${exportCount})`);
      results.mismatched++;
      results.tables.push({
        tableName,
        status: 'mismatched',
        mysqlCount,
        exportCount,
        difference: mysqlCount - exportCount
      });
    }
    
    results.total++;
  }
  
  return results;
}

/**
 * Verify a single foreign key relationship
 * @param {Object} fkCheck - Foreign key check definition
 * @returns {Promise<Object>} - Verification result
 */
async function verifyForeignKey(fkCheck) {
  try {
    // Check for orphaned records (records with FK that don't exist in referenced table)
    const query = `
      SELECT COUNT(*) as orphaned_count
      FROM ${fkCheck.table} t
      LEFT JOIN ${fkCheck.referencedTable} r ON t.${fkCheck.column} = r.${fkCheck.referencedColumn}
      WHERE t.${fkCheck.column} IS NOT NULL
        AND r.${fkCheck.referencedColumn} IS NULL
    `;
    
    const result = await db.queryOne(query);
    const orphanedCount = result ? result.orphaned_count : 0;
    
    if (orphanedCount === 0) {
      return {
        name: fkCheck.name,
        status: 'valid',
        orphanedCount: 0
      };
    } else {
      return {
        name: fkCheck.name,
        status: 'invalid',
        orphanedCount,
        error: `Found ${orphanedCount} orphaned records`
      };
    }
  } catch (error) {
    logger.error('Failed to verify foreign key', {
      fkCheck: fkCheck.name,
      error: error.message
    });
    
    return {
      name: fkCheck.name,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Verify all foreign key relationships
 * @returns {Promise<Object>} - Verification results
 */
async function verifyForeignKeys() {
  console.log('\n🔗 Verifying foreign key relationships...');
  
  const results = {
    total: FOREIGN_KEY_CHECKS.length,
    valid: 0,
    invalid: 0,
    errors: 0,
    checks: []
  };
  
  for (let i = 0; i < FOREIGN_KEY_CHECKS.length; i++) {
    const fkCheck = FOREIGN_KEY_CHECKS[i];
    const progress = `[${i + 1}/${FOREIGN_KEY_CHECKS.length}]`;
    
    console.log(`   ${progress} Checking ${fkCheck.name}...`);
    
    const result = await verifyForeignKey(fkCheck);
    
    if (result.status === 'valid') {
      console.log(`   ${progress} ✓ Valid`);
      results.valid++;
    } else if (result.status === 'invalid') {
      console.log(`   ${progress} ❌ Invalid: ${result.error}`);
      results.invalid++;
    } else {
      console.log(`   ${progress} ❌ Error: ${result.error}`);
      results.errors++;
    }
    
    results.checks.push(result);
  }
  
  return results;
}

/**
 * Check for NULL values in required columns
 * @returns {Promise<Object>} - Validation results
 */
async function validateRequiredFields() {
  console.log('\n✅ Validating required fields...');
  
  const checks = [
    { table: 'users', column: 'email', description: 'User email' },
    { table: 'users', column: 'password_hash', description: 'User password hash' },
    { table: 'users', column: 'role', description: 'User role' },
    { table: 'profiles', column: 'user_id', description: 'Profile user_id' },
    { table: 'vark_modules', column: 'title', description: 'Module title' },
    { table: 'vark_modules', column: 'created_by', description: 'Module creator' }
  ];
  
  const results = {
    total: checks.length,
    passed: 0,
    failed: 0,
    checks: []
  };
  
  for (let i = 0; i < checks.length; i++) {
    const check = checks[i];
    const progress = `[${i + 1}/${checks.length}]`;
    
    console.log(`   ${progress} Checking ${check.description}...`);
    
    try {
      const result = await db.queryOne(
        `SELECT COUNT(*) as null_count FROM ${check.table} WHERE ${check.column} IS NULL`
      );
      
      const nullCount = result ? result.null_count : 0;
      
      if (nullCount === 0) {
        console.log(`   ${progress} ✓ No NULL values`);
        results.passed++;
        results.checks.push({
          table: check.table,
          column: check.column,
          description: check.description,
          status: 'passed',
          nullCount: 0
        });
      } else {
        console.log(`   ${progress} ❌ Found ${nullCount} NULL values`);
        results.failed++;
        results.checks.push({
          table: check.table,
          column: check.column,
          description: check.description,
          status: 'failed',
          nullCount
        });
      }
    } catch (error) {
      console.log(`   ${progress} ❌ Error: ${error.message}`);
      results.failed++;
      results.checks.push({
        table: check.table,
        column: check.column,
        description: check.description,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Check for data corruption (invalid JSON, malformed UUIDs, etc.)
 * @returns {Promise<Object>} - Validation results
 */
async function checkDataCorruption() {
  console.log('\n🔍 Checking for data corruption...');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    checks: []
  };
  
  // Check for invalid UUIDs in users table
  try {
    console.log('   Checking user IDs...');
    const invalidUuids = await db.query(
      `SELECT id FROM users WHERE LENGTH(id) != 36 OR id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`
    );
    
    results.total++;
    if (invalidUuids.length === 0) {
      console.log('   ✓ All user IDs are valid UUIDs');
      results.passed++;
      results.checks.push({
        check: 'User ID format',
        status: 'passed'
      });
    } else {
      console.log(`   ❌ Found ${invalidUuids.length} invalid user IDs`);
      results.failed++;
      results.checks.push({
        check: 'User ID format',
        status: 'failed',
        invalidCount: invalidUuids.length
      });
    }
  } catch (error) {
    console.log(`   ❌ Error checking user IDs: ${error.message}`);
    results.total++;
    results.failed++;
    results.checks.push({
      check: 'User ID format',
      status: 'error',
      error: error.message
    });
  }
  
  // Check for invalid email formats
  try {
    console.log('   Checking email formats...');
    const invalidEmails = await db.query(
      `SELECT email FROM users WHERE email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`
    );
    
    results.total++;
    if (invalidEmails.length === 0) {
      console.log('   ✓ All emails are valid');
      results.passed++;
      results.checks.push({
        check: 'Email format',
        status: 'passed'
      });
    } else {
      console.log(`   ❌ Found ${invalidEmails.length} invalid emails`);
      results.failed++;
      results.checks.push({
        check: 'Email format',
        status: 'failed',
        invalidCount: invalidEmails.length,
        examples: invalidEmails.slice(0, 5).map(r => r.email)
      });
    }
  } catch (error) {
    console.log(`   ❌ Error checking emails: ${error.message}`);
    results.total++;
    results.failed++;
    results.checks.push({
      check: 'Email format',
      status: 'error',
      error: error.message
    });
  }
  
  return results;
}

/**
 * Save verification report
 * @param {Object} report - Complete verification report
 */
function saveReport(report) {
  const reportFilename = path.join(EXPORT_DIR, '_verification_report.json');
  fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
  console.log(`\n💾 Verification report saved to: _verification_report.json`);
  
  // Generate human-readable summary
  const summaryLines = [
    '=' .repeat(60),
    'DATA INTEGRITY VERIFICATION REPORT',
    '='.repeat(60),
    '',
    `Verification Date: ${report.verificationDate}`,
    `Duration: ${report.duration}`,
    '',
    '1. ROW COUNT VERIFICATION',
    '-'.repeat(60),
    `Total tables checked: ${report.rowCounts.total}`,
    `Matched: ${report.rowCounts.matched}`,
    `Mismatched: ${report.rowCounts.mismatched}`,
    `Errors: ${report.rowCounts.errors}`,
    '',
    '2. FOREIGN KEY VERIFICATION',
    '-'.repeat(60),
    `Total checks: ${report.foreignKeys.total}`,
    `Valid: ${report.foreignKeys.valid}`,
    `Invalid: ${report.foreignKeys.invalid}`,
    `Errors: ${report.foreignKeys.errors}`,
    '',
    '3. REQUIRED FIELDS VALIDATION',
    '-'.repeat(60),
    `Total checks: ${report.requiredFields.total}`,
    `Passed: ${report.requiredFields.passed}`,
    `Failed: ${report.requiredFields.failed}`,
    '',
    '4. DATA CORRUPTION CHECKS',
    '-'.repeat(60),
    `Total checks: ${report.dataCorruption.total}`,
    `Passed: ${report.dataCorruption.passed}`,
    `Failed: ${report.dataCorruption.failed}`,
    '',
    '='.repeat(60),
    `OVERALL STATUS: ${report.overallStatus}`,
    '='.repeat(60)
  ];
  
  const summaryFilename = path.join(EXPORT_DIR, '_verification_summary.txt');
  fs.writeFileSync(summaryFilename, summaryLines.join('\n'));
  console.log(`📄 Summary saved to: _verification_summary.txt`);
}

/**
 * Display summary
 * @param {Object} report - Complete verification report
 */
function displaySummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n1️⃣  Row Count Verification:`);
  console.log(`   ✅ Matched: ${report.rowCounts.matched}/${report.rowCounts.total}`);
  console.log(`   ❌ Mismatched: ${report.rowCounts.mismatched}`);
  console.log(`   ⚠️  Errors: ${report.rowCounts.errors}`);
  
  console.log(`\n2️⃣  Foreign Key Verification:`);
  console.log(`   ✅ Valid: ${report.foreignKeys.valid}/${report.foreignKeys.total}`);
  console.log(`   ❌ Invalid: ${report.foreignKeys.invalid}`);
  console.log(`   ⚠️  Errors: ${report.foreignKeys.errors}`);
  
  console.log(`\n3️⃣  Required Fields Validation:`);
  console.log(`   ✅ Passed: ${report.requiredFields.passed}/${report.requiredFields.total}`);
  console.log(`   ❌ Failed: ${report.requiredFields.failed}`);
  
  console.log(`\n4️⃣  Data Corruption Checks:`);
  console.log(`   ✅ Passed: ${report.dataCorruption.passed}/${report.dataCorruption.total}`);
  console.log(`   ❌ Failed: ${report.dataCorruption.failed}`);
  
  console.log(`\n⏱️  Duration: ${report.duration}`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`OVERALL STATUS: ${report.overallStatus}`);
  console.log('='.repeat(60));
  
  if (report.overallStatus === 'PASSED') {
    console.log('\n✅ All verification checks passed!');
    console.log('   Data integrity is confirmed.');
  } else if (report.overallStatus === 'PASSED_WITH_WARNINGS') {
    console.log('\n⚠️  Verification passed with warnings');
    console.log('   Review the detailed report for issues.');
  } else {
    console.log('\n❌ Verification failed!');
    console.log('   Critical issues found. Review the detailed report.');
  }
  
  console.log('\n📝 NEXT STEPS:');
  console.log('   1. Review _verification_report.json for details');
  console.log('   2. Fix any mismatched row counts');
  console.log('   3. Resolve foreign key violations');
  console.log('   4. Correct data corruption issues');
  console.log('   5. Re-run verification after fixes\n');
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
 * Main execution
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      DATA INTEGRITY VERIFICATION SCRIPT                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Verify database connection
    if (!await verifyConnection()) {
      process.exit(1);
    }
    
    // Load export summary
    const exportSummary = loadExportSummary();
    
    console.log('\n🚀 Starting data integrity verification...');
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   Host: ${process.env.DB_HOST}`);
    
    const startTime = Date.now();
    
    // Run all verification checks
    const rowCounts = await verifyRowCounts(exportSummary);
    const foreignKeys = await verifyForeignKeys();
    const requiredFields = await validateRequiredFields();
    const dataCorruption = await checkDataCorruption();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Determine overall status
    let overallStatus = 'PASSED';
    
    if (rowCounts.mismatched > 0 || foreignKeys.invalid > 0 || 
        requiredFields.failed > 0 || dataCorruption.failed > 0) {
      overallStatus = 'FAILED';
    } else if (rowCounts.errors > 0 || foreignKeys.errors > 0) {
      overallStatus = 'PASSED_WITH_WARNINGS';
    }
    
    // Generate report
    const report = {
      verificationDate: new Date().toISOString(),
      duration: `${duration} seconds`,
      database: {
        name: process.env.DB_NAME,
        host: process.env.DB_HOST
      },
      rowCounts,
      foreignKeys,
      requiredFields,
      dataCorruption,
      overallStatus
    };
    
    // Save report
    saveReport(report);
    
    // Display summary
    displaySummary(report);
    
    // Exit with appropriate code
    process.exit(overallStatus === 'FAILED' ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    logger.error('Fatal error during verification', {
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
  verifyRowCounts,
  verifyForeignKeys,
  validateRequiredFields,
  checkDataCorruption
};
