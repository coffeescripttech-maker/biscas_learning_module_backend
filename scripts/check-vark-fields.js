const data = require('../exports/data/vark_modules.json');

const allowedFields = [
  'id','category_id','title','description','learning_objectives',
  'content_structure','difficulty_level','estimated_duration_minutes',
  'prerequisites','multimedia_content','interactive_elements',
  'assessment_questions','module_metadata','json_backup_url',
  'json_content_url','content_summary','target_class_id',
  'target_learning_styles','prerequisite_module_id','is_published',
  'created_by','created_at','updated_at'
];

data.forEach((m, i) => {
  const extraFields = Object.keys(m).filter(k => !allowedFields.includes(k));
  if (extraFields.length > 0) {
    console.log(`Module ${i+1} (${m.title}):`, extraFields);
  }
  
  // Check prerequisite_module_id
  if (m.prerequisite_module_id) {
    console.log(`Module ${i+1} (${m.title}): Has prerequisite_module_id = ${m.prerequisite_module_id}`);
  }
});
