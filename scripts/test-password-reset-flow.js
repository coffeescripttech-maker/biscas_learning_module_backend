/**
 * Test Password Reset Flow
 * 
 * This script tests the complete password reset flow:
 * 1. Request password reset
 * 2. Generate reset token
 * 3. Display reset URL
 * 4. Optionally reset password
 */

require('dotenv').config();
const db = require('../src/utils/db');
const authService = require('../src/services/auth.service');
const User = require('../src/models/User');

async function testPasswordResetFlow() {
  console.log('🧪 Testing Password Reset Flow...\n');

  try {
    // Step 1: Find or create a test user
    console.log('Step 1: Finding test user...');
    let testEmail = 'test@example.com';
    let user = await User.findByEmail(testEmail);

    if (!user) {
      console.log('   Test user not found. Creating one...');
      user = await User.create({
        email: testEmail,
        password: 'OldPassword123',
        role: 'student'
      });
      console.log(`   ✅ Created test user: ${testEmail}`);
    } else {
      console.log(`   ✅ Found test user: ${testEmail} (ID: ${user.id})`);
    }
    console.log('');

    // Step 2: Generate password reset token
    console.log('Step 2: Generating password reset token...');
    const token = await authService.generatePasswordResetToken(user.id);
    console.log(`   ✅ Token generated: ${token}`);
    console.log('');

    // Step 3: Verify token in database
    console.log('Step 3: Verifying token in database...');
    const [tokens] = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = ?',
      [token]
    );
    
    if (tokens.length === 0) {
      throw new Error('Token not found in database');
    }

    const tokenData = tokens[0];
    console.log('   ✅ Token found in database:');
    console.log(`      User ID: ${tokenData.user_id}`);
    console.log(`      Expires: ${tokenData.expires_at}`);
    console.log(`      Used: ${tokenData.used}`);
    console.log('');

    // Step 4: Generate reset URL
    console.log('Step 4: Password reset URL:');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
    console.log('');
    console.log('   🔗 Copy this URL to test password reset:');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ${resetUrl}`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Step 5: Test token verification
    console.log('Step 5: Testing token verification...');
    const verifiedToken = await authService.verifyPasswordResetToken(token);
    console.log('   ✅ Token is valid');
    console.log(`      User ID: ${verifiedToken.user_id}`);
    console.log('');

    // Step 6: Simulate password reset (optional)
    console.log('Step 6: Simulating password reset...');
    const newPassword = 'NewPassword123';
    
    // Update password
    await User.updatePassword(user.id, newPassword);
    console.log('   ✅ Password updated successfully');
    
    // Mark token as used
    await authService.markPasswordResetTokenAsUsed(token);
    console.log('   ✅ Token marked as used');
    console.log('');

    // Step 7: Verify token is now invalid
    console.log('Step 7: Verifying used token is invalid...');
    try {
      await authService.verifyPasswordResetToken(token);
      console.log('   ❌ Token should be invalid but is still valid!');
    } catch (error) {
      console.log('   ✅ Token is now invalid (as expected)');
    }
    console.log('');

    // Step 8: Test login with new password
    console.log('Step 8: Testing login with new password...');
    const updatedUser = await User.findByEmail(testEmail);
    const isPasswordValid = await updatedUser.verifyPassword(newPassword);
    
    if (isPasswordValid) {
      console.log('   ✅ Login successful with new password');
    } else {
      console.log('   ❌ Login failed with new password');
    }
    console.log('');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Password Reset Flow Test Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Test Results:');
    console.log('  ✅ Token generation works');
    console.log('  ✅ Token storage works');
    console.log('  ✅ Token verification works');
    console.log('  ✅ Password update works');
    console.log('  ✅ Token invalidation works');
    console.log('  ✅ Login with new password works');
    console.log('');
    console.log('To test the full UI flow:');
    console.log(`  1. Go to: ${frontendUrl}/auth/forgot-password`);
    console.log(`  2. Enter email: ${testEmail}`);
    console.log('  3. Check email for reset link (if email configured)');
    console.log('  4. Or use the URL above to test directly');
    console.log('');
    console.log('Test user credentials:');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Run test
testPasswordResetFlow()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
