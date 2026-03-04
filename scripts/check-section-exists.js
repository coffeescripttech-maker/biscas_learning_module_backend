require('dotenv').config({ path: '../.env' });
const db = require('../src/utils/db');

async function checkSection() {
  try {
    const moduleId = '20a92752-921f-478e-87cd-42bae4d6dc99';
    const sectionId = '93abbdd7-6a54-43a4-b65d-5d814cdfc709';
    
    console.log('🔍 Checking if section exists...');
    console.log('Module ID:', moduleId);
    console.log('Section ID:', sectionId);
    
    // Check if section exists
    const section = await db.query(
      'SELECT * FROM vark_module_sections WHERE id = ?',
      [sectionId]
    );
    
    if (section.length > 0) {
      console.log('✅ Section exists:', section[0]);
    } else {
      console.log('❌ Section does NOT exist');
    }
    
    // Get all sections for this module
    console.log('\n📋 All sections for this module:');
    const sections = await db.query(
      'SELECT * FROM vark_module_sections WHERE module_id = ? LIMIT 5',
      [moduleId]
    );
    
    console.log(`Found ${sections.length} sections:`);
    if (sections.length > 0) {
      console.log('Columns:', Object.keys(sections[0]));
      sections.forEach(s => {
        console.log(`  - ${s.id} | ${s.title || s.section_title || 'No title'}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSection();
