require('dotenv').config({ path: '../.env' });
const db = require('../src/utils/db');

async function testCompletionStats() {
  try {
    const moduleId = '20a92752-921f-478e-87cd-42bae4d6dc99'; // LESSON 1
    
    console.log('🔍 Testing completion stats for module:', moduleId);
    console.log('');
    
    // Check if completion exists
    console.log('1️⃣ Checking module_completions table:');
    const completions = await db.query(
      'SELECT * FROM module_completions WHERE module_id = ?',
      [moduleId]
    );
    console.log(`   Found ${completions.length} completion(s)`);
    if (completions.length > 0) {
      console.log('   First completion:', completions[0]);
    }
    console.log('');
    
    // Check total students
    console.log('2️⃣ Checking total students:');
    const students = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'student'"
    );
    console.log(`   Total students: ${students[0].total}`);
    console.log('');
    
    // Run the actual stats query
    console.log('3️⃣ Running stats query:');
    const stats = await db.query(
      `SELECT 
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT c.student_id) as submitted_count,
        COALESCE(AVG(c.final_score), 0) as average_score,
        COALESCE((COUNT(DISTINCT c.student_id) * 100.0 / NULLIF(COUNT(DISTINCT u.id), 0)), 0) as completion_rate
      FROM users u
      LEFT JOIN module_completions c ON u.id = c.student_id AND c.module_id = ?
      WHERE u.role = 'student'`,
      [moduleId]
    );
    console.log('   Stats result:', stats[0]);
    console.log('');
    
    console.log('✅ Test complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCompletionStats();
