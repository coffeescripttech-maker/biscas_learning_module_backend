# Import Troubleshooting Guide

This guide helps resolve common issues during the data import process.

## Common Errors and Solutions

### 1. Unknown column 'email' in 'field list' (profiles table)

**Error:**
```
Unknown column 'email' in 'field list'
```

**Cause:**
The Supabase `profiles` table includes `email` and `role` fields, but in MySQL these belong in the `users` table.

**Solution:**
The import script has been updated to automatically skip these fields. If you still see this error:

1. Update to the latest import script
2. The `email` and `role` data will be imported via the `import-auth-users.js` script instead

**Status:** ✅ Fixed in latest version

---

### 2. Got a packet bigger than 'max_allowed_packet' bytes

**Error:**
```
Got a packet bigger than 'max_allowed_packet' bytes
ER_NET_PACKET_TOO_LARGE
```

**Cause:**
MySQL's `max_allowed_packet` setting is too small for large records (e.g., VARK modules with lots of content).

**Solution Option 1: Increase MySQL packet size (Recommended)**

```bash
# Run the SQL script
mysql -u root -p < server/scripts/fix-mysql-packet-size.sql

# Restart MySQL
# Windows:
net stop MySQL80
net start MySQL80

# Linux:
sudo systemctl restart mysql

# macOS:
brew services restart mysql
```

**Solution Option 2: Manual MySQL configuration**

Edit MySQL configuration file:
- Windows: `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`
- Linux: `/etc/mysql/my.cnf`
- macOS: `/usr/local/etc/my.cnf`

Add or update:
```ini
[mysqld]
max_allowed_packet=64M
```

Restart MySQL service.

**Solution Option 3: Temporary session setting**

```sql
SET GLOBAL max_allowed_packet=67108864;
```

Note: This resets after MySQL restart.

**Status:** ✅ Script now automatically uses smaller batches for large content tables

---

### 3. Database connection refused (ECONNREFUSED)

**Error:**
```
ECONNREFUSED
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Cause:**
MySQL server is not running or not accessible.

**Solution:**

1. **Check if MySQL is running:**
   ```bash
   # Windows
   sc query MySQL80
   
   # Linux
   sudo systemctl status mysql
   
   # macOS
   brew services list | grep mysql
   ```

2. **Start MySQL if not running:**
   ```bash
   # Windows
   net start MySQL80
   
   # Linux
   sudo systemctl start mysql
   
   # macOS
   brew services start mysql
   ```

3. **Verify connection:**
   ```bash
   mysql -u root -p -e "SELECT 1"
   ```

4. **Check port:**
   ```bash
   netstat -an | grep 3306
   ```

---

### 4. Access denied for user (ER_ACCESS_DENIED_ERROR)

**Error:**
```
ER_ACCESS_DENIED_ERROR
Access denied for user 'dev_user'@'localhost'
```

**Cause:**
Incorrect database credentials or insufficient permissions.

**Solution:**

1. **Verify credentials in `.env.development`:**
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=dev_user
   DB_PASSWORD=your_password
   DB_NAME=biscas_dev
   ```

2. **Test credentials:**
   ```bash
   mysql -u dev_user -p -h localhost
   ```

3. **Grant permissions if needed:**
   ```sql
   -- Login as root
   mysql -u root -p
   
   -- Grant all privileges
   GRANT ALL PRIVILEGES ON biscas_dev.* TO 'dev_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Create user if doesn't exist:**
   ```sql
   CREATE USER 'dev_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON biscas_dev.* TO 'dev_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

---

### 5. Foreign key constraint fails

**Error:**
```
DB_FOREIGN_KEY_VIOLATION
Cannot add or update a child row: a foreign key constraint fails
```

**Cause:**
Referenced record doesn't exist (e.g., trying to insert profile with non-existent user_id).

**Solution:**

1. **Import tables in correct order:**
   The script already handles this, but ensure you're running:
   ```bash
   # First import users
   node scripts/import-auth-users.js
   
   # Then import other data
   node scripts/import-supabase-data.js
   ```

2. **Check for orphaned records:**
   ```bash
   node scripts/verify-data-integrity.js
   ```

3. **Temporarily disable foreign key checks (use with caution):**
   ```sql
   SET FOREIGN_KEY_CHECKS = 0;
   -- Run import
   SET FOREIGN_KEY_CHECKS = 1;
   ```

---

### 6. Duplicate entry error

**Error:**
```
DB_DUPLICATE_ENTRY
Duplicate entry 'xxx' for key 'PRIMARY'
```

**Cause:**
Record with same primary key already exists.

**Solution:**

This is normal behavior. The script automatically:
1. Skips duplicate records
2. Continues with remaining records
3. Reports skipped count in summary

If you want to re-import:
```sql
-- Clear table data
TRUNCATE TABLE table_name;

-- Re-run import
node scripts/import-supabase-data.js
```

---

### 7. Export files not found

**Error:**
```
Export file not found: profiles.json
```

**Cause:**
Export scripts haven't been run yet.

**Solution:**

Run export scripts first:
```bash
# Export all data
node scripts/export-supabase-data.js

# Export auth users
node scripts/export-supabase-auth.js

# Export storage files
node scripts/export-supabase-storage.js
```

---

### 8. Database doesn't exist

**Error:**
```
Unknown database 'biscas_dev'
```

**Cause:**
Database hasn't been created yet.

**Solution:**

```sql
-- Login as root
mysql -u root -p

-- Create database
CREATE DATABASE IF NOT EXISTS biscas_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Verify
SHOW DATABASES LIKE 'biscas_dev';
```

---

### 9. Tables don't exist

**Error:**
```
Table 'biscas_dev.users' doesn't exist
```

**Cause:**
Database schema hasn't been created.

**Solution:**

Run migration script:
```bash
# Check if migration script exists
ls server/migrations/001_create_mysql_schema.sql

# Run migration
mysql -u dev_user -p biscas_dev < server/migrations/001_create_mysql_schema.sql

# Verify tables
mysql -u dev_user -p biscas_dev -e "SHOW TABLES;"
```

---

### 10. JSON parsing error

**Error:**
```
Unexpected token in JSON at position X
```

**Cause:**
Corrupted export file or invalid JSON.

**Solution:**

1. **Validate JSON file:**
   ```bash
   # Linux/macOS
   cat exports/data/table_name.json | jq .
   
   # Or use online validator
   ```

2. **Re-export the table:**
   ```bash
   node scripts/export-supabase-data.js
   ```

3. **Check file encoding:**
   Ensure files are UTF-8 encoded.

---

### 11. Email sending fails

**Error:**
```
Error: Invalid login
SMTP connection failed
```

**Cause:**
Incorrect SMTP credentials or configuration.

**Solution:**

1. **Verify SMTP settings in `.env.development`:**
   ```env
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USER=your_username
   EMAIL_PASSWORD=your_password
   EMAIL_FROM=noreply@biscas.edu
   ```

2. **Test SMTP connection:**
   ```bash
   telnet smtp.mailtrap.io 2525
   ```

3. **Use Mailtrap for testing:**
   - Sign up at https://mailtrap.io
   - Get SMTP credentials
   - Update `.env.development`

4. **Check firewall:**
   Ensure port 2525 (or 587) is not blocked.

---

### 12. Storage upload fails (S3)

**Error:**
```
Failed to upload to S3: Access Denied
```

**Cause:**
Incorrect AWS credentials or insufficient permissions.

**Solution:**

1. **Verify AWS credentials:**
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_S3_BUCKET=your_bucket
   ```

2. **Check IAM permissions:**
   Ensure IAM user has:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`

3. **Verify bucket exists:**
   ```bash
   aws s3 ls s3://your-bucket-name
   ```

4. **Test AWS CLI:**
   ```bash
   aws s3 cp test.txt s3://your-bucket-name/test.txt
   ```

---

### 13. Storage upload fails (Local)

**Error:**
```
EACCES: permission denied
```

**Cause:**
Insufficient permissions to write to storage directory.

**Solution:**

1. **Check directory permissions:**
   ```bash
   ls -la server/uploads
   ```

2. **Create directory if missing:**
   ```bash
   mkdir -p server/uploads
   ```

3. **Fix permissions:**
   ```bash
   # Linux/macOS
   chmod 755 server/uploads
   
   # Windows (run as administrator)
   icacls server\uploads /grant Users:F
   ```

---

### 14. Verification fails

**Error:**
```
OVERALL STATUS: FAILED
Row count mismatch
```

**Cause:**
Data wasn't imported correctly or some records were skipped.

**Solution:**

1. **Review verification report:**
   ```bash
   cat server/exports/data/_verification_report.json
   ```

2. **Check import summary:**
   ```bash
   cat server/exports/data/_import_summary.json
   ```

3. **Identify specific issues:**
   - Row count mismatches: Re-import specific tables
   - Foreign key violations: Check referenced records exist
   - NULL values: Check required fields

4. **Re-import if needed:**
   ```bash
   # Clear and re-import specific table
   mysql -u dev_user -p biscas_dev -e "TRUNCATE TABLE table_name;"
   node scripts/import-supabase-data.js
   ```

---

## Performance Issues

### Slow import speed

**Symptoms:**
- Import takes very long
- High CPU/memory usage

**Solutions:**

1. **Increase batch size:**
   Edit `import-supabase-data.js`:
   ```javascript
   const BATCH_SIZE = 500; // Increase from 100
   ```

2. **Disable foreign key checks temporarily:**
   ```sql
   SET FOREIGN_KEY_CHECKS = 0;
   -- Run import
   SET FOREIGN_KEY_CHECKS = 1;
   ```

3. **Increase connection pool:**
   Edit `server/src/config/database.js`:
   ```javascript
   connectionLimit: 20 // Increase from 10
   ```

4. **Use faster storage:**
   - SSD instead of HDD
   - Local storage instead of network drive

---

## Getting Help

If you're still experiencing issues:

1. **Check logs:**
   ```bash
   tail -f server/combined.log
   tail -f server/error.log
   ```

2. **Enable debug logging:**
   ```env
   LOG_LEVEL=debug
   ```

3. **Run test script:**
   ```bash
   node scripts/test-import-scripts.js
   ```

4. **Review documentation:**
   - [Import README](./README_IMPORT.md)
   - [Quick Start Guide](./QUICK_START_IMPORT.md)
   - [Migration Guide](../../DATABASE_MIGRATION_GUIDE.md)

5. **Contact support:**
   - Include error messages
   - Include relevant log files
   - Include verification report if available
