const Completion = require('../models/Completion');
const logger = require('../utils/logger');

class CompletionsController {
  /**
   * Complete a module
   * POST /api/completions
   */
  async create(req, res) {
    try {
      const completionData = req.body;

      // Validate required fields
      if (!completionData.student_id || !completionData.module_id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'student_id and module_id are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const completion = await Completion.upsert(completionData);

      logger.info('Module completion recorded', {
        completionId: completion.id,
        studentId: completionData.student_id,
        moduleId: completionData.module_id,
        score: completionData.final_score
      });

      res.status(201).json({
        message: 'Module completion recorded successfully',
        data: completion.toJSON()
      });
    } catch (error) {
      logger.error('Complete module error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to complete module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get all completions for a student with module details
   * GET /api/completions/student/:studentId
   */
  async getStudentCompletions(req, res) {
    try {
      const { studentId } = req.params;

      // Fetch completions with module details
      const completions = await Completion.findByStudent(studentId);

      // Order by completion date descending (most recent first)
      const sortedCompletions = completions.sort((a, b) => {
        const dateA = new Date(a.completionDate);
        const dateB = new Date(b.completionDate);
        return dateB - dateA;
      });

      res.json({
        data: sortedCompletions.map(c => c.toJSON())
      });
    } catch (error) {
      logger.error('Get student completions error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get student completions',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get completion statistics for a student
   * GET /api/completions/student/:studentId/stats
   */
  async getCompletionStats(req, res) {
    try {
      const { studentId } = req.params;

      // Get completions
      const completions = await Completion.findByStudent(studentId);

      // Calculate statistics
      const totalCompletions = completions.length;
      const totalTimeSpent = completions.reduce((sum, c) => sum + (c.timeSpentMinutes || 0), 0);
      const averageScore = totalCompletions > 0
        ? completions.reduce((sum, c) => sum + (c.finalScore || 0), 0) / totalCompletions
        : 0;
      const perfectSections = completions.reduce((sum, c) => sum + (c.perfectSections || 0), 0);

      const stats = {
        total_completions: totalCompletions,
        average_score: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
        total_time_spent: totalTimeSpent,
        perfect_sections: perfectSections
      };

      res.json({
        data: stats
      });
    } catch (error) {
      logger.error('Get completion stats error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get completion statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get completion for specific student and module
   * GET /api/completions/student/:studentId/module/:moduleId
   */
  async getModuleCompletion(req, res) {
    try {
      const { studentId, moduleId } = req.params;

      const completion = await Completion.findByStudentAndModule(studentId, moduleId);

      if (!completion) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Completion not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        data: completion.toJSON()
      });
    } catch (error) {
      logger.error('Get module completion error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get module completion',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new CompletionsController();
