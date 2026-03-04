/**
 * Send Password Reset Emails Script
 * 
 * This script sends password reset emails to all imported users.
 * It uses the email service to send templated emails with reset links.
 * 
 * Requirements: 3.2, 3.3
 * 
 * Usage:
 *   node scripts/send-password-resets.js
 * 
 * Environment Variables Required:
 *   EMAIL_HOST - SMTP host
 *   EMAIL_PORT - SMTP port
 *   EMAIL_USER - SMTP username
 *   EMAIL_PASSWORD - SMTP password
 *   EMAIL_FROM - From email address
 *   FRONTEND_URL - Frontend URL for reset links
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const logger = require('../src/utils/logger');

// Configuration
const EXPORT_DIR = path.join(__dirname, '../exports/auth');
const DELAY_BETWEEN_EMAILS = 100; // ms delay to avoid rate limiting
const BATCH_SIZE = 50; // Send emails in batches

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create email transporter
 */
function createTransporter() {
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };
  
  return nodemailer.createTransporter(config);
}

/**
 * Load password reset email list
 */
function loadEmailList() {
  const filename = path.join(EXPORT_DIR, '_password_reset_emails.json');
  
  if (!fs.existsSync(filename)) {
    throw new Error(`Email list not found: ${filename}`);
  }
  
  try {
    const content = fs.readFileSync(filename, 'utf8');
    const emailList = JSON.parse(content);
    
    if (!Array.isArray(emailList)) {
      throw new Error('Invalid email list format: expected array');
    }
    
    return emailList;
  } catch (error) {
    throw new Error(`Failed to load email list: ${error.message}`);
  }
}

/**
 * Generate password reset email HTML
 * @param {Object} data - Email data
 * @returns {string} - HTML content
 */
function generateEmailHtml(data) {
  const { email, resetUrl, expiresAt } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Required</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
    }
    .content {
      background-color: white;
      border-radius: 6px;
      padding: 25px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .info-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 30px;
    }
    .code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset Required</h1>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      
      <p>We've recently migrated our system to a new platform. As part of this migration, you need to set a new password for your account.</p>
      
      <p><strong>Your account email:</strong> <span class="code">${email}</span></p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Set New Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
      
      <div class="info-box">
        <strong>⏰ Important:</strong> This password reset link will expire on <strong>${new Date(expiresAt).toLocaleString()}</strong>. Please reset your password before then.
      </div>
      
      <p><strong>What to do next:</strong></p>
      <ol>
        <li>Click the button above or use the link</li>
        <li>Enter your new password (minimum 8 characters)</li>
        <li>Confirm your new password</li>
        <li>Log in with your new credentials</li>
      </ol>
      
      <p><strong>Need help?</strong> If you have any questions or issues, please contact our support team.</p>
      
      <p>Thank you for your patience during this migration!</p>
    </div>
    
    <div class="footer">
      <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
      <p>&copy; ${new Date().getFullYear()} BISCAS NAGA Learning Module. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate password reset email text (plain text version)
 * @param {Object} data - Email data
 * @returns {string} - Plain text content
 */
function generateEmailText(data) {
  const { email, resetUrl, expiresAt } = data;
  
  return `
Password Reset Required

Hello,

We've recently migrated our system to a new platform. As part of this migration, you need to set a new password for your account.

Your account email: ${email}

To set your new password, please visit:
${resetUrl}

IMPORTANT: This password reset link will expire on ${new Date(expiresAt).toLocaleString()}. Please reset your password before then.

What to do next:
1. Click the link above
2. Enter your new password (minimum 8 characters)
3. Confirm your new password
4. Log in with your new credentials

Need help? If you have any questions or issues, please contact our support team.

Thank you for your patience during this migration!

---
If you didn't request this password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} BISCAS NAGA Learning Module. All rights reserved.
  `;
}

/**
 * Send a single password reset email
 * @param {Object} transporter - Nodemailer transporter
 * @param {Object} emailData - Email data
 * @returns {Promise<Object>} - Send result
 */
async function sendPasswordResetEmail(transporter, emailData) {
  try {
    const mailOptions = {
      from: `"BISCAS NAGA" <${process.env.EMAIL_FROM}>`,
      to: emailData.email,
      subject: 'Password Reset Required - System Migration',
      text: generateEmailText(emailData),
      html: generateEmailHtml(emailData)
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Password reset email sent', {
      email: emailData.email,
      messageId: info.messageId
    });
    
    return {
      email: emailData.email,
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Failed to send password reset email', {
      email: emailData.email,
      error: error.message
    });
    
    return {
      email: emailData.email,
      success: false,
      error: error.message
    };
  }
}

/**
 * Send all password reset emails
 * @param {Array} emailList - List of email data
 * @returns {Promise<Object>} - Send statistics
 */
async function sendAllEmails(emailList) {
  console.log(`\n📧 Sending ${emailList.length} password reset emails...`);
  
  const transporter = createTransporter();
  
  // Verify transporter configuration
  try {
    await transporter.verify();
    console.log('✅ Email server connection verified');
  } catch (error) {
    throw new Error(`Email server connection failed: ${error.message}`);
  }
  
  const results = {
    total: emailList.length,
    sent: 0,
    failed: 0,
    emails: []
  };
  
  // Send emails in batches
  for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
    const batch = emailList.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(emailList.length / BATCH_SIZE);
    
    console.log(`\n   Batch ${batchNumber}/${totalBatches}: Sending ${batch.length} emails...`);
    
    for (let j = 0; j < batch.length; j++) {
      const emailData = batch[j];
      const progress = `[${i + j + 1}/${emailList.length}]`;
      
      console.log(`   ${progress} Sending to ${emailData.email}...`);
      
      const result = await sendPasswordResetEmail(transporter, emailData);
      
      if (result.success) {
        console.log(`   ${progress} ✓ Sent successfully`);
        results.sent++;
      } else {
        console.log(`   ${progress} ❌ Failed: ${result.error}`);
        results.failed++;
      }
      
      results.emails.push(result);
      
      // Add delay between emails
      if (i + j + 1 < emailList.length) {
        await sleep(DELAY_BETWEEN_EMAILS);
      }
    }
    
    console.log(`   Batch ${batchNumber} complete`);
  }
  
  return results;
}

/**
 * Save send results
 * @param {Object} results - Send results
 */
function saveResults(results) {
  const resultsFilename = path.join(EXPORT_DIR, '_email_send_results.json');
  fs.writeFileSync(resultsFilename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Send results saved to: _email_send_results.json`);
  
  // Generate failed emails list for retry
  const failedEmails = results.emails.filter(e => !e.success);
  if (failedEmails.length > 0) {
    const failedFilename = path.join(EXPORT_DIR, '_failed_emails.json');
    fs.writeFileSync(failedFilename, JSON.stringify(failedEmails, null, 2));
    console.log(`⚠️  Failed emails list saved to: _failed_emails.json`);
  }
}

/**
 * Display summary
 * @param {Object} results - Send results
 * @param {number} duration - Duration in seconds
 */
function displaySummary(results, duration) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EMAIL SEND SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Emails sent: ${results.sent}`);
  console.log(`❌ Emails failed: ${results.failed}`);
  console.log(`📧 Total emails: ${results.total}`);
  console.log(`⏱️  Duration: ${duration} seconds`);
  
  const successRate = ((results.sent / results.total) * 100).toFixed(1);
  console.log(`📈 Success rate: ${successRate}%`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Email sending complete!');
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n⚠️  WARNING: Some emails failed to send');
    console.log('   Review _failed_emails.json and retry if needed');
  }
  
  console.log('\n📝 NEXT STEPS:');
  console.log('   1. Monitor email delivery');
  console.log('   2. Check spam folders if users report not receiving emails');
  console.log('   3. Track password reset completion rate');
  console.log('   4. Send reminder emails after 7 days if needed');
  console.log('   5. Provide manual password reset support if needed\n');
}

/**
 * Verify email configuration
 */
function verifyEmailConfig() {
  console.log('\n🔍 Verifying email configuration...');
  
  const required = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing email configuration: ${missing.join(', ')}`);
    console.error('\nPlease set the following environment variables:');
    missing.forEach(key => console.error(`  ${key}`));
    return false;
  }
  
  console.log('✅ Email configuration verified');
  return true;
}

/**
 * Verify email list exists
 */
function verifyEmailList() {
  console.log('\n🔍 Verifying email list...');
  
  const filename = path.join(EXPORT_DIR, '_password_reset_emails.json');
  
  if (!fs.existsSync(filename)) {
    console.error(`❌ Email list not found: ${filename}`);
    console.error('\nPlease run the user import script first:');
    console.error('  node scripts/import-auth-users.js');
    return false;
  }
  
  console.log('✅ Email list found');
  return true;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      SEND PASSWORD RESET EMAILS SCRIPT                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Verify prerequisites
    if (!verifyEmailConfig()) {
      process.exit(1);
    }
    
    if (!verifyEmailList()) {
      process.exit(1);
    }
    
    // Load email list
    console.log('\n📂 Loading email list...');
    const emailList = loadEmailList();
    console.log(`✅ Loaded ${emailList.length} emails to send`);
    
    // Display warning
    console.log('\n⚠️  WARNING: This will send password reset emails');
    console.log(`   Email server: ${process.env.EMAIL_HOST}`);
    console.log(`   From address: ${process.env.EMAIL_FROM}`);
    console.log(`   Recipients: ${emailList.length}`);
    console.log('\n   This operation will:');
    console.log('   - Send password reset emails to all imported users');
    console.log('   - Include reset links valid for 24 hours');
    console.log('   - May take several minutes for large user bases');
    console.log('   - Use email rate limiting to avoid spam filters');
    
    // Start sending
    const startTime = Date.now();
    const results = await sendAllEmails(emailList);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Save results
    saveResults(results);
    
    // Display summary
    displaySummary(results, duration);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    logger.error('Fatal error during email sending', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  sendAllEmails,
  sendPasswordResetEmail,
  generateEmailHtml,
  generateEmailText
};
