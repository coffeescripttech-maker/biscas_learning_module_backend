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
   * Get module by ID
   * GET /api/modules/:id
   */
  async getModuleById(req, res) {
    try {
      const { id } = req.params;

      const module = await Module.findById(id);

      if (!module) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        data: module.toJSON()
      });
    } catch (error) {
      logger.error('Get module by ID error:', error);
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

      // Only creator or admin can update
      if (existingModule.createdBy !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: {
            code: 'AUTH_FORBIDDEN',
            message: 'You do not have permission to update this module',
            timestamp: new Date().toISOString()
          }
        });
      }

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

      // Only creator or admin can delete
      if (existingModule.createdBy !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: {
            code: 'AUTH_FORBIDDEN',
            message: 'You do not have permission to delete this module',
            timestamp: new Date().toISOString()
          }
        });
      }

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
