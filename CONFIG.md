# Environment Configuration Guide

This document explains how to configure the Express.js API server for different environments.

## Quick Start

1. Copy the example environment file:
   ```bash
   # For development
   cp .env.example .env.development
   
   # For production
   cp .env.example .env.production
   ```

2. Edit the environment file with your configuration values

3. Start the server:
   ```bash
   # Development
   npm run dev
   
   # Production
   NODE_ENV=production npm start
   ```

## Environment Files

- `.env.example` - Template file with all available configuration options (tracked in git)
- `.env.development` - Development environment configuration (not tracked in git)
- `.env.production` - Production environment configuration (not tracked in git)
- `.env` - Generic environment file (not tracked in git)

## Configuration Options

### Server Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode (development/production) | development | No |
| `PORT` | Server port | 3001 | No |

### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | MySQL host | localhost | Yes |
| `DB_PORT` | MySQL port | 3306 | No |
| `DB_NAME` | Database name | biscas_dev | Yes |
| `DB_USER` | Database user | dev_user | Yes |
| `DB_PASSWORD` | Database password | - | Yes (production) |
| `DB_CONNECTION_LIMIT` | Max connections in pool | 10 | No |
| `DB_SSL` | Enable SSL connection | false | No |

### JWT Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for signing tokens | - | Yes |
| `JWT_ACCESS_EXPIRY` | Access token expiry time | 15m | No |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry time | 7d | No |

**Important:** In production, generate a strong secret key:
```bash
openssl rand -base64 32
```

### Storage Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `STORAGE_TYPE` | Storage type (local/s3) | local | No |
| `STORAGE_PATH` | Local storage path | ./uploads | No |

#### AWS S3 Configuration (when STORAGE_TYPE=s3)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AWS_REGION` | AWS region | - | Yes (if s3) |
| `AWS_ACCESS_KEY_ID` | AWS access key | - | Yes (if s3) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - | Yes (if s3) |
| `AWS_S3_BUCKET` | S3 bucket name | - | Yes (if s3) |

### Redis Configuration (Optional)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis host | - | No |
| `REDIS_PORT` | Redis port | 6379 | No |
| `REDIS_PASSWORD` | Redis password | - | No |

### Email Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EMAIL_HOST` | SMTP host | - | Yes |
| `EMAIL_PORT` | SMTP port | 587 | No |
| `EMAIL_USER` | SMTP username | - | Yes |
| `EMAIL_PASSWORD` | SMTP password | - | Yes |
| `EMAIL_FROM` | From email address | noreply@biscas.edu | No |

### Frontend Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 | No |

### Logging Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | info | No |

### Rate Limiting Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_WINDOW_MS` | Time window in milliseconds | 900000 (15 min) | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 | No |

## Development vs Production

### Development Configuration

- Uses local MySQL database
- Uses local file storage
- Debug logging enabled
- Less strict security settings
- Uses Mailtrap or similar for email testing

### Production Configuration

- Uses production MySQL database with SSL
- Uses AWS S3 for file storage
- Info-level logging
- Strict security settings
- Uses real email service (SendGrid, etc.)
- Requires strong JWT secret key
- Requires strong database password

## Configuration Validation

The server validates critical configuration on startup:

- In production, it checks for:
  - Strong database password
  - Strong JWT secret (min 32 characters)
  - AWS credentials (if using S3 storage)

If validation fails, the server will not start and will display error messages.

## Accessing Configuration in Code

```javascript
const config = require('./config');

// Database configuration
console.log(config.database.host);
console.log(config.database.port);

// JWT configuration
console.log(config.jwt.secret);

// Storage configuration
console.log(config.storage.type);
```

## Security Best Practices

1. **Never commit environment files** (except `.env.example`)
2. **Use strong passwords** in production (min 16 characters)
3. **Generate unique JWT secrets** for each environment
4. **Rotate secrets regularly** (every 90 days recommended)
5. **Use environment-specific credentials** (don't reuse dev credentials in production)
6. **Enable SSL/TLS** for database connections in production
7. **Restrict database user permissions** (principle of least privilege)

## Troubleshooting

### Server won't start

1. Check that all required environment variables are set
2. Verify database connection settings
3. Check logs in `error.log` and `combined.log`

### Configuration validation errors

1. Review error messages on startup
2. Ensure production environment has strong secrets
3. Verify AWS credentials if using S3 storage

### Database connection issues

1. Verify database is running
2. Check host, port, username, and password
3. Ensure database user has proper permissions
4. Check firewall rules

## Example Configurations

### Development Example

```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_NAME=biscas_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
JWT_SECRET=dev-secret-key-for-testing-only
STORAGE_TYPE=local
EMAIL_HOST=smtp.mailtrap.io
```

### Production Example

```env
NODE_ENV=production
PORT=3001
DB_HOST=mysql.production.com
DB_NAME=biscas_prod
DB_USER=prod_user
DB_PASSWORD=StrongP@ssw0rd123!
DB_SSL=true
JWT_SECRET=aB3dF6hJ9kL2mN5pQ8rT1uV4wX7yZ0aC
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=biscas-production-files
EMAIL_HOST=smtp.sendgrid.net
FRONTEND_URL=https://biscas.edu
```
