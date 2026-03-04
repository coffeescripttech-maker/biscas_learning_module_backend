require('dotenv').config({ path: '../.env' });
const db = require('../src/utils/db');

async function checkUserId() {
  try {
    const studentId = '4b1559f1-758d-4fc7-9cf6-dead1c43d7aa';
    
    console.log('🔍 Checking user ID:', studentId);
    console.log('');
    
    // Check if user exists
    const user = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [studentId]
    );
    
    if (user.length > 0) {
      console.log('✅ User found:');
      console.log('   ID:', user[0].id);
      console.log('   Email:', user[0].email);
      console.log('   Role:', user[0].role);
    } else {
      console.log('❌ User NOT found in users table');
    }
    console.log('');
    
    // Check completion
    const completion = await db.query(
      'SELECT * FROM module_completions WHERE student_id = ?',
      [studentId]
    );
    
    if (completion.length > 0) {
      console.log('✅ Completion found:');
      console.log('   Student ID:', completion[0].student_id);
      console.log('   Module ID:', completion[0].module_id);
    } else {
      console.log('❌ Completion NOT found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserId();
