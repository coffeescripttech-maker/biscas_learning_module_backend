-- =============================================
-- MySQL Schema Rollback Script
-- =============================================
-- This script drops all tables created by the migration
-- Run this to rollback the migration
-- =============================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS file_storage;
DROP TABLE IF EXISTS student_module_submissions;
DROP TABLE IF EXISTS teacher_notifications;
DROP TABLE IF EXISTS student_badges;
DROP TABLE IF EXISTS module_completions;
DROP TABLE IF EXISTS vark_module_feedback;
DROP TABLE IF EXISTS vark_learning_paths;
DROP TABLE IF EXISTS vark_module_assignments;
DROP TABLE IF EXISTS vark_module_progress;
DROP TABLE IF EXISTS vark_module_sections;
DROP TABLE IF EXISTS vark_modules;
DROP TABLE IF EXISTS vark_module_categories;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS activity_class_assignees;
DROP TABLE IF EXISTS activity_assignees;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS quiz_results;
DROP TABLE IF EXISTS quiz_class_assignees;
DROP TABLE IF EXISTS quiz_assignees;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS lesson_progress;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS class_students;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ All tables dropped successfully!' AS Status;
SELECT 'Database has been rolled back to pre-migration state.' AS Message;
