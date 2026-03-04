const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const authService = require('../services/auth.service');

class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.email = data.email;
    this.passwordHash = data.password_hash;
    this.role = data.role;
    this.emailVerified = data.email_verified || false;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.lastLogin = data.last_login;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User instance or null
   */
  static async findByEmail(email) {
    const rows = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return (rows && rows.length > 0) ? new User(rows[0]) : null;
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User instance or null
   */
  static async findById(id) {
    const rows = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return (rows && rows.length > 0) ? new User(rows[0]) : null;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.password - Plain text password
   * @param {string} userData.role - User role (student, teacher, admin)
   * @returns {Promise<User>} Created user instance
   */
  static async create(userData) {
    const user = new User({
      id: userData.id,  // Use provided id if available
      email: userData.email,
      role: userData.role || 'student'
    });

    // Hash password
    user.passwordHash = await authService.hashPassword(userData.password);

    // Insert into database
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, email_verified) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, user.email, user.passwordHash, user.role, user.emailVerified]
    );

    return user;
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<User>} Updated user instance
   */
  static async update(id, updates) {
    const allowedFields = ['email', 'role', 'email_verified', 'last_login'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    await db.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return User.findById(id);
  }

  /**
   * Update user password
   * @param {string} id - User ID
   * @param {string} newPassword - New plain text password
   * @returns {Promise<void>}
   */
  static async updatePassword(id, newPassword) {
    const passwordHash = await authService.hashPassword(newPassword);
    await db.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, id]
    );
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Verify password
   * @param {string} password - Plain text password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password) {
    return authService.verifyPassword(password, this.passwordHash);
  }

  /**
   * Update last login timestamp
   * @returns {Promise<void>}
   */
  async updateLastLogin() {
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [this.id]
    );
    this.lastLogin = new Date();
  }

  /**
   * Get user without sensitive data
   * @returns {Object} User object without password hash
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin
    };
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if email exists
   */
  static async emailExists(email) {
    const rows = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email]
    );
    return rows[0].count > 0;
  }

  /**
   * Get all users (with pagination)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.role - Filter by role
   * @returns {Promise<Array<User>>} Array of user instances
   */
  static async findAll(options = {}) {
    const { limit = 50, offset = 0, role } = options;
    
    let query = 'SELECT * FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);
    return rows.map(row => new User(row));
  }

  /**
   * Find users by role with their profiles
   * @param {string} role - User role (student, teacher, admin)
   * @returns {Promise<Array<Object>>} Array of users with profile data
   */
  static async findByRole(role) {
    const rows = await db.query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        u.email_verified,
        u.created_at,
        u.updated_at,
        u.last_login,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.full_name,
        p.grade_level,
        p.learning_style,
        p.preferred_modules,
        p.learning_type,
        p.onboarding_completed
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = ?
      ORDER BY u.created_at DESC`,
      [role]
    );

    return rows.map(row => {
      // Parse JSON fields
      let preferredModules = row.preferred_modules;
      if (typeof preferredModules === 'string') {
        try {
          preferredModules = JSON.parse(preferredModules);
        } catch (e) {
          preferredModules = [];
        }
      }
      
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        email_verified: row.email_verified,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_login: row.last_login,
        first_name: row.first_name,
        middle_name: row.middle_name,
        last_name: row.last_name,
        full_name: row.full_name,
        grade_level: row.grade_level,
        learning_style: row.learning_style,
        preferred_modules: preferredModules || [],
        learning_type: row.learning_type,
        onboarding_completed: row.onboarding_completed
      };
    });
  }

  /**
   * Find user by ID with profile
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User with profile data or null
   */
  static async findByIdWithProfile(id) {
    const rows = await db.query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        u.email_verified,
        u.created_at,
        u.updated_at,
        u.last_login,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.full_name,
        p.grade_level,
        p.learning_style,
        p.preferred_modules,
        p.learning_type,
        p.onboarding_completed
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    
    // Parse JSON fields
    let preferredModules = row.preferred_modules;
    if (typeof preferredModules === 'string') {
      try {
        preferredModules = JSON.parse(preferredModules);
      } catch (e) {
        preferredModules = [];
      }
    }
    
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      email_verified: row.email_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login: row.last_login,
      first_name: row.first_name,
      middle_name: row.middle_name,
      last_name: row.last_name,
      full_name: row.full_name,
      grade_level: row.grade_level,
      learning_style: row.learning_style,
      preferred_modules: preferredModules || [],
      learning_type: row.learning_type,
      onboarding_completed: row.onboarding_completed
    };
  }
}

module.exports = User;
