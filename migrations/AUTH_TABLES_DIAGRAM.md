# Authentication Tables - Entity Relationship Diagram

## Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         users                                │
├─────────────────────────────────────────────────────────────┤
│ PK  id                    CHAR(36)                          │
│ UNI email                 VARCHAR(255)  NOT NULL            │
│     password_hash         VARCHAR(255)  NOT NULL            │
│     role                  ENUM('student','teacher','admin') │
│     email_verified        BOOLEAN       DEFAULT FALSE       │
│     created_at            DATETIME      DEFAULT NOW()       │
│     updated_at            DATETIME      ON UPDATE NOW()     │
│     last_login            DATETIME                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                ┌─────────────┴─────────────┐
                │                           │
                │ *                         │ *
                ▼                           ▼
┌───────────────────────────────┐  ┌──────────────────────────────┐
│     refresh_tokens            │  │  password_reset_tokens       │
├───────────────────────────────┤  ├──────────────────────────────┤
│ PK  id           INT AUTO_INC │  │ PK  id          INT AUTO_INC │
│ FK  user_id      CHAR(36)     │  │ FK  user_id     CHAR(36)     │
│ IDX token        VARCHAR(500) │  │ IDX token       VARCHAR(255) │
│ IDX expires_at   DATETIME     │  │     expires_at  DATETIME     │
│     created_at   DATETIME     │  │     used        BOOLEAN      │
└───────────────────────────────┘  │     created_at  DATETIME     │
                                   └──────────────────────────────┘
```

## Relationships

### users → refresh_tokens (1:N)
- **Type**: One-to-Many
- **Foreign Key**: `refresh_tokens.user_id` → `users.id`
- **Delete Rule**: CASCADE (deleting user removes all their refresh tokens)
- **Purpose**: A user can have multiple active refresh tokens (different devices/sessions)

### users → password_reset_tokens (1:N)
- **Type**: One-to-Many
- **Foreign Key**: `password_reset_tokens.user_id` → `users.id`
- **Delete Rule**: CASCADE (deleting user removes all their reset tokens)
- **Purpose**: A user can request multiple password resets (only latest valid one should work)

## Table Purposes

### users
**Primary authentication table** - Stores user credentials and basic info
- Replaces Supabase `auth.users`
- Stores bcrypt hashed passwords
- Supports role-based access control (RBAC)
- Tracks email verification status
- Records last login for security monitoring

### refresh_tokens
**Token rotation and revocation** - Manages JWT refresh tokens
- Enables secure token refresh without re-authentication
- Supports token revocation (logout, security breach)
- Allows multiple concurrent sessions per user
- Automatic cleanup via expiration timestamp
- Indexed for fast token lookup and validation

### password_reset_tokens
**Password recovery** - Manages password reset flow
- Time-limited tokens (typically 1 hour expiration)
- Single-use tokens (marked as used after consumption)
- Secure password reset without email access to account
- Automatic cleanup of expired/used tokens
- Indexed for fast token validation

## Index Strategy

### users
- **PRIMARY (id)**: Fast user lookup by ID
- **UNIQUE (email)**: Prevent duplicate accounts, fast login lookup
- **idx_email**: Redundant with UNIQUE but explicit for queries
- **idx_role**: Fast filtering by user role (admin queries)

### refresh_tokens
- **PRIMARY (id)**: Fast token record lookup
- **idx_user_id**: Fast lookup of all user's tokens (for revocation)
- **idx_token**: Fast token validation during refresh
- **idx_expires_at**: Fast cleanup of expired tokens

### password_reset_tokens
- **PRIMARY (id)**: Fast token record lookup
- **idx_token**: Fast token validation during reset
- **idx_user_id**: Fast lookup of user's reset tokens

## Security Considerations

### Password Storage
- ✅ Passwords stored as bcrypt hash (never plaintext)
- ✅ Salt rounds: 10+ (configurable in auth service)
- ✅ Password complexity enforced at application layer

### Token Security
- ✅ Refresh tokens stored in database (can be revoked)
- ✅ Access tokens NOT stored (stateless JWT)
- ✅ Token expiration enforced
- ✅ Single-use reset tokens

### Data Protection
- ✅ Foreign key CASCADE ensures no orphaned tokens
- ✅ Email uniqueness prevents duplicate accounts
- ✅ Role-based access control built into schema
- ✅ Timestamps for audit trail

## Usage Patterns

### User Registration
```sql
-- 1. Create user
INSERT INTO users (id, email, password_hash, role, email_verified)
VALUES (UUID(), 'user@example.com', '$2b$10$...', 'student', FALSE);

-- 2. Create profile (in profiles table)
INSERT INTO profiles (id, user_id, first_name, last_name, ...)
VALUES (UUID(), <user_id>, 'John', 'Doe', ...);
```

### User Login
```sql
-- 1. Validate credentials
SELECT id, email, password_hash, role, email_verified
FROM users
WHERE email = 'user@example.com';

-- 2. Update last login
UPDATE users SET last_login = NOW() WHERE id = <user_id>;

-- 3. Store refresh token
INSERT INTO refresh_tokens (user_id, token, expires_at)
VALUES (<user_id>, '<refresh_token>', DATE_ADD(NOW(), INTERVAL 7 DAY));
```

### Token Refresh
```sql
-- 1. Validate refresh token
SELECT user_id, expires_at
FROM refresh_tokens
WHERE token = '<refresh_token>' AND expires_at > NOW();

-- 2. Optionally rotate token (delete old, insert new)
DELETE FROM refresh_tokens WHERE token = '<old_token>';
INSERT INTO refresh_tokens (user_id, token, expires_at)
VALUES (<user_id>, '<new_token>', DATE_ADD(NOW(), INTERVAL 7 DAY));
```

### User Logout
```sql
-- Revoke refresh token
DELETE FROM refresh_tokens WHERE token = '<refresh_token>';
```

### Logout All Sessions
```sql
-- Revoke all user's refresh tokens
DELETE FROM refresh_tokens WHERE user_id = <user_id>;
```

### Password Reset Request
```sql
-- 1. Create reset token
INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
VALUES (<user_id>, '<reset_token>', DATE_ADD(NOW(), INTERVAL 1 HOUR), FALSE);

-- 2. Send email with reset link
-- (handled by email service)
```

### Password Reset Completion
```sql
-- 1. Validate reset token
SELECT user_id, expires_at, used
FROM password_reset_tokens
WHERE token = '<reset_token>' 
  AND expires_at > NOW() 
  AND used = FALSE;

-- 2. Update password
UPDATE users SET password_hash = '<new_hash>' WHERE id = <user_id>;

-- 3. Mark token as used
UPDATE password_reset_tokens SET used = TRUE WHERE token = '<reset_token>';

-- 4. Revoke all refresh tokens (force re-login)
DELETE FROM refresh_tokens WHERE user_id = <user_id>;
```

### Cleanup Expired Tokens
```sql
-- Cleanup expired refresh tokens (run periodically)
DELETE FROM refresh_tokens WHERE expires_at < NOW();

-- Cleanup old password reset tokens (run periodically)
DELETE FROM password_reset_tokens 
WHERE expires_at < NOW() OR (used = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY));
```

## Migration from Supabase

### User Migration Strategy
```sql
-- Export from Supabase auth.users
-- Import to MySQL users table with:
-- 1. Generate new password reset tokens for all users
-- 2. Send password reset emails
-- 3. Users set new passwords on first login

INSERT INTO users (id, email, password_hash, role, email_verified, created_at)
SELECT 
  id,
  email,
  '<temporary_hash>', -- Will be reset by user
  user_metadata->>'$.role',
  email_confirmed_at IS NOT NULL,
  created_at
FROM supabase_auth_users;

-- Generate reset tokens for all users
INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
SELECT 
  id,
  MD5(CONCAT(id, email, NOW())),
  DATE_ADD(NOW(), INTERVAL 7 DAY), -- Longer expiration for migration
  FALSE
FROM users;
```

## Performance Considerations

### Query Optimization
- All foreign keys indexed for fast joins
- Email lookup optimized with unique index
- Token validation optimized with dedicated indexes
- Expiration checks optimized with datetime indexes

### Scalability
- Auto-increment IDs for token tables (faster than UUIDs)
- VARCHAR(500) for refresh tokens (supports long JWTs)
- Periodic cleanup prevents table bloat
- Connection pooling at application layer

### Monitoring
- Track token table growth
- Monitor slow queries on token validation
- Alert on excessive failed login attempts
- Track password reset request frequency

## Compliance & Audit

### Data Retention
- User accounts: Retained until explicit deletion
- Refresh tokens: Auto-deleted on expiration
- Reset tokens: Auto-deleted after 7 days if used
- Last login: Tracked for security monitoring

### Audit Trail
- created_at: When record was created
- updated_at: When record was last modified (users only)
- last_login: When user last authenticated
- used flag: Whether reset token was consumed

## Testing Checklist

- [x] Tables created successfully
- [x] All columns have correct data types
- [x] Primary keys established
- [x] Unique constraints working (email)
- [x] Foreign keys established
- [x] Indexes created
- [x] CASCADE delete working
- [ ] Insert test user
- [ ] Generate test tokens
- [ ] Validate token expiration
- [ ] Test token revocation
- [ ] Test password reset flow

## Next Steps

1. **Implement Auth Service** (Task 10.2)
   - Password hashing with bcrypt
   - JWT token generation
   - Token validation and refresh

2. **Implement Auth Middleware** (Task 10.4)
   - JWT verification
   - Role-based access control
   - Request user injection

3. **Implement Auth Endpoints** (Task 10.5)
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/logout
   - POST /api/auth/refresh
   - POST /api/auth/forgot-password
   - POST /api/auth/reset-password

4. **User Migration** (Task 16.2)
   - Export Supabase auth users
   - Import to MySQL
   - Generate reset tokens
   - Send reset emails
