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
}

module.exports = new TeachersController();
