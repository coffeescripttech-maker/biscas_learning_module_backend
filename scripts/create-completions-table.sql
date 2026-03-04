-- Create completions table for tracking student module completions
-- Note: Make sure data types match the referenced tables exactly

CREATE TABLE IF NOT EXISTS completions (
  id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  module_id VARCHAR(36) NOT NULL,
  completion_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  final_score DECIMAL(5,2) DEFAULT 0,
  time_spent_minutes INT DEFAULT 0,
  sections_completed INT DEFAULT 0,
  perfect_sections INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  
  -- Indexes (add before foreign keys)
  INDEX idx_student_id (student_id),
  INDEX idx_module_id (module_id),
  INDEX idx_completion_date (completion_date),
  
  -- Unique constraint: one completion per student per module
  UNIQUE KEY unique_student_module (student_id, module_id),
  
  -- Foreign keys (add last)
  CONSTRAINT fk_completions_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_completions_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
