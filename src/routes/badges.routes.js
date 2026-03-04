const express = require('express');
const router = express.Router();
const badgesController = require('../controllers/badges.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   POST /api/badges
 * @desc    Award a badge to a student
 * @access  Private
 */
router.post('/', verifyToken, badgesController.create);

/**
 * @route   GET /api/badges/student/:studentId
 * @desc    Get badges for a student
 * @access  Private
 */
router.get('/student/:studentId', verifyToken, badgesController.getStudentBadges);

module.exports = router;
