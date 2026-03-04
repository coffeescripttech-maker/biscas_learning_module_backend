/**
 * Unit tests for database utility functions (no database connection required)
 * Tests prepared statement helpers and query builders
 */

const db = require('./src/utils/db');

console.log('=== Unit Tests for Database Utility Functions ===\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✓ ${testName}`);
    testsPassed++;
  } else {
    console.log(`✗ ${testName}`);
    testsFailed++;
  }
}

function assertDeepEqual(actual, expected, testName) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`✓ ${testName}`);
    testsPassed++;
  } else {
    console.log(`✗ ${testName}`);
    console.log(`  Expected: ${expectedStr}`);
    console.log(`  Actual: ${actualStr}`);
    testsFailed++;
  }
}

// Test 1: buildInsert
console.log('1. Testing buildInsert helper:');
const insertResult = db.buildInsert('users', {
  id: 'test-uuid',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  role: 'student'
});
assert(
  insertResult.sql === 'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
  'buildInsert generates correct SQL'
);
assertDeepEqual(
  insertResult.params,
  ['test-uuid', 'test@example.com', 'hashed_password', 'student'],
  'buildInsert generates correct params'
);
console.log();

// Test 2: buildUpdate
console.log('2. Testing buildUpdate helper:');
const updateResult = db.buildUpdate(
  'users',
  { email: 'newemail@example.com', role: 'teacher' },
  { id: 'test-uuid' }
);
assert(
  updateResult.sql === 'UPDATE users SET email = ?, role = ? WHERE id = ?',
  'buildUpdate generates correct SQL'
);
assertDeepEqual(
  updateResult.params,
  ['newemail@example.com', 'teacher', 'test-uuid'],
  'buildUpdate generates correct params'
);
console.log();

// Test 3: buildDelete
console.log('3. Testing buildDelete helper:');
const deleteResult = db.buildDelete('users', { id: 'test-uuid', email: 'test@example.com' });
assert(
  deleteResult.sql === 'DELETE FROM users WHERE id = ? AND email = ?',
  'buildDelete generates correct SQL'
);
assertDeepEqual(
  deleteResult.params,
  ['test-uuid', 'test@example.com'],
  'buildDelete generates correct params'
);
console.log();

// Test 4: buildSelect - basic
console.log('4. Testing buildSelect helper (basic):');
const selectBasic = db.buildSelect('users', {
  where: { email: 'test@example.com' },
  columns: ['id', 'email', 'role']
});
assert(
  selectBasic.sql === 'SELECT id, email, role FROM users WHERE email = ?',
  'buildSelect generates correct basic SQL'
);
assertDeepEqual(
  selectBasic.params,
  ['test@example.com'],
  'buildSelect generates correct basic params'
);
console.log();

// Test 5: buildSelect - with all options
console.log('5. Testing buildSelect helper (with all options):');
const selectFull = db.buildSelect('users', {
  where: { role: 'student', grade_level: 'Grade 7' },
  columns: ['id', 'email', 'full_name'],
  orderBy: 'created_at DESC',
  limit: 10,
  offset: 20
});
assert(
  selectFull.sql === 'SELECT id, email, full_name FROM users WHERE role = ? AND grade_level = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
  'buildSelect generates correct full SQL'
);
assertDeepEqual(
  selectFull.params,
  ['student', 'Grade 7', 10, 20],
  'buildSelect generates correct full params'
);
console.log();

// Test 6: buildSelect - no where clause
console.log('6. Testing buildSelect helper (no where clause):');
const selectNoWhere = db.buildSelect('users', {
  columns: ['*'],
  orderBy: 'email ASC',
  limit: 5
});
assert(
  selectNoWhere.sql === 'SELECT * FROM users ORDER BY email ASC LIMIT ?',
  'buildSelect generates correct SQL without WHERE'
);
assertDeepEqual(
  selectNoWhere.params,
  [5],
  'buildSelect generates correct params without WHERE'
);
console.log();

// Test 7: mapErrorCode
console.log('7. Testing mapErrorCode function:');
assert(
  db.mapErrorCode('ER_DUP_ENTRY') === 'DB_DUPLICATE_ENTRY',
  'mapErrorCode maps ER_DUP_ENTRY correctly'
);
assert(
  db.mapErrorCode('ER_NO_REFERENCED_ROW') === 'DB_FOREIGN_KEY_VIOLATION',
  'mapErrorCode maps ER_NO_REFERENCED_ROW correctly'
);
assert(
  db.mapErrorCode('ECONNREFUSED') === 'DB_CONNECTION_ERROR',
  'mapErrorCode maps ECONNREFUSED correctly'
);
assert(
  db.mapErrorCode('UNKNOWN_ERROR') === 'DB_QUERY_ERROR',
  'mapErrorCode returns default for unknown errors'
);
console.log();

// Test 8: DatabaseError class
console.log('8. Testing DatabaseError class:');
const dbError = new db.DatabaseError('Test error', 'DB_TEST_ERROR', new Error('Original'));
assert(
  dbError.name === 'DatabaseError',
  'DatabaseError has correct name'
);
assert(
  dbError.message === 'Test error',
  'DatabaseError has correct message'
);
assert(
  dbError.code === 'DB_TEST_ERROR',
  'DatabaseError has correct code'
);
assert(
  dbError.originalError instanceof Error,
  'DatabaseError stores original error'
);
console.log();

// Summary
console.log('=== Test Summary ===');
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
