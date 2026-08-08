-- Mỗi câu hỏi thuộc một mã đề (0 = D01, 1 = D02, …)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS version_index INTEGER NOT NULL DEFAULT 0
  CHECK (version_index >= 0 AND version_index <= 3);

CREATE INDEX IF NOT EXISTS idx_questions_exam_version
  ON questions (exam_id, version_index, display_order);

COMMENT ON COLUMN questions.version_index IS 'Chỉ số mã đề (0=D01); mỗi mã đề import từ một file Word riêng';
