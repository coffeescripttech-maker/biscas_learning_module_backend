const db = require('../utils/db');
const logger = require('../utils/logger');

class TeachersController {
  /**
   * Get teacher dashboard statistics
   * GET /api/teachers/:teacherId/stats
   */
  async getDashboardStats(req, res) {
    try {
      const { teacherId } = req.params;

      // Get total students count (users with role='student')
      const [studentsResult] = await db.query(
        `SELECT COUNT(*) as total FROM users WHERE role = 'student'`
      );

      console.log({studentsResult});
      const totalStudents = studentsResult?.total || 0;

      // Get published modules count for this teacher
      const [publishedResult] = await db.query(
        `SELECT COUNT(*) as total FROM vark_modules 
         WHERE created_by = ? AND is_published = 1`,
        [teacherId]
      );
      const publishedModules = publishedResult?.total || 0;

      // Get total modules count for this teacher
      const [totalModulesResult] = await db.query(
        `SELECT COUNT(*) as total FROM vark_modules WHERE created_by = ?`,
        [teacherId]
      );
      const totalModules = totalModulesResult?.total || 0;

      // Get completed modules count (for modules created by this teacher)
      const [completionsResult] = await db.query(
        `SELECT COUNT(DISTINCT mc.id) as total 
         FROM module_completions mc
         INNER JOIN vark_modules vm ON mc.module_id = vm.id
         WHERE vm.created_by = ?`,
        [teacherId]
      );
      const completedModules = completionsResult?.total || 0;


      console.log({totalStudents});
      res.json({
        totalStudents,
        publishedModules,
        totalModules,
        completedModules
      });
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get dashboard statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get learning style distribution
   * GET /api/teachers/:teacherId/learning-style-distribution
   */
  async getLearningStyleDistribution(req, res) {
    try {
      const rows = await db.query(
        `SELECT p.learning_style, COUNT(*) as count 
         FROM profiles p
         INNER JOIN users u ON p.user_id = u.id
         WHERE u.role = 'student' AND p.learning_style IS NOT NULL
         GROUP BY p.learning_style`
      );

      const distribution = {
        visual: 0,
        auditory: 0,
        reading_writing: 0,
        kinesthetic: 0
      };

      rows.forEach(row => {
        const style = row.learning_style;
        if (style && style in distribution) {
          distribution[style] = row.count;
        }
      });

      res.json(distribution);
    } catch (error) {
      logger.error('Get learning style distribution error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get learning style distribution',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get learning type distribution (modality)
   * GET /api/teachers/:teacherId/learning-type-distribution
   */
  async getLearningTypeDistribution(req, res) {
    try {
      const rows = await db.query(
        `SELECT p.learning_type, COUNT(*) as count 
         FROM profiles p
         INNER JOIN users u ON p.user_id = u.id
         WHERE u.role = 'student'
         GROUP BY p.learning_type`
      );

      const distribution = {
        unimodal: 0,
        bimodal: 0,
        trimodal: 0,
        multimodal: 0,
        not_set: 0
      };

      rows.forEach(row => {
        const type = row.learning_type ? row.learning_type.toLowerCase() : null;
        if (type && type in distribution) {
          distribution[type] = row.count;
        } else {
          distribution.not_set += row.count;
        }
      });

      res.json(distribution);
    } catch (error) {
      logger.error('Get learning type distribution error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get learning type distribution',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get recent module completions
   * GET /api/teachers/:teacherId/recent-completions
   */
  async getRecentCompletions(req, res) {
    try {
      const { teacherId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const rows = await db.query(
        `SELECT 
          mc.id,
          mc.student_id,
          mc.module_id,
          mc.completion_date,
          mc.final_score,
          mc.time_spent_minutes,
          mc.perfect_sections,
          vm.title as module_title,
          p.full_name as student_name,
          p.first_name,
          p.last_name
         FROM module_completions mc
         INNER JOIN vark_modules vm ON mc.module_id = vm.id
         INNER JOIN profiles p ON mc.student_id = p.user_id
         WHERE vm.created_by = ?
         ORDER BY mc.completion_date DESC
         LIMIT ?`,
        [teacherId, limit]
      );

      const completions = rows.map(row => ({
        id: row.id,
        moduleTitle: row.module_title || 'Unknown Module',
        studentName: row.student_name || 
                     `${row.first_name || ''} ${row.last_name || ''}`.trim() || 
                     'Unknown Student',
        completionDate: row.completion_date,
        finalScore: row.final_score || 0,
        timeSpentMinutes: row.time_spent_minutes || 0,
        perfectSections: row.perfect_sections || 0
      }));

      res.json(completions);
    } catch (error) {
      logger.error('Get recent completions error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recent completions',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get student list for teacher
   * GET /api/teachers/:teacherId/students
   */
  async getStudentList(req, res) {
    try {
      const { teacherId } = req.params;

      const rows = await db.query(
        `SELECT DISTINCT
          p.user_id as id,
          p.full_name as name,
          p.first_name,
          p.last_name,
          u.email,
          p.grade_level,
          p.learning_style,
          p.onboarding_completed,
          cs.joined_at,
          c.name as class_name,
          c.subject
         FROM class_students cs
         INNER JOIN classes c ON cs.class_id = c.id
         INNER JOIN profiles p ON cs.student_id = p.user_id
         INNER JOIN users u ON p.user_id = u.id
         WHERE c.created_by = ?
         ORDER BY cs.joined_at DESC`,
        [teacherId]
      );

      const students = rows.map(row => ({
        id: row.id,
        name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        email: row.email,
        gradeLevel: row.grade_level,
        learningStyle: row.learning_style,
        className: row.class_name,
        subject: row.subject,
        joinedAt: row.joined_at,
        onboardingCompleted: row.onboarding_completed
      }));

      res.json(students);
    } catch (error) {
      logger.error('Get student list error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get student list',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new TeachersController();
