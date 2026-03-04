const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

/**
 * Module Model
 * Handles VARK module operations
 */
class Module {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.categoryId = data.category_id;
    this.title = data.title;
    this.description = data.description;
    this.learningObjectives = data.learning_objectives;
    this.contentStructure = data.content_structure;
    this.difficultyLevel = data.difficulty_level;
    this.estimatedDurationMinutes = data.estimated_duration_minutes;
    this.prerequisites = data.prerequisites;
    this.multimediaContent = data.multimedia_content;
    this.interactiveElements = data.interactive_elements;
    this.assessmentQuestions = data.assessment_questions;
    this.moduleMetadata = data.module_metadata;
    this.jsonBackupUrl = data.json_backup_url;
    this.jsonContentUrl = data.json_content_url;
    this.contentSummary = data.content_summary;
    this.targetClassId = data.target_class_id;
    this.targetLearningStyles = data.target_learning_styles;
    this.prerequisiteModuleId = data.prerequisite_module_id;
    this.isPublished = data.is_published || false;
    this.createdBy = data.created_by;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;

    // Additional fields from joins
    this.creatorName = data.creator_name;
    this.categoryName = data.category_name;
  }

  /**
   * Parse JSON fields from database
   * @param {Object} data - Raw data from database
   * @returns {Object} Data with parsed JSON fields
   */
  static parseJsonFields(data) {
    const jsonFields = [
      'learning_objectives',
      'content_structure',
      'prerequisites',
      'multimedia_content',
      'interactive_elements',
      'assessment_questions',
      'module_metadata',
      'content_summary',
      'target_learning_styles'
    ];

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
   * Validate module data
   * @param {Object} data - Module data to validate
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  static validate(data) {
    const errors = [];

    // Required fields
    if (!data.title) {
      errors.push('Title is required');
    }

    if (!data.createdBy) {
      errors.push('Created by user ID is required');
    }

    // Optional field validation
    if (data.difficultyLevel && !['beginner', 'intermediate', 'advanced'].includes(data.difficultyLevel)) {
      errors.push('Invalid difficulty level');
    }

    if (data.estimatedDurationMinutes && (data.estimatedDurationMinutes < 0 || data.estimatedDurationMinutes > 10000)) {
      errors.push('Estimated duration must be between 0 and 10000 minutes');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find module by ID
   * @param {string} id - Module ID
   * @returns {Promise<Module|null>} Module instance or null
   */
  static async findById(id) {
    const rows = await db.query(
      `SELECT 
        m.*,
        p.full_name as creator_name,
        c.name as category_name
       FROM vark_modules m
       LEFT JOIN users u ON m.created_by = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN vark_module_categories c ON m.category_id = c.id
       WHERE m.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    const moduleData = Module.parseJsonFields(rows[0]);
    return new Module(moduleData);
  }

  /**
   * Get all modules with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.categoryId - Filter by category ID
   * @param {string} options.difficultyLevel - Filter by difficulty level
   * @param {boolean} options.isPublished - Filter by published status
   * @param {string} options.createdBy - Filter by creator user ID
   * @param {string} options.search - Search by title or description
   * @returns {Promise<Object>} - { modules: Array<Module>, total: number }
   */
  static async findAll(options = {}) {
    const {
      limit = 50,
      offset = 0,
      categoryId,
      difficultyLevel,
      isPublished,
      createdBy,
      search
    } = options;

    let query = `
      SELECT 
        m.*,
        p.full_name as creator_name,
        c.name as category_name
      FROM vark_modules m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN vark_module_categories c ON m.category_id = c.id
      WHERE 1=1
    `;

    const params = [];

    // Add filters
    if (categoryId) {
      query += ' AND m.category_id = ?';
      params.push(categoryId);
    }

    if (difficultyLevel) {
      query += ' AND m.difficulty_level = ?';
      params.push(difficultyLevel);
    }

    if (isPublished !== undefined) {
      query += ' AND m.is_published = ?';
      params.push(isPublished);
    }

    if (createdBy) {
      query += ' AND m.created_by = ?';
      params.push(createdBy);
    }

    if (search) {
      query += ' AND (m.title LIKE ? OR m.description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT[\s\S]+?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const [countResult] = await db.query(countQuery, params);
    const total = countResult && countResult[0] ? countResult[0].total : 0;

    // Add ordering and pagination
    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);

    const modules = rows.map(row => {
      const moduleData = Module.parseJsonFields(row);
      return new Module(moduleData);
    });

    return { modules, total };
  }

  /**
   * Create a new module
   * @param {Object} moduleData - Module data
   * @returns {Promise<Module>} Created module instance
   */
  static async create(moduleData) {
    // Validate data
    const validation = Module.validate(moduleData);
    if (!validation.valid) {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION_ERROR';
      error.details = validation.errors;
      throw error;
    }

    const moduleId = uuidv4();

    // Prepare JSON fields
    const jsonFields = {
      learning_objectives: moduleData.learningObjectives,
      content_structure: moduleData.contentStructure,
      prerequisites: moduleData.prerequisites,
      multimedia_content: moduleData.multimediaContent,
      interactive_elements: moduleData.interactiveElements,
      assessment_questions: moduleData.assessmentQuestions,
      module_metadata: moduleData.moduleMetadata,
      content_summary: moduleData.contentSummary,
      target_learning_styles: moduleData.targetLearningStyles
    };

    // Convert to JSON strings
    for (const [key, value] of Object.entries(jsonFields)) {
      if (value !== undefined && value !== null) {
        jsonFields[key] = JSON.stringify(value);
      } else {
        jsonFields[key] = null;
      }
    }

    await db.query(
      `INSERT INTO vark_modules 
       (id, category_id, title, description, learning_objectives, content_structure,
        difficulty_level, estimated_duration_minutes, prerequisites, multimedia_content,
        interactive_elements, assessment_questions, module_metadata, json_backup_url,
        json_content_url, content_summary, target_class_id, target_learning_styles,
        prerequisite_module_id, is_published, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        moduleId,
        moduleData.categoryId || null,
        moduleData.title,
        moduleData.description || null,
        jsonFields.learning_objectives,
        jsonFields.content_structure,
        moduleData.difficultyLevel || null,
        moduleData.estimatedDurationMinutes || null,
        jsonFields.prerequisites,
        jsonFields.multimedia_content,
        jsonFields.interactive_elements,
        jsonFields.assessment_questions,
        jsonFields.module_metadata,
        moduleData.jsonBackupUrl || null,
        moduleData.jsonContentUrl || null,
        jsonFields.content_summary,
        moduleData.targetClassId || null,
        jsonFields.target_learning_styles,
        moduleData.prerequisiteModuleId || null,
        moduleData.isPublished || false,
        moduleData.createdBy
      ]
    );

    return await Module.findById(moduleId);
  }

  /**
   * Update module data
   * @param {string} id - Module ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Module>} Updated module instance
   */
  static async update(id, updates) {
    // Validate module exists
    const existingModule = await Module.findById(id);
    if (!existingModule) {
      const error = new Error('Module not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    const updateFields = {};
    const fieldMapping = {
      categoryId: 'category_id',
      title: 'title',
      description: 'description',
      learningObjectives: 'learning_objectives',
      contentStructure: 'content_structure',
      difficultyLevel: 'difficulty_level',
      estimatedDurationMinutes: 'estimated_duration_minutes',
      prerequisites: 'prerequisites',
      multimediaContent: 'multimedia_content',
      interactiveElements: 'interactive_elements',
      assessmentQuestions: 'assessment_questions',
      moduleMetadata: 'module_metadata',
      jsonBackupUrl: 'json_backup_url',
      jsonContentUrl: 'json_content_url',
      contentSummary: 'content_summary',
      targetClassId: 'target_class_id',
      targetLearningStyles: 'target_learning_styles',
      prerequisiteModuleId: 'prerequisite_module_id',
      isPublished: 'is_published'
    };

    const jsonFields = [
      'learning_objectives',
      'content_structure',
      'prerequisites',
      'multimedia_content',
      'interactive_elements',
      'assessment_questions',
      'module_metadata',
      'content_summary',
      'target_learning_styles'
    ];

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

    if (Object.keys(updateFields).length > 0) {
      const { sql, params } = db.buildUpdate('vark_modules', updateFields, { id });
      await db.query(sql, params);
    }

    return await Module.findById(id);
  }

  /**
   * Delete module
   * @param {string} id - Module ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    // Verify module exists
    const module = await Module.findById(id);
    if (!module) {
      const error = new Error('Module not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    await db.query('DELETE FROM vark_modules WHERE id = ?', [id]);
  }

  /**
   * Import module from JSON data
   * @param {Object} jsonData - Module JSON data
   * @param {string} createdBy - User ID of the importer
   * @returns {Promise<Module>} Created module instance
   */
  static async importModule(jsonData, createdBy) {
    // Extract module data from JSON
    const moduleData = {
      title: jsonData.title || 'Imported Module',
      description: jsonData.description,
      learningObjectives: jsonData.learningObjectives || jsonData.learning_objectives,
      contentStructure: jsonData.contentStructure || jsonData.content_structure,
      difficultyLevel: jsonData.difficultyLevel || jsonData.difficulty_level,
      estimatedDurationMinutes: jsonData.estimatedDurationMinutes || jsonData.estimated_duration_minutes,
      prerequisites: jsonData.prerequisites,
      multimediaContent: jsonData.multimediaContent || jsonData.multimedia_content,
      interactiveElements: jsonData.interactiveElements || jsonData.interactive_elements,
      assessmentQuestions: jsonData.assessmentQuestions || jsonData.assessment_questions,
      moduleMetadata: jsonData.moduleMetadata || jsonData.module_metadata,
      contentSummary: jsonData.contentSummary || jsonData.content_summary,
      targetLearningStyles: jsonData.targetLearningStyles || jsonData.target_learning_styles,
      isPublished: false, // Imported modules start as unpublished
      createdBy
    };

    return await Module.create(moduleData);
  }

  /**
   * Get modules by category
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Module>>} Array of module instances
   */
  static async findByCategoryId(categoryId, options = {}) {
    const { limit = 50, offset = 0, isPublished } = options;

    let query = `
      SELECT 
        m.*,
        p.full_name as creator_name,
        c.name as category_name
      FROM vark_modules m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN vark_module_categories c ON m.category_id = c.id
      WHERE m.category_id = ?
    `;

    const params = [categoryId];

    if (isPublished !== undefined) {
      query += ' AND m.is_published = ?';
      params.push(isPublished);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);

    return rows.map(row => {
      const moduleData = Module.parseJsonFields(row);
      return new Module(moduleData);
    });
  }

  /**
   * Get modules by creator
   * @param {string} createdBy - Creator user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Module>>} Array of module instances
   */
  static async findByCreator(createdBy, options = {}) {
    return await Module.findAll({ ...options, createdBy });
  }

  /**
   * Convert module to JSON (safe for API responses)
   * @returns {Object} Module object
   */
  toJSON() {
    return {
      id: this.id,
      categoryId: this.categoryId,
      categoryName: this.categoryName,
      title: this.title,
      description: this.description,
      learningObjectives: this.learningObjectives || [],
      contentStructure: this.contentStructure || {
        sections: [],
        learning_path: [],
        prerequisites_checklist: [],
        completion_criteria: []
      },
      difficultyLevel: this.difficultyLevel,
      estimatedDurationMinutes: this.estimatedDurationMinutes,
      prerequisites: this.prerequisites || [],
      multimediaContent: this.multimediaContent || {},
      interactiveElements: this.interactiveElements || {},
      assessmentQuestions: this.assessmentQuestions || [],
      moduleMetadata: this.moduleMetadata || {},
      jsonBackupUrl: this.jsonBackupUrl,
      jsonContentUrl: this.jsonContentUrl,
      contentSummary: this.contentSummary || {},
      targetClassId: this.targetClassId,
      targetLearningStyles: this.targetLearningStyles || [],
      prerequisiteModuleId: this.prerequisiteModuleId,
      isPublished: this.isPublished,
      createdBy: this.createdBy,
      creatorName: this.creatorName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Get submission statistics for a module
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object>} Statistics object
   */
  static async getSubmissionStats(moduleId) {
    console.log('🔍 getSubmissionStats called for moduleId:', moduleId);
    
    const rows = await db.query(
      `SELECT 
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT c.student_id) as submitted_count,
        COALESCE(AVG(c.final_score), 0) as average_score,
        COALESCE((COUNT(DISTINCT c.student_id) * 100.0 / NULLIF(COUNT(DISTINCT u.id), 0)), 0) as completion_rate
      FROM users u
      LEFT JOIN module_completions c ON u.id = c.student_id AND c.module_id = ?
      WHERE u.role = 'student'`,
      [moduleId]
    );

    console.log('📊 Query result:', rows[0]);

    const stats = rows[0];
    const result = {
      totalStudents: parseInt(stats.total_students) || 0,
      submittedCount: parseInt(stats.submitted_count) || 0,
      averageScore: parseFloat(stats.average_score) || 0,
      completionRate: parseFloat(stats.completion_rate) || 0
    };
    
    console.log('✅ Returning stats:', result);
    return result;
  }

  /**
   * Get all completions for a module with student profiles
   * @param {string} moduleId - Module ID
   * @returns {Promise<Array>} Array of completion records
   */
  static async getCompletions(moduleId) {
    const rows = await db.query(
      `SELECT 
        c.id,
        c.student_id,
        c.module_id,
        c.completion_date,
        c.final_score,
        c.time_spent_minutes,
        c.sections_completed,
        c.perfect_sections,
        c.created_at,
        c.updated_at,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.full_name,
        u.email
      FROM module_completions c
      INNER JOIN profiles p ON c.student_id = p.user_id
      INNER JOIN users u ON c.student_id = u.id
      WHERE c.module_id = ?
      ORDER BY c.completion_date DESC`,
      [moduleId]
    );

    return rows.map(row => ({
      id: row.id,
      student_id: row.student_id,
      module_id: row.module_id,
      completion_date: row.completion_date,
      final_score: row.final_score,
      time_spent_minutes: row.time_spent_minutes,
      sections_completed: row.sections_completed,
      perfect_sections: row.perfect_sections,
      created_at: row.created_at,
      updated_at: row.updated_at,
      profiles: {
        first_name: row.first_name,
        middle_name: row.middle_name,
        last_name: row.last_name,
        full_name: row.full_name,
        email: row.email
      }
    }));
  }
}

module.exports = Module;
