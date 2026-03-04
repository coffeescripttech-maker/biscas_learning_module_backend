const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

class Profile {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.user_id;
    this.firstName = data.first_name;
    this.middleName = data.middle_name;
    this.lastName = data.last_name;
    this.fullName = data.full_name;
    this.gradeLevel = data.grade_level;
    this.learningStyle = data.learning_style;
    this.preferredModules = data.preferred_modules;
    this.learningType = data.learning_type;
    this.onboardingCompleted = data.onboarding_completed || false;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Find profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Profile|null>} Profile instance or null
   */
  static async findByUserId(userId) {
    const rows = await db.query(
      'SELECT * FROM profiles WHERE user_id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      return null;
    }

    // Parse JSON fields
    const profileData = rows[0];
    if (profileData.preferred_modules && typeof profileData.preferred_modules === 'string') {
      profileData.preferred_modules = JSON.parse(profileData.preferred_modules);
    }

    return new Profile(profileData);
  }

  /**
   * Find profile by ID
   * @param {string} id - Profile ID
   * @returns {Promise<Profile|null>} Profile instance or null
   */
  static async findById(id) {
    const rows = await db.query(
      'SELECT * FROM profiles WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }

    // Parse JSON fields
    const profileData = rows[0];
    if (profileData.preferred_modules && typeof profileData.preferred_modules === 'string') {
      profileData.preferred_modules = JSON.parse(profileData.preferred_modules);
    }

    return new Profile(profileData);
  }

  /**
   * Create a new profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Profile>} Created profile instance
   */
  static async create(profileData) {
    const profile = new Profile({
      user_id: profileData.userId,
      first_name: profileData.firstName,
      middle_name: profileData.middleName,
      last_name: profileData.lastName,
      full_name: profileData.fullName,
      grade_level: profileData.gradeLevel,
      learning_style: profileData.learningStyle,
      preferred_modules: profileData.preferredModules,
      learning_type: profileData.learningType,
      onboarding_completed: profileData.onboardingCompleted || false
    });

    // Serialize JSON fields
    const preferredModulesJson = profile.preferredModules 
      ? JSON.stringify(profile.preferredModules) 
      : null;

    await db.query(
      `INSERT INTO profiles 
       (id, user_id, first_name, middle_name, last_name, full_name, 
        grade_level, learning_style, preferred_modules, learning_type, 
        onboarding_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profileData.userId,  // Use the original parameter, not profile.userId
        profile.firstName,
        profile.middleName,
        profile.lastName,
        profile.fullName,
        profile.gradeLevel,
        profile.learningStyle,
        preferredModulesJson,
        profile.learningType,
        profile.onboardingCompleted
      ]
    );

    return profile;
  }

  /**
   * Update profile
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Profile>} Updated profile instance
   */
  static async update(userId, updates) {
    const allowedFields = [
      'first_name', 'middle_name', 'last_name', 'full_name',
      'grade_level', 'learning_style', 'preferred_modules',
      'learning_type', 'onboarding_completed'
    ];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        // Handle JSON fields
        if (key === 'preferred_modules' && value !== null) {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);

    await db.query(
      `UPDATE profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE user_id = ?`,
      values
    );

    return Profile.findByUserId(userId);
  }

  /**
   * Delete profile
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async delete(userId) {
    await db.query('DELETE FROM profiles WHERE user_id = ?', [userId]);
  }

  /**
   * Get profile with user data
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Combined user and profile data
   */
  static async getFullProfile(userId) {
    const rows = await db.query(
      `SELECT 
        u.id, u.email, u.role, u.email_verified, u.created_at as user_created_at,
        p.id as profile_id, p.first_name, p.middle_name, p.last_name, 
        p.full_name, p.grade_level, p.learning_style, p.preferred_modules,
        p.learning_type, p.onboarding_completed
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const data = rows[0];

    // Parse JSON fields
    if (data.preferred_modules && typeof data.preferred_modules === 'string') {
      data.preferred_modules = JSON.parse(data.preferred_modules);
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      emailVerified: data.email_verified,
      createdAt: data.user_created_at,
      profile: data.profile_id ? {
        id: data.profile_id,
        firstName: data.first_name,
        middleName: data.middle_name,
        lastName: data.last_name,
        fullName: data.full_name,
        gradeLevel: data.grade_level,
        learningStyle: data.learning_style,
        preferredModules: data.preferred_modules,
        learningType: data.learning_type,
        onboardingCompleted: data.onboarding_completed
      } : null
    };
  }

  /**
   * Get all profiles (with pagination)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.learningStyle - Filter by learning style
   * @returns {Promise<Array<Profile>>} Array of profile instances
   */
  static async findAll(options = {}) {
    const { limit = 50, offset = 0, learningStyle } = options;
    
    let query = 'SELECT * FROM profiles';
    const params = [];

    if (learningStyle) {
      query += ' WHERE learning_style = ?';
      params.push(learningStyle);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);
    
    return rows.map(row => {
      // Parse JSON fields
      if (row.preferred_modules && typeof row.preferred_modules === 'string') {
        row.preferred_modules = JSON.parse(row.preferred_modules);
      }
      return new Profile(row);
    });
  }

  /**
   * Convert profile to JSON
   * @returns {Object} Profile object
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      fullName: this.fullName,
      gradeLevel: this.gradeLevel,
      learningStyle: this.learningStyle,
      preferredModules: this.preferredModules,
      learningType: this.learningType,
      onboardingCompleted: this.onboardingCompleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Profile;
