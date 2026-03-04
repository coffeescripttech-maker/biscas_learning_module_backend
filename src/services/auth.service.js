const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const db = require('../utils/db');

const SALT_ROUNDS = 10;

class AuthService {
  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload (userId, email, role)
   * @returns {string} JWT access token
   */
  generateAccessToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.accessExpiry
      }
    );
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload (userId, tokenId)
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
        tokenId: payload.tokenId
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.refreshExpiry
      }
    );
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object with id, email, role
   * @returns {Promise<Object>} Object containing accessToken and refreshToken
   */
  async generateTokens(user) {
    const tokenId = uuidv4();
    
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = this.generateRefreshToken({
      userId: user.id,
      tokenId: tokenId
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) 
       VALUES (?, ?, ?)`,
      [user.id, refreshToken, expiresAt]
    );

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New access and refresh tokens
   * @throws {Error} If refresh token is invalid or expired
   */
  async refreshTokens(refreshToken) {
    // Verify refresh token
    const decoded = await this.verifyToken(refreshToken);

    // Check if refresh token exists in database and is not expired
    const rows = await db.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = ? AND user_id = ? AND expires_at > NOW()`,
      [refreshToken, decoded.userId]
    );

    if (!rows || rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user details
    const userRows = await db.query(
      'SELECT id, email, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!userRows || userRows.length === 0) {
      throw new Error('User not found');
    }

    const user = userRows[0];

    // Delete old refresh token
    await db.query(
      'DELETE FROM refresh_tokens WHERE token = ?',
      [refreshToken]
    );

    // Generate new tokens
    return this.generateTokens(user);
  }

  /**
   * Revoke refresh token (logout)
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<void>}
   */
  async revokeRefreshToken(refreshToken) {
    await db.query(
      'DELETE FROM refresh_tokens WHERE token = ?',
      [refreshToken]
    );
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async revokeAllUserTokens(userId) {
    await db.query(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    );
  }

  /**
   * Clean up expired refresh tokens
   * @returns {Promise<void>}
   */
  async cleanupExpiredTokens() {
    await db.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
    );
  }

  /**
   * Generate password reset token
   * @param {string} userId - User ID
   * @returns {Promise<string>} Password reset token
   */
  async generatePasswordResetToken(userId) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES (?, ?, ?)`,
      [userId, token, expiresAt]
    );

    return token;
  }

  /**
   * Verify password reset token
   * @param {string} token - Password reset token
   * @returns {Promise<Object>} Token data with user_id
   * @throws {Error} If token is invalid or expired
   */
  async verifyPasswordResetToken(token) {
    const rows = await db.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND expires_at > NOW() AND used = FALSE`,
      [token]
    );

    if (!rows || rows.length === 0) {
      throw new Error('Invalid or expired password reset token');
    }

    return rows[0];
  }

  /**
   * Mark password reset token as used
   * @param {string} token - Password reset token
   * @returns {Promise<void>}
   */
  async markPasswordResetTokenAsUsed(token) {
    await db.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
      [token]
    );
  }
}

module.exports = new AuthService();
