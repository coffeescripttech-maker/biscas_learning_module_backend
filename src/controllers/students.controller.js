const Student = require('../models/Student');
const Completion = require('../models/Completion');
const Badge = require('../models/Badge');
const User = require('../models/User');
const Profile = require('../models/Profile');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class StudentsController {
  /**
   * Get all students
   * GET /api/students
   */
  async getAll(req, res) {
    try {
      logger.info('Fetching all students');

      // Get all users with role 'student' including their profiles
      const students = await User.findByRole('student');

      logger.info(`Found ${students.length} students`);

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      logger.error('Get all students error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch students',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get student by ID
   * GET /api/students/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const student = await User.findByIdWithProfile(id);

      if (!student || student.role !== 'student') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Student not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        data: student
      });
    } catch (error) {
      logger.error('Get student by ID error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch student',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Create a new student
   * POST /api/students
   */
  async create(req, res) {
    try {
      logger.info('=== CREATE STUDENT REQUEST ===');
      logger.info('Raw req.body:', JSON.stringify(req.body, null, 2));
      logger.info('req.body type:', typeof req.body);
      logger.info('req.body keys:', Object.keys(req.body));
      
      const {
        firstName,
        middleName,
        lastName,
        email,
        password,
        gradeLevel,
        learningStyle,
        preferredModules,
        learningType,
        onboardingCompleted
      } = req.body;

      logger.info('Creating student:', email);
      logger.info('Extracted password:', password);
      logger.info('Password type:', typeof password);
      logger.info('Password value:', password ? `"${password}"` : 'UNDEFINED/NULL');

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
      
      logger.info('🔴 BACKEND: Raw password from req.body:', password);
      logger.info('🔴 BACKEND: Password type:', typeof password);
      logger.info('🔴 BACKEND: Password length:', password ? password.length : 'N/A');
      logger.info('🔴 BACKEND: Password is truthy?', !!password);
      
      // Ensure password is a string and not empty
      let passwordToHash = password;
      if (!passwordToHash || typeof passwordToHash !== 'string' || passwordToHash.trim() === '') {
        passwordToHash = 'learn2025';
        logger.info('Using default password: learn2025');
      } else {
        logger.info('Using provided password');
      }
      
      logger.info('🔴 BACKEND: Password to hash:', passwordToHash);
      logger.info('🔴 BACKEND: Password to hash length:', passwordToHash.length);

      await User.create({
        id: userId,
        email,
        password: passwordToHash,  // Pass plain password, User.create will hash it
        role: 'student',
        emailVerified: true
      });

      // Create profile
      const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
      
      logger.info('Creating profile for user:', userId);
      logger.info('Profile data:', {
        userId,
        firstName,
        middleName,
        lastName,
        fullName,
        gradeLevel,
        learningStyle,
        preferredModules,
        learningType,
        onboardingCompleted
      });
      
      await Profile.create({
        userId,
        firstName,
        middleName: middleName || null,
        lastName,
        fullName,
        gradeLevel: gradeLevel || 'Grade 7',
        learningStyle: learningStyle || 'reading_writing',
        preferredModules: preferredModules || [],
        learningType: learningType || null,
        onboardingCompleted: onboardingCompleted !== undefined ? onboardingCompleted : false
      });

      logger.info('Profile created successfully');

      // Fetch the created student with profile
      const student = await User.findByIdWithProfile(userId);
      
      logger.info('Fetched student with profile:', JSON.stringify(student, null, 2));

      logger.info('Student created successfully:', userId);

      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: student
      });
    } catch (error) {
      logger.error('Create student error:', error);
      logger.error('Error stack:', error.stack);
      
      // Handle specific error cases
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
          message: 'Failed to create student',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Bulk import students
   * POST /api/students/bulk-import
   */
  async bulkImport(req, res) {
    try {
      const students = req.body;

      if (!Array.isArray(students)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body must be an array of students',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info(`Starting bulk import of ${students.length} students`);

      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const errors = [];

      for (const studentData of students) {
        try {
          // Validate required fields
          if (!studentData.firstName || !studentData.lastName || !studentData.email) {
            failedCount++;
            errors.push({
              email: studentData.email || 'unknown',
              error: 'Missing required fields (firstName, lastName, email)'
            });
            continue;
          }

          // Check if email already exists
          const existingUser = await User.findByEmail(studentData.email);
          if (existingUser) {
            skippedCount++;
            logger.info(`Skipped duplicate email: ${studentData.email}`);
            continue;
          }

          // Create user
          const userId = uuidv4();
          const defaultPassword = studentData.password || 'learn2025'; // Use default if not provided

          await User.create({
            id: userId,
            email: studentData.email,
            password: defaultPassword,  // Pass plain password, User.create will hash it
            role: 'student',
            emailVerified: true
          });

          // Create profile
          const fullName = `${studentData.firstName} ${studentData.middleName ? studentData.middleName + ' ' : ''}${studentData.lastName}`.trim();
          
          await Profile.create({
            userId,
            firstName: studentData.firstName,
            middleName: studentData.middleName || null,
            lastName: studentData.lastName,
            fullName,
            gradeLevel: studentData.gradeLevel || 'Grade 7',
            learningStyle: studentData.learningStyle || 'reading_writing',
            preferredModules: studentData.preferredModules || [],
            learningType: studentData.learningType || null,
            onboardingCompleted: studentData.onboardingCompleted !== undefined ? studentData.onboardingCompleted : false
          });

          successCount++;
          logger.info(`Created student: ${studentData.email}`);
        } catch (error) {
          failedCount++;
          errors.push({
            email: studentData.email,
            error: error.message
          });
          logger.error(`Failed to create student ${studentData.email}:`, error);
        }
      }

      logger.info(`Bulk import complete: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`);

      res.json({
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        errors
      });
    } catch (error) {
      logger.error('Bulk import error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to import students',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update student
   * PUT /api/students/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      logger.info('Updating student:', id);
      logger.info('Update payload:', JSON.stringify(updates, null, 2));

      // Check if student exists
      const student = await User.findById(id);
      if (!student || student.role !== 'student') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Student not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Update profile
      if (updates.firstName || updates.lastName || updates.middleName || updates.gradeLevel || 
          updates.learningStyle || updates.preferredModules || updates.learningType || 
          updates.onboardingCompleted !== undefined) {
        
        // Check if profile exists
        const existingProfile = await Profile.findByUserId(id);
        
        if (!existingProfile) {
          // Profile doesn't exist, create it
          logger.info('Profile does not exist, creating new profile for user:', id);
          
          const fullName = `${updates.firstName || ''} ${updates.middleName || ''} ${updates.lastName || ''}`.trim();
          
          await Profile.create({
            userId: id,
            firstName: updates.firstName || '',
            middleName: updates.middleName || null,
            lastName: updates.lastName || '',
            fullName: fullName || 'Unknown',
            gradeLevel: updates.gradeLevel || 'Grade 7',
            learningStyle: updates.learningStyle || 'reading_writing',
            preferredModules: updates.preferredModules || [],
            learningType: updates.learningType || null,
            onboardingCompleted: updates.onboardingCompleted !== undefined ? updates.onboardingCompleted : false
          });
          
          logger.info('Profile created successfully');
        } else {
          // Profile exists, update it
          const profileUpdates = {};
          
          // Convert camelCase to snake_case for database
          if (updates.firstName) profileUpdates.first_name = updates.firstName;
          if (updates.lastName) profileUpdates.last_name = updates.lastName;
          if (updates.middleName !== undefined) profileUpdates.middle_name = updates.middleName;
          if (updates.gradeLevel) profileUpdates.grade_level = updates.gradeLevel;
          if (updates.learningStyle) profileUpdates.learning_style = updates.learningStyle;
          if (updates.preferredModules) profileUpdates.preferred_modules = updates.preferredModules;
          if (updates.learningType !== undefined) profileUpdates.learning_type = updates.learningType;
          if (updates.onboardingCompleted !== undefined) profileUpdates.onboarding_completed = updates.onboardingCompleted;
          
          // Update full name if first or last name changed
          if (updates.firstName || updates.lastName) {
            const firstName = updates.firstName || existingProfile.firstName;
            const middleName = updates.middleName !== undefined ? updates.middleName : existingProfile.middleName;
            const lastName = updates.lastName || existingProfile.lastName;
            profileUpdates.full_name = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
          }

          logger.info('Profile updates (snake_case):', JSON.stringify(profileUpdates, null, 2));
          await Profile.update(id, profileUpdates);
          logger.info('Profile updated successfully');
        }
      }

      // Fetch updated student with profile
      const updatedStudent = await User.findByIdWithProfile(id);
      
      logger.info('Fetched updated student:', JSON.stringify(updatedStudent, null, 2));

      logger.info('Student updated successfully:', id);

      res.json({
        success: true,
        message: 'Student updated successfully',
        data: updatedStudent
      });
    } catch (error) {
      logger.error('Update student error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update student',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Delete student
   * DELETE /api/students/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      logger.info('Deleting student:', id);

      // Check if student exists
      const student = await User.findById(id);
      if (!student || student.role !== 'student') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Student not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Delete user (cascade will delete profile)
      await User.delete(id);

      logger.info('Student deleted successfully:', id);

      res.json({
        success: true,
        message: 'Student deleted successfully'
      });
    } catch (error) {
      logger.error('Delete student error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete student',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get student statistics
   * GET /api/students/:id/stats
   */
  async getStats(req, res) {
    try {
      const { id } = req.params;

      console.log('Getting stats for student:', id);

      // Get completion stats
      const completionStats = await Completion.getStudentStats(id);
      console.log('Completion stats:', completionStats);

      // Get badge stats
      const badgeStats = await Badge.getStudentBadgeStats(id);
      console.log('Badge stats:', badgeStats);

      res.json({
        ...completionStats,
        ...badgeStats
      });
    } catch (error) {
      console.error('Get student stats error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get student statistics',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get student module completion
   * GET /api/students/:id/modules/:moduleId/completion
   */
  async getModuleCompletion(req, res) {
    try {
      const { id, moduleId } = req.params;

      const completion = await Completion.findByStudentAndModule(id, moduleId);

      if (!completion) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Module completion not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json(completion.toJSON());
    } catch (error) {
      console.error('Get module completion error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get module completion',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get dashboard statistics for a student
   * GET /api/students/:id/dashboard-stats
   */
  async getDashboardStats(req, res) {
    try {
      const { id } = req.params;

      logger.info('Getting dashboard stats for student:', id);

      // Verify student exists
      const student = await User.findById(id);
      if (!student || student.role !== 'student') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Student not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get completion stats
      const completionStats = await Completion.getStudentStats(id);
      
      // Get progress stats
      const Progress = require('../models/Progress');
      const progressStats = await Progress.getStudentStats(id);

      // Get total available modules
      const Module = require('../models/Module');
      const { total: totalModulesAvailable } = await Module.findAll({ 
        isPublished: true,
        limit: 1,
        offset: 0
      });

      // Build dashboard stats response
      const dashboardStats = {
        modulesCompleted: completionStats.totalModulesCompleted || 0,
        modulesInProgress: progressStats.in_progress_modules || 0,
        averageScore: Math.round(completionStats.averageScore || 0),
        totalTimeSpent: completionStats.totalTimeSpent || 0,
        perfectSections: completionStats.completions.reduce((sum, c) => sum + (c.perfect_sections || 0), 0),
        totalModulesAvailable: totalModulesAvailable || 0
      };

      logger.info('Dashboard stats calculated:', dashboardStats);

      res.json({
        success: true,
        data: dashboardStats
      });
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get dashboard statistics',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get recent activities for a student
   * GET /api/students/:id/recent-activities
   */
  async getRecentActivities(req, res) {
    try {
      const { id } = req.params;

      logger.info('Getting recent activities for student:', id);

      // Verify student exists
      const student = await User.findById(id);
      if (!student || student.role !== 'student') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Student not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get recent completions (limit 3)
      const completions = await Completion.findByStudent(id);
      const recentCompletions = completions.slice(0, 3).map(c => ({
        id: c.id,
        type: 'module_completion',
        title: c.module_title || 'Unknown Module',
        status: 'completed',
        timestamp: c.completionDate,
        score: c.finalScore
      }));

      // Get recent progress (limit 3, in-progress only)
      const Progress = require('../models/Progress');
      const { progress } = await Progress.findByStudentId(id, { 
        status: 'in_progress',
        limit: 3,
        offset: 0
      });
      const recentProgress = progress.map(p => ({
        id: p.id,
        type: 'module_progress',
        title: p.moduleTitle || 'Unknown Module',
        status: 'in_progress',
        timestamp: p.lastAccessedAt,
        progress: p.progressPercentage
      }));

      // Merge and sort by timestamp descending
      const allActivities = [...recentCompletions, ...recentProgress];
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Return top 5 activities
      const recentActivities = allActivities.slice(0, 5);

      logger.info(`Found ${recentActivities.length} recent activities`);

      res.json({
        success: true,
        data: recentActivities
      });
    } catch (error) {
      logger.error('Get recent activities error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recent activities',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get recommended modules for a student based on learning style
   * GET /api/students/:id/recommended-modules
   */
  async getRecommendedModules(req, res) {
    try {
      const { id } = req.params;

      logger.info('Getting recommended modules for student:', id);

      // Get student with profile
      const student = await User.findByIdWithProfile(id);
      if (!student || student.role !== 'student') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Student not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get student's learning style from profile
      const learningStyle = student.profile?.learningStyle || student.profile?.learning_style;
      
      logger.info('Student learning style:', learningStyle);

      // Get all published modules
      const Module = require('../models/Module');
      const { modules: allModules } = await Module.findAll({ 
        isPublished: true,
        limit: 100,
        offset: 0
      });

      // Get completed module IDs
      const completions = await Completion.findByStudent(id);
      const completedModuleIds = new Set(completions.map(c => c.moduleId));

      // Get in-progress module IDs
      const Progress = require('../models/Progress');
      const { progress } = await Progress.findByStudentId(id, { limit: 100 });
      const inProgressModuleIds = new Set(progress.map(p => p.moduleId));

      // Filter modules
      let recommendedModules = allModules.filter(module => {
        // Exclude completed modules
        if (completedModuleIds.has(module.id)) {
          return false;
        }

        // If student has a learning style, filter by target learning styles
        if (learningStyle && module.targetLearningStyles && Array.isArray(module.targetLearningStyles)) {
          return module.targetLearningStyles.includes(learningStyle);
        }

        // If no learning style or module has no target styles, include all
        return true;
      });

      // Sort: not-started modules first, then in-progress
      recommendedModules.sort((a, b) => {
        const aInProgress = inProgressModuleIds.has(a.id);
        const bInProgress = inProgressModuleIds.has(b.id);

        if (aInProgress && !bInProgress) return 1;
        if (!aInProgress && bInProgress) return -1;
        return 0;
      });

      // Limit to 10 recommendations
      recommendedModules = recommendedModules.slice(0, 10);

      logger.info(`Found ${recommendedModules.length} recommended modules`);

      res.json({
        success: true,
        data: recommendedModules.map(m => m.toJSON())
      });
    } catch (error) {
      logger.error('Get recommended modules error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recommended modules',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new StudentsController();
