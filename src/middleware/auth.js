const authService = require('../services/auth.service');
const User = require('../models/User');

/**
 * Middleware to verify JWT token
 * Extracts token from Authorization header and verifies it
 * Adds decoded user data to req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'No authorization token provided',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_FORMAT',
          message: 'Invalid authorization header format. Expected: Bearer <token>',
          timestamp: new Date().toISOString()
        }
      });
    }

    const token = parts[1];

    // Verify token
    const decoded = await authService.verifyToken(token);

    // Attach user data to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Token has expired',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Invalid token',
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(401).json({
      error: {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Authentication failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Middleware to require specific role(s)
 * Must be used after verifyToken middleware
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'AUTH_FORBIDDEN',
          message: `Insufficient permissions. Required role: ${roles.join(' or ')}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

/**
 * Middleware to require admin role
 * Shorthand for requireRole('admin')
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware to require teacher or admin role
 * Shorthand for requireRole('teacher', 'admin')
 */
const requireTeacher = requireRole('teacher', 'admin');

/**
 * Middleware to require student role
 * Shorthand for requireRole('student')
 */
const requireStudent = requireRole('student');

/**
 * Optional authentication middleware
 * Verifies token if present, but doesn't fail if missing
 * Useful for endpoints that work differently for authenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No token provided, continue without authentication
      return next();
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without authentication
      return next();
    }

    const token = parts[1];

    // Try to verify token
    const decoded = await authService.verifyToken(token);

    // Attach user data to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    // Token verification failed, continue without authentication
    next();
  }
};

/**
 * Middleware to check if user owns the resource
 * Compares req.user.userId with req.params.userId or req.params.id
 * Admins bypass this check
 */
const requireOwnership = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Admins can access any resource
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user owns the resource
  const resourceUserId = req.params.userId || req.params.id;
  
  if (req.user.userId !== resourceUserId) {
    return res.status(403).json({
      error: {
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource',
        timestamp: new Date().toISOString()
      }
    });
  }

  next();
};

/**
 * Middleware to attach full user object to request
 * Must be used after verifyToken middleware
 * Fetches complete user data from database
 */
const attachUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return next();
    }

    // Fetch full user data from database
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Attach full user object
    req.userObject = user;

    next();
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user data',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireTeacher,
  requireStudent,
  optionalAuth,
  requireOwnership,
  attachUser
};
