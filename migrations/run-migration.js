/**
 * MySQL Migration Runner
 * 
 * This script runs the MySQL schema migration
 * Usage:
 *   node migrations/run-migration.js          # Run migration
 *   node migrations/run-migration.js rollback # Rollback migration
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'biscas_learning',
  multipleStatements: true
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration() {
  let connection;
  
  try {
    log('\n🚀 Starting MySQL Schema Migration...', 'cyan');
    log('━'.repeat(60), 'cyan');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '001_create_mysql_schema.sql');
    log(`\n📄 Reading migration file: ${migrationPath}`, 'blue');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Connect to MySQL
    log(`\n🔌 Connecting to MySQL...`, 'blue');
    log(`   Host: ${dbConfig.host}:${dbConfig.port}`, 'blue');
    log(`   Database: ${dbConfig.database}`, 'blue');
    
    connection = await mysql.createConnection(dbConfig);
    log('✅ Connected to MySQL successfully!', 'green');
    
    // Execute the migration
    log('\n⚙️  Executing migration...', 'blue');
    await connection.query(migrationSQL);
    log('✅ Migration executed successfully!', 'green');
    
    // Verify tables were created
    log('\n🔍 Verifying tables...', 'blue');
    const [tables] = await connection.query('SHOW TABLES');
    log(`✅ Created ${tables.length} tables:`, 'green');
    
    // Group tables by category
    const tableCategories = {
      'Authentication': ['users', 'refresh_tokens', 'password_reset_tokens'],
      'User Data': ['profiles'],
      'Classes': ['classes', 'class_students'],
      'Lessons': ['lessons', 'lesson_progress'],
      'Quizzes': ['quizzes', 'quiz_questions', 'quiz_assignees', 'quiz_class_assignees', 'quiz_results'],
      'Activities': ['activities', 'activity_assignees', 'activity_class_assignees', 'submissions'],
      'Announcements': ['announcements'],
      'VARK Modules': [
        'vark_module_categories', 'vark_modules', 'vark_module_sections',
        'vark_module_progress', 'vark_module_assignments', 'vark_learning_paths',
        'vark_module_feedback', 'module_completions', 'student_badges',
        'teacher_notifications', 'student_module_submissions'
      ],
      'File Storage': ['file_storage']
    };
    
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    for (const [category, categoryTables] of Object.entries(tableCategories)) {
      const foundTables = categoryTables.filter(t => tableNames.includes(t));
      if (foundTables.length > 0) {
        log(`\n   ${category}:`, 'cyan');
        foundTables.forEach(table => log(`      ✓ ${table}`, 'green'));
      }
    }
    
    // Show summary
    log('\n' + '━'.repeat(60), 'green');
    log('✅ MIGRATION COMPLETED SUCCESSFULLY!', 'green');
    log('━'.repeat(60), 'green');
    log('\n📊 Summary:', 'bright');
    log(`   • Total tables created: ${tables.length}`, 'green');
    log(`   • Database: ${dbConfig.database}`, 'green');
    log(`   • Host: ${dbConfig.host}:${dbConfig.port}`, 'green');
    
    log('\n🎯 Next Steps:', 'yellow');
    log('   1. Review the created tables', 'yellow');
    log('   2. Test database connections from your application', 'yellow');
    log('   3. Run data import scripts (when ready)', 'yellow');
    log('   4. Update application configuration', 'yellow');
    
    log('\n💡 Rollback:', 'cyan');
    log('   To rollback this migration, run:', 'cyan');
    log('   node migrations/run-migration.js rollback\n', 'cyan');
    
  } catch (error) {
    log('\n❌ Migration failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.code) {
      log(`Error Code: ${error.code}`, 'red');
    }
    
    if (error.sqlMessage) {
      log(`SQL Error: ${error.sqlMessage}`, 'red');
    }
    
    log('\n💡 Troubleshooting:', 'yellow');
    log('   1. Check your database credentials in .env file', 'yellow');
    log('   2. Ensure MySQL server is running', 'yellow');
    log('   3. Verify database exists or create it first', 'yellow');
    log('   4. Check user permissions', 'yellow');
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log('🔌 Database connection closed.\n', 'blue');
    }
  }
}

async function runRollback() {
  let connection;
  
  try {
    log('\n⚠️  Starting MySQL Schema Rollback...', 'yellow');
    log('━'.repeat(60), 'yellow');
    log('⚠️  WARNING: This will DROP ALL TABLES!', 'red');
    log('⚠️  All data will be PERMANENTLY DELETED!', 'red');
    log('━'.repeat(60), 'yellow');
    
    // In production, you might want to add a confirmation prompt here
    
    // Read the rollback SQL file
    const rollbackPath = path.join(__dirname, '001_rollback_mysql_schema.sql');
    log(`\n📄 Reading rollback file: ${rollbackPath}`, 'blue');
    const rollbackSQL = await fs.readFile(rollbackPath, 'utf8');
    
    // Connect to MySQL
    log(`\n🔌 Connecting to MySQL...`, 'blue');
    connection = await mysql.createConnection(dbConfig);
    log('✅ Connected to MySQL successfully!', 'green');
    
    // Execute the rollback
    log('\n⚙️  Executing rollback...', 'blue');
    await connection.query(rollbackSQL);
    log('✅ Rollback executed successfully!', 'green');
    
    // Verify tables were dropped
    log('\n🔍 Verifying rollback...', 'blue');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      log('✅ All migration tables have been dropped!', 'green');
    } else {
      log(`⚠️  Warning: ${tables.length} tables still exist`, 'yellow');
      tables.forEach(t => log(`   • ${Object.values(t)[0]}`, 'yellow'));
    }
    
    log('\n' + '━'.repeat(60), 'green');
    log('✅ ROLLBACK COMPLETED SUCCESSFULLY!', 'green');
    log('━'.repeat(60), 'green');
    log('\n📊 Database has been restored to pre-migration state.\n', 'green');
    
  } catch (error) {
    log('\n❌ Rollback failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.sqlMessage) {
      log(`SQL Error: ${error.sqlMessage}`, 'red');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log('🔌 Database connection closed.\n', 'blue');
    }
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    await runRollback();
  } else if (!command || command === 'migrate') {
    await runMigration();
  } else {
    log('\n❌ Invalid command!', 'red');
    log('\nUsage:', 'yellow');
    log('  node migrations/run-migration.js          # Run migration', 'cyan');
    log('  node migrations/run-migration.js rollback # Rollback migration\n', 'cyan');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
