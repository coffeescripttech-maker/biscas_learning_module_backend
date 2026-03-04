// Test if routes are loading properly
const express = require('express');
const app = express();

app.use(express.json());

console.log('Loading auth routes...');
const authRoutes = require('./src/routes/auth.routes');
console.log('Auth routes loaded:', typeof authRoutes);

console.log('\nLoading students routes...');
const studentsRoutes = require('./src/routes/students.routes');
console.log('Students routes loaded:', typeof studentsRoutes);

console.log('\nRegistering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);

console.log('\nRoutes registered successfully!');
console.log('\nExpress app stack:');
app._router.stack.forEach((middleware, index) => {
  if (middleware.route) {
    console.log(`  ${index}: ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    console.log(`  ${index}: router - ${middleware.regexp}`);
  }
});

console.log('\nTest complete!');
