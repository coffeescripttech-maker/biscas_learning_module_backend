/**
 * Test script to debug Lesson 2 import issue
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const db = require('../src/utils/db');
const { initialize: initializeDatabase } = require('../src/config/database');

async function testLesson2Insert() {
  try {
    await initializeDatabase();
    console.log('✅ Database connected\n');
    
    // Load Lesson 2 data
    const data = require('../exports/data/vark_modules.json');
    const lesson2 = data.find(x => x.title && x.title.includes('Lesson 2'));
    
    if (!lesson2) {
      console.error('❌ Lesson 2 not found!');
      process.exit(1);
    }
    
    console.log('📝 Lesson 2 ID:', lesson2.id);
    console.log('📝 Title:', lesson2.title);
    
    // Transform the record (simplified version)
    const record = {
      id: lesson2.id,
      title: lesson2.title,
      description: lesson2.description,
      learning_objectives: JSON.stringify(lesson2.learning_objectives),
      content_structure: JSON.stringify(lesson2.content_structure),
      difficulty_level: lesson2.difficulty_level,
      estimated_duration_minutes: lesson2.estimated_duration_minutes,
      prerequisites: JSON.stringify(lesson2.prerequisites),
      multimedia_content: lesson2.multimedia_content ? JSON.stringify(lesson2.multimedia_content) : null,
      interactive_elements: lesson2.interactive_elements ? JSON.stringify(lesson2.interactive_elements) : null,
      assessment_questions: lesson2.assessment_questions ? JSON.stringify(lesson2.assessment_questions) : null,
      is_published: lesson2.is_published ? 1 : 0,
      created_by: lesson2.created_by,
      created_at: new Date(lesson2.created_at).toISOString().slice(0, 19).replace('T', ' '),
      updated_at: new Date(lesson2.updated_at).toISOString().slice(0, 19).replace('T', ' '),
      module_metadata: lesson2.module_metadata ? JSON.stringify(lesson2.module_metadata) : null,
      target_class_id: null, // Set to NULL
      target_learning_styles: lesson2.target_learning_styles ? JSON.stringify(lesson2.target_learning_styles) : null,
      category_id: null, // Set to NULL
      json_backup_url: lesson2.json_backup_url,
      json_content_url: lesson2.json_content_url,
      content_summary: lesson2.content_summary ? JSON.stringify(lesson2.content_summary) : null,
      prerequisite_module_id: null // Set to NULL
    };
    
    console.log('\n📊 Record keys:', Object.keys(record).length);
    console.log('📊 Record keys:', Object.keys(record).join(', '));
    
    // Try to build the INSERT statement
    console.log('\n🔨 Building INSERT statement...');
    const { sql, params } = db.buildInsert('vark_modules', record);
    
    console.log('✅ SQL built successfully');
    console.log('📝 SQL (first 200 chars):', sql.substring(0, 200) + '...');
    console.log('📝 Params count:', params.length);
    
    // Try to execute
    console.log('\n🚀 Attempting to insert...');
    const result = await db.query(sql, params);
    
    console.log('✅ Insert successful!');
    console.log('📊 Result:', result);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('📝 Error code:', error.code);
    console.error('📝 SQL State:', error.sqlState);
    
    if (error.sql) {
      console.error('📝 SQL (first 500 chars):', error.sql.substring(0, 500));
    }
    
    process.exit(1);
  }
}

testLesson2Insert();
