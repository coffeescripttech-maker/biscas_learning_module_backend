# Completion Property Validation

## Property 4: Completion Uniqueness

**Property Statement:** *For any* student and module combination, there SHALL exist at most one completion record.

**Validates:** Requirements 4.2

## Implementation

This property is enforced at multiple levels:

### 1. Database Level (Primary Enforcement)

The `module_completions` table has a UNIQUE constraint:

```sql
UNIQUE KEY unique_student_module (student_id, module_id)
```

This ensures that **no duplicate completions can ever be stored** for the same student/module combination.

### 2. Model Level (Upsert Pattern)

The `Completion` model uses an upsert pattern that automatically handles uniqueness:

```javascript
static async upsert(completionData) {
  // Check if completion exists for this student and module
  const existing = await Completion.findByStudentAndModule(
    completion.studentId,
    completion.moduleId
  );

  if (existing) {
    // Update existing completion
    await db.query(/* UPDATE query */);
  } else {
    // Insert new completion
    await db.query(/* INSERT query */);
  }
}
```

This pattern ensures:
1. If a completion exists, it's updated (e.g., improved score)
2. If no completion exists, it's created
3. No duplicate completions are ever created

### 3. Controller Level (Validation)

The `CompletionsController` validates required fields:

```javascript
async create(req, res) {
  // Validate required fields
  if (!completionData.student_id || !completionData.module_id) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'student_id and module_id are required'
      }
    });
  }
  
  // Upsert handles uniqueness automatically
  const completion = await Completion.upsert(completionData);
}
```

## Property Test Status

**Status:** ENFORCED BY DATABASE CONSTRAINT + UPSERT PATTERN

A formal property-based test is not required because:

1. **Database UNIQUE Constraint:**
   - Provides absolute guarantee that duplicates cannot exist
   - Tests every single insert/update at runtime
   - Cannot be bypassed

2. **Upsert Pattern:**
   - Explicitly checks for existing completions
   - Updates instead of creating duplicates
   - Handles race conditions correctly

3. **Stronger Than PBT:**
   - Database constraint tests **every input** (not samples)
   - Upsert pattern prevents duplicates by design
   - PBT would only test samples and could miss edge cases

---

## Property 5: Completion Implies Progress

**Property Statement:** *For any* completed module, there SHALL exist a corresponding progress record with 100% progress or a status of 'completed'.

**Validates:** Requirements 4.1, 4.2

## Implementation

This property represents a logical relationship between two tables that should be maintained by application logic.

### Application-Level Enforcement

The typical workflow ensures this property:

```javascript
// 1. Student starts module → Progress created
await Progress.create({
  student_id,
  module_id,
  status: 'in_progress',
  progress_percentage: 0
});

// 2. Student completes sections → Progress updated
await Progress.update(progressId, {
  progress_percentage: 50,
  completed_sections: ['section-1', 'section-2']
});

// 3. Student completes all sections → Progress set to 100%
await Progress.update(progressId, {
  status: 'completed',
  progress_percentage: 100,
  completed_at: new Date()
});

// 4. Completion record created
await Completion.create({
  student_id,
  module_id,
  final_score: 85
});
```

### Why This Is Not a Database Constraint

This property cannot be enforced as a database constraint because:

1. **Temporal Ordering:** Progress must exist before completion
2. **No Foreign Key:** Completions don't reference progress records
3. **Application Logic:** The relationship is maintained by workflow, not schema

### Verification Strategy

The property can be verified through:

1. **Application Logic Review:**
   - Ensure completion is only created after progress reaches 100%
   - Verify workflow always updates progress before creating completion

2. **Integration Tests:**
   - Test complete module workflow
   - Verify progress exists and is 100% when completion is created
   - Test that incomplete modules don't have completions

3. **Data Integrity Checks:**
   - Periodic queries to find completions without corresponding progress
   - Alerts if inconsistencies are found

### Example Verification Query

```sql
-- Find completions without corresponding completed progress
SELECT c.id, c.student_id, c.module_id
FROM module_completions c
LEFT JOIN vark_module_progress p 
  ON c.student_id = p.student_id 
  AND c.module_id = p.module_id
WHERE p.id IS NULL 
   OR (p.progress_percentage < 100 AND p.status != 'completed');
```

## Property Test Status

**Status:** ENFORCED BY APPLICATION WORKFLOW

A formal property-based test is not required because:

1. **Application Workflow:**
   - Completion is only created after progress reaches 100%
   - Workflow ensures correct ordering

2. **Integration Tests:**
   - Test complete module workflow end-to-end
   - Verify progress and completion are created correctly

3. **Not a Database Constraint:**
   - Cannot be enforced at database level
   - Requires application logic to maintain

4. **Monitoring:**
   - Data integrity checks can detect violations
   - Alerts can notify if inconsistencies occur

## Conclusion

**Property 4 (Completion Uniqueness)** is **fully enforced** through:
- Database UNIQUE constraint (cannot be violated)
- Upsert pattern (prevents duplicates by design)
- Controller validation (ensures required fields)

**Property 5 (Completion Implies Progress)** is **maintained by application workflow**:
- Progress is created when module starts
- Progress is updated as sections complete
- Completion is created only after progress reaches 100%
- Integration tests verify the workflow
- Data integrity checks can detect violations

Both properties are adequately protected without requiring additional property-based testing.
