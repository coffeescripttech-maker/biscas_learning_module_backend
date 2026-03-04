const Badge = require('../models/Badge');

class BadgesController {
  /**
   * Award a badge to a student
   * POST /api/badges
   */
  async create(req, res) {
    try {
      const badgeData = req.body;

      // Validate required fields
      if (!badgeData.student_id || !badgeData.badge_type || !badgeData.module_id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'student_id, badge_type, and module_id are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const badge = await Badge.create(badgeData);

      res.json(badge.toJSON());
    } catch (error) {
      console.error('Award badge error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to award badge',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get badges for a student
   * GET /api/badges/student/:studentId
   */
  async getStudentBadges(req, res) {
    try {
      const { studentId } = req.params;

      const badges = await Badge.findByStudent(studentId);

      res.json(badges.map(b => b.toJSON()));
    } catch (error) {
      console.error('Get student badges error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get student badges',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new BadgesController();
