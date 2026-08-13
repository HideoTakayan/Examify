CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_sessions_one_active ON exam_sessions (exam_id, student_id) WHERE status = 'active';
