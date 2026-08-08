-- Task 10: Add question_order JSONB to exam_sessions for deterministic shuffle per student
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS question_order JSONB;

COMMENT ON COLUMN exam_sessions.question_order IS 'Deterministic shuffled question order for this student (array of question IDs)';