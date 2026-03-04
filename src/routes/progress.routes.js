const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');
const { verifyToken, requireTeacher } = require('../middleware/auth');

/**
 * All progress routes require authentication
 * Most routes require teacher or admin role for viewing all progress
 * Students can view their own progress
 */

/**
 * @route   GET /api/progress/student/:studentId
 * @desc    Get all progress records for a student
 * @access  Private (Teacher/Admin or the student themselves)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50, max: 100)
 * @query   status - Filter by status (not_started, in_progress, completed, paused)
 */
router.get('/student/:studentId', verifyToken, progressController.getProgressByStudent);

/**
 * @route   GET /api/progress/student/:studentId/stats
 * @desc    Get progress statistics for a student
 * @access  Private (Teacher/Admin or the student themselves)
 */
router.get('/student/:studentId/stats', verifyToken, progressController.getStudentStats);

/**
 * @route   GET /api/progress/student/:studentId/module/:moduleId
 * @desc    Get progress for a specific student and module
 * @access  Private (Teacher/Admin or the student themselves)
 */
router.get('/student/:studentId/module/:moduleId', verifyToken, progressController.getProgressByStudentAndModule);

/**
 * @route   PUT /api/progress/student/:studentId/module/:moduleId
 * @desc    Update progress for a specific student and module
 * @access  Private (Teacher/Admin or the student themselves)
 * @body    {
 *            status: string (optional) - not_started, in_progress, completed, paused,
 *            progressPercentage: number (optional) - 0-100,
 *            currentSectionId: string (optional),
 *            timeSpentMinutes: number (optional),
 *            completedSections: array (optional),
 *            assessmentScores: object (optional),
 *            completedAt: date (optional)
 *          }
 */
router.put('/student/:studentId/module/:moduleId', verifyToken, progressController.updateProgressByStudentAndModule);

/**
 * @route   GET /api/progress/module/:moduleId
 * @desc    Get all progress records for a module
 * @access  Private (Teacher/Admin only)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50, max: 100)
 * @query   status - Filter by status (not_started, in_progress, completed, paused)
 */
router.get('/module/:moduleId', verifyToken, requireTeacher, progressController.getProgressByModule);

/**
 * @route   GET /api/progress/module/:moduleId/stats
 * @desc    Get progress statistics for a module
 * @access  Private (Teacher/Admin only)
 */
router.get('/module/:moduleId/stats', verifyToken, requireTeacher, progressController.getModuleStats);

/**
 * @route   GET /api/progress/:id
 * @desc    Get progress by ID
 * @access  Private (Teacher/Admin only)
 */
router.get('/:id', verifyToken, requireTeacher, progressController.getProgressById);

/**
 * @route   POST /api/progress
 * @desc    Create a new progress record
 * @access  Private (Authenticated users)
 * @body    {
 *            studentId: string (required),
 *            moduleId: string (required),
 *            status: string (optional) - not_started, in_progress, completed, paused,
 *            progressPercentage: number (optional) - 0-100,
 *            currentSectionId: string (optional),
 *            timeSpentMinutes: number (optional),
 *            completedSections: array (optional),
 *            assessmentScores: object (optional)
 *          }
 */
router.post('/', verifyToken, progressController.createProgress);

/**
 * @route   PUT /api/progress/:id
 * @desc    Update progress record
 * @access  Private (Teacher/Admin or the student themselves)
 * @body    Any progress fields to update (except studentId and moduleId)
 */
router.put('/:id', verifyToken, progressController.updateProgress);

/**
 * @route   DELETE /api/progress/:id
 * @desc    Delete progress record
 * @access  Private (Teacher/Admin only)
 */
router.delete('/:id', verifyToken, requireTeacher, progressController.deleteProgress);

module.exports = router;
