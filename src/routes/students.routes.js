const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/students.controller');
const { verifyToken, requireTeacher } = require('../middleware/auth');

/**
 * @route   GET /api/students
 * @desc    Get all students
 * @access  Private (Teacher/Admin only)
 */
router.get('/', verifyToken, requireTeacher, studentsController.getAll);

/**
 * @route   GET /api/students/:id
 * @desc    Get student by ID
 * @access  Private
 */
router.get('/:id', verifyToken, studentsController.getById);

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  Private (Teacher/Admin only)
 */
router.post('/', verifyToken, requireTeacher, studentsController.create);

/**
 * @route   POST /api/students/bulk-import
 * @desc    Bulk import students from JSON
 * @access  Private (Teacher/Admin only)
 */
router.post('/bulk-import', verifyToken, requireTeacher, studentsController.bulkImport);

/**
 * @route   PUT /api/students/:id
 * @desc    Update student
 * @access  Private (Teacher/Admin only)
 */
router.put('/:id', verifyToken, requireTeacher, studentsController.update);

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete student
 * @access  Private (Teacher/Admin only)
 */
router.delete('/:id', verifyToken, requireTeacher, studentsController.delete);

/**
 * @route   GET /api/students/:id/stats
 * @desc    Get student statistics
 * @access  Private
 */
router.get('/:id/stats', verifyToken, studentsController.getStats);

/**
 * @route   GET /api/students/:id/modules/:moduleId/completion
 * @desc    Get student module completion
 * @access  Private
 */
router.get('/:id/modules/:moduleId/completion', verifyToken, studentsController.getModuleCompletion);

/**
 * @route   GET /api/students/:id/dashboard-stats
 * @desc    Get student dashboard statistics
 * @access  Private
 */
router.get('/:id/dashboard-stats', verifyToken, studentsController.getDashboardStats);

/**
 * @route   GET /api/students/:id/recent-activities
 * @desc    Get student recent activities
 * @access  Private
 */
router.get('/:id/recent-activities', verifyToken, studentsController.getRecentActivities);

/**
 * @route   GET /api/students/:id/recommended-modules
 * @desc    Get recommended modules for student based on learning style
 * @access  Private
 */
router.get('/:id/recommended-modules', verifyToken, studentsController.getRecommendedModules);

module.exports = router;
