# PostgreSQL to MySQL Conversion Notes

This document details all the conversion decisions made when migrating from PostgreSQL/Supabase to MySQL.

## Data Type Conversions

### UUID → CHAR(36)

**PostgreSQL:**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**MySQL:**
```sql
id CHAR(36) PRIMARY KEY
```

**Rationale:**
- MySQL 8.0+ doesn't have native UUID type
- CHAR(36) stores UUID as string with hyphens (e.g., "550e8400-e29b-41d4-a716-446655440000")
- Alternative: BINARY(16) for storage efficiency, but CHAR(36) is more readable and easier to debug
- UUIDs will be generated in application code using libraries like `uuid` package

**Migration Impact:**
- Application must generate UUIDs before INSERT
- Existing UUIDs from PostgreSQL can be directly copied (already in string format)

### JSONB → JSON

**PostgreSQL:**
```sql
options JSONB
```

**MySQL:**
```sql
options JSON
```

**Rationale:**
- MySQL 5.7+ has native JSON support
- MySQL JSON type provides similar functionality to PostgreSQL JSONB
- Automatic validation and binary storage
- Supports JSON functions (JSON_EXTRACT, JSON_SET, etc.)

**Migration Impact:**
- JSON data can be directly copied
- Query syntax differs slightly:
  - PostgreSQL: `data->>'key'`
  - MySQL: `JSON_EXTRACT(data, '$.key')` or `data->>'$.key'`

### TIMESTAMP WITH TIME ZONE → DATETIME

**PostgreSQL:**
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**MySQL:**
```sql
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Rationale:**
- MySQL DATETIME doesn't store timezone information
- Store all timestamps in UTC
- Convert to local timezone in application layer
- DATETIME range: '1000-01-01' to '9999-12-31' (sufficient for our use case)

**Migration Impact:**
- Convert all PostgreSQL timestamps to UTC before import
- Application must handle timezone conversions
- Use libraries like `moment-timezone` or `date-fns-tz`

### TEXT → TEXT

**PostgreSQL:**
```sql
description TEXT
```

**MySQL:**
```sql
description TEXT
```

**Rationale:**
- Direct mapping, no conversion needed
- MySQL TEXT can store up to 65,535 characters
- For larger content, consider MEDIUMTEXT (16MB) or LONGTEXT (4GB)

**Migration Impact:**
- No changes needed for data migration
- Content length limits are similar

### SERIAL → INT AUTO_INCREMENT

**PostgreSQL:**
```sql
id SERIAL PRIMARY KEY
```

**MySQL:**
```sql
id INT AUTO_INCREMENT PRIMARY KEY
```

**Rationale:**
- SERIAL is PostgreSQL-specific syntax
- MySQL uses AUTO_INCREMENT for auto-incrementing integers
- Both start at 1 by default

**Migration Impact:**
- Sequence values can be preserved during migration
- Use `ALTER TABLE table_name AUTO_INCREMENT = value` to set starting point

### BOOLEAN → BOOLEAN (TINYINT(1))

**PostgreSQL:**
```sql
is_published BOOLEAN DEFAULT FALSE
```

**MySQL:**
```sql
is_published BOOLEAN DEFAULT FALSE
```

**Rationale:**
- MySQL BOOLEAN is an alias for TINYINT(1)
- Stores 0 (false) or 1 (true)
- Compatible with PostgreSQL boolean values

**Migration Impact:**
- PostgreSQL true/false converts to 1/0
- Application should use boolean comparisons (works transparently)

### ENUM Types

**PostgreSQL:**
```sql
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
role user_role NOT NULL;
```

**MySQL:**
```sql
role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student'
```

**Rationale:**
- MySQL has native ENUM support
- PostgreSQL custom types converted to inline ENUM definitions
- MySQL ENUMs are stored as integers internally (efficient)

**Migration Impact:**
- ENUM values are case-sensitive in MySQL
- Adding new values requires ALTER TABLE
- Consider VARCHAR with CHECK constraint for more flexibility

### DECIMAL

**PostgreSQL:**
```sql
score DECIMAL(10,2)
```

**MySQL:**
```sql
score DECIMAL(10,2)
```

**Rationale:**
- Direct mapping, identical behavior
- DECIMAL(10,2) = 10 total digits, 2 after decimal point

**Migration Impact:**
- No conversion needed

## Removed PostgreSQL Features

### Row Level Security (RLS)

**PostgreSQL:**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

**MySQL:**
- No native RLS support
- Implement in application layer

**Rationale:**
- MySQL doesn't have RLS
- Security must be enforced in application code
- Use middleware to check user permissions before queries

**Migration Impact:**
- All RLS policies must be reimplemented in Express.js middleware
- Authentication middleware checks user permissions
- More flexible but requires careful implementation

### Triggers and Functions

**PostgreSQL:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**MySQL:**
```sql
-- Handled by ON UPDATE CURRENT_TIMESTAMP
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**Rationale:**
- MySQL has simpler syntax for updated_at columns
- ON UPDATE CURRENT_TIMESTAMP automatically updates the column
- No need for triggers for this common pattern

**Migration Impact:**
- Remove trigger-based updated_at logic
- Use column-level ON UPDATE CURRENT_TIMESTAMP
- Complex triggers need to be rewritten in MySQL syntax or moved to application

### Array Types

**PostgreSQL:**
```sql
tags TEXT[]
```

**MySQL:**
```sql
tags JSON
```

**Rationale:**
- MySQL doesn't have native array types
- Use JSON arrays instead: `["tag1", "tag2", "tag3"]`
- JSON provides similar functionality with validation

**Migration Impact:**
- Convert PostgreSQL arrays to JSON arrays
- Update queries to use JSON functions
- Example: `JSON_CONTAINS(tags, '"tag1"')`

### Supabase Auth Integration

**PostgreSQL:**
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
```

**MySQL:**
```sql
-- auth.users doesn't exist, use our users table
id CHAR(36) PRIMARY KEY
user_id CHAR(36) REFERENCES users(id) ON DELETE CASCADE
```

**Rationale:**
- Supabase provides auth.users table
- We create our own users table in MySQL
- Profiles reference users table instead

**Migration Impact:**
- User authentication completely reimplemented
- JWT-based auth replaces Supabase Auth
- User IDs preserved during migration

## Index Strategy

### Primary Keys

All tables use appropriate primary keys:
- Single column: `id CHAR(36) PRIMARY KEY`
- Composite: `PRIMARY KEY (class_id, student_id)`

### Foreign Key Indexes

MySQL automatically creates indexes on foreign key columns, but we explicitly define them for clarity:

```sql
INDEX idx_user_id (user_id),
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

### Query Optimization Indexes

Added indexes for common query patterns:

```sql
-- For filtering by status
INDEX idx_status (status)

-- For date range queries
INDEX idx_created_at (created_at)

-- For composite queries
INDEX idx_student_module (student_id, module_id)
```

### Full-Text Search

**PostgreSQL:**
```sql
CREATE INDEX idx_title_search ON lessons USING gin(to_tsvector('english', title));
```

**MySQL:**
```sql
-- Option 1: FULLTEXT index (for MyISAM or InnoDB)
CREATE FULLTEXT INDEX idx_title_search ON lessons(title);

-- Option 2: Use application-level search (Elasticsearch, etc.)
```

**Rationale:**
- MySQL FULLTEXT search syntax differs from PostgreSQL
- Consider external search engine for complex requirements

## Foreign Key Constraints

### ON DELETE Actions

**CASCADE:**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```
- Used when child records should be deleted with parent
- Example: Delete user → delete all their profiles, progress, etc.

**SET NULL:**
```sql
FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
```
- Used when relationship is optional
- Example: Delete teacher → submissions remain but graded_by becomes NULL

**RESTRICT (default):**
- Prevents deletion if child records exist
- Not used in our schema (we prefer CASCADE or SET NULL)

### Circular References

**Self-referencing foreign keys:**
```sql
prerequisite_module_id CHAR(36),
FOREIGN KEY (prerequisite_module_id) REFERENCES vark_modules(id) ON DELETE SET NULL
```
- Modules can reference other modules as prerequisites
- ON DELETE SET NULL prevents circular deletion issues

## Character Set and Collation

**Configuration:**
```sql
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

**Rationale:**
- utf8mb4: Full Unicode support (including emojis)
- utf8mb4_unicode_ci: Case-insensitive, accent-insensitive comparisons
- InnoDB: ACID compliance, foreign key support, row-level locking

**Migration Impact:**
- All text data supports full Unicode
- Email comparisons are case-insensitive
- Emoji and special characters work correctly

## Performance Considerations

### Connection Pooling

MySQL connection pooling is essential:
```javascript
const pool = mysql.createPool({
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true
});
```

### Query Optimization

**Use prepared statements:**
```javascript
await connection.query('SELECT * FROM users WHERE email = ?', [email]);
```

**Avoid N+1 queries:**
```javascript
// Bad: N+1 queries
for (const student of students) {
  const progress = await getProgress(student.id);
}

// Good: Single query with JOIN
const studentsWithProgress = await connection.query(`
  SELECT s.*, p.progress_percentage
  FROM users s
  LEFT JOIN vark_module_progress p ON s.id = p.student_id
`);
```

### Index Usage

Monitor slow queries:
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Check queries not using indexes
SELECT * FROM mysql.slow_log WHERE sql_text NOT LIKE '%INDEX%';
```

## Testing Recommendations

### Unit Tests

Test database operations:
```javascript
describe('User Model', () => {
  it('should create user with UUID', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'hashed_password',
      role: 'student'
    });
    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
```

### Integration Tests

Test foreign key constraints:
```javascript
it('should cascade delete profile when user is deleted', async () => {
  const user = await User.create({ /* ... */ });
  const profile = await Profile.create({ user_id: user.id, /* ... */ });
  
  await User.delete(user.id);
  
  const deletedProfile = await Profile.findById(profile.id);
  expect(deletedProfile).toBeNull();
});
```

### Performance Tests

Test query performance:
```javascript
it('should query 1000 users in under 100ms', async () => {
  const start = Date.now();
  const users = await User.findAll({ limit: 1000 });
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(100);
  expect(users.length).toBe(1000);
});
```

## Common Pitfalls

### 1. Case Sensitivity

**Issue:** MySQL table names are case-sensitive on Linux, case-insensitive on Windows/Mac

**Solution:** Always use lowercase table names

### 2. Reserved Keywords

**Issue:** Words like `order`, `group`, `key` are reserved

**Solution:** Use backticks: `` `order` ``

### 3. String Comparison

**Issue:** MySQL string comparison is case-insensitive by default

**Solution:** Use BINARY for case-sensitive: `WHERE BINARY email = 'Test@example.com'`

### 4. Date Handling

**Issue:** MySQL doesn't store timezone in DATETIME

**Solution:** Always store UTC, convert in application

### 5. JSON Queries

**Issue:** Different syntax from PostgreSQL

**Solution:** Learn MySQL JSON functions:
```sql
-- PostgreSQL: data->>'key'
-- MySQL: JSON_UNQUOTE(JSON_EXTRACT(data, '$.key'))
-- MySQL shorthand: data->>'$.key'
```

## Migration Checklist

- [x] Convert all data types
- [x] Create all tables with proper structure
- [x] Add all indexes for performance
- [x] Set up foreign key constraints
- [x] Configure character set (utf8mb4)
- [x] Remove PostgreSQL-specific features (RLS, triggers)
- [x] Create migration and rollback scripts
- [x] Document all conversion decisions
- [ ] Test migration on development database
- [ ] Verify data integrity after migration
- [ ] Update application code for MySQL
- [ ] Performance test with production-like data
- [ ] Create backup and rollback procedures

## References

- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)
- [PostgreSQL to MySQL Migration](https://dev.mysql.com/doc/workbench/en/wb-migration-database-postgresql.html)
- [MySQL JSON Functions](https://dev.mysql.com/doc/refman/8.0/en/json-functions.html)
- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
