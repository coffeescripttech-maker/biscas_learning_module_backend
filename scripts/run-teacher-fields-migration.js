const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read the migration SQL file
    const sqlFile = path.join(__dirname, 'add-teacher-profile-fields.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('🔄 Running migration...');
    console.log('SQL:', sql);

    // Execute the migration
    await connection.query(sql);

    console.log('✅ Migration completed successfully!');

    // Verify the columns were added
    console.log('\n📋 Verifying profiles table structure:');
    const [columns] = await connection.query('DESCRIBE profiles');
    
    console.table(columns.map(col => ({
      Field: col.Field,
      Type: col.Type,
      Null: col.Null,
      Key: col.Key,
      Default: col.Default
    })));

    // Check if the new columns exist
    const hasPhoneNumber = columns.some(col => col.Field === 'phone_number');
    const hasDepartment = columns.some(col => col.Field === 'department');
    const hasSpecialization = columns.some(col => col.Field === 'specialization');

    console.log('\n✅ Column verification:');
    console.log(`  phone_number: ${hasPhoneNumber ? '✓' : '✗'}`);
    console.log(`  department: ${hasDepartment ? '✓' : '✗'}`);
    console.log(`  specialization: ${hasSpecialization ? '✓' : '✗'}`);

    if (hasPhoneNumber && hasDepartment && hasSpecialization) {
      console.log('\n🎉 All columns added successfully!');
    } else {
      console.log('\n⚠️  Some columns are missing. Please check the migration.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

runMigration();
