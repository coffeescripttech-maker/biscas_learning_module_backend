const express = require('express');
const router = express.Router();
const db = require('../utils/db');

/**
 * GET /api/stats/homepage
 * Get homepage statistics
 */
router.get('/homepage', async (req, res) => {
  try {
    console.log('📊 Fetching homepage statistics...');

    // Fetch all statistics in parallel
    const [
      studentsResult,
      teachersResult,
      modulesResult,
      completedModulesResult,
      recentStudentsResult,
      recentTeachersResult,
      classesResult
    ] = await Promise.all([
      // Total students
      db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['student']),
      
      // Total teachers
      db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['teacher']),
      
      // Total published modules
      db.query('SELECT COUNT(*) as count FROM vark_modules WHERE is_published = ?', [true]),
      
      // Completed modules count
      db.query('SELECT COUNT(*) as count FROM module_completions'),
      
      // Recent students (last 30 days)
      db.query(
        'SELECT COUNT(*) as count FROM users WHERE role = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        ['student']
      ),
      
      // Recent teachers (last 30 days)
      db.query(
        'SELECT COUNT(*) as count FROM users WHERE role = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        ['teacher']
      ),
      
      // Total classes
      db.query('SELECT COUNT(*) as count FROM classes')
    ]);

    const totalStudents = studentsResult[0]?.count || 0;
    const totalTeachers = teachersResult[0]?.count || 0;
    const totalModules = modulesResult[0]?.count || 0;
    const completedModules = completedModulesResult[0]?.count || 0;
    const recentStudents = recentStudentsResult[0]?.count || 0;
    const recentTeachers = recentTeachersResult[0]?.count || 0;
    const totalClasses = classesResult[0]?.count || 0;

    // Calculate success rate (percentage of students who completed modules)
    const successRate = totalStudents > 0 
      ? Math.round((completedModules / totalStudents) * 100) 
      : 0;

    const stats = {
      totalStudents,
      totalTeachers,
      totalModules,
      totalClasses,
      totalQuizzes: 0, // Not implemented yet
      totalActivities: 0, // Not implemented yet
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
