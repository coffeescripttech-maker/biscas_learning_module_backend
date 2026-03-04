const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

/**
 * Badge Model
 * Handles student badge/achievement operations
 */
class Badge {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.studentId = data.student_id || data.studentId;
    this.badgeType = data.badge_type || data.badgeType;
    this.badgeName = data.badge_name || data.badgeName;
    this.badgeDescription = data.badge_description || data.badgeDescription;
    this.badgeIcon = data.badge_icon || data.badgeIcon;
    this.badgeRarity = data.badge_rarity || data.badgeRarity || 'bronze';
    this.moduleId = data.module_id || data.moduleId;
    this.earnedDate = data.earned_date || data.earnedDate;
    this.criteriaMet = data.criteria_met || data.criteriaMet;
    this.createdAt = data.created_at || data.createdAt;
  }

  /**
   * Find badge by ID
   */
  static async findById(id) {
    const rows = await db.query(
      'SELECT * FROM student_badges WHERE id = ?',
      [id]
    );

    return rows.length > 0 ? new Badge(rows[0]) : null;
  }

  /**
   * Find all badges for a student
   */
  static async findByStudent(studentId) {
    const rows = await db.query(
      `SELECT * FROM student_badges 
       WHERE student_id = ?
       ORDER BY earned_date DESC`,
      [studentId]
    );

    return rows.map(row => new Badge(row));
  }

  /**
   * Award badge to student
   */
  static async create(badgeData) {
    const badge = new Badge(badgeData);

    // Check if student already has this badge for this module
    const existing = await db.query(
      `SELECT id FROM student_badges 
       WHERE student_id = ? AND badge_type = ? AND module_id = ?`,
      [badge.studentId, badge.badgeType, badge.moduleId]
    );

    if (existing.length > 0) {
      // Badge already awarded
      return Badge.findById(existing[0].id);
    }

    // Serialize JSON field
    const criteriaMetJson = typeof badge.criteriaMet === 'string'
      ? badge.criteriaMet
      : JSON.stringify(badge.criteriaMet || {});

    // Insert new badge
    await db.query(
      `INSERT INTO student_badges 
       (id, student_id, badge_type, badge_name, badge_description, 
        badge_icon, badge_rarity, module_id, earned_date, criteria_met)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        badge.id,
        badge.studentId,
        badge.badgeType,
        badge.badgeName,
        badge.badgeDescription,
        badge.badgeIcon,
        badge.badgeRarity,
        badge.moduleId,
        criteriaMetJson
      ]
    );

    return Badge.findById(badge.id);
  }

  /**
   * Get badge statistics for a student
   */
  static async getStudentBadgeStats(studentId) {
    const badges = await Badge.findByStudent(studentId);

    const byRarity = {
      platinum: badges.filter(b => b.badgeRarity === 'platinum').length,
      gold: badges.filter(b => b.badgeRarity === 'gold').length,
      silver: badges.filter(b => b.badgeRarity === 'silver').length,
      bronze: badges.filter(b => b.badgeRarity === 'bronze').length
    };

    return {
      badges: badges.map(b => b.toJSON()),
      totalBadgesEarned: badges.length,
      byRarity
    };
  }

  toJSON() {
    return {
      id: this.id,
      student_id: this.studentId,
      badge_type: this.badgeType,
      badge_name: this.badgeName,
      badge_description: this.badgeDescription,
      badge_icon: this.badgeIcon,
      badge_rarity: this.badgeRarity,
      module_id: this.moduleId,
      earned_date: this.earnedDate,
      criteria_met: this.criteriaMet,
      created_at: this.createdAt
    };
  }
}

module.exports = Badge;
