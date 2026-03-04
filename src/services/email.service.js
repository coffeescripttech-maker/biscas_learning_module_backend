const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, text, html }) {
    try {
      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} token - Password reset token
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${config.frontendUrl}/auth/reset-password?token=${token}`;
    
    const subject = 'Password Reset Request - BISCAS NAGA Learning Module';
    
    const text = `
You have requested to reset your password for BISCAS NAGA Learning Module.

Please click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
BISCAS NAGA Learning Module Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4F46E5;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 5px 5px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4F46E5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>You have requested to reset your password for BISCAS NAGA Learning Module.</p>
      <p>Please click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
      <p><strong>This link will expire in 1 hour.</strong></p>
      <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
      <div class="footer">
        <p>Best regards,<br>BISCAS NAGA Learning Module Team</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }

  /**
   * Send welcome email
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(email, firstName) {
    const subject = 'Welcome to BISCAS NAGA Learning Module';
    
    const text = `
Hello ${firstName || 'there'},

Welcome to BISCAS NAGA Learning Module!

Your account has been successfully created. You can now log in and start exploring our learning modules.

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
BISCAS NAGA Learning Module Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4F46E5;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 5px 5px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to BISCAS NAGA!</h1>
    </div>
    <div class="content">
      <p>Hello ${firstName || 'there'},</p>
      <p>Welcome to BISCAS NAGA Learning Module!</p>
      <p>Your account has been successfully created. You can now log in and start exploring our learning modules tailored to your learning style.</p>
      <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
      <div class="footer">
        <p>Best regards,<br>BISCAS NAGA Learning Module Team</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>} True if configuration is valid
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
