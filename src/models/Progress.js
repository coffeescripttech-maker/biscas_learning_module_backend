const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

console.log('🚀 Progress.js module loaded - UPDATED VERSION with dual case support');

/**
 * Progress Model
 * Handles VARK module progress tracking operations
 */
class Progress {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.studentId = data.student_id;
    this.moduleId = data.module_id;
    this.status = data.status || 'not_started';
    this.progressPercentage = data.progress_percentage || 0;
    this.currentSectionId = data.current_section_id;
    this.timeSpentMinutes = data.time_spent_minutes || 0;
    this.completedSections = data.completed_sections;
    this.assessmentScores = data.assessment_scores;
    this.startedAt = data.started_at;
    this.completedAt = data.completed_at;
    this.lastAccessedAt = data.last_accessed_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;

    // Additional fields from joins
    this.studentName = data.student_name;
    this.moduleTitle = data.module_title;
  }

  /**
   * Parse JSON fields from database
   * @param {Object} data - Raw data from database
   * @returns {Object} Data with parsed JSON fields
   */
  static parseJsonFields(data) {
    const jsonFields = ['completed_sections', 'assessment_scores'];

    const parsed = { ...data };
    
    for (const field of jsonFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (error) {
          console.error(`Error parsing JSON field ${field}:`, error);
          parsed[field] = null;
        }
      }
    }

    return parsed;
  }

  /**
   * Validate progress data
   * @param {Object} data - Progress data to validate
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  static validate(data) {
    console.log('🔍 === PROGRESS.VALIDATE DEBUG ===');
    console.log('📦 Data received:', JSON.stringify(data, null, 2));
    console.log('📋 Keys in data:', Object.keys(data));
    
    const errors = [];

    // Required fields (accept both camelCase and snake_case)
    const studentId = data.studentId || data.student_id;
    const moduleId = data.moduleId || data.module_id;
    
    console.log('🔑 Extracted studentId:', studentId);
    console.log('🔑 Extracted moduleId:', moduleId);
    
    if (!studentId) {
      errors.push('Student ID is required');
      console.log('❌ Student ID missing');
    }

    if (!moduleId) {
      errors.push('Module ID is required');
      console.log('❌ Module ID missing');
    }

    // Optional field validation
    if (data.status && !['not_started', 'in_progress', 'completed', 'paused'].includes(data.status)) {
      errors.push('Invalid status. Must be: not_started, in_progress, completed, or paused');
    }

    const progressPercentage = data.progressPercentage !== undefined ? data.progressPercentage : data.progress_percentage;
    if (progressPercentage !== undefined && (progressPercentage < 0 || progressPercentage > 100)) {
      errors.push('Progress percentage must be between 0 and 100');
    }

    const timeSpentMinutes = data.timeSpentMinutes !== undefined ? data.timeSpentMinutes : data.time_spent_minutes;
    if (timeSpentMinutes !== undefined && timeSpentMinutes < 0) {
      errors.push('Time spent minutes cannot be negative');
    }

    console.log('✅ Validation result:', { valid: errors.length === 0, errors });
    console.log('🔍 === END VALIDATE DEBUG ===');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find progress by ID
   * @param {string} id - Progress ID
   * @returns {Promise<Progress|null>} Progress instance or null
   */
  static async findById(id) {
    const rows = await db.query(
      `SELECT 
        p.*,
        prof.full_name as student_name,
        m.title as module_title
       FROM vark_module_progress p
       LEFT JOIN users u ON p.student_id = u.id
       LEFT JOIN profiles prof ON u.id = prof.user_id
       LEFT JOIN vark_modules m ON p.module_id = m.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    const progressData = Progress.parseJsonFields(rows[0]);
    return new Progress(progressData);
  }

  /**
   * Find progress by student and module
   * @param {string} studentId - Student user ID
   * @param {string} moduleId - Module ID
   * @returns {Promise<Progress|null>} Progress instance or null
   */
  static async findByStudentAndModule(studentId, moduleId) {
    const rows = await db.query(
      `SELECT 
        p.*,
        prof.full_name as student_name,
        m.title as module_title
       FROM vark_module_progress p
       LEFT JOIN users u ON p.student_id = u.id
       LEFT JOIN profiles prof ON u.id = prof.user_id
       LEFT JOIN vark_modules m ON p.module_id = m.id
       WHERE p.student_id = ? AND p.module_id = ?`,
      [studentId, moduleId]
    );

    if (rows.length === 0) {
      return null;
    }

    const progressData = Progress.parseJsonFields(rows[0]);
    return new Progress(progressData);
  }

  /**
   * Get all progress records for a student
   * @param {string} studentId - Student user ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.status - Filter by status
   * @returns {Promise<Object>} - { progress: Array<Progress>, total: number }
   */
  static async findByStudentId(studentId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      status
    } = options;

    let query = `
      SELECT 
        p.*,
        prof.full_name as student_name,
        m.title as module_title
      FROM vark_module_progress p
      LEFT JOIN users u ON p.student_id = u.id
      LEFT JOIN profiles prof ON u.id = prof.user_id
      LEFT JOIN vark_modules m ON p.module_id = m.id
      WHERE p.student_id = ?
    `;

    const params = [studentId];

    // Add filters
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT .+ FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Add ordering and pagination
    query += ' ORDER BY p.last_accessed_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);

    const progress = rows.map(row => {
      const progressData = Progress.parseJsonFields(row);
      return new Progress(progressData);
    });

    return { progress, total };
  }

  /**
   * Get all progress records for a module
   * @param {string} moduleId - Module ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.status - Filter by status
   * @returns {Promise<Object>} - { progress: Array<Progress>, total: number }
   */
  static async findByModuleId(moduleId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      status
    } = options;

    let query = `
      SELECT 
        p.*,
        prof.full_name as student_name,
        m.title as module_title
      FROM vark_module_progress p
      LEFT JOIN users u ON p.student_id = u.id
      LEFT JOIN profiles prof ON u.id = prof.user_id
      LEFT JOIN vark_modules m ON p.module_id = m.id
      WHERE p.module_id = ?
    `;

    const params = [moduleId];

    // Add filters
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT .+ FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Add ordering and pagination
    query += ' ORDER BY p.last_accessed_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);

    const progress = rows.map(row => {
      const progressData = Progress.parseJsonFields(row);
      return new Progress(progressData);
    });

    return { progress, total };
  }

  /**
   * Create a new progress record
   * @param {Object} progressData - Progress data
   * @returns {Promise<Progress>} Created progress instance
   */
  static async create(progressData) {
    console.log('🔍 === PROGRESS.CREATE DEBUG ===');
    console.log('📦 Data received in create:', JSON.stringify(progressData, null, 2));
    
    // Validate data
    const validation = Progress.validate(progressData);
    if (!validation.valid) {
      console.log('❌ Validation failed in create');
      const error = new Error('Validation failed');
      error.code = 'VALIDATION_ERROR';
      error.details = validation.errors;
      throw error;
    }

    console.log('✅ Validation passed in create');

    // Extract fields (accept both camelCase and snake_case)
    const studentId = progressData.studentId || progressData.student_id;
    const moduleId = progressData.moduleId || progressData.module_id;
    const currentSectionId = progressData.currentSectionId || progressData.current_section_id;
    const progressPercentage = progressData.progressPercentage !== undefined 
      ? progressData.progressPercentage 
      : progressData.progress_percentage;
    const timeSpentMinutes = progressData.timeSpentMinutes !== undefined 
      ? progressData.timeSpentMinutes 
      : progressData.time_spent_minutes;
    const completedSections = progressData.completedSections || progressData.completed_sections;
    const assessmentScores = progressData.assessmentScores || progressData.assessment_scores;
    const completedAt = progressData.completedAt || progressData.completed_at;

    console.log('🔑 Extracted values:', { studentId, moduleId, currentSectionId });

    // Check if progress already exists for this student and module
    const existingProgress = await Progress.findByStudentAndModule(studentId, moduleId);

    if (existingProgress) {
      console.log('❌ Duplicate progress record found');
      const error = new Error('Progress record already exists for this student and module');
      error.code = 'DB_DUPLICATE_ENTRY';
      throw error;
    }

    const progressId = uuidv4();

    // Prepare JSON fields
    const completedSectionsJson = completedSections 
      ? JSON.stringify(completedSections) 
      : null;
    const assessmentScoresJson = assessmentScores 
      ? JSON.stringify(assessmentScores) 
      : null;

    // Set started_at if status is not 'not_started'
    const startedAt = progressData.status && progressData.status !== 'not_started'
      ? new Date()
      : null;

    console.log('💾 Inserting into database with values:', {
      progressId,
      studentId,
      moduleId,
      status: progressData.status || 'not_started',
      progressPercentage: progressPercentage || 0,
      currentSectionId: currentSectionId || null
    });

    await db.query(
      `INSERT INTO vark_module_progress 
       (id, student_id, module_id, status, progress_percentage, current_section_id,
        time_spent_minutes, completed_sections, assessment_scores, started_at,
        completed_at, last_accessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        progressId,
        studentId,
        moduleId,
        progressData.status || 'not_started',
        progressPercentage || 0,
        currentSectionId || null,
        timeSpentMinutes || 0,
        completedSectionsJson,
        assessmentScoresJson,
        startedAt,
        completedAt || null
      ]
    );

    console.log('✅ Insert successful, fetching created record');
    console.log('🔍 === END CREATE DEBUG ===');

    return await Progress.findById(progressId);
  }

  /**
   * Update progress data
   * @param {string} id - Progress ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Progress>} Updated progress instance
   */
  static async update(id, updates) {
    // Validate progress exists
    const existingProgress = await Progress.findById(id);
    if (!existingProgress) {
      const error = new Error('Progress record not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    const updateFields = {};
    const fieldMapping = {
      status: 'status',
      progressPercentage: 'progress_percentage',
      currentSectionId: 'current_section_id',
      timeSpentMinutes: 'time_spent_minutes',
      completedSections: 'completed_sections',
      assessmentScores: 'assessment_scores',
      startedAt: 'started_at',
      completedAt: 'completed_at'
    };

    const jsonFields = ['completed_sections', 'assessment_scores'];

    for (const [camelKey, dbKey] of Object.entries(fieldMapping)) {
      if (updates[camelKey] !== undefined) {
        // Handle JSON fields
        if (jsonFields.includes(dbKey)) {
          updateFields[dbKey] = updates[camelKey] !== null 
            ? JSON.stringify(updates[camelKey]) 
            : null;
        } else {
          updateFields[dbKey] = updates[camelKey];
        }
      }
    }

    // Auto-set started_at if status changes from 'not_started'
    if (updates.status && updates.status !== 'not_started' && !existingProgress.startedAt) {
      updateFields.started_at = new Date();
    }

    // Auto-set completed_at if status changes to 'completed'
    if (updates.status === 'completed' && !existingProgress.completedAt) {
      updateFields.completed_at = new Date();
    }

    // Always update last_accessed_at
    updateFields.last_accessed_at = new Date();

    if (Object.keys(updateFields).length > 0) {
      const { sql, params } = db.buildUpdate('vark_module_progress', updateFields, { id });
      await db.query(sql, params);
    }

    return await Progress.findById(id);
  }

  /**
   * Update progress by student and module
   * @param {string} studentId - Student user ID
   * @param {string} moduleId - Module ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Progress>} Updated progress instance
   */
  static async updateByStudentAndModule(studentId, moduleId, updates) {
    const progress = await Progress.findByStudentAndModule(studentId, moduleId);
    
    if (!progress) {
      const error = new Error('Progress record not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    return await Progress.update(progress.id, updates);
  }

  /**
   * Delete progress record
   * @param {string} id - Progress ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    // Verify progress exists
    const progress = await Progress.findById(id);
    if (!progress) {
      const error = new Error('Progress record not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    await db.query('DELETE FROM vark_module_progress WHERE id = ?', [id]);
  }

  /**
   * Get progress statistics for a student
   * @param {string} studentId - Student user ID
   * @returns {Promise<Object>} Progress statistics
   */
  static async getStudentStats(studentId) {
    const rows = await db.query(
      `SELECT 
        COUNT(*) as total_modules,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_modules,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_modules,
        SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) as not_started_modules,
        AVG(progress_percentage) as average_progress,
        SUM(time_spent_minutes) as total_time_spent
       FROM vark_module_progress
       WHERE student_id = ?`,
      [studentId]
    );

    return rows[0];
  }

  /**
   * Get progress statistics for a module
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object>} Progress statistics
   */
  static async getModuleStats(moduleId) {
    const rows = await db.query(
      `SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_students,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_students,
        SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) as not_started_students,
        AVG(progress_percentage) as average_progress,
        AVG(time_spent_minutes) as average_time_spent
       FROM vark_module_progress
       WHERE module_id = ?`,
      [moduleId]
    );

    return rows[0];
  }

  /**
   * Convert progress to JSON (safe for API responses)
   * @returns {Object} Progress object
   */
  toJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      studentName: this.studentName,
      moduleId: this.moduleId,
      moduleTitle: this.moduleTitle,
      status: this.status,
      progressPercentage: this.progressPercentage,
      currentSectionId: this.currentSectionId,
      timeSpentMinutes: this.timeSpentMinutes,
      completedSections: this.completedSections,
      assessmentScores: this.assessmentScores,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      lastAccessedAt: this.lastAccessedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Progress;
