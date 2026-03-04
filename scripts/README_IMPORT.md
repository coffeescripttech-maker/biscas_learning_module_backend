# Data Import Scripts

This directory contains scripts for importing data from Supabase exports into MySQL database.

## Overview

The import process consists of four main steps:

1. **Data Import** - Import table data from JSON exports
2. **User Import** - Import authentication users with password reset
3. **Storage Import** - Upload files to new storage system
4. **Verification** - Verify data integrity after import

## Prerequisites

Before running import scripts, ensure:

1. ✅ MySQL database is set up and running
2. ✅ Database schema has been created (run migration scripts)
3. ✅ Export scripts have been run successfully
4. ✅ Environment variables are configured
5. ✅ Required npm packages are installed

## Environment Variables

Create or update `.env.development` with:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=biscas_dev
DB_USER=dev_user
DB_PASSWORD=dev_password

# JWT Configuration
JWT_SECRET=your-secret-key

# Email Configuration (for password resets)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-user
EMAIL_PASSWORD=your-mailtrap-password
EMAIL_FROM=noreply@biscas.edu

# Storage Configuration
STORAGE_TYPE=local  # or 's3'
STORAGE_PATH=./uploads

# For S3 storage (production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-bucket-name

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

## Import Scripts

### 1. Import Table Data

**Script:** `import-supabase-data.js`

Imports all table data from Supabase exports into MySQL.

**Features:**
- Converts data types (UUIDs, timestamps, JSON)
- Handles foreign key dependencies
- Batch inserts for performance
- Skips duplicate records
- Progress reporting

**Usage:**
```bash
node scripts/import-supabase-data.js
```

**What it does:**
1. Loads JSON export files from `exports/data/`
2. Transforms data for MySQL compatibility
3. Imports tables in dependency order
4. Generates import summary

**Output:**
- `exports/data/_import_summary.json` - Detailed import statistics

**Requirements:** 2.2, 2.5, 2.6, 2.8

---

### 2. Import User Accounts

**Script:** `import-auth-users.js`

Imports user accounts from Supabase Auth export.

**Features:**
- Creates users with temporary passwords
- Generates password reset tokens
- Hashes passwords with bcrypt
- Tracks import progress

**Usage:**
```bash
node scripts/import-auth-users.js
```

**What it does:**
1. Loads users from `exports/auth/users_for_migration.json`
2. Creates user accounts in MySQL
3. Generates password reset tokens (24-hour expiry)
4. Prepares email list for password resets

**Output:**
- `exports/auth/_import_results.json` - Import results
- `exports/auth/_password_reset_emails.json` - Email list with reset tokens
- `exports/auth/_password_reset_emails.csv` - CSV format for easy viewing

**Requirements:** 3.2, 3.3

---

### 3. Send Password Reset Emails

**Script:** `send-password-resets.js`

Sends password reset emails to all imported users.

**Features:**
- HTML and plain text email templates
- Batch sending with rate limiting
- Progress tracking
- Retry support for failed emails

**Usage:**
```bash
node scripts/send-password-resets.js
```

**What it does:**
1. Loads email list from `exports/auth/_password_reset_emails.json`
2. Sends password reset emails with reset links
3. Tracks send success/failure
4. Generates failed emails list for retry

**Output:**
- `exports/auth/_email_send_results.json` - Send results
- `exports/auth/_failed_emails.json` - Failed emails for retry

**Email Template:**
- Professional HTML design
- Clear instructions for password reset
- Expiry date and time
- Support contact information

**Requirements:** 3.2, 3.3

---

### 4. Import Storage Files

**Script:** `import-storage-files.js`

Uploads files from Supabase Storage export to new storage system.

**Features:**
- Supports local storage (development)
- Supports S3 storage (production)
- Maintains bucket structure
- Updates file URLs in database
- Progress tracking

**Usage:**
```bash
# For local storage
STORAGE_TYPE=local node scripts/import-storage-files.js

# For S3 storage
STORAGE_TYPE=s3 node scripts/import-storage-files.js
```

**What it does:**
1. Loads URL mapping from `exports/storage/_url_mapping.json`
2. Uploads files to configured storage
3. Updates file URLs in database
4. Tracks upload success/failure

**Output:**
- `exports/storage/_import_results.json` - Import results
- `exports/storage/_failed_uploads.json` - Failed uploads for retry

**Requirements:** 5.4, 5.5

---

### 5. Verify Data Integrity

**Script:** `verify-data-integrity.js`

Verifies data integrity after import.

**Features:**
- Compares row counts with exports
- Verifies foreign key relationships
- Validates required fields
- Checks for data corruption
- Generates detailed report

**Usage:**
```bash
node scripts/verify-data-integrity.js
```

**What it does:**
1. Compares row counts between export and MySQL
2. Checks foreign key integrity
3. Validates required fields (no NULLs)
4. Checks for data corruption (invalid UUIDs, emails)
5. Generates comprehensive report

**Output:**
- `exports/data/_verification_report.json` - Detailed verification results
- `exports/data/_verification_summary.txt` - Human-readable summary

**Exit Codes:**
- `0` - All checks passed
- `1` - Verification failed (critical issues found)

**Requirements:** 2.4

---

## Complete Import Workflow

Follow these steps in order:

### Step 1: Prepare Environment

```bash
# Ensure MySQL is running
mysql -u root -p -e "SHOW DATABASES;"

# Verify database exists
mysql -u root -p -e "USE biscas_dev; SHOW TABLES;"

# Check environment variables
cat .env.development
```

### Step 2: Run Exports (if not done)

```bash
# Export Supabase data
node scripts/export-supabase-data.js

# Export Supabase auth
node scripts/export-supabase-auth.js

# Export Supabase storage
node scripts/export-supabase-storage.js
```

### Step 3: Import Data

```bash
# 1. Import table data
node scripts/import-supabase-data.js

# 2. Import user accounts
node scripts/import-auth-users.js

# 3. Import storage files
node scripts/import-storage-files.js

# 4. Verify data integrity
node scripts/verify-data-integrity.js
```

### Step 4: Send Password Resets

```bash
# Send password reset emails to all users
node scripts/send-password-resets.js
```

### Step 5: Verify Import

```bash
# Check import summary
cat exports/data/_import_summary.json

# Check verification report
cat exports/data/_verification_report.json

# Check user import results
cat exports/auth/_import_results.json

# Check storage import results
cat exports/storage/_import_results.json
```

## Troubleshooting

### Database Connection Errors

**Error:** `ECONNREFUSED` or `ER_ACCESS_DENIED_ERROR`

**Solution:**
1. Verify MySQL is running: `mysql -u root -p`
2. Check credentials in `.env.development`
3. Ensure database exists: `CREATE DATABASE IF NOT EXISTS biscas_dev;`
4. Grant permissions: `GRANT ALL PRIVILEGES ON biscas_dev.* TO 'dev_user'@'localhost';`

### Duplicate Entry Errors

**Error:** `DB_DUPLICATE_ENTRY`

**Solution:**
- Import script automatically skips duplicates
- Check `_import_summary.json` for skipped records
- If needed, clear tables and re-import:
  ```sql
  SET FOREIGN_KEY_CHECKS = 0;
  TRUNCATE TABLE table_name;
  SET FOREIGN_KEY_CHECKS = 1;
  ```

### Foreign Key Violations

**Error:** `DB_FOREIGN_KEY_VIOLATION`

**Solution:**
1. Ensure tables are imported in correct order (script handles this)
2. Check if referenced records exist
3. Run verification script to identify orphaned records
4. Fix data and re-import

### Email Sending Failures

**Error:** Email sending fails

**Solution:**
1. Verify SMTP credentials in `.env.development`
2. Test SMTP connection: `telnet smtp.mailtrap.io 2525`
3. Check failed emails in `_failed_emails.json`
4. Retry failed emails by modifying script to load from failed list

### Storage Upload Failures

**Error:** File upload fails

**Solution:**

For local storage:
1. Ensure `STORAGE_PATH` directory exists and is writable
2. Check disk space: `df -h`

For S3:
1. Verify AWS credentials
2. Check S3 bucket exists and is accessible
3. Verify IAM permissions for PutObject
4. Check network connectivity to AWS

### Verification Failures

**Error:** Row count mismatch or foreign key violations

**Solution:**
1. Review `_verification_report.json` for details
2. Identify specific tables/relationships with issues
3. Check export files for completeness
4. Re-run import for specific tables if needed
5. Fix data issues and re-verify

## Data Transformation

### UUID Conversion

PostgreSQL UUIDs are converted to MySQL CHAR(36) format:
- Input: `550e8400-e29b-41d4-a716-446655440000`
- Output: `550e8400-e29b-41d4-a716-446655440000` (same format)

### Timestamp Conversion

PostgreSQL timestamps are converted to MySQL DATETIME:
- Input: `2025-01-14T10:30:00.000Z` (ISO 8601)
- Output: `2025-01-14 10:30:00` (MySQL DATETIME)
- All timestamps stored in UTC

### JSON Conversion

PostgreSQL JSONB is converted to MySQL JSON:
- Objects and arrays are stringified
- Validation ensures valid JSON format
- NULL values preserved

### Array Conversion

PostgreSQL arrays are converted to JSON arrays:
- Input: `{val1,val2,val3}` (PostgreSQL array)
- Output: `["val1","val2","val3"]` (JSON array)

### Boolean Conversion

PostgreSQL booleans are converted to MySQL TINYINT:
- `true` → `1`
- `false` → `0`

## Performance Considerations

### Batch Size

Default batch size is 100 records per insert. Adjust in script if needed:

```javascript
const BATCH_SIZE = 100; // Increase for better performance
```

### Delays

Delays between operations prevent rate limiting:

```javascript
const DELAY_BETWEEN_BATCHES = 50; // ms
const DELAY_BETWEEN_EMAILS = 100; // ms
const DELAY_BETWEEN_UPLOADS = 50; // ms
```

### Connection Pooling

Database connection pool is configured in `config/database.js`:

```javascript
connectionLimit: 10 // Adjust based on load
```

## Security Notes

### Password Security

- Temporary passwords are cryptographically secure (32 hex characters)
- All passwords hashed with bcrypt (10 rounds)
- Password reset tokens expire after 24 hours
- Tokens are single-use only

### File Security

- File permissions maintained from original storage
- Access control enforced through API
- Private files require authentication
- Public files accessible via CDN

### Database Security

- Use parameterized queries (prevents SQL injection)
- Least privilege database user
- SSL/TLS for production connections
- Regular backups before import

## Monitoring

### Import Progress

Monitor import progress in real-time:

```bash
# Watch import logs
tail -f server/combined.log

# Check database row counts
mysql -u dev_user -p biscas_dev -e "
  SELECT 
    table_name, 
    table_rows 
  FROM information_schema.tables 
  WHERE table_schema = 'biscas_dev' 
  ORDER BY table_name;
"
```

### Verification Metrics

Key metrics to monitor:
- Row count accuracy (should be 100%)
- Foreign key integrity (0 orphaned records)
- Required field validation (0 NULL values)
- Data corruption checks (0 invalid records)

## Rollback

If import fails or data is incorrect:

### 1. Clear Imported Data

```sql
-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Truncate all tables
TRUNCATE TABLE profiles;
TRUNCATE TABLE classes;
-- ... (truncate all tables)

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
```

### 2. Re-run Import

```bash
# Re-import data
node scripts/import-supabase-data.js
node scripts/import-auth-users.js
node scripts/import-storage-files.js
```

### 3. Verify Again

```bash
node scripts/verify-data-integrity.js
```

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review script logs in `server/combined.log`
3. Check verification reports for specific issues
4. Refer to migration documentation
5. Contact development team

## Related Documentation

- [Export Scripts README](./README_EXPORT.md)
- [Database Migration Guide](../../DATABASE_MIGRATION_GUIDE.md)
- [Requirements Document](../../.kiro/specs/supabase-to-mysql-migration/requirements.md)
- [Design Document](../../.kiro/specs/supabase-to-mysql-migration/design.md)
