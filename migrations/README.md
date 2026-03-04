# MySQL Schema Migration

This directory contains the MySQL schema migration scripts for converting from PostgreSQL/Supabase to MySQL.

## Files

- **001_create_mysql_schema.sql** - Main migration script that creates all tables
- **001_rollback_mysql_schema.sql** - Rollback script that drops all tables
- **run-migration.js** - Node.js script to execute migrations

## Prerequisites

1. **MySQL Server** - MySQL 8.0+ or MariaDB 10.5+
2. **Node.js** - Version 14+ with mysql2 package installed
3. **Database Created** - Create the target database first

## Setup

### 1. Create Database

```sql
CREATE DATABASE biscas_learning 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
```

### 2. Configure Environment

Create or update your `.env` file in the `server/` directory:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=biscas_learning
```

### 3. Install Dependencies

```bash
cd server
npm install mysql2 dotenv
```

## Running the Migration

### Option 1: Using Node.js Script (Recommended)

```bash
# Run migration
node migrations/run-migration.js

# Rollback migration
node migrations/run-migration.js rollback
```

The script will:
- ✅ Connect to MySQL
- ✅ Execute the migration
- ✅ Verify tables were created
- ✅ Show detailed summary
- ✅ Provide next steps

### Option 2: Using MySQL CLI

```bash
# Run migration
mysql -u root -p biscas_learning < migrations/001_create_mysql_schema.sql

# Rollback migration
mysql -u root -p biscas_learning < migrations/001_rollback_mysql_schema.sql
```

## Schema Conversion Details

### Data Type Conversions

| PostgreSQL | MySQL | Notes |
|------------|-------|-------|
| `UUID` | `CHAR(36)` | Stored as string with hyphens |
| `JSONB` | `JSON` | MySQL 5.7+ native JSON support |
| `TIMESTAMP WITH TIME ZONE` | `DATETIME` | Store in UTC, convert in application |
| `TEXT` | `TEXT` | Direct mapping |
| `SERIAL` | `INT AUTO_INCREMENT` | For auto-incrementing IDs |
| `BOOLEAN` | `BOOLEAN` (TINYINT(1)) | MySQL uses TINYINT |
| `ENUM` | `ENUM` | Direct mapping |
| `DECIMAL(10,2)` | `DECIMAL(10,2)` | Direct mapping |

### ENUM Type Conversions

PostgreSQL ENUMs are converted to MySQL ENUMs:

- `user_role` → `ENUM('student', 'teacher', 'admin')`
- `learning_style` → `ENUM('visual', 'auditory', 'reading_writing', 'kinesthetic')`
- `progress_status` → `ENUM('not_started', 'in_progress', 'completed', 'paused')`
- `quiz_type` → `ENUM('pre', 'post')`
- `question_type` → `ENUM('multiple_choice', 'true_false', 'matching', 'short_answer')`

### Tables Created

#### Authentication (3 tables)
- `users` - User accounts (replaces Supabase auth.users)
- `refresh_tokens` - JWT refresh tokens
- `password_reset_tokens` - Password reset tokens

#### User Data (1 table)
- `profiles` - User profile information

#### Classes (2 tables)
- `classes` - Class definitions
- `class_students` - Class enrollment (junction table)

#### Lessons (2 tables)
- `lessons` - Lesson content
- `lesson_progress` - Student lesson progress

#### Quizzes (5 tables)
- `quizzes` - Quiz definitions
- `quiz_questions` - Quiz questions
- `quiz_assignees` - Student-level quiz assignments
- `quiz_class_assignees` - Class-level quiz assignments
- `quiz_results` - Quiz attempt results

#### Activities (4 tables)
- `activities` - Activity/assignment definitions
- `activity_assignees` - Student-level activity assignments
- `activity_class_assignees` - Class-level activity assignments
- `submissions` - Student submissions

#### Announcements (1 table)
- `announcements` - System announcements

#### VARK Modules (11 tables)
- `vark_module_categories` - Module categories
- `vark_modules` - Module definitions
- `vark_module_sections` - Module content sections
- `vark_module_progress` - Student progress tracking
- `vark_module_assignments` - Module assignments
- `vark_learning_paths` - Learning path definitions
- `vark_module_feedback` - Student feedback
- `module_completions` - Completion records
- `student_badges` - Achievement badges
- `teacher_notifications` - Teacher notifications
- `student_module_submissions` - Section submissions

#### File Storage (1 table)
- `file_storage` - File metadata tracking

**Total: 30 tables**

## Indexes

All tables include appropriate indexes for:
- Primary keys
- Foreign keys
- Frequently queried columns
- Composite indexes for common query patterns

Examples:
- `idx_email` on users.email
- `idx_student_module` on vark_module_progress(student_id, module_id)
- `idx_created_by` on various tables

## Foreign Key Constraints

All foreign key relationships are preserved with appropriate actions:
- `ON DELETE CASCADE` - Delete related records
- `ON DELETE SET NULL` - Set to NULL when parent deleted
- Circular references handled (e.g., prerequisite_module_id)

## Verification

After running the migration, verify the schema:

```sql
-- Show all tables
SHOW TABLES;

-- Show table structure
DESCRIBE users;
DESCRIBE vark_modules;

-- Show indexes
SHOW INDEX FROM vark_modules;

-- Show foreign keys
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'biscas_learning'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Testing the Migration

### 1. Test Database Connection

```bash
cd server
node test-database-connection.js
```

### 2. Verify Table Count

```sql
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'biscas_learning';
-- Expected: 30 tables
```

### 3. Test Insert Operations

```sql
-- Test user creation
INSERT INTO users (id, email, password_hash, role) 
VALUES (UUID(), 'test@example.com', 'hashed_password', 'student');

-- Verify
SELECT * FROM users WHERE email = 'test@example.com';
```

## Rollback Procedure

If you need to rollback the migration:

```bash
# Using Node.js script
node migrations/run-migration.js rollback

# Or using MySQL CLI
mysql -u root -p biscas_learning < migrations/001_rollback_mysql_schema.sql
```

⚠️ **WARNING**: Rollback will DROP ALL TABLES and DELETE ALL DATA!

## Troubleshooting

### Connection Errors

```
Error: Access denied for user
```
**Solution**: Check DB_USER and DB_PASSWORD in .env

```
Error: Unknown database
```
**Solution**: Create the database first using CREATE DATABASE

### Migration Errors

```
Error: Table already exists
```
**Solution**: The migration uses IF NOT EXISTS, so this shouldn't happen. If it does, run rollback first.

```
Error: Foreign key constraint fails
```
**Solution**: Ensure tables are created in the correct order. The migration script handles this automatically.

### Character Set Issues

```
Error: Incorrect string value
```
**Solution**: Ensure database uses utf8mb4:
```sql
ALTER DATABASE biscas_learning 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
```

## Next Steps

After successful migration:

1. ✅ **Test Connections** - Verify application can connect to MySQL
2. ✅ **Data Import** - Run data export/import scripts (Phase 7)
3. ✅ **Update Application** - Update connection strings and queries
4. ✅ **Run Tests** - Execute integration tests
5. ✅ **Monitor** - Watch for errors in development

## Notes

- All timestamps are stored in UTC (DATETIME type)
- UUIDs are stored as CHAR(36) with hyphens
- JSON columns use MySQL's native JSON type
- All tables use InnoDB engine for transaction support
- Character set is utf8mb4 for full Unicode support
- Collation is utf8mb4_unicode_ci for case-insensitive comparisons

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the migration logs
3. Verify environment configuration
4. Check MySQL server logs

## References

- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)
- [PostgreSQL to MySQL Migration Guide](https://dev.mysql.com/doc/workbench/en/wb-migration-database-postgresql.html)
- [MySQL JSON Data Type](https://dev.mysql.com/doc/refman/8.0/en/json.html)
