# Supabase Data Export Scripts

This directory contains scripts for exporting all data from Supabase in preparation for migration to MySQL + Express.

## Overview

The export process consists of three main components:

1. **Database Tables** - Export all PostgreSQL tables to JSON
2. **Authentication Data** - Export user accounts from Supabase Auth
3. **Storage Files** - Download all files from Supabase Storage

## Prerequisites

### Required Dependencies

Install the required npm packages:

```bash
cd server
npm install @supabase/supabase-js dotenv
```

### Environment Variables

Ensure the following variables are set in your root `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**⚠️ Important:** Use the **service role key**, not the anon key, as it has admin privileges needed for export.

## Export Scripts

### 1. Export Database Tables

**Script:** `export-supabase-data.js`

Exports all database tables to JSON files with pagination support.

**Usage:**
```bash
node scripts/export-supabase-data.js
```

**Output:**
- Location: `server/exports/data/`
- Files: One JSON file per table (e.g., `profiles.json`, `vark_modules.json`)
- Summary: `_export_summary.json`

**Features:**
- Handles large tables with pagination (1000 records per batch)
- Respects foreign key dependencies
- Skips non-existent tables
- Provides detailed progress reporting
- Generates export statistics

**Tables Exported:**
- profiles
- classes, class_students
- lessons, lesson_progress
- quizzes, quiz_questions, quiz_results
- activities, submissions
- announcements
- vark_modules, vark_module_sections, vark_module_progress
- And more...

### 2. Export Authentication Data

**Script:** `export-supabase-auth.js`

Exports user authentication data with password migration strategy.

**Usage:**
```bash
node scripts/export-supabase-auth.js
```

**Output:**
- Location: `server/exports/auth/`
- Files:
  - `supabase_auth_users_raw.json` - Raw Supabase auth data
  - `users_for_migration.json` - Transformed data for import
  - `password_reset_list.json` - Temporary passwords for users
  - `users_migration.csv` - Human-readable format
  - `_auth_export_summary.json` - Export statistics
  - `MIGRATION_INSTRUCTIONS.txt` - Detailed migration guide

**Password Migration Strategy:**

Since Supabase password hashes cannot be directly exported, this script implements a **force password reset** strategy:

1. Each user is assigned a secure temporary password
2. Users are imported into MySQL with these temporary passwords
3. Password reset emails are sent to all users
4. Users set new passwords on first login

**Security:**
- Temporary passwords are cryptographically secure (32 hex characters)
- Passwords are hashed with bcrypt (10 rounds)
- Reset tokens expire after 24 hours
- Keep `password_reset_list.json` secure!

### 3. Export Storage Files

**Script:** `export-supabase-storage.js`

Downloads all files from Supabase Storage buckets.

**Usage:**
```bash
node scripts/export-supabase-storage.js
```

**Output:**
- Location: `server/exports/storage/`
- Structure: Maintains original bucket and folder structure
- Files:
  - Downloaded files in respective bucket folders
  - `_manifest.json` in each bucket folder
  - `_url_mapping.json` - URL mapping for database updates
  - `_storage_export_summary.json` - Export statistics
  - `MIGRATION_INSTRUCTIONS.txt` - Migration guide

**Features:**
- Discovers all buckets automatically
- Maintains directory structure
- Generates URL mapping for migration
- Handles large files
- Rate limiting to avoid API throttling

**Common Buckets:**
- avatars
- profile-photos
- module-images
- module-content
- submissions
- attachments

### 4. Master Export Script

**Script:** `export-all.js`

Runs all three export scripts in sequence.

**Usage:**
```bash
# Export everything
node scripts/export-all.js

# Export only database tables
node scripts/export-all.js --data-only

# Export only authentication data
node scripts/export-all.js --auth-only

# Export only storage files
node scripts/export-all.js --storage-only
```

**Output:**
- Runs all exports in order
- Generates master summary: `exports/_master_export_summary.json`
- Provides consolidated statistics

## Export Directory Structure

After running the exports, you'll have:

```
server/exports/
├── data/
│   ├── profiles.json
│   ├── vark_modules.json
│   ├── classes.json
│   ├── ... (all tables)
│   └── _export_summary.json
├── auth/
│   ├── supabase_auth_users_raw.json
│   ├── users_for_migration.json
│   ├── password_reset_list.json
│   ├── users_migration.csv
│   ├── _auth_export_summary.json
│   └── MIGRATION_INSTRUCTIONS.txt
├── storage/
│   ├── avatars/
│   │   ├── user1.jpg
│   │   └── _manifest.json
│   ├── module-images/
│   │   └── ...
│   ├── _url_mapping.json
│   ├── _storage_export_summary.json
│   └── MIGRATION_INSTRUCTIONS.txt
└── _master_export_summary.json
```

## Step-by-Step Export Process

### Step 1: Prepare Environment

1. Ensure Supabase credentials are in `.env.local`
2. Install dependencies: `npm install`
3. Create backup of current Supabase data (optional but recommended)

### Step 2: Run Export

**Option A: Export Everything (Recommended)**
```bash
node scripts/export-all.js
```

**Option B: Export Individually**
```bash
# Export database tables
node scripts/export-supabase-data.js

# Export authentication data
node scripts/export-supabase-auth.js

# Export storage files
node scripts/export-supabase-storage.js
```

### Step 3: Verify Export

1. Check the export summaries:
   - `exports/data/_export_summary.json`
   - `exports/auth/_auth_export_summary.json`
   - `exports/storage/_storage_export_summary.json`
   - `exports/_master_export_summary.json`

2. Verify record counts match your expectations

3. Check for any errors or skipped items

4. Verify file sizes are reasonable

### Step 4: Secure Sensitive Data

**⚠️ CRITICAL:** The following files contain sensitive data:

- `exports/auth/password_reset_list.json` - Contains temporary passwords
- `exports/auth/supabase_auth_users_raw.json` - Contains user metadata

**Security measures:**
- Store exports in a secure location
- Encrypt sensitive files
- Limit access to authorized personnel only
- Delete temporary passwords after migration
- Do not commit exports to version control

### Step 5: Review Migration Instructions

Read the migration instructions in each export directory:
- `exports/auth/MIGRATION_INSTRUCTIONS.txt`
- `exports/storage/MIGRATION_INSTRUCTIONS.txt`

## Troubleshooting

### Error: Missing Supabase credentials

**Solution:** Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`

### Error: Table does not exist

**Solution:** This is normal. The script will skip tables that don't exist in your Supabase database.

### Error: Rate limiting

**Solution:** The scripts include delays between requests. If you still hit rate limits, increase the `DELAY_BETWEEN_BATCHES` constant in the scripts.

### Error: File download failed

**Solution:** 
- Check your internet connection
- Verify the file exists in Supabase Storage
- Check Supabase Storage permissions
- Try running the storage export again (it will skip already downloaded files)

### Error: Out of memory

**Solution:**
- The scripts use pagination to avoid memory issues
- If you still encounter problems, reduce `PAGE_SIZE` in the scripts
- Export tables individually instead of all at once

## Performance Considerations

### Database Export
- **Time:** ~1-5 minutes for small databases, longer for large ones
- **Factors:** Number of tables, records per table, network speed
- **Optimization:** Runs in batches of 1000 records

### Authentication Export
- **Time:** ~30 seconds to 2 minutes
- **Factors:** Number of users
- **Optimization:** Paginated requests

### Storage Export
- **Time:** Varies greatly based on file count and sizes
- **Factors:** Number of files, total size, network speed
- **Optimization:** Downloads files sequentially with rate limiting

### Complete Export
- **Typical time:** 5-30 minutes depending on data volume
- **Recommendation:** Run during off-peak hours

## Next Steps After Export

1. **Verify Data Integrity**
   - Review all export summaries
   - Check record counts
   - Verify file downloads

2. **Prepare MySQL Database**
   - Run schema migration: `node migrations/run-migration.js`
   - Verify tables created successfully

3. **Import Data**
   - Run import scripts (to be created in Phase 16)
   - Verify data imported correctly

4. **Migrate Users**
   - Import user accounts
   - Send password reset emails

5. **Migrate Files**
   - Upload files to new storage (local or S3)
   - Update database URLs

6. **Test Migration**
   - Verify all data accessible
   - Test authentication
   - Test file access

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the migration documentation
3. Check export summary files for error details
4. Contact the development team

## Related Documentation

- [Migration Plan](../../.kiro/specs/supabase-to-mysql-migration/requirements.md)
- [Design Document](../../.kiro/specs/supabase-to-mysql-migration/design.md)
- [Task List](../../.kiro/specs/supabase-to-mysql-migration/tasks.md)
- [Database Schema](../migrations/001_create_mysql_schema.sql)

## Version History

- **v1.0.0** - Initial export scripts
  - Database table export
  - Authentication data export
  - Storage file export
  - Master export script

---

**Last Updated:** January 2025
**Maintainer:** Development Team
