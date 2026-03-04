const express = require('express');
const router = express.Router();
const modulesController = require('../controllers/modules.controller');
const { verifyToken, requireTeacher } = require('../middleware/auth');

/**
 * All module routes require authentication
 * Most routes require teacher or admin role for creation/modification
 * Students can view published modules
 */

/**
 * @route   GET /api/modules
 * @desc    Get all modules with pagination and filtering
 * @access  Private (Authenticated users)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50, max: 100)
 * @query   categoryId - Filter by category ID
 * @query   difficultyLevel - Filter by difficulty (beginner, intermediate, advanced)
 * @query   isPublished - Filter by published status (true/false)
 * @query   createdBy - Filter by creator user ID
 * @query   search - Search by title or description
 */
router.get('/', verifyToken, modulesController.getModules);

/**
 * @route   POST /api/modules/import
 * @desc    Import module from JSON
 * @access  Private (Teacher/Admin only)
 * @body    JSON module data
 */
router.post('/import', verifyToken, requireTeacher, modulesController.importModule);

/**
 * @route   GET /api/modules/category/:categoryId
 * @desc    Get modules by category ID
 * @access  Private (Authenticated users)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50)
 * @query   isPublished - Filter by published status (true/false)
 */
router.get('/category/:categoryId', verifyToken, modulesController.getModulesByCategory);

/**
 * @route   GET /api/modules/creator/:creatorId
 * @desc    Get modules by creator ID
 * @access  Private (Authenticated users)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50)
 */
router.get('/creator/:creatorId', verifyToken, modulesController.getModulesByCreator);

/**
 * @route   GET /api/modules/:id/submission-stats
 * @desc    Get submission statistics for a module
 * @access  Private (Teacher/Admin only)
 */
router.get('/:id/submission-stats', verifyToken, requireTeacher, modulesController.getModuleSubmissionStats);

/**
 * @route   GET /api/modules/:id/completions
 * @desc    Get all completions for a module
 * @access  Private (Teacher/Admin only)
 */
router.get('/:id/completions', verifyToken, requireTeacher, modulesController.getModuleCompletions);

/**
 * @route   GET /api/modules/:id
 * @desc    Get module by ID
 * @access  Private (Authenticated users)
 */
router.get('/:id', verifyToken, modulesController.getModuleById);

/**
 * @route   POST /api/modules
 * @desc    Create a new module
 * @access  Private (Teacher/Admin only)
 * @body    {
 *            title: string (required),
 *            description: string (optional),
 *            categoryId: string (optional),
 *            learningObjectives: array (optional),
 *            contentStructure: object (optional),
 *            difficultyLevel: string (optional - beginner, intermediate, advanced),
 *            estimatedDurationMinutes: number (optional),
 *            prerequisites: array (optional),
 *            multimediaContent: object (optional),
 *            interactiveElements: object (optional),
 *            assessmentQuestions: array (optional),
 *            moduleMetadata: object (optional),
 *            jsonBackupUrl: string (optional),
 *            jsonContentUrl: string (optional),
 *            contentSummary: object (optional),
 *            targetClassId: string (optional),
 *            targetLearningStyles: array (optional),
 *            prerequisiteModuleId: string (optional),
 *            isPublished: boolean (optional)
 *          }
 */
router.post('/', verifyToken, requireTeacher, modulesController.createModule);

/**
 * @route   PUT /api/modules/:id
 * @desc    Update module
 * @access  Private (Teacher/Admin only - must be creator or admin)
 * @body    Any module fields to update (except createdBy)
 */
router.put('/:id', verifyToken, requireTeacher, modulesController.updateModule);

/**
 * @route   DELETE /api/modules/:id
 * @desc    Delete module
 * @access  Private (Teacher/Admin only - must be creator or admin)
 */
router.delete('/:id', verifyToken, requireTeacher, modulesController.deleteModule);

module.exports = router;
