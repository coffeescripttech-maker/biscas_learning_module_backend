/**
 * Database connection module
 * Implements MySQL connection pool with retry logic, health checks, and graceful shutdown
 */

const mysql = require('mysql2/promise');
const config = require('./index');
const logger = require('../utils/logger');

let pool = null;
let isShuttingDown = false;

/**
 * Create MySQL connection pool
 */
function createPool() {
  const poolConfig = {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    connectionLimit: config.database.connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };

  // Add SSL configuration if enabled
  if (config.database.ssl) {
    poolConfig.ssl = {
      rejectUnauthorized: true
    };
  }

  pool = mysql.createPool(poolConfig);

  logger.info('MySQL connection pool created', {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    connectionLimit: config.database.connectionLimit
  });

  return pool;
}

/**
 * Get database connection pool
 * Creates pool if it doesn't exist
 */
function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

/**
 * Test database connection with retry logic
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} retryDelay - Delay between retries in milliseconds
 * @returns {Promise<boolean>} - True if connection successful
 */
async function testConnection(maxRetries = 5, retryDelay = 2000) {
  let lastError;
  
  console.log("testConnection");
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await getPool().getConnection();
      await connection.query('SELECT 1');
      connection.release();
      
      logger.info('Database connection test successful', { attempt });
      return true;
    } catch (error) {
      lastError = error;
      logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed`, {
        error: error.message,
        code: error.code
      });
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error('Database connection failed after all retries', {
    error: lastError.message,
    code: lastError.code
  });
  throw lastError;
}

/**
 * Health check for database connection
 * @returns {Promise<Object>} - Health check result
 */
async function healthCheck() {
  try {
    if (!pool) {
      return {
        status: 'error',
        message: 'Connection pool not initialized'
      };
    }

    const connection = await pool.getConnection();
    const startTime = Date.now();
    await connection.query('SELECT 1 as health_check');
    const responseTime = Date.now() - startTime;
    connection.release();

    // Get pool statistics
    const poolStats = {
      totalConnections: pool.pool._allConnections.length,
      freeConnections: pool.pool._freeConnections.length,
      queuedRequests: pool.pool._connectionQueue.length
    };

    return {
      status: 'ok',
      message: 'Database connected',
      responseTime: `${responseTime}ms`,
      pool: poolStats
    };
  } catch (error) {
    logger.error('Database health check failed', {
      error: error.message,
      code: error.code
    });
    
    return {
      status: 'error',
      message: error.message,
      code: error.code
    };
  }
}

/**
 * Graceful shutdown of database connections
 * Closes all connections in the pool
 */
async function shutdown() {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  logger.info('Starting graceful database shutdown...');

  try {
    if (pool) {
      // Wait for active connections to finish (with timeout)
      const shutdownTimeout = 10000; // 10 seconds
      const shutdownPromise = pool.end();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Shutdown timeout')), shutdownTimeout);
      });

      await Promise.race([shutdownPromise, timeoutPromise]);
      
      logger.info('Database connections closed successfully');
      pool = null;
    } else {
      logger.info('No active database pool to close');
    }
  } catch (error) {
    logger.error('Error during database shutdown', {
      error: error.message
    });
    
    // Force close if graceful shutdown fails
    if (pool) {
      try {
        await pool.end();
        pool = null;
      } catch (forceError) {
        logger.error('Force close failed', { error: forceError.message });
      }
    }
  } finally {
    isShuttingDown = false;
  }
}

/**
 * Initialize database connection
 * Tests connection and sets up event handlers
 */
async function initialize() {
  try {
    logger.info('Initializing database connection...');
    
    // Create pool
    createPool();
    
    // Test connection with retry logic
    await testConnection();
    
    logger.info('Database initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize database', {
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

module.exports = {
  getPool,
  initialize,
  testConnection,
  healthCheck,
  shutdown
};
