/**
 * Check MySQL vark_modules table structure
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const db = require('../src/utils/db');
const { initialize: initializeDatabase } = require('../src/config/database');

async function checkTable() {
  try {
    await initializeDatabase();
    console.log('✅ Database connected\n');
    
    // Show table structure
    console.log('📋 Table structure:');
    const columns = await db.query('DESCRIBE vark_modules');
    console.log(columns);
    
    console.log('\n📋 Checking for triggers:');
    const triggers = await db.query('SHOW TRIGGERS LIKE "vark_modules"');
    console.log(triggers);
    
    console.log('\n📋 Checking for generated columns:');
    const createTable = await db.query('SHOW CREATE TABLE vark_modules');
    console.log(createTable[0]['Create Table']);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTable();
