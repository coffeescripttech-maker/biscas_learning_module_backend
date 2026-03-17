const fs = require('fs');
const path = require('path');
const db = require('../src/utils/db');

async function exportVARKModules() {
  try {
    console.log('🚀 Starting MySQL VARK Modules Export...');
    
    // Create exports directory
    const exportDir = path.join(__dirname, '../exports/mysql');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Export VARK modules
    console.log('📦 Exporting VARK modules...');
    const modules = await db.query('SELECT * FROM vark_modules ORDER BY created_at DESC');
    
    console.log(`   Found ${modules.length} VARK modules`);
    
    // Save to JSON file
    const modulesFile = path.join(exportDir, 'vark_modules.json');
    fs.writeFileSync(modulesFile, JSON.stringify(modules, null, 2));
    
    console.log(`✅ VARK modules exported to: ${modulesFile}`);
    
    // Export VARK module categories
    console.log('📦 Exporting VARK module categories...');
    try {
      const categories = await db.query('SELECT * FROM vark_module_categories ORDER BY name');
      const categoriesFile = path.join(exportDir, 'vark_module_categories.json');
      fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2));
      console.log(`✅ Categories exported to: ${categoriesFile}`);
    } catch (error) {
      console.log('⚠️  Categories table not found or empty');
    }
    
    // Create summary
    const summary = {
      export_date: new Date().toISOString(),
      total_modules: modules.length,
      modules_by_status: {
        published: modules.filter(m => m.is_published).length,
        draft: modules.filter(m => !m.is_published).length
      },
      modules_with_content: modules.filter(m => m.json_content_url).length,
      export_location: exportDir
    };
    
    const summaryFile = path.join(exportDir, 'export_summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('\n📊 Export Summary:');
    console.log(`   Total modules: ${summary.total_modules}`);
    console.log(`   Published: ${summary.modules_by_status.published}`);
    console.log(`   Draft: ${summary.modules_by_status.draft}`);
    console.log(`   With content: ${summary.modules_with_content}`);
    console.log(`   Export location: ${exportDir}`);
    
    console.log('\n✅ Export completed successfully!');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  exportVARKModules().then(() => {
    process.exit(0);
  });
}

module.exports = { exportVARKModules };