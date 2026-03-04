const express = require('express');
const router = express.Router();
const submissionsController = require('../controllers/submissions.controller');
const { verifyToken, requireTeacher } = require('../middleware/auth');

/**
 * All submission routes require authentication
 */

/**
 * @route   GET /api/submissions
 * @desc    Get submissions with filters
 * @access  Private
 * @query   studentId - Student ID (required)
 * @query   moduleId - Module ID (required)
 * @query   sectionId - Section ID (optional, returns specific submission)
 */
router.get('/', verifyToken, submissionsController.getSubmissions);

/**
 * @route   GET /api/submissions/student/:studentId/module/:moduleId/section/:sectionId
 * @desc    Get submission for specific section
 * @access  Private (Student or Teacher)
 */
router.get('/student/:studentId/module/:moduleId/section/:sectionId', verifyToken, submissionsController.getSectionSubmission);

/**
 * @route   GET /api/submissions/module/:moduleId
 * @desc    Get all submissions for a module (teacher view)
 * @access  Private (Teacher/Admin only)
 */
router.get('/module/:moduleId', verifyToken, requireTeacher, submissionsController.getModuleSubmissions);

/**
 * @route   POST /api/submissions
 * @desc    Create submission (save student answer)
 * @access  Private
 * @body    {
 *            student_id: string (required),
 *            module_id: string (required),
 *            section_id: string (required),
 *            section_title: string (optional),
 *            section_type: string (optional),
 *            submission_data: object (required),
 *            assessment_results: object (optional),
 *            time_spent_seconds: number (optional),
 *            submission_status: string (optional)
 *          }
 */
router.post('/', verifyToken, submissionsController.createSubmission);

/**
 * @route   PUT /api/submissions/:id
 * @desc    Update submission
 * @access  Private (Student or Teacher)
 * @body    Any submission fields to update (except student_id, module_id, section_id)
 */
router.put('/:id', verifyToken, submissionsController.updateSubmission);

/**
 * @route   PUT /api/submissions/:id/grade
 * @desc    Grade submission (teacher grades submission)
 * @access  Private (Teacher/Admin only)
 * @body    {
 *            teacher_score: number (0-100, optional),
 *            teacher_feedback: string (optional)
 *          }
 */
router.put('/:id/grade', verifyToken, requireTeacher, submissionsController.gradeSubmission);

module.exports = router;
