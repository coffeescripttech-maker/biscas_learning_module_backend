const express = require('express');
const router = express.Router();
const teachersController = require('../controllers/teachers.controller');
const { verifyToken, requireTeacher } = require('../middleware/auth');

/**
 * @route   GET /api/teachers
 * @desc    Get all teachers
 * @access  Private (Teacher/Admin only)
 */
router.get('/', verifyToken, requireTeacher, teachersController.getAll);

/**
 * @route   GET /api/teachers/:id
 * @desc    Get teacher by ID
 * @access  Private (Teacher/Admin only)
 */
router.get('/:id/stats', verifyToken, requireTeacher, teachersController.getStats);
router.get('/:id/learning-style-distribution', verifyToken, requireTeacher, teachersController.getLearningStyleDistribution);
router.get('/:id/learning-type-distribution', verifyToken, requireTeacher, teachersController.getLearningTypeDistribution);
router.get('/:id/recent-completions', verifyToken, requireTeacher, teachersController.getRecentCompletions);
router.get('/:id/students', verifyToken, requireTeacher, teachersController.getStudents);
router.get('/:id', verifyToken, requireTeacher, teachersController.getById);

/**
 * @route   POST /api/teachers
 * @desc    Create a new teacher
 * @access  Private (Teacher/Admin only)
 */
router.post('/', verifyToken, requireTeacher, teachersController.create);

/**
 * @route   PUT /api/teachers/:id
 * @desc    Update teacher
 * @access  Private (Teacher/Admin only)
 */
router.put('/:id', verifyToken, requireTeacher, teachersController.update);

/**
 * @route   DELETE /api/teachers/:id
 * @desc    Delete teacher
 * @access  Private (Teacher/Admin only)
 */
router.delete('/:id', verifyToken, requireTeacher, teachersController.delete);

module.exports = router;
