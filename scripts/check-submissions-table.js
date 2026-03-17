const db = require('../src/utils/db');

async function checkSubmissionsTable() {
  try {
    console.log('🔍 Checking student_module_submissions table...');
    
    // Check if table exists
    const tables = await db.query("SHOW TABLES LIKE 'student_module_submissions'");
    
    if (tables.length === 0) {
      console.log('❌ Table student_module_submissions does not exist!');
      console.log('📋 Available tables:');
      const allTables = await db.query('SHOW TABLES');
      allTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   - ${tableName}`);
      });
      return;
    }
    
    console.log('✅ Table student_module_submissions exists');
    
    // Check table structure
    const structure = await db.query('DESCRIBE student_module_submissions');
    console.log('\n📋 Table structure:');
    structure.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    // Check if there are any records
    const count = await db.query('SELECT COUNT(*) as count FROM student_module_submissions');
    console.log(`\n📊 Records in table: ${count[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    
    if (error.message.includes("doesn't exist")) {
      console.log('\n🔧 The table needs to be created. Here\'s the SQL:');
      console.log(`
CREATE TABLE student_module_submissions (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  module_id VARCHAR(36) NOT NULL,
  section_id VARCHAR(255) NOT NULL,
  section_title VARCHAR(500),
  section_type VARCHAR(100),
  submission_data JSON,
  assessment_results JSON,
  time_spent_seconds INT DEFAULT 0,
  submission_status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student_module (student_id, module_id),
  INDEX idx_module (module_id),
  UNIQUE KEY unique_submission (student_id, module_id, section_id)
);
      `);
    }
  }
}

checkSubmissionsTable().then(() => {
  process.exit(0);
}).catch(console.error);