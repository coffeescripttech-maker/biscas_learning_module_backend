const express = require('express');
const router = express.Router();
const teachersController = require('../controllers/teachers.controller');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Teacher dashboard statistics
router.get('/:teacherId/stats', teachersController.getDashboardStats);

// Learning style distribution
router.get('/:teacherId/learning-style-distribution', teachersController.getLearningStyleDistribution);

// Learning type distribution
router.get('/:teacherId/learning-type-distribution', teachersController.getLearningTypeDistribution);

// Recent module completions
router.get('/:teacherId/recent-completions', teachersController.getRecentCompletions);

// Student list
router.get('/:teacherId/students', teachersController.getStudentList);

module.exports = router;
