const Submission = require('../models/Submission');
const logger = require('../utils/logger');

class SubmissionsController {
  /**
   * Get submissions with filters
   * GET /api/submissions?studentId=xxx&moduleId=xxx&sectionId=xxx
   */
  async getSubmissions(req, res) {
    try {
      const { studentId, moduleId, sectionId } = req.query;

      // If sectionId is provided, get specific submission
      if (studentId && moduleId && sectionId) {
        return this.getSectionSubmission(req, res);
      }

      // Otherwise get all submissions for student and module
      if (!studentId || !moduleId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'studentId and moduleId are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const submissions = await Submission.findByStudentAndModule(studentId, moduleId);

      res.json({
        data: submissions.map(s => s.toJSON())
      });
    } catch (error) {
      logger.error('Get submissions error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get submissions',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get submission for specific section
   * GET /api/submissions/student/:studentId/module/:moduleId/section/:sectionId
   */
  async getSectionSubmission(req, res) {
    try {
      const { studentId, moduleId, sectionId } = req.params.studentId 
        ? req.params 
        : req.query;

      if (!studentId || !moduleId || !sectionId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'studentId, moduleId, and sectionId are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const submissions = await Submission.findByStudentAndModule(studentId, moduleId);
      const submission = submissions.find(s => s.sectionId === sectionId);

      if (!submission) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Submission not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        data: submission.toJSON()
      });
    } catch (error) {
      logger.error('Get section submission error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get submission',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Create submission (save student answer)
   * POST /api/submissions
   */
  async createSubmission(req, res) {
    try {
      const submissionData = req.body;

      // Validate required fields
      if (!submissionData.student_id || !submissionData.module_id || !submissionData.section_id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'student_id, module_id, and section_id are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Ensure submission_data exists
      if (!submissionData.submission_data) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'submission_data is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const submission = await Submission.upsert(submissionData);

      logger.info('Submission created/updated successfully', {
        submissionId: submission.id,
        studentId: submissionData.student_id,
        moduleId: submissionData.module_id,
        sectionId: submissionData.section_id,
        createdBy: req.user.userId
      });

      res.status(201).json({
        message: 'Submission saved successfully',
        data: submission.toJSON()
      });
    } catch (error) {
      logger.error('Create submission error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save submission',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update submission
   * PUT /api/submissions/:id
   */
  async updateSubmission(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get existing submission
      const existing = await Submission.findById(id);
      if (!existing) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Submission not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Prevent updating immutable fields
      if (updates.student_id || updates.module_id || updates.section_id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot update student_id, module_id, or section_id',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Update using upsert with existing IDs
      const submissionData = {
        student_id: existing.studentId,
        module_id: existing.moduleId,
        section_id: existing.sectionId,
        ...updates
      };

      const submission = await Submission.upsert(submissionData);

      logger.info('Submission updated successfully', {
        submissionId: id,
        updatedBy: req.user.userId
      });

      res.json({
        message: 'Submission updated successfully',
        data: submission.toJSON()
      });
    } catch (error) {
      logger.error('Update submission error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update submission',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Grade submission (teacher grades submission)
   * PUT /api/submissions/:id/grade
   */
  async gradeSubmission(req, res) {
    try {
      const { id } = req.params;
      const { teacher_score, teacher_feedback } = req.body;

      // Validate score
      if (teacher_score !== undefined && (teacher_score < 0 || teacher_score > 100)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Teacher score must be between 0 and 100',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get existing submission
      const existing = await Submission.findById(id);
      if (!existing) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'Submission not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Update with grading info
      const submissionData = {
        student_id: existing.studentId,
        module_id: existing.moduleId,
        section_id: existing.sectionId,
        submission_data: existing.submissionData,
        teacher_score,
        teacher_feedback,
        submission_status: 'reviewed'
      };

      const submission = await Submission.upsert(submissionData);

      logger.info('Submission graded successfully', {
        submissionId: id,
        score: teacher_score,
        gradedBy: req.user.userId
      });

      res.json({
        message: 'Submission graded successfully',
        data: submission.toJSON()
      });
    } catch (error) {
      logger.error('Grade submission error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to grade submission',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get all submissions for a module (teacher view)
   * GET /api/submissions/module/:moduleId
   */
  async getModuleSubmissions(req, res) {
    try {
      const { moduleId } = req.params;

      const submissions = await Submission.findByModule(moduleId);

      res.json({
        data: submissions.map(s => s.toJSON())
      });
    } catch (error) {
      logger.error('Get module submissions error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get module submissions',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Alias for backward compatibility
  async create(req, res) {
    return this.createSubmission(req, res);
  }
}

module.exports = new SubmissionsController();
