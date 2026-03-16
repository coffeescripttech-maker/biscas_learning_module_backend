const Module = require('../models/Module');
const logger = require('../utils/logger');

class ModulesController {
  /**
   * Get all modules with pagination and filtering
   * GET /api/modules
   */
  async getModules(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        categoryId,
        difficultyLevel,
        isPublished,
        createdBy,
        search
      } = req.query;

      // Parse pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Validate pagination parameters
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Parse boolean isPublished
      let isPublishedBool;
      if (isPublished !== undefined) {
        isPublishedBool = isPublished === 'true' || isPublished === '1';
      }

      // Get modules with filters
      const { modules, total } = await Module.findAll({
        limit: limitNum,
        offset,
        categoryId,
        difficultyLevel,
        isPublished: isPublishedBool,
        createdBy,
        search
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        data: modules.map(m => m.toJSON()),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore: pageNum < totalPages
        }
      });
    } catch (error) {
      logger.error('Get modules error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve modules',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Test endpoint - Get modules count only
   * GET /api/modules/test
   */
  async testModules(req, res) {
    try {
      console.log('🧪 Testing modules endpoint...');
      
      // Simple count query
      const [countResult] = await require('../utils/db').query('SELECT COUNT(*) as total FROM vark_modules');
      const total = countResult ? countResult.total : 0;
      
      console.log('✅ Modules count:', total);
      
      res.json({
        success: true,
        message: 'Modules test successful',
        data: {
          totalModules: total,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Test modules error:', error);
      res.status(500).json({
        error: {
          code: 'TEST_ERROR',
          message: 'Test failed: ' + error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  async getModuleById(req, res) {
    const startTime = Date.now();
    const { id } = req.params;
    
    try {
      console.log('🔍 [GET MODULE BY ID] Starting request for module:', id);
      
      const module = await Module.findById(id);

      if (!module) {
        console.log('❌ [GET MODULE BY ID] Module not found:', id);
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      const totalDuration = Date.now() - startTime;
      console.log(`✅ [GET MODULE BY ID] Module retrieved successfully in ${totalDuration}ms:`, {
        moduleId: id,
        title: module.title,
        hasJsonContentUrl: !!module.jsonContentUrl
      });

      res.json({
        data: module.toJSON()
      });
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error(`❌ [GET MODULE BY ID] Error after ${totalDuration}ms:`, error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Proxy R2 content through backend
   * GET /api/modules/:id/content
   * This avoids DNS resolution issues with R2 public URLs
   * Uses redirect to avoid memory issues with large files
   */
  async getModuleContent(req, res) {
    const startTime = Date.now();
    const { id } = req.params;
    
    try {
      logger.info('🔄 [MODULE CONTENT] Starting request', {
        moduleId: id,
        timestamp: new Date().toISOString(),
        userAgent: req.get('user-agent'),
        origin: req.get('origin')
      });

      // Step 1: Find module in database
      logger.info('📊 [MODULE CONTENT] Fetching module from database', { moduleId: id });
      const module = await Module.findById(id);

      if (!module) {
        logger.warn('⚠️ [MODULE CONTENT] Module not found in database', { moduleId: id });
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info('✅ [MODULE CONTENT] Module found', {
        moduleId: id,
        title: module.title,
        hasContentUrl: !!module.jsonContentUrl
      });

      if (!module.jsonContentUrl) {
        logger.warn('⚠️ [MODULE CONTENT] Module has no content URL', {
          moduleId: id,
          title: module.title
        });
        return res.status(404).json({
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Module content URL not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Step 2: Redirect to R2 URL (memory efficient - no proxying)
      // This avoids loading large files into backend memory
      logger.info('🔀 [MODULE CONTENT] Redirecting to R2', {
        moduleId: id,
        url: module.jsonContentUrl
      });

      const totalDuration = Date.now() - startTime;
      logger.info('✅ [MODULE CONTENT] Redirect sent', {
        moduleId: id,
        totalDuration: `${totalDuration}ms`
      });

      // Send 307 redirect (preserves method and body)
      res.redirect(307, module.jsonContentUrl);
      
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error('❌ [MODULE CONTENT] Request failed', {
        moduleId: id,
        error: error.message,
        stack: error.stack,
        duration: `${totalDuration}ms`
      });
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch module content',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Proxy R2 content through backend (fallback for DNS issues)
   * GET /api/modules/:id/content-proxy
   * This endpoint streams content from R2 through the backend
   * Only used when direct R2 access fails due to DNS issues
   * Uses streaming to minimize memory usage (~5MB instead of 50MB)
   */
  async proxyModuleContent(req, res) {
    const startTime = Date.now();
    const { id } = req.params;
    
    try {
      logger.info('🔄 [MODULE PROXY] Starting proxy request', {
        moduleId: id,
        timestamp: new Date().toISOString(),
        userAgent: req.get('user-agent'),
        origin: req.get('origin')
      });

      // Step 1: Find module in database
      const module = await Module.findById(id);

      if (!module) {
        logger.warn('⚠️ [MODULE PROXY] Module not found in database', { moduleId: id });
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (!module.jsonContentUrl) {
        logger.warn('⚠️ [MODULE PROXY] Module has no content URL', {
          moduleId: id,
          title: module.title
        });
        return res.status(404).json({
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Module content URL not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info('📥 [MODULE PROXY] Streaming from R2', {
        moduleId: id,
        url: module.jsonContentUrl
      });

      // Step 2: Stream from R2 to client using https module (memory efficient)
      const https = require('https');
      const url = new URL(module.jsonContentUrl);
      
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      https.get(options, (r2Response) => {
        if (r2Response.statusCode !== 200) {
          logger.error('❌ [MODULE PROXY] R2 fetch failed', {
            moduleId: id,
            status: r2Response.statusCode,
            statusMessage: r2Response.statusMessage
          });
          return res.status(502).json({
            error: {
              code: 'R2_FETCH_FAILED',
              message: 'Failed to fetch content from storage',
              timestamp: new Date().toISOString()
            }
          });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        // Copy content-length if available
        if (r2Response.headers['content-length']) {
          res.setHeader('Content-Length', r2Response.headers['content-length']);
        }

        // Stream the response body directly (memory efficient - only ~5MB buffer)
        // This pipes the R2 response directly to the client without loading into memory
        r2Response.pipe(res);
        
        // Log completion when stream finishes
        res.on('finish', () => {
          const totalDuration = Date.now() - startTime;
          logger.info('✅ [MODULE PROXY] Content streamed successfully', {
            moduleId: id,
            totalDuration: `${totalDuration}ms`,
            contentLength: r2Response.headers['content-length'] || 'unknown'
          });
        });
      }).on('error', (error) => {
        logger.error('❌ [MODULE PROXY] HTTPS request failed', {
          moduleId: id,
          error: error.message
        });
        
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to proxy module content',
              details: error.message,
              timestamp: new Date().toISOString()
            }
          });
        }
      });
      
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error('❌ [MODULE PROXY] Proxy request failed', {
        moduleId: id,
        error: error.message,
        stack: error.stack,
        duration: `${totalDuration}ms`
      });
      
      // Only send error if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to proxy module content',
            details: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * Create a new module
   * POST /api/modules
   */
  async createModule(req, res) {
    try {
      const moduleData = req.body;

      // Set createdBy to current user
      moduleData.createdBy = req.user.userId;

      // Validate required fields
      if (!moduleData.title) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Create module
      const module = await Module.create(moduleData);

      logger.info('Module created successfully', {
        moduleId: module.id,
        title: module.title,
        createdBy: req.user.userId
      });

      res.status(201).json({
        message: 'Module created successfully',
        data: module.toJSON()
      });
    } catch (error) {
      // Handle validation errors
      if (error.code === 'VALIDATION_ERROR') {
        return res.status(400).json({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.error('Create module error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update module
   * PUT /api/modules/:id
   */
  async updateModule(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Prevent changing createdBy (check both camelCase and snake_case)
      if (updates.createdBy || updates.created_by) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot change module creator',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user has permission to update this module
      const existingModule = await Module.findById(id);
      if (!existingModule) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Allow any teacher to update any module (collaborative editing)
      logger.info('Updating module', {
        moduleId: id,
        userId: req.user.userId,
        originalCreator: existingModule.createdBy
      });

      // Update module
      const module = await Module.update(id, updates);

      logger.info('Module updated successfully', {
        moduleId: id,
        updatedBy: req.user.userId
      });

      res.json({
        message: 'Module updated successfully',
        data: module.toJSON()
      });
    } catch (error) {
      // Handle not found
      if (error.code === 'DB_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: error.code,
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.error('Update module error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Delete module
   * DELETE /api/modules/:id
   */
  async deleteModule(req, res) {
    try {
      const { id } = req.params;

      // Check if user has permission to delete this module
      const existingModule = await Module.findById(id);
      if (!existingModule) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Allow any teacher to delete any module (collaborative editing)
      logger.info('Deleting module', {
        moduleId: id,
        userId: req.user.userId,
        originalCreator: existingModule.createdBy
      });

      // Delete module
      await Module.delete(id);

      logger.info('Module deleted successfully', {
        moduleId: id,
        deletedBy: req.user.userId
      });

      res.json({
        message: 'Module deleted successfully'
      });
    } catch (error) {
      // Handle not found
      if (error.code === 'DB_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: error.code,
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.error('Delete module error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Import module from JSON
   * POST /api/modules/import
   */
  async importModule(req, res) {
    try {
      const jsonData = req.body;

      // Validate JSON data
      if (!jsonData || typeof jsonData !== 'object') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON data',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Import module
      const module = await Module.importModule(jsonData, req.user.userId);

      logger.info('Module imported successfully', {
        moduleId: module.id,
        title: module.title,
        importedBy: req.user.userId
      });

      res.status(201).json({
        message: 'Module imported successfully',
        data: module.toJSON()
      });
    } catch (error) {
      // Handle validation errors
      if (error.code === 'VALIDATION_ERROR') {
        return res.status(400).json({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.error('Import module error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to import module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get modules by category
   * GET /api/modules/category/:categoryId
   */
  async getModulesByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const { page = 1, limit = 50, isPublished } = req.query;

      // Parse pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Parse boolean isPublished
      let isPublishedBool;
      if (isPublished !== undefined) {
        isPublishedBool = isPublished === 'true' || isPublished === '1';
      }

      // Get modules in category
      const modules = await Module.findByCategoryId(categoryId, {
        limit: limitNum,
        offset,
        isPublished: isPublishedBool
      });

      res.json({
        data: modules.map(m => m.toJSON()),
        pagination: {
          page: pageNum,
          limit: limitNum
        }
      });
    } catch (error) {
      logger.error('Get modules by category error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve modules',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get modules by creator
   * GET /api/modules/creator/:creatorId
   */
  async getModulesByCreator(req, res) {
    try {
      const { creatorId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      // Parse pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Get modules by creator
      const { modules, total } = await Module.findByCreator(creatorId, {
        limit: limitNum,
        offset
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        data: modules.map(m => m.toJSON()),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore: pageNum < totalPages
        }
      });
    } catch (error) {
      logger.error('Get modules by creator error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve modules',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get module submission statistics
   * GET /api/modules/:id/submission-stats
   */
  async getModuleSubmissionStats(req, res) {
    try {
      const { id } = req.params;

      const stats = await Module.getSubmissionStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get module submission stats error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve module submission statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get all completions for a module
   * GET /api/modules/:id/completions
   */
  async getModuleCompletions(req, res) {
    try {
      const { id } = req.params;

      const completions = await Module.getCompletions(id);

      res.json({
        success: true,
        data: completions
      });
    } catch (error) {
      logger.error('Get module completions error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve module completions',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new ModulesController();
