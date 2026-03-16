const db = require('./src/utils/db');

async function inspectVarkModulesTable() {
  try {
    console.log('🔍 Inspecting vark_modules table...');
    
    // Get table structure
    console.log('\n📋 Table Structure:');
    const structure = await db.query('DESCRIBE vark_modules');
    console.table(structure);
    
    // Get sample data
    console.log('\n📊 Sample Data (first 2 rows):');
    const sampleData = await db.query('SELECT * FROM vark_modules LIMIT 2');
    
    if (sampleData.length > 0) {
      console.log('First row keys:', Object.keys(sampleData[0]));
      console.log('\nFirst row data:');
      for (const [key, value] of Object.entries(sampleData[0])) {
        console.log(`${key}:`, typeof value === 'string' && value.length > 100 ? 
          `${value.substring(0, 100)}...` : value);
      }
      
      // Check prerequisites specifically
      console.log('\n🎯 Prerequisites field analysis:');
      sampleData.forEach((row, index) => {
        console.log(`Row ${index + 1}:`);
        console.log(`  prerequisites type:`, typeof row.prerequisites);
        console.log(`  prerequisites value:`, row.prerequisites);
        console.log(`  prerequisite_module_id:`, row.prerequisite_module_id);
      });
    } else {
      console.log('No data found in vark_modules table');
    }
    
    // Get count
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM vark_modules');
    console.log(`\n📈 Total modules: ${countResult.total}`);
    
  } catch (error) {
    console.error('❌ Error inspecting table:', error);
  } finally {
    process.exit(0);
  }
}

inspectVarkModulesTable();