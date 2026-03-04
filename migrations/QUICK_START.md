# Quick Start Guide - MySQL Migration

Get your MySQL database up and running in 5 minutes!

## Prerequisites

✅ MySQL 8.0+ installed and running  
✅ Node.js 14+ installed  
✅ Database created  

## Step 1: Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE biscas_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Exit MySQL
exit;
```

## Step 2: Configure Environment

Edit `server/.env.development`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=biscas_learning
DB_USER=root
DB_PASSWORD=your_password
```

## Step 3: Install Dependencies

```bash
cd server
npm install mysql2 dotenv
```

## Step 4: Run Migration

```bash
# Run the migration
node migrations/run-migration.js
```

You should see:
```
✅ MIGRATION COMPLETED SUCCESSFULLY!
📊 Summary:
   • Total tables created: 30
```

## Step 5: Verify Migration

```bash
# Run tests
node migrations/test-migration.js
```

Expected output:
```
✅ Tests Passed: 5
📈 Success Rate: 100%
🎉 All tests passed! Migration is successful!
```

## Step 6: Test Connection

```bash
# Test database connection from your app
node test-database-connection.js
```

## Done! 🎉

Your MySQL database is ready to use!

## Next Steps

1. **Import Data** - Run data export/import scripts (Phase 7)
2. **Update App** - Configure your Express.js app to use MySQL
3. **Test** - Run integration tests
4. **Deploy** - Deploy to staging environment

## Troubleshooting

### Can't connect to MySQL?

```bash
# Check if MySQL is running
mysql -u root -p -e "SELECT 1"

# Check your credentials in .env.development
```

### Tables already exist?

```bash
# Rollback and try again
node migrations/run-migration.js rollback
node migrations/run-migration.js
```

### Permission denied?

```sql
-- Grant permissions to your user
GRANT ALL PRIVILEGES ON biscas_learning.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

## Need Help?

- 📖 Read [README.md](./README.md) for detailed documentation
- 📝 Check [CONVERSION_NOTES.md](./CONVERSION_NOTES.md) for technical details
- 🐛 Review error messages carefully - they usually tell you what's wrong

## Rollback

If something goes wrong:

```bash
node migrations/run-migration.js rollback
```

⚠️ **WARNING**: This will delete all tables and data!
