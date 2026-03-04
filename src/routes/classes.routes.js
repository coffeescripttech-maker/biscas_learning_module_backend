const express = require('express');
const router = express.Router();
const classesController = require('../controllers/classes.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * Class Routes
 * All routes require authentication
 */

// Get all classes (accessible by teachers and admins)
router.get(
  '/',
  verifyToken,
  requireRole('teacher', 'admin'),
  classesController.getClasses
);

// Get classes by teacher
router.get(
  '/teacher/:teacherId',
  verifyToken,
  requireRole('teacher', 'admin'),
  classesController.getClassesByTeacher
);

// Get classes for a student
router.get(
  '/student/:studentId',
  verifyToken,
  classesController.getClassesByStudent
);

// Get class by ID
router.get(
  '/:id',
  verifyToken,
  classesController.getClassById
);

// Create new class (teachers and admins only)
router.post(
  '/',
  verifyToken,
  requireRole('teacher', 'admin'),
  classesController.createClass
);

// Update class (creator or admin only - checked in controller)
router.put(
  '/:id',
  verifyToken,
  requireRole('teacher', 'admin'),
  classesController.updateClass
);

// Delete class (creator or admin only - checked in controller)
router.delete(
  '/:id',
  verifyToken,
  requireRole('teacher', 'admin'),
  classesController.deleteClass
);

// Get students in a class
router.get(
  '/:id/students',
  verifyToken,
  classesController.getClassStudents
);

// Add student to class (creator or admin only - checked in controller)
router.post(
  '/:id/students',
  verifyToken,
  requireRole('teacher', 'admin'),
  classesController.addStudent
);

// Remove student from class (creator or admin only - checked in controller)
router.delete(
  '/:id/students/:studentId',
  verifyToken,
  requireRole('teacher', 'admin'),
  classesController.removeStudent
);

module.exports = router;
