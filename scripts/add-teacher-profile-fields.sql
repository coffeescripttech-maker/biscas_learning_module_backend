-- Add teacher-specific fields to profiles table
-- Run this migration to add phone_number, department, and specialization columns

-- Check and add phone_number column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'profiles' 
AND COLUMN_NAME = 'phone_number';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE profiles ADD COLUMN phone_number VARCHAR(20) NULL AFTER full_name', 
  'SELECT "phone_number column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add department column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'profiles' 
AND COLUMN_NAME = 'department';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE profiles ADD COLUMN department VARCHAR(100) NULL AFTER phone_number', 
  'SELECT "department column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add specialization column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'profiles' 
AND COLUMN_NAME = 'specialization';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE profiles ADD COLUMN specialization VARCHAR(100) NULL AFTER department', 
  'SELECT "specialization column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for department for faster queries (if not exists)
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'profiles' 
AND INDEX_NAME = 'idx_profiles_department';

SET @query = IF(@index_exists = 0, 
  'CREATE INDEX idx_profiles_department ON profiles(department)', 
  'SELECT "idx_profiles_department index already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
