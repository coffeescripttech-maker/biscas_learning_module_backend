const http = require('http');

async function testSubmissionEndpoint() {
  console.log('🧪 Testing Submissions Endpoint...');
  
  // Test data
  const testSubmission = {
    student_id: 'test-student-123',
    module_id: 'test-module-456',
    section_id: 'test-section-789',
    section_title: 'Test Section',
    section_type: 'assessment',
    submission_data: {
      answers: ['A', 'B', 'C'],
      score: 85
    },
    time_spent_seconds: 300,
    submission_status: 'submitted'
  };
  
  const postData = JSON.stringify(testSubmission);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/submissions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      // Add a test auth header (you might need to adjust this)
      'Authorization': 'Bearer test-token'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      console.log(`📊 Status: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 201) {
            console.log('✅ Submission created successfully');
            console.log('📄 Response:', response);
          } else {
            console.log('❌ Submission failed');
            console.log('📄 Error response:', response);
          }
        } catch (e) {
          console.log('📄 Raw response:', data);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Request failed:', error.message);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

testSubmissionEndpoint();