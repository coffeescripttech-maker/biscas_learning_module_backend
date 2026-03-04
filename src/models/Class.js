const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

/**
 * Class Model
 * Handles class management operations
 */
class Class {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.description = data.description;
    this.subject = data.subject;
    this.gradeLevel = data.grade_level;
    this.createdBy = data.created_by;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;

    // Additional fields from joins
    this.creatorName = data.creator_name;
    this.studentCount = data.student_count;
  }

  /**
   * Validate class data
   * @param {Object} data - Class data to validate
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  static validate(data) {
    const errors = [];

    // Required fields
    if (!data.name) {
      errors.push('Class name is required');
    }

    if (!data.createdBy) {
      errors.push('Created by user ID is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find class by ID
   * @param {string} id - Class ID
   * @returns {Promise<Class|null>} Class instance or null
   */
  static async findById(id) {
    const rows = await db.query(
      `SELECT 
        c.*,
        p.full_name as creator_name,
        COUNT(DISTINCT cs.student_id) as student_count
       FROM classes c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN class_students cs ON c.id = cs.class_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return new Class(rows[0]);
  }

  /**
   * Get all classes with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.subject - Filter by subject
   * @param {string} options.gradeLevel - Filter by grade level
   * @param {string} options.createdBy - Filter by creator user ID
   * @param {string} options.search - Search by name or description
   * @returns {Promise<Object>} - { classes: Array<Class>, total: number }
   */
  static async findAll(options = {}) {
    const {
      limit = 50,
      offset = 0,
      subject,
      gradeLevel,
      createdBy,
      search
    } = options;

    let query = `
      SELECT 
        c.*,
        p.full_name as creator_name,
        COUNT(DISTINCT cs.student_id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN class_students cs ON c.id = cs.class_id
      WHERE 1=1
    `;

    const params = [];

    // Add filters
    if (subject) {
      query += ' AND c.subject = ?';
      params.push(subject);
    }

    if (gradeLevel) {
      query += ' AND c.grade_level = ?';
      params.push(gradeLevel);
    }

    if (createdBy) {
      query += ' AND c.created_by = ?';
      params.push(createdBy);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' GROUP BY c.id';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as counted`;
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Add ordering and pagination
    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);

    const classes = rows.map(row => new Class(row));

    return { classes, total };
  }

  /**
   * Create a new class
   * @param {Object} classData - Class data
   * @returns {Promise<Class>} Created class instance
   */
  static async create(classData) {
    // Validate data
    const validation = Class.validate(classData);
    if (!validation.valid) {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION_ERROR';
      error.details = validation.errors;
      throw error;
    }

    const classId = uuidv4();

    await db.query(
      `INSERT INTO classes 
       (id, name, description, subject, grade_level, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        classId,
        classData.name,
        classData.description || null,
        classData.subject || null,
        classData.gradeLevel || null,
        classData.createdBy
      ]
    );

    return await Class.findById(classId);
  }

  /**
   * Update class data
   * @param {string} id - Class ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Class>} Updated class instance
   */
  static async update(id, updates) {
    // Validate class exists
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      const error = new Error('Class not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    const updateFields = {};
    const fieldMapping = {
      name: 'name',
      description: 'description',
      subject: 'subject',
      gradeLevel: 'grade_level'
    };

    for (const [camelKey, dbKey] of Object.entries(fieldMapping)) {
      if (updates[camelKey] !== undefined) {
        updateFields[dbKey] = updates[camelKey];
      }
    }

    if (Object.keys(updateFields).length > 0) {
      const { sql, params } = db.buildUpdate('classes', updateFields, { id });
      await db.query(sql, params);
    }

    return await Class.findById(id);
  }

  /**
   * Delete class
   * @param {string} id - Class ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    // Verify class exists
    const classObj = await Class.findById(id);
    if (!classObj) {
      const error = new Error('Class not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    await db.query('DELETE FROM classes WHERE id = ?', [id]);
  }

  /**
   * Add student to class
   * @param {string} classId - Class ID
   * @param {string} studentId - Student user ID
   * @returns {Promise<void>}
   */
  static async addStudent(classId, studentId) {
    // Verify class exists
    const classObj = await Class.findById(classId);
    if (!classObj) {
      const error = new Error('Class not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    // Check if student is already enrolled
    const [existing] = await db.query(
      'SELECT * FROM class_students WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    if (existing.length > 0) {
      const error = new Error('Student already enrolled in this class');
      error.code = 'DB_DUPLICATE_ENTRY';
      throw error;
    }

    await db.query(
      'INSERT INTO class_students (class_id, student_id) VALUES (?, ?)',
      [classId, studentId]
    );
  }

  /**
   * Remove student from class
   * @param {string} classId - Class ID
   * @param {string} studentId - Student user ID
   * @returns {Promise<void>}
   */
  static async removeStudent(classId, studentId) {
    const result = await db.query(
      'DELETE FROM class_students WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    if (result.affectedRows === 0) {
      const error = new Error('Student not found in this class');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }
  }

  /**
   * Get students in a class
   * @param {string} classId - Class ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of student data
   */
  static async getStudents(classId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const rows = await db.query(
      `SELECT 
        u.id, u.email, u.role,
        p.first_name, p.middle_name, p.last_name, p.full_name,
        p.grade_level, p.learning_style,
        cs.joined_at
       FROM class_students cs
       INNER JOIN users u ON cs.student_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE cs.class_id = ?
       ORDER BY p.last_name, p.first_name
       LIMIT ? OFFSET ?`,
      [classId, limit, offset]
    );

    return rows;
  }

  /**
   * Get classes by teacher
   * @param {string} teacherId - Teacher user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Class>>} Array of class instances
   */
  static async findByTeacher(teacherId, options = {}) {
    return await Class.findAll({ ...options, createdBy: teacherId });
  }

  /**
   * Get classes for a student
   * @param {string} studentId - Student user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Class>>} Array of class instances
   */
  static async findByStudent(studentId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const rows = await db.query(
      `SELECT 
        c.*,
        p.full_name as creator_name,
        COUNT(DISTINCT cs2.student_id) as student_count,
        cs.joined_at
       FROM class_students cs
       INNER JOIN classes c ON cs.class_id = c.id
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN class_students cs2 ON c.id = cs2.class_id
       WHERE cs.student_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [studentId, limit, offset]
    );

    return rows.map(row => new Class(row));
  }

  /**
   * Convert class to JSON (safe for API responses)
   * @returns {Object} Class object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      subject: this.subject,
      gradeLevel: this.gradeLevel,
      createdBy: this.createdBy,
      creatorName: this.creatorName,
      studentCount: this.studentCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Class;
