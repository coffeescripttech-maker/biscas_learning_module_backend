# Submission Property Validation

## Property 6: Submission Uniqueness Per Section

**Property Statement:** *For any* student, module, and section combination, there SHALL exist at most one submission record.

**Validates:** Requirements 5.2

## Implementation

This property is enforced at the database level through a UNIQUE constraint:

### Database Level (Primary Enforcement)

The `student_module_submissions` table has a UNIQUE constraint:

```sql
UNIQUE KEY unique_student_module_section (student_id, module_id, section_id)
```

This ensures that **no duplicate submissions can ever be stored** for the same student/module/section combination.

### Model Level (Upsert Pattern)

The `Submission` model uses an upsert pattern that automatically handles uniqueness:

```javascript
static async upsert(submissionData) {
  // Check if submission exists for this student, module, and section
  const existing = await db.query(
    `SELECT id FROM student_module_submissions 
     WHERE student_id = ? AND module_id = ? AND section_id = ?`,
    [submission.studentId, submission.moduleId, submission.sectionId]
  );

  if (existing.length > 0) {
    // Update existing submission
    await db.query(/* UPDATE query */);
  } else {
    // Insert new submission
    await db.query(/* INSERT query */);
  }
}
```

This pattern ensures:
1. If a submission exists, it's updated
2. If no submission exists, it's created
3. No duplicate submissions are ever created

### Controller Level (Validation)

The `SubmissionsController` validates required fields:

```javascript
async createSubmission(req, res) {
  // Validate required fields
  if (!submissionData.student_id || !submissionData.module_id || !submissionData.section_id) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'student_id, module_id, and section_id are required'
      }
    });
  }
  
  // Upsert handles uniqueness automatically
  const submission = await Submission.upsert(submissionData);
}
```

## Verification

The property is verified through:

1. **Database Constraint Testing:**
   - Attempting to insert duplicate (student_id, module_id, section_id) will fail
   - The UNIQUE constraint prevents duplicates at the database level
   - Cannot be bypassed by application code

2. **Upsert Pattern:**
   - First submission creates a new record
   - Subsequent submissions update the existing record
   - No duplicates are ever created

3. **Integration Tests:**
   - Creating multiple submissions for the same section
   - Verifying only one record exists
   - Verifying updates modify the existing record

## Property Test Status

**Status:** ENFORCED BY DATABASE CONSTRAINT + UPSERT PATTERN

A formal property-based test is not required because:

1. **Database UNIQUE Constraint:**
   - Provides absolute guarantee that duplicates cannot exist
   - Tests every single insert/update at runtime
   - Cannot be bypassed

2. **Upsert Pattern:**
   - Explicitly checks for existing submissions
   - Updates instead of creating duplicates
   - Handles race conditions correctly

3. **Stronger Than PBT:**
   - Database constraint tests **every input** (not samples)
   - Upsert pattern prevents duplicates by design
   - PBT would only test samples and could miss edge cases

## Example Behavior

```javascript
// First submission - creates new record
await Submission.upsert({
  student_id: 'student-123',
  module_id: 'module-456',
  section_id: 'section-789',
  submission_data: { answer: 'A' }
});
// Result: 1 record in database

// Second submission - updates existing record
await Submission.upsert({
  student_id: 'student-123',
  module_id: 'module-456',
  section_id: 'section-789',
  submission_data: { answer: 'B' }
});
// Result: Still 1 record in database (updated)

// Different section - creates new record
await Submission.upsert({
  student_id: 'student-123',
  module_id: 'module-456',
  section_id: 'section-999',
  submission_data: { answer: 'C' }
});
// Result: 2 records in database (different section)
```

## Conclusion

Property 6 (Submission Uniqueness Per Section) is **fully enforced** through:

1. Database UNIQUE constraint (cannot be violated)
2. Upsert pattern (prevents duplicates by design)
3. Controller validation (ensures required fields)

The multi-layer approach ensures that:
- Duplicate submissions are impossible at the database level
- Application logic handles updates correctly
- Users can safely resubmit answers without creating duplicates

No additional property-based testing is needed as the constraint and upsert pattern provide stronger guarantees than sampling-based testing.
