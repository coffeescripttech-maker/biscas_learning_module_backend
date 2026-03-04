/**
 * Configuration module
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  
  // Database
  database: {
    // host: process.env.DB_HOST || 'localhost',
    // port: parseInt(process.env.DB_PORT, 10) || 3306,
    // name: process.env.DB_NAME || 'biscas_learning',
    // user: process.env.DB_USER || 'root',
    // password: process.env.DB_PASSWORD || '',
    // connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    // ssl: process.env.DB_SSL === 'true',
      host: process.env.DB_HOST || 'database-1.cjuyw8m4ev18.ap-southeast-2.rds.amazonaws.com',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'biscas_learning',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'MirandaFam123',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    ssl: process.env.DB_SSL === 'true'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  
  // Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    path: process.env.STORAGE_PATH || './uploads',
    aws: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucket: process.env.AWS_S3_BUCKET
    }
  },
  
  // Redis (optional)
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD
  },
  
  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@biscas.edu'
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  }
};

/**
 * Validate required configuration
 */
function validateConfig() {

  console.log("validateConfig");

  console.log({config});
  const errors = [];
  
  // Check critical configuration in production
  if (config.env === 'production') {
    if (!config.database.password) {
      errors.push('DB_PASSWORD is required in production');
    }
    
    if (config.jwt.secret === 'dev-secret-key' || config.jwt.secret.length < 32) {
      errors.push('JWT_SECRET must be a strong secret key (min 32 characters) in production');
    }
    
    if (config.storage.type === 's3') {
      if (!config.storage.aws.accessKeyId) {
        errors.push('AWS_ACCESS_KEY_ID is required when STORAGE_TYPE=s3');
      }
      if (!config.storage.aws.secretAccessKey) {
        errors.push('AWS_SECRET_ACCESS_KEY is required when STORAGE_TYPE=s3');
      }
      if (!config.storage.aws.bucket) {
        errors.push('AWS_S3_BUCKET is required when STORAGE_TYPE=s3');
      }
    }
  }
  
  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid configuration');
  }
}

// Validate configuration on load
validateConfig();

module.exports = config;
