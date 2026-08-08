ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'TRUNGBINH';

ALTER TABLE questions
  DROP CONSTRAINT IF EXISTS questions_difficulty_check;

ALTER TABLE questions
  ADD CONSTRAINT questions_difficulty_check
  CHECK (difficulty IN ('DE', 'TRUNGBINH', 'KHO'));

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS chapter INTEGER;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS chapter_label TEXT;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS answer_hint TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_exam_chapter
  ON questions (exam_id, chapter, display_order);
