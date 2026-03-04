const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');

// Initialize Express app
const app = express();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Make logger available to the app
app.locals.logger = logger;

// Middleware setup
// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
// Increased limit to 50mb to handle large VARK module imports with rich content
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { healthCheck } = require('./config/database');
    const dbHealth = await healthCheck();
    
    const health = {
      status: dbHealth.status === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth
    };
    
    const statusCode = dbHealth.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'error',
        message: error.message
      }
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'BISCAS NAGA Learning Module API',
    version: '1.0.0',
    status: 'running'
  });
});

// API Routes
const authRoutes = require('./routes/auth.routes');
const studentsRoutes = require('./routes/students.routes');
const modulesRoutes = require('./routes/modules.routes');
const classesRoutes = require('./routes/classes.routes');
const progressRoutes = require('./routes/progress.routes');
const filesRoutes = require('./routes/files.routes');
const statsRoutes = require('./routes/stats.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const completionsRoutes = require('./routes/completions.routes');
const badgesRoutes = require('./routes/badges.routes');
const teachersRoutes = require('./routes/teachers.routes');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/completions', completionsRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/teachers', teachersRoutes);

// 404 handler - must be after all routes
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
});

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    statusCode: err.statusCode || 500
  });
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Send error response
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: err.details || {},
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = app;
