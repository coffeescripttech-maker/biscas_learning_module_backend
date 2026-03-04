# Correct Import Order

⚠️ **IMPORTANT**: You must import data in this specific order to avoid foreign key constraint errors.

## Step-by-Step Import Process

### Step 1: Import Users First (REQUIRED)

```bash
node scripts/import-auth-users.js
```

**Why first?**
- The `profiles` table has a foreign key to `users.id`
- Other tables reference `users` and `profiles`
- Must create users before any dependent data

**Expected output:**
```
✅ Users created: 60
🔑 Reset tokens created: 60
```

---

### Step 2: Fix MySQL Packet Size (REQUIRED for large content)

```bash
# Option A: Run SQL script (recommended)
mysql -u root -p < server/scripts/fix-mysql-packet-size.sql

# Then restart MySQL
# Windows:
net stop MySQL80
net start MySQL80

# Linux:
sudo systemctl restart mysql

# macOS:
brew services restart mysql
```

**Why needed?**
- VARK modules contain large content (HTML, images, etc.)
- Default MySQL packet size (4MB) is too small
- Increases to 64MB to handle large records

---

### Step 3: Import Table Data

```bash
node scripts/import-supabase-data.js
```

**What it imports:**
- Profiles (now that users exist)
- VARK modules (now that packet size is increased)
- All other tables

**Expected output:**
```
✅ Successfully imported: X tables
📝 Total records imported: XXX
```

---

### Step 4: Import Storage Files (Optional)

```bash
node scripts/import-storage-files.js
```

**What it does:**
- Uploads files to local storage or S3
- Updates file URLs in database

---

### Step 5: Verify Data Integrity

```bash
node scripts/verify-data-integrity.js
```

**What it checks:**
- Row counts match exports
- Foreign keys are valid
- No NULL values in required fields
- No data corruption

**Expected output:**
```
OVERALL STATUS: PASSED
✅ All verification checks passed!
```

---

### Step 6: Send Password Reset Emails

```bash
node scripts/send-password-resets.js
```

**What it does:**
- Sends password reset emails to all users
- Users can set their own passwords

---

## Quick Command Sequence

```bash
# 1. Import users
node scripts/import-auth-users.js

# 2. Fix packet size (in separate terminal as root)
mysql -u root -p < server/scripts/fix-mysql-packet-size.sql
# Then restart MySQL

# 3. Import data
node scripts/import-supabase-data.js

# 4. Import files (optional)
node scripts/import-storage-files.js

# 5. Verify
node scripts/verify-data-integrity.js

# 6. Send emails
node scripts/send-password-resets.js
```

---

## Troubleshooting

### "Foreign key constraint fails" on profiles

**Problem:** Users table is empty

**Solution:** Run `import-auth-users.js` first

---

### "Packet bigger than max_allowed_packet"

**Problem:** MySQL packet size too small

**Solution:** 
1. Run `fix-mysql-packet-size.sql`
2. Restart MySQL
3. Re-run import

---

### "Export file not found"

**Problem:** Export scripts haven't been run

**Solution:** Run export scripts first:
```bash
node scripts/export-supabase-data.js
node scripts/export-supabase-auth.js
node scripts/export-supabase-storage.js
```

---

## Why This Order Matters

```
users (no dependencies)
  ↓
profiles (depends on users)
  ↓
classes (depends on users)
  ↓
class_students (depends on classes, profiles)
  ↓
vark_modules (depends on users)
  ↓
... (other tables)
```

The import script respects this order, but **users must be imported separately first** because they come from Supabase Auth, not the regular database tables.
