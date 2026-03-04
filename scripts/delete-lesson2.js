const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const db = require('../src/utils/db');
const { initialize: initializeDatabase } = require('../src/config/database');

async function deleteLess on2() {
  try {
    await initializeDatabase();
    
    const result = await db.query(
      "DELETE FROM vark_modules WHERE id = ?",
      ['4cf58b23-32c1-4af5-a881-9dab5f57bcc3']
    );
    
    console.log('✅ Deleted Lesson 2:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteLess on2();
