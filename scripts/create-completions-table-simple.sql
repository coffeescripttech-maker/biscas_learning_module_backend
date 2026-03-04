-- Create completions table WITHOUT foreign keys (add them later if needed)
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
  INDEX idx_student_id (student_id),
  INDEX idx_module_id (module_id),
  INDEX idx_completion_date (completion_date),
  UNIQUE KEY unique_student_module (student_id, module_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
