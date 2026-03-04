const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');
const files = [
  'Profile.js',
  'Student.js',
  'Module.js',
  'Class.js',
  'Progress.js',
  'File.js'
];

files.forEach(file => {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all instances of "const [rows] = await db.query" with "const rows = await db.query"
  content = content.replace(/const \[rows\] = await db\.query/g, 'const rows = await db.query');
  
  // Replace all instances of "const [result] = await db.query" with "const result = await db.query"
  content = content.replace(/const \[result\] = await db\.query/g, 'const result = await db.query');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed ${file}`);
});

console.log('\n✅ All model files fixed!');
