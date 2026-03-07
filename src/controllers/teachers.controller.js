const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Profile = require('../models/Profile');
const logger = require('../utils/logger');

/**
 * Teachers Controller
 * Handles CRUD operations for teacher accounts
 */
class TeachersController {
  /**
   * Get all teachers
   * GET /api/teachers
   */
  async getAll(req, res) {
    try {
      logger.info('Getting all teachers');

      // Get all users with role 'teacher'
      const teachers = await User.findByRole('teacher');

      logger.info(`Found ${teachers.length} teachers`);

      res.json({
        success: true,
        data: teachers
      });
    } catch (error) {
      logger.error('Get teachers error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get teachers',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get teacher by ID
   * GET /api/teachers/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      logger.info('Getting teacher by ID:', id);

      const teacher = await User.findByIdWithProfile(id);

      if (!teacher || teacher.role !== 'teacher') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Teacher not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        data: teacher
      });
    } catch (error) {
      logger.error('Get teacher error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get teacher',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Create a new teacher
   * POST /api/teachers
   */
  async create(req, res) {
    try {
      logger.info('=== CREATE TEACHER REQUEST ===');
      logger.info('Request body:', JSON.stringify(req.body, null, 2));

      const {
        firstName,
        middleName,
        lastName,
        email,
        password,
        phoneNumber,
        department,
        specialization
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'First name, last name, and email are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'A user with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Create user
      const userId = uuidv4();
      
      // Use provided password or default
      let passwordToHash = password;
      if (!passwordToHash || typeof passwordToHash !== 'string' || passwordToHash.trim() === '') {
        passwordToHash = 'teach2025';
        logger.info('Using default password: teach2025');
      }

      await User.create({
        id: userId,
        email,
        password: passwordToHash,
        role: 'teacher',
        emailVerified: true
      });

      // Create profile
      const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
      
      await Profile.create({
        userId,
        firstName,
        middleName: middleName || null,
        lastName,
        fullName,
        phoneNumber: phoneNumber || null,
        department: department || null,
        specialization: specialization || null,
        onboardingCompleted: true
      });

      // Fetch the created teacher with profile
      const teacher = await User.findByIdWithProfile(userId);

      logger.info('Teacher created successfully:', userId);

      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        data: teacher
      });
    } catch (error) {
      logger.error('Create teacher error:', error);
      logger.error('Error stack:', error.stack);

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'A user with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create teacher',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update teacher
   * PUT /api/teachers/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        firstName,
        middleName,
        lastName,
        email,
        phoneNumber,
        department,
        specialization
      } = req.body;

      logger.info('Updating teacher:', id);

      // Check if teacher exists
      const teacher = await User.findById(id);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Teacher not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if email is being changed and if it's already taken
      if (email && email !== teacher.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'DUPLICATE_EMAIL',
              message: 'A user with this email already exists',
              timestamp: new Date().toISOString()
            }
          });
        }
        // Update email
        await User.update(id, { email });
      }

      // Update profile
      const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
      
      await Profile.update(id, {
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        full_name: fullName,
        phone_number: phoneNumber || null,
        department: department || null,
        specialization: specialization || null
      });

      // Fetch updated teacher
      const updatedTeacher = await User.findByIdWithProfile(id);

      logger.info('Teacher updated successfully:', id);

      res.json({
        success: true,
        message: 'Teacher updated successfully',
        data: updatedTeacher
      });
    } catch (error) {
      logger.error('Update teacher error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update teacher',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Delete teacher
   * DELETE /api/teachers/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      logger.info('Deleting teacher:', id);

      // Check if teacher exists
      const teacher = await User.findById(id);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Teacher not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Delete profile first
      await Profile.delete(id);

      // Delete user
      await User.delete(id);

      logger.info('Teacher deleted successfully:', id);

      res.json({
        success: true,
        message: 'Teacher deleted successfully'
      });
    } catch (error) {
      logger.error('Delete teacher error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete teacher',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get teacher dashboard stats
   * GET /api/teachers/:id/stats
   */
  async getStats(req, res) {
    try {
      const { id } = req.params;
      const db = require('../utils/db');

      logger.info('Getting teacher stats for:', id);

      // Get stats in parallel
      const [
        studentsResult,
        publishedModulesResult,
        totalModulesResult,
        completedModulesResult
      ] = await Promise.all([
        // Total students
        db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['student']),
        
        // Published modules
        db.query('SELECT COUNT(*) as count FROM vark_modules WHERE is_published = ?', [1]),
        
        // Total modules
        db.query('SELECT COUNT(*) as count FROM vark_modules'),
        
        // Completed modules
        db.query('SELECT COUNT(*) as count FROM module_completions')
      ]);

      const stats = {
        totalStudents: studentsResult[0]?.count || 0,
        publishedModules: publishedModulesResult[0]?.count || 0,
        totalModules: totalModulesResult[0]?.count || 0,
        completedModules: completedModulesResult[0]?.count || 0
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get teacher stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get teacher stats',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get learning style distribution
   * GET /api/teachers/:id/learning-style-distribution
   */
  async getLearningStyleDistribution(req, res) {
    try {
      const { id } = req.params;
      const db = require('../utils/db');

      logger.info('Getting learning style distribution for teacher:', id);

      const results = await db.query(`
        SELECT 
          learning_style,
          COUNT(*) as count
        FROM profiles
        WHERE learning_style IS NOT NULL
        GROUP BY learning_style
      `);

      const distribution = {
        visual: 0,
        auditory: 0,
        reading_writing: 0,
        kinesthetic: 0
      };

      // Handle results - db.query returns array directly
      const rows = Array.isArray(results) ? results : [];
      rows.forEach(row => {
        if (row.learning_style && distribution.hasOwnProperty(row.learning_style)) {
          distribution[row.learning_style] = row.count;
        }
      });

      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      logger.error('Get learning style distribution error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get learning style distribution',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get learning type distribution
   * GET /api/teachers/:id/learning-type-distribution
   */
  async getLearningTypeDistribution(req, res) {
    try {
      const { id } = req.params;
      const db = require('../utils/db');

      logger.info('Getting learning type distribution for teacher:', id);

      const results = await db.query(`
        SELECT 
          learning_type,
          COUNT(*) as count
        FROM profiles
        WHERE learning_type IS NOT NULL
        GROUP BY learning_type
      `);

      const distribution = {
        unimodal: 0,
        bimodal: 0,
        trimodal: 0,
        multimodal: 0,
        not_set: 0
      };

      // Handle results - db.query returns array directly
      const rows = Array.isArray(results) ? results : [];
      rows.forEach(row => {
        if (row.learning_type && distribution.hasOwnProperty(row.learning_type)) {
          distribution[row.learning_type] = row.count;
        }
      });

      // Count profiles without learning_type
      const notSetResult = await db.query(`
        SELECT COUNT(*) as count
        FROM profiles
        WHERE learning_type IS NULL OR learning_type = ''
      `);

      distribution.not_set = notSetResult[0]?.count || 0;

      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      logger.error('Get learning type distribution error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get learning type distribution',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get recent completions
   * GET /api/teachers/:id/recent-completions
   */
  async getRecentCompletions(req, res) {
    try {
      const { id } = req.params;
      const db = require('../utils/db');

      logger.info('Getting recent completions for teacher:', id);

      const completions = await db.query(`
        SELECT 
          mc.id,
          vm.title as moduleTitle,
          CONCAT(p.first_name, ' ', p.last_name) as studentName,
          mc.completion_date as completionDate,
          mc.final_score as finalScore,
          mc.time_spent_minutes as timeSpentMinutes,
          mc.perfect_sections as perfectSections
        FROM module_completions mc
        JOIN vark_modules vm ON mc.module_id = vm.id
        JOIN users u ON mc.student_id = u.id
        JOIN profiles p ON u.id = p.user_id
        ORDER BY mc.completion_date DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: completions || []
      });
    } catch (error) {
      logger.error('Get recent completions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recent completions',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get students for teacher
   * GET /api/teachers/:id/students
   */
  async getStudents(req, res) {
    try {
      const { id } = req.params;

      logger.info('Getting students for teacher:', id);

      // Get all students
      const students = await User.findByRole('student');

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      logger.error('Get students error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get students',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new TeachersController();
