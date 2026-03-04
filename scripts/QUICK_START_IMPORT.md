# Quick Start: Data Import

This guide provides a quick reference for running the data import process.

## Prerequisites Checklist

- [ ] MySQL server is running
- [ ] Database schema has been created
- [ ] Export scripts have been run
- [ ] `.env.development` is configured
- [ ] npm packages are installed (`npm install`)

## Quick Import Commands

Run these commands in order:

```bash
# 1. Import table data (5-10 minutes)
node scripts/import-supabase-data.js

# 2. Import user accounts (2-5 minutes)
node scripts/import-auth-users.js

# 3. Import storage files (varies by file count)
node scripts/import-storage-files.js

# 4. Verify data integrity (1-2 minutes)
node scripts/verify-data-integrity.js

# 5. Send password reset emails (5-10 minutes)
node scripts/send-password-resets.js
```

## Expected Output

### 1. Data Import
```
✅ Successfully imported: 25 tables
📝 Total records imported: 15,234
⏱️  Duration: 8.5 seconds
```

### 2. User Import
```
✅ Users created: 150
🔑 Reset tokens created: 150
⏱️  Duration: 12.3 seconds
```

### 3. Storage Import
```
✅ Files uploaded: 1,234
🔄 Records updated: 1,234
⏱️  Duration: 45.2 seconds
```

### 4. Verification
```
OVERALL STATUS: PASSED
✅ All verification checks passed!
```

### 5. Email Sending
```
✅ Emails sent: 150/150
📈 Success rate: 100%
⏱️  Duration: 18.7 seconds
```

## Troubleshooting Quick Fixes

### Database Connection Failed
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"

# Verify credentials
cat .env.development | grep DB_
```

### Export Files Not Found
```bash
# Run export scripts first
node scripts/export-supabase-data.js
node scripts/export-supabase-auth.js
node scripts/export-supabase-storage.js
```

### Duplicate Entry Errors
```
# Normal - script automatically skips duplicates
# Check summary for skipped count
```

### Verification Failed
```bash
# Review detailed report
cat exports/data/_verification_report.json

# Check specific issues
cat exports/data/_verification_summary.txt
```

## Verification Checklist

After import, verify:

- [ ] Row counts match export counts
- [ ] No foreign key violations
- [ ] No NULL values in required fields
- [ ] No data corruption detected
- [ ] Users can reset passwords
- [ ] Files are accessible

## Next Steps

After successful import:

1. Test user login with password reset
2. Verify file access through API
3. Run application smoke tests
4. Monitor for any issues
5. Keep Supabase as backup for 2 weeks

## Emergency Rollback

If something goes wrong:

```bash
# 1. Stop the import process (Ctrl+C)

# 2. Clear imported data
mysql -u dev_user -p biscas_dev < scripts/rollback-import.sql

# 3. Fix the issue

# 4. Re-run import
node scripts/import-supabase-data.js
```

## Support

For detailed documentation, see:
- [Import Scripts README](./README_IMPORT.md)
- [Export Scripts README](./README_EXPORT.md)
- [Migration Guide](../../DATABASE_MIGRATION_GUIDE.md)

## Time Estimates

| Task | Small DB | Medium DB | Large DB |
|------|----------|-----------|----------|
| Data Import | 1-2 min | 5-10 min | 20-30 min |
| User Import | 1 min | 2-5 min | 10-15 min |
| Storage Import | 2-5 min | 10-20 min | 30-60 min |
| Verification | 1 min | 1-2 min | 2-5 min |
| Email Sending | 2-5 min | 5-10 min | 15-30 min |
| **Total** | **7-14 min** | **23-47 min** | **77-140 min** |

*Small DB: <1,000 records, <100 files*  
*Medium DB: 1,000-10,000 records, 100-1,000 files*  
*Large DB: >10,000 records, >1,000 files*
