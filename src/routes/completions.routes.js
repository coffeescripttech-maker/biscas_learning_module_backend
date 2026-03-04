const express = require('express');
const router = express.Router();
const completionsController = require('../controllers/completions.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * All completion routes require authentication
 */

/**
 * @route   GET /api/completions/student/:studentId
 * @desc    Get all completions for a student with module details
 * @access  Private (Student or Teacher)
 */
router.get('/student/:studentId', verifyToken, completionsController.getStudentCompletions);

/**
 * @route   GET /api/completions/student/:studentId/stats
 * @desc    Get completion statistics for a student
 * @access  Private (Student or Teacher)
 */
router.get('/student/:studentId/stats', verifyToken, completionsController.getCompletionStats);

/**
 * @route   GET /api/completions/student/:studentId/module/:moduleId
 * @desc    Get completion for specific student and module
 * @access  Private (Student or Teacher)
 */
router.get('/student/:studentId/module/:moduleId', verifyToken, completionsController.getModuleCompletion);

/**
 * @route   POST /api/completions
 * @desc    Complete a module (create or update completion record)
 * @access  Private
 * @body    {
 *            student_id: string (required),
 *            module_id: string (required),
 *            final_score: number (optional),
 *            time_spent_minutes: number (optional),
 *            sections_completed: number (optional),
 *            perfect_sections: number (optional)
 *          }
 */
router.post('/', verifyToken, completionsController.create);

module.exports = router;
