/**
 * Test script to check for base64 images in module content
 * and verify the conversion process works
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const MODULE_ID = '4cf58b23-32c1-4af5-a881-9dab5f57bcc3'; // The module you're editing

// Get authentication token
const getAuthToken = async () => {
  try {
    console.log('🔐 Getting authentication token...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'teacher@test.com',
      password: 'teach2025'
    });
    
    console.log('✅ Authentication successful');
    return response.data.accessToken || response.data.data?.accessToken;
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return null;
  }
};

// Check module for base64 images
const checkModuleForBase64Images = async (authToken) => {
  try {
    console.log(`\n🔍 Checking module ${MODULE_ID} for base64 images...`);
    
    const response = await axios.get(`${BASE_URL}/api/modules/${MODULE_ID}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    const module = response.data.data;
    console.log('📋 Module loaded:', module.title);
    console.log('📊 Has json_content_url:', !!module.jsonContentUrl);
    
    if (module.jsonContentUrl) {
      console.log('📥 Fetching full content from R2...');
      
      // Fetch the full content from R2
      const contentResponse = await axios.get(module.jsonContentUrl);
      const fullContent = contentResponse.data;
      
      console.log('📊 Full content loaded, analyzing for base64 images...');
      
      // Convert to string to search for base64 images
      const contentString = JSON.stringify(fullContent);
      
      // Count base64 images
      const base64Matches = contentString.match(/data:image\/[^;]+;base64,/g);
      const base64Count = base64Matches ? base64Matches.length : 0;
      
      // Count R2 images
      const r2Matches = contentString.match(/https:\/\/pub-[^"'\s]+\.r2\.dev/g);
      const r2Count = r2Matches ? r2Matches.length : 0;
      
      console.log('\n📊 Image Analysis Results:');
      console.log(`   🔢 Base64 images found: ${base64Count}`);
      console.log(`   🔢 R2 images found: ${r2Count}`);
      console.log(`   📏 Total content size: ${(contentString.length / 1024 / 1024).toFixed(2)} MB`);
      
      if (base64Count > 0) {
        console.log('\n✅ Module has base64 images that can be converted!');
        console.log('💡 When you update this module, these will be automatically converted to R2 URLs');
        
        // Show some examples
        console.log('\n📝 Base64 image examples:');
        const examples = contentString.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/]{50}/g);
        if (examples) {
          examples.slice(0, 3).forEach((example, index) => {
            console.log(`   ${index + 1}. ${example}...`);
          });
        }
      } else {
        console.log('\nℹ️ No base64 images found - module is already optimized!');
      }
      
      if (r2Count > 0) {
        console.log('\n✅ Module already has some R2 optimized images!');
      }
      
    } else {
      console.log('📝 Module content stored in database (no R2 URL)');
      
      // Check database content for base64 images
      const contentString = JSON.stringify(module);
      const base64Matches = contentString.match(/data:image\/[^;]+;base64,/g);
      const base64Count = base64Matches ? base64Matches.length : 0;
      
      console.log(`🔢 Base64 images in database: ${base64Count}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to check module:', error.response?.data || error.message);
  }
};

// Main function
const runCheck = async () => {
  console.log('🧪 Base64 Image Conversion Check\n');
  console.log('=' .repeat(50));
  
  try {
    const authToken = await getAuthToken();
    if (!authToken) {
      console.error('❌ Cannot proceed without authentication');
      return;
    }
    
    await checkModuleForBase64Images(authToken);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 Next Steps:');
    console.log('1. Edit the module in the browser');
    console.log('2. Make any small change (add a space, etc.)');
    console.log('3. Click "Update Module"');
    console.log('4. Watch the console for conversion messages');
    console.log('5. Run this script again to see the results');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
};

// Run the check
if (require.main === module) {
  runCheck();
}

module.exports = { runCheck, checkModuleForBase64Images };