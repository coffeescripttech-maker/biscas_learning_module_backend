/**
 * Test Email Configuration
 * 
 * This script tests if the email service is properly configured
 * and can send emails successfully.
 */

require('dotenv').config();
const emailService = require('../src/services/email.service');

async function testEmailConfiguration() {
  console.log('🔍 Testing Email Configuration...\n');

  // Display configuration (without password)
  console.log('Configuration:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET');
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('');

  // Test 1: Verify connection
  console.log('Test 1: Verifying SMTP connection...');
  try {
    const isConnected = await emailService.verifyConnection();
    if (isConnected) {
      console.log('✅ SMTP connection successful!\n');
    } else {
      console.log('❌ SMTP connection failed!\n');
      return;
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.error('Full error:', error);
    return;
  }

  // Test 2: Send test email
  console.log('Test 2: Sending test email...');
  try {
    const testEmail = process.env.EMAIL_USER; // Send to self for testing
    
    await emailService.sendEmail({
      to: testEmail,
      subject: 'Test Email - BISCAS NAGA Learning Module',
      text: 'This is a test email to verify the email configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #00af8f;">Email Configuration Test</h2>
          <p>This is a test email to verify the email configuration is working correctly.</p>
          <p>If you received this email, your email service is properly configured!</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            BISCAS NAGA Learning Module<br>
            Automated Test Email
          </p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📧 Check inbox: ${testEmail}\n`);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('Full error:', error);
    return;
  }

  // Test 3: Send password reset email
  console.log('Test 3: Sending password reset email...');
  try {
    const testEmail = process.env.EMAIL_USER;
    const testToken = 'test-token-12345';
    
    await emailService.sendPasswordResetEmail(testEmail, testToken);

    console.log('✅ Password reset email sent successfully!');
    console.log(`📧 Check inbox: ${testEmail}\n`);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    console.error('Full error:', error);
    return;
  }

  console.log('🎉 All email tests passed!');
  console.log('\nYour email service is ready to use.');
}

// Run tests
testEmailConfiguration()
  .then(() => {
    console.log('\n✅ Email testing complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Email testing failed:', error);
    process.exit(1);
  });
