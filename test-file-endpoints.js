const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'http://localhost:3001/api';

// Test credentials (use existing test user)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

let authToken = null;
let uploadedFileId = null;

/**
 * Login to get auth token
 */
async function login() {
  try {
    console.log('\n🔐 Logging in...');
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    authToken = response.data.accessToken;
    console.log('✅ Login successful');
    console.log('   Token:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Create a test file
 */
function createTestFile() {
  const testFilePath = path.join(__dirname, 'test-upload.txt');
  const content = 'This is a test file for upload testing.\nCreated at: ' + new Date().toISOString();
  fs.writeFileSync(testFilePath, content);
  return testFilePath;
}

/**
 * Test file upload
 */
async function testFileUpload() {
  try {
    console.log('\n📤 Testing file upload...');
    
    // Create test file
    const testFilePath = createTestFile();
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('folder', 'test');
    form.append('allowedTypes', 'text/plain,image/jpeg,image/png'); // Allow text files
    
    const response = await axios.post(
      `${API_URL}/files/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    uploadedFileId = response.data.id;
    
    console.log('✅ File uploaded successfully');
    console.log('   File ID:', response.data.id);
    console.log('   Original Name:', response.data.originalName);
    console.log('   Size:', response.data.size, 'bytes');
    console.log('   URL:', response.data.url);
    console.log('   Folder:', response.data.folder);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    return true;
  } catch (error) {
    console.error('❌ File upload failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test get file metadata
 */
async function testGetFileMetadata() {
  try {
    console.log('\n📋 Testing get file metadata...');
    
    const response = await axios.get(
      `${API_URL}/files/${uploadedFileId}/metadata`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✅ File metadata retrieved');
    console.log('   File ID:', response.data.id);
    console.log('   Original Name:', response.data.originalName);
    console.log('   MIME Type:', response.data.mimetype);
    console.log('   Size:', response.data.size, 'bytes');
    console.log('   Created:', response.data.createdAt);
    
    return true;
  } catch (error) {
    console.error('❌ Get file metadata failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test get user files
 */
async function testGetUserFiles() {
  try {
    console.log('\n📂 Testing get user files...');
    
    const response = await axios.get(
      `${API_URL}/files`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✅ User files retrieved');
    console.log('   Total files:', response.data.files.length);
    console.log('   Total storage:', response.data.totalStorage, 'bytes');
    
    if (response.data.files.length > 0) {
      console.log('   First file:', response.data.files[0].originalName);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Get user files failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test get file (download)
 */
async function testGetFile() {
  try {
    console.log('\n📥 Testing get file...');
    
    const response = await axios.get(
      `${API_URL}/files/${uploadedFileId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer'
      }
    );
    
    console.log('✅ File retrieved');
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   Content-Length:', response.headers['content-length'], 'bytes');
    console.log('   File content preview:', Buffer.from(response.data).toString().substring(0, 50) + '...');
    
    return true;
  } catch (error) {
    console.error('❌ Get file failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test delete file
 */
async function testDeleteFile() {
  try {
    console.log('\n🗑️  Testing delete file...');
    
    const response = await axios.delete(
      `${API_URL}/files/${uploadedFileId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✅ File deleted successfully');
    console.log('   Message:', response.data.message);
    
    return true;
  } catch (error) {
    console.error('❌ Delete file failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test file upload with validation (should fail)
 */
async function testFileUploadValidation() {
  try {
    console.log('\n🚫 Testing file upload validation (should fail)...');
    
    // Create a large test file (> 10MB)
    const testFilePath = path.join(__dirname, 'test-large.txt');
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
    fs.writeFileSync(testFilePath, largeContent);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('folder', 'test');
    
    try {
      await axios.post(
        `${API_URL}/files/upload`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${authToken}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      console.log('❌ Validation test failed - large file was accepted');
      fs.unlinkSync(testFilePath);
      return false;
    } catch (error) {
      // Check if it's a file size error (413 or multer error)
      if (error.response?.status === 413 || 
          error.response?.status === 500 ||
          error.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' ||
          error.message.includes('File too large') ||
          error.message.includes('LIMIT_FILE_SIZE')) {
        console.log('✅ Validation working - large file rejected');
        fs.unlinkSync(testFilePath);
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Validation test error:', error.message);
    // Clean up if file exists
    const testFilePath = path.join(__dirname, 'test-large.txt');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 File Upload Endpoints Test Suite');
  console.log('═══════════════════════════════════════════════════════');
  
  const results = {
    login: false,
    upload: false,
    metadata: false,
    userFiles: false,
    getFile: false,
    deleteFile: false,
    validation: false
  };
  
  // Run tests in sequence
  results.login = await login();
  
  if (results.login) {
    results.upload = await testFileUpload();
    
    if (results.upload) {
      results.metadata = await testGetFileMetadata();
      results.userFiles = await testGetUserFiles();
      results.getFile = await testGetFile();
      results.deleteFile = await testDeleteFile();
    }
    
    results.validation = await testFileUploadValidation();
  }
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Test Results Summary');
  console.log('═══════════════════════════════════════════════════════');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${test.padEnd(20)} ${result ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('───────────────────────────────────────────────────────');
  console.log(`Total: ${passed}/${total} tests passed`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
