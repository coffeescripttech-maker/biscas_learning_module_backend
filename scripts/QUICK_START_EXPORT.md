# Quick Start: Supabase Data Export

## Prerequisites

1. **Environment Variables** - Ensure these are set in root `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Dependencies** - Install required packages:
   ```bash
   cd server
   npm install
   ```

## Step 1: Verify Setup

Run the setup test to ensure everything is configured:

```bash
node scripts/test-export-setup.js
```

Expected output:
```
✅ All checks passed!
✅ NEXT_PUBLIC_SUPABASE_URL: configured
✅ SUPABASE_SERVICE_ROLE_KEY: configured
✅ @supabase/supabase-js is installed
✅ All export scripts exist
✅ Successfully connected to Supabase
```

## Step 2: Run Export

### Option A: Export Everything (Recommended)

```bash
node scripts/export-all.js
```

This will:
1. Export all database tables → `exports/data/`
2. Export authentication data → `exports/auth/`
3. Export storage files → `exports/storage/`
4. Generate master summary → `exports/_master_export_summary.json`

### Option B: Export Individually

```bash
# Export database tables only
node scripts/export-supabase-data.js

# Export authentication data only
node scripts/export-supabase-auth.js

# Export storage files only
node scripts/export-supabase-storage.js
```

### Option C: Selective Export

```bash
# Export only database tables
node scripts/export-all.js --data-only

# Export only authentication data
node scripts/export-all.js --auth-only

# Export only storage files
node scripts/export-all.js --storage-only
```

## Step 3: Verify Export

Check the export summaries:

```bash
# View master summary
cat exports/_master_export_summary.json

# View database export summary
cat exports/data/_export_summary.json

# View auth export summary
cat exports/auth/_auth_export_summary.json

# View storage export summary
cat exports/storage/_storage_export_summary.json
```

## Step 4: Review Results

### Database Export
- Location: `server/exports/data/`
- Check: Record counts match expectations
- Files: One JSON file per table

### Authentication Export
- Location: `server/exports/auth/`
- Check: User count matches Supabase
- **IMPORTANT:** Secure `password_reset_list.json`

### Storage Export
- Location: `server/exports/storage/`
- Check: File count and sizes
- Structure: Organized by bucket

## Common Issues

### Issue: Missing credentials
**Error:** `Missing Supabase credentials`
**Fix:** Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

### Issue: Connection failed
**Error:** `Failed to connect to Supabase`
**Fix:** 
- Check internet connection
- Verify Supabase URL is correct
- Verify service role key is correct (not anon key)

### Issue: Table not found
**Message:** `Table does not exist, skipping...`
**Fix:** This is normal - script skips tables that don't exist in your database

### Issue: Rate limiting
**Error:** `Too many requests`
**Fix:** Script includes delays. If still occurring, wait a few minutes and retry.

## Security Checklist

After export, ensure:

- [ ] `exports/` directory is not committed to git
- [ ] `password_reset_list.json` is stored securely
- [ ] Sensitive files are encrypted if stored long-term
- [ ] Access is limited to authorized personnel
- [ ] Temporary passwords will be deleted after migration

## Next Steps

1. ✅ Export completed
2. ⏭️ Review export summaries
3. ⏭️ Verify data integrity
4. ⏭️ Run import scripts (Task 16)
5. ⏭️ Test migrated data
6. ⏭️ Send password reset emails to users

## Need Help?

- **Full Documentation:** See `README_EXPORT.md`
- **Migration Instructions:** Check `MIGRATION_INSTRUCTIONS.txt` in each export directory
- **Task Summary:** See `TASK_15_SUMMARY.md`

## Estimated Time

- **Setup & Verification:** 2-5 minutes
- **Small Database:** 5-10 minutes
- **Medium Database:** 10-30 minutes
- **Large Database:** 30-60+ minutes

**Tip:** Run during off-peak hours for large databases.

---

**Last Updated:** January 2025
