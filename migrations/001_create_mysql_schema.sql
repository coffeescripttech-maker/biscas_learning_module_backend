-- =============================================
-- MySQL Schema Migration from PostgreSQL/Supabase
-- =============================================
-- This script converts the PostgreSQL schema to MySQL
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =============================================

-- Set MySQL settings for better compatibility
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- STEP 1: Create Database (if needed)
-- =============================================
-- CREATE DATABASE IF NOT EXISTS biscas_learning 
--   CHARACTER SET utf8mb4 
--   COLLATE utf8mb4_unicode_ci;
-- USE biscas_learning;

-- =============================================
-- STEP 2: Core Authentication Tables
-- =============================================

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student',
  email_verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login DATETIME,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token(255)),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 3: Profile and User Data Tables
-- =============================================

-- Profiles table (extends users)
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255),
  grade_level VARCHAR(50),
  profile_photo TEXT,
  learning_style ENUM('visual', 'auditory', 'reading_writing', 'kinesthetic'),
  preferred_modules JSON,
  learning_type VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_learning_style (learning_style),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 4: Class Management Tables
-- =============================================

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  grade_level VARCHAR(50),
  created_by CHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_by (created_by),
  INDEX idx_grade_level (grade_level),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Class enrollments (junction table)
CREATE TABLE IF NOT EXISTS class_students (
  class_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, student_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 5: Lesson Tables
-- =============================================

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content_url TEXT NOT NULL,
  subject VARCHAR(100),
  grade_level VARCHAR(50),
  vark_tag ENUM('visual', 'auditory', 'reading_writing', 'kinesthetic'),
  resource_type VARCHAR(50),
  is_published BOOLEAN DEFAULT FALSE,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_by (created_by),
  INDEX idx_published (is_published),
  INDEX idx_vark_tag (vark_tag),
  INDEX idx_grade_level (grade_level),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lesson progress tracking
CREATE TABLE IF NOT EXISTS lesson_progress (
  lesson_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  progress_percentage INT DEFAULT 0,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  PRIMARY KEY (lesson_id, student_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 6: Quiz Tables
-- =============================================

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('pre', 'post') NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_by (created_by),
  INDEX idx_type (type),
  INDEX idx_published (is_published),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id CHAR(36) PRIMARY KEY,
  quiz_id CHAR(36) NOT NULL,
  question TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'true_false', 'matching', 'short_answer') NOT NULL,
  options JSON,
  correct_answer JSON,
  points INT DEFAULT 1,
  position INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quiz_id (quiz_id),
  INDEX idx_position (quiz_id, position),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quiz assignees (student-level assignment)
CREATE TABLE IF NOT EXISTS quiz_assignees (
  quiz_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id, student_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quiz class assignees (class-level assignment)
CREATE TABLE IF NOT EXISTS quiz_class_assignees (
  quiz_id CHAR(36) NOT NULL,
  class_id CHAR(36) NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id, class_id),
  INDEX idx_class_id (class_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quiz results (per attempt)
CREATE TABLE IF NOT EXISTS quiz_results (
  id CHAR(36) PRIMARY KEY,
  quiz_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  total_points INT NOT NULL,
  responses JSON,
  attempt_number INT DEFAULT 1,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_quiz_student_attempt (quiz_id, student_id, attempt_number),
  INDEX idx_quiz_student (quiz_id, student_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 7: Activity Tables
-- =============================================

-- Activities (assignments/projects)
CREATE TABLE IF NOT EXISTS activities (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  rubric_url TEXT,
  deadline DATETIME,
  grading_mode VARCHAR(50),
  is_published BOOLEAN DEFAULT FALSE,
  assigned_by CHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assigned_by (assigned_by),
  INDEX idx_deadline (deadline),
  INDEX idx_published (is_published),
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity assignees (student-level assignment)
CREATE TABLE IF NOT EXISTS activity_assignees (
  activity_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_id, student_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity class assignees (class-level assignment)
CREATE TABLE IF NOT EXISTS activity_class_assignees (
  activity_id CHAR(36) NOT NULL,
  class_id CHAR(36) NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_id, class_id),
  INDEX idx_class_id (class_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Submissions for activities
CREATE TABLE IF NOT EXISTS submissions (
  id CHAR(36) PRIMARY KEY,
  activity_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  file_url TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  score DECIMAL(10,2),
  feedback TEXT,
  graded_at DATETIME,
  graded_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_activity_student (activity_id, student_id),
  INDEX idx_activity_student (activity_id, student_id),
  INDEX idx_graded_by (graded_by),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 8: Announcement Tables
-- =============================================

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_role ENUM('student', 'teacher', 'admin'),
  target_class_id CHAR(36),
  target_student_id CHAR(36),
  is_urgent BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  expires_at DATETIME,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_by (created_by),
  INDEX idx_target_role (target_role),
  INDEX idx_target_class (target_class_id),
  INDEX idx_published (is_published),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 9: VARK Module Tables
-- =============================================

-- VARK module categories
CREATE TABLE IF NOT EXISTS vark_module_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100) NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  learning_style VARCHAR(50) NOT NULL,
  icon_name VARCHAR(100),
  color_scheme VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subject (subject),
  INDEX idx_grade_level (grade_level),
  INDEX idx_learning_style (learning_style),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VARK modules
CREATE TABLE IF NOT EXISTS vark_modules (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  learning_objectives JSON,
  content_structure JSON,
  difficulty_level ENUM('beginner', 'intermediate', 'advanced'),
  estimated_duration_minutes INT,
  prerequisites JSON,
  multimedia_content JSON,
  interactive_elements JSON,
  assessment_questions JSON,
  module_metadata JSON,
  json_backup_url TEXT,
  json_content_url TEXT,
  content_summary JSON,
  target_class_id CHAR(36),
  target_learning_styles JSON,
  prerequisite_module_id CHAR(36),
  is_published BOOLEAN DEFAULT FALSE,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category_id (category_id),
  INDEX idx_created_by (created_by),
  INDEX idx_published (is_published),
  INDEX idx_target_class (target_class_id),
  INDEX idx_prerequisite (prerequisite_module_id),
  INDEX idx_difficulty (difficulty_level),
  FOREIGN KEY (category_id) REFERENCES vark_module_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_module_id) REFERENCES vark_modules(id) ON DELETE SET NULL,
  FOREIGN KEY (target_class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VARK module sections
CREATE TABLE IF NOT EXISTS vark_module_sections (
  id CHAR(36) PRIMARY KEY,
  module_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  content_data JSON NOT NULL,
  position INT DEFAULT 1,
  is_required BOOLEAN DEFAULT TRUE,
  time_estimate_minutes INT,
  learning_style_tags JSON,
  interactive_elements JSON,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_module_id (module_id),
  INDEX idx_position (module_id, position),
  INDEX idx_content_type (content_type),
  FOREIGN KEY (module_id) REFERENCES vark_modules(id) ON DELETE CASCADE,
  CONSTRAINT chk_content_type CHECK (content_type IN ('text', 'video', 'audio', 'interactive', 'activity', 'assessment', 'quick_check', 'highlight', 'table', 'diagram'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VARK module progress
CREATE TABLE IF NOT EXISTS vark_module_progress (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  module_id CHAR(36) NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed', 'paused') DEFAULT 'not_started',
  progress_percentage INT DEFAULT 0,
  current_section_id CHAR(36),
  time_spent_minutes INT DEFAULT 0,
  completed_sections JSON,
  assessment_scores JSON,
  started_at DATETIME,
  completed_at DATETIME,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_module (student_id, module_id),
  INDEX idx_student_module (student_id, module_id),
  INDEX idx_status (status),
  INDEX idx_last_accessed (last_accessed_at),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES vark_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (current_section_id) REFERENCES vark_module_sections(id) ON DELETE SET NULL,
  CONSTRAINT chk_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VARK module assignments
CREATE TABLE IF NOT EXISTS vark_module_assignments (
  id CHAR(36) PRIMARY KEY,
  module_id CHAR(36) NOT NULL,
  assigned_by CHAR(36) NOT NULL,
  assigned_to_type ENUM('student', 'class') NOT NULL,
  assigned_to_id CHAR(36) NOT NULL,
  due_date DATETIME,
  is_required BOOLEAN DEFAULT TRUE,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_module_id (module_id),
  INDEX idx_assigned_by (assigned_by),
  INDEX idx_assigned_to (assigned_to_type, assigned_to_id),
  INDEX idx_due_date (due_date),
  FOREIGN KEY (module_id) REFERENCES vark_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VARK learning paths
CREATE TABLE IF NOT EXISTS vark_learning_paths (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100) NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  learning_style ENUM('visual', 'auditory', 'reading_writing', 'kinesthetic') NOT NULL,
  module_sequence JSON NOT NULL,
  total_duration_hours INT,
  difficulty_progression ENUM('linear', 'adaptive', 'branching'),
  is_published BOOLEAN DEFAULT FALSE,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_by (created_by),
  INDEX idx_subject (subject),
  INDEX idx_grade_level (grade_level),
  INDEX idx_learning_style (learning_style),
  INDEX idx_published (is_published),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VARK module feedback
CREATE TABLE IF NOT EXISTS vark_module_feedback (
  id CHAR(36) PRIMARY KEY,
  module_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  rating INT,
  feedback_text TEXT,
  difficulty_rating INT,
  engagement_rating INT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_module_feedback (student_id, module_id),
  INDEX idx_module_id (module_id),
  INDEX idx_student_id (student_id),
  INDEX idx_rating (rating),
  FOREIGN KEY (module_id) REFERENCES vark_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT chk_difficulty_rating CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  CONSTRAINT chk_engagement_rating CHECK (engagement_rating >= 1 AND engagement_rating <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Module completions
CREATE TABLE IF NOT EXISTS module_completions (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  module_id CHAR(36) NOT NULL,
  completion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  final_score DECIMAL(5,2),
  time_spent_minutes INT DEFAULT 0,
  pre_test_score DECIMAL(5,2),
  post_test_score DECIMAL(5,2),
  sections_completed INT DEFAULT 0,
  perfect_sections INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_module_completion (student_id, module_id),
  INDEX idx_student_id (student_id),
  INDEX idx_module_id (module_id),
  INDEX idx_completion_date (completion_date),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES vark_modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student badges
CREATE TABLE IF NOT EXISTS student_badges (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  badge_type VARCHAR(100) NOT NULL,
  badge_name VARCHAR(255) NOT NULL,
  badge_description TEXT,
  badge_icon VARCHAR(255),
  badge_rarity ENUM('bronze', 'silver', 'gold', 'platinum'),
  module_id CHAR(36),
  earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  criteria_met JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student_id (student_id),
  INDEX idx_module_id (module_id),
  INDEX idx_badge_type (badge_type),
  INDEX idx_earned_date (earned_date),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES vark_modules(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher notifications
CREATE TABLE IF NOT EXISTS teacher_notifications (
  id CHAR(36) PRIMARY KEY,
  teacher_id CHAR(36) NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_student_id CHAR(36),
  related_module_id CHAR(36),
  is_read BOOLEAN DEFAULT FALSE,
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_is_read (is_read),
  INDEX idx_priority (priority),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_module_id) REFERENCES vark_modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student module submissions
CREATE TABLE IF NOT EXISTS student_module_submissions (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  module_id CHAR(36) NOT NULL,
  section_id VARCHAR(255) NOT NULL,
  section_title VARCHAR(255) NOT NULL,
  section_type VARCHAR(50) NOT NULL,
  submission_data JSON NOT NULL,
  assessment_results JSON,
  time_spent_seconds INT DEFAULT 0,
  submission_status ENUM('draft', 'submitted', 'reviewed') DEFAULT 'draft',
  teacher_feedback TEXT,
  teacher_score DECIMAL(5,2),
  submitted_at DATETIME,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_module_section (student_id, module_id, section_id),
  INDEX idx_student_module (student_id, module_id),
  INDEX idx_status (submission_status),
  INDEX idx_submitted_at (submitted_at),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES vark_modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 10: File Storage Metadata Table
-- =============================================

-- File storage metadata (for tracking uploaded files)
CREATE TABLE IF NOT EXISTS file_storage (
  id CHAR(36) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  bucket VARCHAR(100) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_bucket (bucket),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Files table (simplified file tracking for API)
CREATE TABLE IF NOT EXISTS files (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mimetype VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  path TEXT NOT NULL,
  folder VARCHAR(100),
  url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_folder (folder),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Re-enable foreign key checks
-- =============================================
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- Success Message
-- =============================================
SELECT '✅ MySQL Schema Created Successfully!' AS Status;
SELECT 'All tables, indexes, and foreign keys have been created.' AS Message;
