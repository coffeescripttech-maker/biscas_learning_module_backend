const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

/**
 * Submission Model
 * Handles student module submission operations
 */
class Submission {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.studentId = data.student_id || data.studentId;
    this.moduleId = data.module_id || data.moduleId;
    this.sectionId = data.section_id || data.sectionId;
    this.sectionTitle = data.section_title || data.sectionTitle;
    this.sectionType = data.section_type || data.sectionType;
    this.submissionData = data.submission_data || data.submissionData;
    this.assessmentResults = data.assessment_results || data.assessmentResults;
    this.timeSpentSeconds = data.time_spent_seconds || data.timeSpentSeconds || 0;
    this.submissionStatus = data.submission_status || data.submissionStatus || 'draft';
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  /**
   * Find submission by ID
   */
  static async findById(id) {
    const rows = await db.query(
      'SELECT * FROM student_module_submissions WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return null;

    const data = rows[0];
    // Parse JSON fields
    if (data.submission_data && typeof data.submission_data === 'string') {
      data.submission_data = JSON.parse(data.submission_data);
    }
    if (data.assessment_results && typeof data.assessment_results === 'string') {
      data.assessment_results = JSON.parse(data.assessment_results);
    }

    return new Submission(data);
  }

  /**
   * Find submissions by student and module
   */
  static async findByStudentAndModule(studentId, moduleId) {
    const rows = await db.query(
      `SELECT * FROM student_module_submissions 
       WHERE student_id = ? AND module_id = ?
       ORDER BY created_at DESC`,
      [studentId, moduleId]
    );

    return rows.map(row => {
      // Parse JSON fields
      if (row.submission_data && typeof row.submission_data === 'string') {
        row.submission_data = JSON.parse(row.submission_data);
      }
      if (row.assessment_results && typeof row.assessment_results === 'string') {
        row.assessment_results = JSON.parse(row.assessment_results);
      }
      return new Submission(row);
    });
  }

  /**
   * Create or update submission
   */
  static async upsert(submissionData) {
    const submission = new Submission(submissionData);

    // Check if submission exists for this student, module, and section
    const existing = await db.query(
      `SELECT id FROM student_module_submissions 
       WHERE student_id = ? AND module_id = ? AND section_id = ?`,
      [submission.studentId, submission.moduleId, submission.sectionId]
    );

    const submissionDataJson = typeof submission.submissionData === 'string' 
      ? submission.submissionData 
      : JSON.stringify(submission.submissionData || {});
    
    const assessmentResultsJson = typeof submission.assessmentResults === 'string'
      ? submission.assessmentResults
      : JSON.stringify(submission.assessmentResults || {});

    if (existing.length > 0) {
      // Update existing
      await db.query(
        `UPDATE student_module_submissions 
         SET section_title = ?, section_type = ?, submission_data = ?, 
             assessment_results = ?, time_spent_seconds = ?, 
             submission_status = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          submission.sectionTitle,
          submission.sectionType,
          submissionDataJson,
          assessmentResultsJson,
          submission.timeSpentSeconds,
          submission.submissionStatus,
          existing[0].id
        ]
      );
      return Submission.findById(existing[0].id);
    } else {
      // Insert new
      await db.query(
        `INSERT INTO student_module_submissions 
         (id, student_id, module_id, section_id, section_title, section_type,
          submission_data, assessment_results, time_spent_seconds, submission_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          submission.id,
          submission.studentId,
          submission.moduleId,
          submission.sectionId,
          submission.sectionTitle,
          submission.sectionType,
          submissionDataJson,
          assessmentResultsJson,
          submission.timeSpentSeconds,
          submission.submissionStatus
        ]
      );
      return Submission.findById(submission.id);
    }
  }

  /**
   * Get all submissions for a module (teacher view)
   */
  static async findByModule(moduleId) {
    const rows = await db.query(
      `SELECT s.*, p.full_name as student_name
       FROM student_module_submissions s
       LEFT JOIN profiles p ON s.student_id = p.user_id
       WHERE s.module_id = ?
       ORDER BY s.created_at DESC`,
      [moduleId]
    );

    return rows.map(row => {
      if (row.submission_data && typeof row.submission_data === 'string') {
        row.submission_data = JSON.parse(row.submission_data);
      }
      if (row.assessment_results && typeof row.assessment_results === 'string') {
        row.assessment_results = JSON.parse(row.assessment_results);
      }
      return new Submission(row);
    });
  }

  toJSON() {
    return {
      id: this.id,
      student_id: this.studentId,
      module_id: this.moduleId,
      section_id: this.sectionId,
      section_title: this.sectionTitle,
      section_type: this.sectionType,
      submission_data: this.submissionData,
      assessment_results: this.assessmentResults,
      time_spent_seconds: this.timeSpentSeconds,
      submission_status: this.submissionStatus,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }
}

module.exports = Submission;
