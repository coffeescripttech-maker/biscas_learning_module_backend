/**
 * Debug Module Content Structure
 * 
 * This script checks the content_structure field of a specific module
 * to diagnose why sections aren't showing up in the edit page.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/utils/db');

async function debugModuleContent() {
  try {
    console.log('🔍 Debugging Module Content Structure\n');

    // Get all modules
    const modules = await db.query(`
      SELECT 
        id,
        title,
        content_structure,
        CHAR_LENGTH(content_structure) as content_length,
        JSON_VALID(content_structure) as is_valid_json
      FROM vark_modules
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`📚 Found ${modules.length} recent modules:\n`);

    for (const module of modules) {
      console.log('─'.repeat(80));
      console.log(`📖 Module: ${module.title}`);
      console.log(`   ID: ${module.id}`);
      console.log(`   Content Length: ${module.content_length || 0} characters`);
      console.log(`   Valid JSON: ${module.is_valid_json ? 'Yes' : 'No'}`);

      if (module.content_structure) {
        try {
          const parsed = JSON.parse(module.content_structure);
          console.log(`   Structure Keys: ${Object.keys(parsed).join(', ')}`);
          
          if (parsed.sections) {
            console.log(`   ✅ Sections Array: ${parsed.sections.length} sections`);
            
            if (parsed.sections.length > 0) {
              console.log(`   📋 Section Titles:`);
              parsed.sections.forEach((section, idx) => {
                console.log(`      ${idx + 1}. ${section.title || '(Untitled)'}`);
              });
            }
          } else {
            console.log(`   ⚠️  No 'sections' property found`);
            console.log(`   Raw structure:`, JSON.stringify(parsed, null, 2).substring(0, 200));
          }
        } catch (error) {
          console.log(`   ❌ Parse Error: ${error.message}`);
          console.log(`   Raw content (first 200 chars):`, module.content_structure.substring(0, 200));
        }
      } else {
        console.log(`   ⚠️  content_structure is NULL or empty`);
      }
      console.log('');
    }

    console.log('─'.repeat(80));
    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugModuleContent();
