const User = require('../models/User');
const Profile = require('../models/Profile');
const authService = require('../services/auth.service');
const emailService = require('../services/email.service');

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { email, password, role, firstName, middleName, lastName, gradeLevel } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_INVALID_FORMAT',
            message: 'Invalid email format',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate password strength (minimum 8 characters)
      if (password.length < 8) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters long',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          error: {
            code: 'DB_DUPLICATE_ENTRY',
            message: 'Email already registered',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Create user
      const user = await User.create({
        email,
        password,
        role: role || 'student'
      });

      // Create profile if additional data provided
      let profile = null;
      if (firstName || lastName) {
        const fullName = [firstName, middleName, lastName]
          .filter(Boolean)
          .join(' ');

        profile = await Profile.create({
          userId: user.id,
          firstName,
          middleName,
          lastName,
          fullName,
          gradeLevel
        });
      }

      // Generate tokens
      const tokens = await authService.generateTokens(user);

      // Update last login
      await user.updateLastLogin();

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        profile: profile ? profile.toJSON() : null,
        ...tokens
      });
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to register user',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Verify password
      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Generate tokens
      const tokens = await authService.generateTokens(user);

      // Update last login
      await user.updateLastLogin();

      // Get profile data
      const profile = await Profile.findByUserId(user.id);

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        profile: profile ? profile.toJSON() : null,
        ...tokens
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to login',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Revoke refresh token
      await authService.revokeRefreshToken(refreshToken);

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to logout',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Refresh tokens
      const tokens = await authService.refreshTokens(refreshToken);

      res.json({
        message: 'Token refreshed successfully',
        ...tokens
      });
    } catch (error) {
      if (error.message === 'Invalid or expired refresh token') {
        return res.status(401).json({
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid or expired refresh token',
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Token refresh error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refresh token',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async me(req, res) {
    try {
      // req.user is set by verifyToken middleware
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get profile data
      const profile = await Profile.findByUserId(user.id);

      res.json({
        user: user.toJSON(),
        profile: profile ? profile.toJSON() : null
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get user data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      
      // Always return success to prevent email enumeration
      // Don't reveal if email exists or not
      if (!user) {
        return res.json({
          message: 'If the email exists, a password reset link has been sent'
        });
      }

      // Generate password reset token
      const token = await authService.generatePasswordResetToken(user.id);

      // Send password reset email
      await emailService.sendPasswordResetEmail(email, token);

      res.json({
        message: 'If the email exists, a password reset link has been sent'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process password reset request',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Validate required fields
      if (!token || !newPassword) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token and new password are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate password strength (minimum 8 characters)
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters long',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Verify password reset token
      const tokenData = await authService.verifyPasswordResetToken(token);

      // Update user password
      await User.updatePassword(tokenData.user_id, newPassword);

      // Mark token as used
      await authService.markPasswordResetTokenAsUsed(token);

      // Revoke all existing refresh tokens for security
      await authService.revokeAllUserTokens(tokenData.user_id);

      res.json({
        message: 'Password reset successful. Please login with your new password.'
      });
    } catch (error) {
      if (error.message === 'Invalid or expired password reset token') {
        return res.status(400).json({
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid or expired password reset token',
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Reset password error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reset password',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      // req.user is set by verifyToken middleware
      const userId = req.user.userId;
      const {
        firstName,
        middleName,
        lastName,
        fullName,
        gradeLevel,
        learningStyle,
        preferredModules,
        learningType,
        profilePhoto,
        onboardingCompleted
      } = req.body;

      // Get current user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'DB_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get or create profile
      let profile = await Profile.findByUserId(userId);
      
      if (!profile) {
        // Create new profile if it doesn't exist
        profile = await Profile.create({
          userId: userId,
          firstName: firstName || '',
          middleName: middleName || '',
          lastName: lastName || '',
          fullName: fullName || '',
          gradeLevel: gradeLevel || '',
          learningStyle: learningStyle || null,
          preferredModules: preferredModules || [],
          learningType: learningType || null,
          profilePhoto: profilePhoto || null,
          onboardingCompleted: onboardingCompleted || false
        });
      } else {
        // Update existing profile
        // Convert camelCase to snake_case for database
        const updateData = {};
        
        if (firstName !== undefined) updateData.first_name = firstName;
        if (middleName !== undefined) updateData.middle_name = middleName;
        if (lastName !== undefined) updateData.last_name = lastName;
        if (fullName !== undefined) updateData.full_name = fullName;
        if (gradeLevel !== undefined) updateData.grade_level = gradeLevel;
        if (learningStyle !== undefined) updateData.learning_style = learningStyle;
        if (preferredModules !== undefined) updateData.preferred_modules = preferredModules;
        if (learningType !== undefined) updateData.learning_type = learningType;
        if (profilePhoto !== undefined) updateData.profile_photo = profilePhoto;
        if (onboardingCompleted !== undefined) updateData.onboarding_completed = onboardingCompleted;

        profile = await Profile.update(userId, updateData);
      }

      res.json({
        message: 'Profile updated successfully',
        user: user.toJSON(),
        profile: profile ? profile.toJSON() : null
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new AuthController();
