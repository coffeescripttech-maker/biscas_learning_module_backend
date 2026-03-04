const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

/**
 * Completion Model
 * Handles module completion tracking
 */
class Completion {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.studentId = data.student_id || data.studentId;
    this.moduleId = data.module_id || data.moduleId;
    this.completionDate = data.completion_date || data.completionDate;
    this.finalScore = data.final_score || data.finalScore || 0;
    this.timeSpentMinutes = data.time_spent_minutes || data.timeSpentMinutes || 0;
    this.preTestScore = data.pre_test_score || data.preTestScore;
    this.postTestScore = data.post_test_score || data.postTestScore;
    this.sectionsCompleted = data.sections_completed || data.sectionsCompleted || 0;
    this.perfectSections = data.perfect_sections || data.perfectSections || 0;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  /**
   * Find completion by ID
   */
  static async findById(id) {
    const rows = await db.query(
      'SELECT * FROM module_completions WHERE id = ?',
      [id]
    );

    return rows.length > 0 ? new Completion(rows[0]) : null;
  }

  /**
   * Find completion by student and module
   */
  static async findByStudentAndModule(studentId, moduleId) {
    const rows = await db.query(
      `SELECT * FROM module_completions 
       WHERE student_id = ? AND module_id = ?`,
      [studentId, moduleId]
    );

    return rows.length > 0 ? new Completion(rows[0]) : null;
  }

  /**
   * Find all completions for a student
   */
  static async findByStudent(studentId) {
    const rows = await db.query(
      `SELECT c.*, m.title as module_title, m.difficulty_level
       FROM module_completions c
       LEFT JOIN vark_modules m ON c.module_id = m.id
       WHERE c.student_id = ?
       ORDER BY c.completion_date DESC`,
      [studentId]
    );

    return rows.map(row => new Completion(row));
  }

  /**
   * Create or update completion
   */
  static async upsert(completionData) {
    const completion = new Completion(completionData);

    // Check if completion exists
    const existing = await Completion.findByStudentAndModule(
      completion.studentId,
      completion.moduleId
    );

    if (existing) {
      // Update existing
      await db.query(
        `UPDATE module_completions 
         SET final_score = ?, time_spent_minutes = ?, 
             sections_completed = ?, perfect_sections = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          completion.finalScore,
          completion.timeSpentMinutes,
          completion.sectionsCompleted,
          completion.perfectSections,
          existing.id
        ]
      );
      return Completion.findById(existing.id);
    } else {
      // Insert new
      await db.query(
        `INSERT INTO module_completions 
         (id, student_id, module_id, completion_date, final_score, 
          time_spent_minutes, sections_completed, perfect_sections)
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
        [
          completion.id,
          completion.studentId,
          completion.moduleId,
          completion.finalScore,
          completion.timeSpentMinutes,
          completion.sectionsCompleted,
          completion.perfectSections
        ]
      );
      return Completion.findById(completion.id);
    }
  }

  /**
   * Get student statistics
   */
  static async getStudentStats(studentId) {
    // Get completions
    const completions = await Completion.findByStudent(studentId);

    // Calculate stats
    const totalModulesCompleted = completions.length;
    const totalTimeSpent = completions.reduce((sum, c) => sum + (c.timeSpentMinutes || 0), 0);
    const averageScore = completions.length > 0
      ? completions.reduce((sum, c) => sum + (c.finalScore || 0), 0) / completions.length
      : 0;

    return {
      completions: completions.map(c => c.toJSON()),
      totalModulesCompleted,
      totalTimeSpent,
      averageScore: Math.round(averageScore)
    };
  }

  toJSON() {
    return {
      id: this.id,
      student_id: this.studentId,
      module_id: this.moduleId,
      completion_date: this.completionDate,
      final_score: this.finalScore,
      time_spent_minutes: this.timeSpentMinutes,
      pre_test_score: this.preTestScore,
      post_test_score: this.postTestScore,
      sections_completed: this.sectionsCompleted,
      perfect_sections: this.perfectSections,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }
}

module.exports = Completion;
