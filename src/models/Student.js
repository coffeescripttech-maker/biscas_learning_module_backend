const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const User = require('./User');
const Profile = require('./Profile');

/**
 * Student Model
 * Combines User and Profile data for student-specific operations
 */
class Student {
  constructor(data) {
    // User fields
    this.id = data.id || uuidv4();
    this.email = data.email;
    this.role = 'student';
    this.emailVerified = data.email_verified || false;
    this.createdAt = data.created_at || data.user_created_at;
    this.updatedAt = data.updated_at;
    this.lastLogin = data.last_login;

    // Profile fields
    this.profileId = data.profile_id;
    this.firstName = data.first_name;
    this.middleName = data.middle_name;
    this.lastName = data.last_name;
    this.fullName = data.full_name;
    this.gradeLevel = data.grade_level;
    this.profilePhoto = data.profile_photo;
    this.learningStyle = data.learning_style;
    this.preferredModules = data.preferred_modules;
    this.learningType = data.learning_type;
    this.onboardingCompleted = data.onboarding_completed || false;
  }

  /**
   * Validate student data
   * @param {Object} data - Student data to validate
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  static validate(data) {
    const errors = [];

    // Required fields
    if (!data.email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.password && !data.skipPassword) {
      errors.push('Password is required');
    } else if (data.password && data.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (!data.firstName) {
      errors.push('First name is required');
    }

    if (!data.lastName) {
      errors.push('Last name is required');
    }

    // Optional field validation
    if (data.learningStyle && !['visual', 'auditory', 'reading_writing', 'kinesthetic'].includes(data.learningStyle)) {
      errors.push('Invalid learning style');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find student by ID (returns combined user + profile data)
   * @param {string} id - Student user ID
   * @returns {Promise<Student|null>} Student instance or null
   */
  static async findById(id) {
    const rows = await db.query(
      `SELECT 
        u.id, u.email, u.role, u.email_verified, u.created_at as user_created_at,
        u.updated_at, u.last_login,
        p.id as profile_id, p.first_name, p.middle_name, p.last_name, 
        p.full_name, p.grade_level, p.profile_photo, p.learning_style, 
        p.preferred_modules, p.learning_type, p.onboarding_completed
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ? AND u.role = 'student'`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    const studentData = rows[0];

    // Parse JSON fields
    if (studentData.preferred_modules && typeof studentData.preferred_modules === 'string') {
      studentData.preferred_modules = JSON.parse(studentData.preferred_modules);
    }

    return new Student(studentData);
  }

  /**
   * Find student by email
   * @param {string} email - Student email
   * @returns {Promise<Student|null>} Student instance or null
   */
  static async findByEmail(email) {
    const rows = await db.query(
      `SELECT 
        u.id, u.email, u.role, u.email_verified, u.created_at as user_created_at,
        u.updated_at, u.last_login,
        p.id as profile_id, p.first_name, p.middle_name, p.last_name, 
        p.full_name, p.grade_level, p.profile_photo, p.learning_style, 
        p.preferred_modules, p.learning_type, p.onboarding_completed
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.email = ? AND u.role = 'student'`,
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    const studentData = rows[0];

    // Parse JSON fields
    if (studentData.preferred_modules && typeof studentData.preferred_modules === 'string') {
      studentData.preferred_modules = JSON.parse(studentData.preferred_modules);
    }

    return new Student(studentData);
  }

  /**
   * Get all students with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.gradeLevel - Filter by grade level
   * @param {string} options.learningStyle - Filter by learning style
   * @param {string} options.search - Search by name or email
   * @returns {Promise<Object>} - { students: Array<Student>, total: number }
   */
  static async findAll(options = {}) {
    const {
      limit = 50,
      offset = 0,
      gradeLevel,
      learningStyle,
      search
    } = options;

    let query = `
      SELECT 
        u.id, u.email, u.role, u.email_verified, u.created_at as user_created_at,
        u.updated_at, u.last_login,
        p.id as profile_id, p.first_name, p.middle_name, p.last_name, 
        p.full_name, p.grade_level, p.profile_photo, p.learning_style, 
        p.preferred_modules, p.learning_type, p.onboarding_completed
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'student'
    `;

    const params = [];

    // Add filters
    if (gradeLevel) {
      query += ' AND p.grade_level = ?';
      params.push(gradeLevel);
    }

    if (learningStyle) {
      query += ' AND p.learning_style = ?';
      params.push(learningStyle);
    }

    if (search) {
      query += ' AND (p.full_name LIKE ? OR u.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT .+ FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Add ordering and pagination
    query += ' ORDER BY p.last_name, p.first_name LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);

    const students = rows.map(row => {
      // Parse JSON fields
      if (row.preferred_modules && typeof row.preferred_modules === 'string') {
        row.preferred_modules = JSON.parse(row.preferred_modules);
      }
      return new Student(row);
    });

    return { students, total };
  }

  /**
   * Create a new student (creates both user and profile)
   * @param {Object} studentData - Student data
   * @returns {Promise<Student>} Created student instance
   */
  static async create(studentData) {
    // Validate data
    const validation = Student.validate(studentData);
    if (!validation.valid) {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION_ERROR';
      error.details = validation.errors;
      throw error;
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(studentData.email);
    if (existingUser) {
      const error = new Error('Email already exists');
      error.code = 'DB_DUPLICATE_ENTRY';
      throw error;
    }

    // Use transaction to create user and profile atomically
    return await db.transaction(async (txQuery) => {
      // Create user
      const userId = uuidv4();
      const User = require('./User');
      const passwordHash = await require('../services/auth.service').hashPassword(studentData.password);

      await txQuery(
        `INSERT INTO users (id, email, password_hash, role, email_verified) 
         VALUES (?, ?, ?, 'student', ?)`,
        [userId, studentData.email, passwordHash, studentData.emailVerified || false]
      );

      // Create profile
      const profileId = uuidv4();
      const fullName = `${studentData.firstName} ${studentData.middleName || ''} ${studentData.lastName}`.replace(/\s+/g, ' ').trim();
      const preferredModulesJson = studentData.preferredModules 
        ? JSON.stringify(studentData.preferredModules) 
        : null;

      await txQuery(
        `INSERT INTO profiles 
         (id, user_id, first_name, middle_name, last_name, full_name, 
          grade_level, profile_photo, learning_style, preferred_modules, 
          learning_type, onboarding_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profileId,
          userId,
          studentData.firstName,
          studentData.middleName || null,
          studentData.lastName,
          fullName,
          studentData.gradeLevel || null,
          studentData.profilePhoto || null,
          studentData.learningStyle || null,
          preferredModulesJson,
          studentData.learningType || null,
          studentData.onboardingCompleted || false
        ]
      );

      // Fetch and return the created student
      return await Student.findById(userId);
    });
  }

  /**
   * Update student data
   * @param {string} id - Student user ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Student>} Updated student instance
   */
  static async update(id, updates) {
    // Validate student exists
    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      const error = new Error('Student not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    // Use transaction to update user and profile
    return await db.transaction(async (txQuery) => {
      // Update user fields if provided
      const userFields = ['email', 'email_verified'];
      const userUpdates = {};
      for (const field of userFields) {
        if (updates[field] !== undefined) {
          const dbField = field === 'emailVerified' ? 'email_verified' : field;
          userUpdates[dbField] = updates[field];
        }
      }

      if (Object.keys(userUpdates).length > 0) {
        const { sql, params } = db.buildUpdate('users', userUpdates, { id });
        await txQuery(sql, params);
      }

      // Update profile fields if provided
      const profileFields = [
        'firstName', 'middleName', 'lastName', 'gradeLevel', 'profilePhoto',
        'learningStyle', 'preferredModules', 'learningType', 'onboardingCompleted'
      ];
      const profileUpdates = {};
      
      for (const field of profileFields) {
        if (updates[field] !== undefined) {
          // Convert camelCase to snake_case
          const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          
          // Handle JSON fields
          if (field === 'preferredModules' && updates[field] !== null) {
            profileUpdates[dbField] = JSON.stringify(updates[field]);
          } else {
            profileUpdates[dbField] = updates[field];
          }
        }
      }

      // Update full_name if name fields changed
      if (updates.firstName || updates.middleName || updates.lastName) {
        const firstName = updates.firstName || existingStudent.firstName;
        const middleName = updates.middleName !== undefined ? updates.middleName : existingStudent.middleName;
        const lastName = updates.lastName || existingStudent.lastName;
        profileUpdates.full_name = `${firstName} ${middleName || ''} ${lastName}`.replace(/\s+/g, ' ').trim();
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { sql, params } = db.buildUpdate('profiles', profileUpdates, { user_id: id });
        await txQuery(sql, params);
      }

      // Fetch and return updated student
      return await Student.findById(id);
    });
  }

  /**
   * Delete student (deletes both user and profile via CASCADE)
   * @param {string} id - Student user ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    // Verify student exists
    const student = await Student.findById(id);
    if (!student) {
      const error = new Error('Student not found');
      error.code = 'DB_NOT_FOUND';
      throw error;
    }

    // Delete user (profile will be deleted via CASCADE)
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Bulk import students
   * @param {Array<Object>} studentsData - Array of student data objects
   * @returns {Promise<Object>} - { created: number, failed: Array }
   */
  static async bulkImport(studentsData) {
    const results = {
      created: 0,
      failed: []
    };

    for (let i = 0; i < studentsData.length; i++) {
      const studentData = studentsData[i];
      
      try {
        await Student.create(studentData);
        results.created++;
      } catch (error) {
        results.failed.push({
          index: i,
          data: studentData,
          error: error.message,
          code: error.code
        });
      }
    }

    return results;
  }

  /**
   * Get students by class ID
   * @param {string} classId - Class ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Student>>} Array of student instances
   */
  static async findByClassId(classId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const rows = await db.query(
      `SELECT 
        u.id, u.email, u.role, u.email_verified, u.created_at as user_created_at,
        u.updated_at, u.last_login,
        p.id as profile_id, p.first_name, p.middle_name, p.last_name, 
        p.full_name, p.grade_level, p.profile_photo, p.learning_style, 
        p.preferred_modules, p.learning_type, p.onboarding_completed,
        cs.joined_at
       FROM users u
       INNER JOIN class_students cs ON u.id = cs.student_id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE cs.class_id = ? AND u.role = 'student'
       ORDER BY p.last_name, p.first_name
       LIMIT ? OFFSET ?`,
      [classId, limit, offset]
    );

    return rows.map(row => {
      // Parse JSON fields
      if (row.preferred_modules && typeof row.preferred_modules === 'string') {
        row.preferred_modules = JSON.parse(row.preferred_modules);
      }
      return new Student(row);
    });
  }

  /**
   * Convert student to JSON (safe for API responses)
   * @returns {Object} Student object without sensitive data
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin,
      profile: {
        id: this.profileId,
        firstName: this.firstName,
        middleName: this.middleName,
        lastName: this.lastName,
        fullName: this.fullName,
        gradeLevel: this.gradeLevel,
        profilePhoto: this.profilePhoto,
        learningStyle: this.learningStyle,
        preferredModules: this.preferredModules,
        learningType: this.learningType,
        onboardingCompleted: this.onboardingCompleted
      }
    };
  }
}

module.exports = Student;
