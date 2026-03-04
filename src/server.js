const config = require('./config');
const app = require('./app');
const { initialize: initializeDatabase, healthCheck } = require('./config/database');

// Initialize database and start server
async function startServer() {
  const logger = app.locals.logger;
  
  try {
    // Test database connection
    logger.info('🔌 Testing database connection...');
    await initializeDatabase();
    
    // Get database health status
    const dbHealth = await healthCheck();
    if (dbHealth.status === 'ok') {
      logger.info('✅ Database connected successfully');
      logger.info(`   Response time: ${dbHealth.responseTime}`);
      logger.info(`   Pool connections: ${dbHealth.pool.totalConnections}`);
    } else {
      logger.error('❌ Database health check failed:', dbHealth);
      throw new Error('Database connection failed');
    }
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info('🚀 Server started successfully');
      logger.info(`   Port: ${config.port}`);
      logger.info(`   Environment: ${config.env}`);
      logger.info(`   Health check: http://localhost:${config.port}/health`);
      logger.info(`   Database: ${config.database.name}@${config.database.host}`);
    });
    
    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      logger.info(`${signal} signal received: closing HTTP server`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connections
        const { shutdown: shutdownDb } = require('./config/database');
        await shutdownDb();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    return server;
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    logger.error('   Please check your database configuration');
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
module.exports = startServer;
