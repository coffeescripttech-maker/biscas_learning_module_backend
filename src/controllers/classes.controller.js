const Class = require('../models/Class');
const logger = require('../utils/logger');

/**
 * Class Controller
 * Handles HTTP requests for class management
 */

/**
 * Get all classes
 * GET /api/classes
 */
exports.getClasses = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      subject,
      gradeLevel,
      createdBy,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Class.findAll({
      limit: parseInt(limit),
      offset,
      subject,
      gradeLevel,
      createdBy,
      search
    });

    res.json({
      success: true,
      data: result.classes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error getting classes:', error);
    next(error);
  }
};

/**
 * Get class by ID
 * GET /api/classes/:id
 */
exports.getClassById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const classObj = await Class.findById(id);

    if (!classObj) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DB_NOT_FOUND',
          message: 'Class not found'
        }
      });
    }

    res.json({
      success: true,
      data: classObj
    });
  } catch (error) {
    logger.error('Error getting class by ID:', error);
    next(error);
  }
};

/**
 * Create new class
 * POST /api/classes
 */
exports.createClass = async (req, res, next) => {
  try {
    const classData = {
      name: req.body.name,
      description: req.body.description,
      subject: req.body.subject,
      gradeLevel: req.body.gradeLevel,
      createdBy: req.user.userId // From auth middleware
    };

    const newClass = await Class.create(classData);

    logger.info(`Class created: ${newClass.id} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      data: newClass
    });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
    }

    logger.error('Error creating class:', error);
    next(error);
  }
};

/**
 * Update class
 * PUT /api/classes/:id
 */
exports.updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify class exists and user has permission
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DB_NOT_FOUND',
          message: 'Class not found'
        }
      });
    }

    // Check if user is the creator or admin
    if (existingClass.createdBy !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to update this class'
        }
      });
    }

    const updates = {
      name: req.body.name,
      description: req.body.description,
      subject: req.body.subject,
      gradeLevel: req.body.gradeLevel
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    const updatedClass = await Class.update(id, updates);

    logger.info(`Class updated: ${id} by user ${req.user.userId}`);

    res.json({
      success: true,
      data: updatedClass
    });
  } catch (error) {
    logger.error('Error updating class:', error);
    next(error);
  }
};

/**
 * Delete class
 * DELETE /api/classes/:id
 */
exports.deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify class exists and user has permission
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DB_NOT_FOUND',
          message: 'Class not found'
        }
      });
    }

    // Check if user is the creator or admin
    if (existingClass.createdBy !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to delete this class'
        }
      });
    }

    await Class.delete(id);

    logger.info(`Class deleted: ${id} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting class:', error);
    next(error);
  }
};

/**
 * Add student to class
 * POST /api/classes/:id/students
 */
exports.addStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Student ID is required'
        }
      });
    }

    // Verify class exists and user has permission
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DB_NOT_FOUND',
          message: 'Class not found'
        }
      });
    }

    // Check if user is the creator or admin
    if (existingClass.createdBy !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to add students to this class'
        }
      });
    }

    await Class.addStudent(id, studentId);

    logger.info(`Student ${studentId} added to class ${id} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Student added to class successfully'
    });
  } catch (error) {
    if (error.code === 'DB_DUPLICATE_ENTRY') {
      return res.status(400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    logger.error('Error adding student to class:', error);
    next(error);
  }
};

/**
 * Remove student from class
 * DELETE /api/classes/:id/students/:studentId
 */
exports.removeStudent = async (req, res, next) => {
  try {
    const { id, studentId } = req.params;

    // Verify class exists and user has permission
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DB_NOT_FOUND',
          message: 'Class not found'
        }
      });
    }

    // Check if user is the creator or admin
    if (existingClass.createdBy !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to remove students from this class'
        }
      });
    }

    await Class.removeStudent(id, studentId);

    logger.info(`Student ${studentId} removed from class ${id} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Student removed from class successfully'
    });
  } catch (error) {
    if (error.code === 'DB_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    logger.error('Error removing student from class:', error);
    next(error);
  }
};

/**
 * Get students in a class
 * GET /api/classes/:id/students
 */
exports.getClassStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify class exists
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DB_NOT_FOUND',
          message: 'Class not found'
        }
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const students = await Class.getStudents(id, {
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error getting class students:', error);
    next(error);
  }
};

/**
 * Get classes by teacher
 * GET /api/classes/teacher/:teacherId
 */
exports.getClassesByTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Class.findByTeacher(teacherId, {
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: result.classes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error getting classes by teacher:', error);
    next(error);
  }
};

/**
 * Get classes for a student
 * GET /api/classes/student/:studentId
 */
exports.getClassesByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const classes = await Class.findByStudent(studentId, {
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: classes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error getting classes by student:', error);
    next(error);
  }
};
