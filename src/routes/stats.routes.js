const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/stats/homepage
 * Get homepage statistics
 */
router.get('/homepage', async (req, res) => {
  try {
    console.log('📊 Fetching homepage statistics...');

    // Fetch all statistics in parallel
    const [
      [studentsResult],
      [teachersResult],
      [modulesResult],
      [completedModulesResult],
      [recentStudentsResult],
      [recentTeachersResult],
      [classesResult],
      [quizzesResult],
      [activitiesResult]
    ] = await Promise.all([
      // Total students
      db.query('SELECT COUNT(*) as count FROM profiles WHERE role = ?', ['student']),
      
      // Total teachers
      db.query('SELECT COUNT(*) as count FROM profiles WHERE role = ?', ['teacher']),
      
      // Total published modules
      db.query('SELECT COUNT(*) as count FROM vark_modules WHERE is_published = ?', [true]),
      
      // Completed modules (students with onboarding completed)
      db.query('SELECT COUNT(*) as count FROM profiles WHERE role = ? AND onboarding_completed = ?', ['student', true]),
      
      // Recent students (last 30 days)
      db.query(
        'SELECT COUNT(*) as count FROM profiles WHERE role = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        ['student']
      ),
      
      // Recent teachers (last 30 days)
      db.query(
        'SELECT COUNT(*) as count FROM profiles WHERE role = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        ['teacher']
      ),
      
      // Total classes
      db.query('SELECT COUNT(*) as count FROM classes'),
      
      // Total published quizzes
      db.query('SELECT COUNT(*) as count FROM quizzes WHERE is_published = ?', [true]),
      
      // Total published activities
      db.query('SELECT COUNT(*) as count FROM activities WHERE is_published = ?', [true])
    ]);

    const totalStudents = studentsResult.count || 0;
    const totalTeachers = teachersResult.count || 0;
    const totalModules = modulesResult.count || 0;
    const completedModules = completedModulesResult.count || 0;
    const recentStudents = recentStudentsResult.count || 0;
    const recentTeachers = recentTeachersResult.count || 0;
    const totalClasses = classesResult.count || 0;
    const totalQuizzes = quizzesResult.count || 0;
    const totalActivities = activitiesResult.count || 0;

    // Calculate success rate (percentage of students who completed onboarding)
    const successRate = totalStudents > 0 
      ? Math.round((completedModules / totalStudents) * 100) 
      : 0;

    const stats = {
      totalStudents,
      totalTeachers,
      totalModules,
      totalClasses,
      totalQuizzes,
      totalActivities,
      successRate,
      recentActivity: {
        newStudents: recentStudents,
        newTeachers: recentTeachers,
        completedModules: completedModules
      }
    };

    console.log('✅ Homepage stats fetched successfully:', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching homepage stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch homepage statistics'
    });
  }
});

/**
 * GET /api/stats/health
 * Get system health status
 */
router.get('/health', async (req, res) => {
  try {
    // Simple health check - try to query the database
    const [[result]] = await db.query('SELECT COUNT(*) as count FROM profiles LIMIT 1');
    
    res.json({
      success: true,
      data: {
        databaseConnected: true,
        lastUpdate: new Date().toISOString(),
        totalUsers: result.count || 0
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }
});

module.exports = router;
