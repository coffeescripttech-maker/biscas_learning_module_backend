
const Progress = require('../models/Progress');
const logger = require('../utils/logger');

class ProgressController {
  /**
   * Get progress by student ID
   * GET /api/progress/student/:studentId
   */
  async getProgressByStudent(req, res) {
    try {
      const { studentId } = req.params;
      const {
        page = 1,
        limit = 50,
        status
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

      // Get progress records
      const { progress, total } = await Progress.findByStudentId(studentId, {
        limit: limitNum,
        offset,
        status
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        data: progress.map(p => p.toJSON()),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore: pageNum < totalPages
        }
      });
    } catch (error) {
      logger.error('Get progress by student error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve progress',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get progress by module ID
   * GET /api/progress/module/:moduleId
   */
  async getProgressByModule(req, res) {
    try {
      const { moduleId } = req.params;
      const {
        page = 1,
        limit = 50,
        status
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

      // Get progress records
      const { progress, total } = await Progress.findByModuleId(moduleId, {
        limit: limitNum,
        offset,
        status
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        data: progress.map(p => p.toJSON()),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore: pageNum < totalPages
        }
      });
    } catch (error) {
      logger.error('Get progress by module error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve progress',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get progress by ID
   * GET /api/progress/:id
   */
  async getProgressById(req, res) {
    try {
      const { id } = req.params;

      const progress = await Progress.findById(id);

      if (!progress) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Progress record not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        data: progress.toJSON()
      });
    } catch (error) {
      logger.error('Get progress by ID error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve progress',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get progress by student and module
   * GET /api/progress/student/:studentId/module/:moduleId
   */
  async getProgressByStudentAndModule(req, res) {
    try {
      const { studentId, moduleId } = req.params;

      const progress = await Progress.findByStudentAndModule(studentId, moduleId);

      if (!progress) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Progress record not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        data: progress.toJSON()
      });
    } catch (error) {
      logger.error('Get progress by student and module error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve progress',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Create a new progress record
   * POST /api/progress
   */
  async createProgress(req, res) {
    try {
      const progressData = req.body;
      
      console.log('🔍 === CREATE PROGRESS DEBUG ===');
      console.log('📦 Raw req.body:', JSON.stringify(progressData, null, 2));
      console.log('📋 Keys in req.body:', Object.keys(progressData));

      // Validate required fields (accept both camelCase and snake_case)
      const studentId = progressData.studentId || progressData.student_id;
      const moduleId = progressData.moduleId || progressData.module_id;
      
      console.log('🔑 Extracted studentId:', studentId);
      console.log('🔑 Extracted moduleId:', moduleId);
      
      if (!studentId || !moduleId) {
        console.log('❌ Validation failed - missing IDs');
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Student ID and Module ID are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Normalize data to snake_case for database
      const normalizedData = {
        student_id: studentId,
        module_id: moduleId,
        status: progressData.status || 'not_started',
        progress_percentage: progressData.progress_percentage || progressData.progressPercentage || 0,
        current_section_id: null, // Set to null to avoid foreign key constraint issues
        time_spent_minutes: progressData.time_spent_minutes || progressData.timeSpentMinutes || 0,
        completed_sections: progressData.completed_sections || progressData.completedSections || [],
        assessment_scores: progressData.assessment_scores || progressData.assessmentScores || {}
      };
      
      console.log('🔄 Normalized data:', JSON.stringify(normalizedData, null, 2));

      // Create progress
      const progress = await Progress.create(normalizedData);

      logger.info('Progress record created successfully', {
        progressId: progress.id,
        studentId: progress.studentId,
        moduleId: progress.moduleId,
        createdBy: req.user.userId
      });

      console.log('✅ Progress created successfully');
      console.log('🔍 === END DEBUG ===');

      res.status(201).json({
        message: 'Progress record created successfully',
        data: progress.toJSON()
      });
    } catch (error) {
      console.log('❌ Error in createProgress:', error);
      console.log('❌ Error code:', error.code);
      console.log('❌ Error message:', error.message);
      console.log('❌ Error details:', error.details);
      
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

      // Handle duplicate entry
      if (error.code === 'DB_DUPLICATE_ENTRY') {
        return res.status(400).json({
          error: {
            code: error.code,
            message: 'Progress record already exists for this student and module',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.error('Create progress error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create progress record',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update progress record
   * PUT /api/progress/:id
   */
  async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Prevent updating student_id or module_id
      if (updates.studentId || updates.moduleId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot update student ID or module ID',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Update progress
      const progress = await Progress.update(id, updates);

      logger.info('Progress record updated successfully', {
        progressId: id,
        updatedBy: req.user.userId
      });

      res.json({
        message: 'Progress record updated successfully',
        data: progress.toJSON()
      });
    } catch (error) {
      // Handle not found
      if (error.code === 'DB_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: error.code,
            message: 'Progress record not found',
            timestamp: new Date().toISOString()
          }
        });
      }

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

      logger.error('Update progress error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update progress record',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update progress by student and module
   * PUT /api/progress/student/:studentId/module/:moduleId
   */
  async updateProgressByStudentAndModule(req, res) {
    try {
      const { studentId, moduleId } = req.params;
      const updates = req.body;

      // Prevent updating student_id or module_id
      if (updates.studentId || updates.moduleId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot update student ID or module ID',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Update progress
      const progress = await Progress.updateByStudentAndModule(studentId, moduleId, updates);

      logger.info('Progress record updated successfully', {
        studentId,
        moduleId,
        updatedBy: req.user.userId
      });

      res.json({
        message: 'Progress record updated successfully',
        data: progress.toJSON()
      });
    } catch (error) {
      // Handle not found
      if (error.code === 'DB_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: error.code,
            message: 'Progress record not found',
            timestamp: new Date().toISOString()
          }
        });
      }

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

      logger.error('Update progress by student and module error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update progress record',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Delete progress record
   * DELETE /api/progress/:id
   */
  async deleteProgress(req, res) {
    try {
      const { id } = req.params;

      // Delete progress
      await Progress.delete(id);

      logger.info('Progress record deleted successfully', {
        progressId: id,
        deletedBy: req.user.userId
      });

      res.json({
        message: 'Progress record deleted successfully'
      });
    } catch (error) {
      // Handle not found
      if (error.code === 'DB_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: error.code,
            message: 'Progress record not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.error('Delete progress error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete progress record',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get student progress statistics
   * GET /api/progress/student/:studentId/stats
   */
  async getStudentStats(req, res) {
    try {
      const { studentId } = req.params;

      const stats = await Progress.getStudentStats(studentId);

      res.json({
        data: stats
      });
    } catch (error) {
      logger.error('Get student stats error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve student statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get module progress statistics
   * GET /api/progress/module/:moduleId/stats
   */
  async getModuleStats(req, res) {
    try {
      const { moduleId } = req.params;

      const stats = await Progress.getModuleStats(moduleId);

      res.json({
        data: stats
      });
    } catch (error) {
      logger.error('Get module stats error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve module statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new ProgressController();
