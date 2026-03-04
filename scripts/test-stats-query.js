require('dotenv').config();
const db = require('../src/utils/db');

async function testStatsQuery() {
  try {
    const moduleId = '20a92752-921f-478e-87cd-42bae4d6dc99';
    
    console.log('Testing stats query for module:', moduleId);
    
    const rows = await db.query(
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

    console.log('\nQuery result:', JSON.stringify(rows[0], null, 2));
    
    // Also check the completion directly
    const completions = await db.query(
      'SELECT * FROM module_completions WHERE module_id = ?',
      [moduleId]
    );
    
    console.log('\nCompletions in table:', completions.length);
    if (completions.length > 0) {
      console.log('First completion:', JSON.stringify(completions[0], null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testStatsQuery();
