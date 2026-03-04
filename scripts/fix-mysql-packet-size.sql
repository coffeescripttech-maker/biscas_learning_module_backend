"}
✅ Database connection verified

⚠️  WARNING: This will import data into MySQL database
   Database: biscas_learning
   Host: localhost

   This operation will:
   - Insert records into existing tables
   - Skip duplicate records (based on primary keys)
   - May take several minutes for large datasets

🚀 Starting MySQL data import...
   Import directory: C:\Users\ACER\Desktop\2025 Capstone Project\BISCAS NAGA - LEARNING MODULE\client\server\exports\data
   Batch size: 100 records
   Tables to import: 28

📦 Importing table: profiles
   Found 60 records to import
   Transforming data...
   Importing in batches of 100...
   Batch 1/1: Importing 60 records...
2026-01-14 19:46:30 [debug]: Executing query {"service":"biscas-api","sql":"INSERT INTO profiles (id, email, first_name, middle_name, last_name, full_name, role, grade_level, p","paramCount":900}
2026-01-14 19:46:30 [error]: Query execution failed {"service":"biscas-api","sql":"INSERT INTO profiles (id, email, first_name, middle_name, last_name, full_name, role, grade_level, p","error":"Unknown column 'email' in 'field list'","code":"ER_BAD_FIELD_ERROR","duration":"9ms"}
   ❌ Batch 1 failed: Unknown column 'email' in 'field list'
   ✅ Imported 0/60 records

📦 Importing table: classes
   ⚠️  Empty export file for classes

📦 Importing table: class_students
   ⚠️  Empty export file for class_students

📦 Importing table: lessons
   ⚠️  Empty export file for lessons

📦 Importing table: lesson_progress
   ⚠️  Empty export file for lesson_progress

📦 Importing table: quizzes
   ⚠️  Empty export file for quizzes

📦 Importing table: quiz_questions
   ⚠️  Empty export file for quiz_questions

📦 Importing table: quiz_assignees
   ⚠️  Empty export file for quiz_assignees

📦 Importing table: quiz_class_assignees
   ⚠️  Empty export file for quiz_class_assignees

📦 Importing table: quiz_results
   ⚠️  Empty export file for quiz_results

📦 Importing table: activities
   ⚠️  Empty export file for activities

📦 Importing table: activity_assignees
   ⚠️  Empty export file for activity_assignees

📦 Importing table: activity_class_assignees
2026-01-14 19:46:30 [warn]: Export file not found: activity_class_assignees.json {"service":"biscas-api"}
   ⚠️  No data to import for activity_class_assignees

📦 Importing table: submissions
   ⚠️  Empty export file for submissions

📦 Importing table: announcements
   ⚠️  Empty export file for announcements

📦 Importing table: vark_module_categories
   ⚠️  Empty export file for vark_module_categories

📦 Importing table: vark_modules
   Found 3 records to import
   Transforming data...
   Importing in batches of 100...
   Batch 1/1: Importing 3 records...
2026-01-14 19:46:30 [debug]: Executing query {"service":"biscas-api","sql":"INSERT INTO vark_modules (id, title, description, learning_objectives, content_structure, difficulty","paramCount":69}
2026-01-14 19:46:31 [error]: Query execution failed {"service":"biscas-api","sql":"INSERT INTO vark_modules (id, title, description, learning_objectives, content_structure, difficulty","error":"Got a packet bigger than 'max_allowed_packet' bytes","code":"ER_NET_PACKET_TOO_LARGE","duration":"32ms"}
   ❌ Batch 1 failed: Got a packet bigger than 'max_allowed_packet' bytes
   ✅ Imported 0/3 records

📦 Importing table: vark_module_sections
   ⚠️  Empty export file for vark_module_sections

📦 Importing table: vark_module_progress
   ⚠️  Empty export file for vark_module_progress

📦 Importing table: vark_module_assignments
   ⚠️  Empty export file for vark_module_assignments

📦 Importing table: vark_learning_paths
   ⚠️  Empty export file for vark_learning_paths

📦 Importing table: vark_module_feedback
   ⚠️  Empty export file for vark_module_feedback

📦 Importing table: module_completions
   ⚠️  Empty export file for module_completions

📦 Importing table: student_badges
   ⚠️  Empty export file for student_badges

📦 Importing table: teacher_notifications
   ⚠️  Empty export file for teacher_notifications

📦 Importing table: student_module_submissions
   ⚠️  Empty export file for student_module_submissions

📦 Importing table: file_storage
2026-01-14 19:46:31 [warn]: Export file not found: file_storage.json {"service":"biscas-api"}
   ⚠️  No data to import for file_storage

📦 Importing table: files
2026-01-14 19:46:31 [warn]: Export file not found: files.json {"service":"biscas-api"}
   ⚠️  No data to import for files

============================================================
📊 IMPORT SUMMARY
============================================================

✅ Successfully imported: 2 tables
⚠️  Skipped (no data): 26 tables
❌ Failed: 0 tables
📝 Total records imported: 0
⚠️  Total records skipped: 63
⏱️  Duration: 0.12 seconds

📋 Details by table:
   ✓  profiles                            -        0/      60 records (60 skipped) 
   ⚠️  classes                             - SKIPPED (no data)
   ⚠️  class_students                      - SKIPPED (no data)
   ⚠️  lessons                             - SKIPPED (no data)
   ⚠️  lesson_progress                     - SKIPPED (no data)
   ⚠️  quizzes                             - SKIPPED (no data)
   ⚠️  quiz_questions                      - SKIPPED (no data)
   ⚠️  quiz_assignees                      - SKIPPED (no data)
   ⚠️  quiz_class_assignees                - SKIPPED (no data)
   ⚠️  quiz_results                        - SKIPPED (no data)
   ⚠️  activities                          - SKIPPED (no data)
   ⚠️  activity_assignees                  - SKIPPED (no data)
   ⚠️  activity_class_assignees            - SKIPPED (no data)
   ⚠️  submissions                         - SKIPPED (no data)
   ⚠️  announcements                       - SKIPPED (no data)
   ⚠️  vark_module_categories              - SKIPPED (no data)
   ✓  vark_modules                        -        0/       3 records (3 skipped)  
   ⚠️  vark_module_sections                - SKIPPED (no data)
   ⚠️  vark_module_progress                - SKIPPED (no data)
   ⚠️  vark_module_assignments             - SKIPPED (no data)
   ⚠️  vark_learning_paths                 - SKIPPED (no data)
   ⚠️  vark_module_feedback                - SKIPPED (no data)
   ⚠️  module_completions                  - SKIPPED (no data)
   ⚠️  student_badges                      - SKIPPED (no data)
   ⚠️  teacher_notifications               - SKIPPED (no data)
   ⚠️  student_module_submissions          - SKIPPED (no data)
   ⚠️  file_storage                        - SKIPPED (no data)
   ⚠️  files                               - SKIPPED (no data)

💾 Summary saved to: _import_summary.json