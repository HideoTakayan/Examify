-- Task 3: Add explanation field to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT;

COMMENT ON COLUMN questions.explanation IS 'Teacher explanation for the answer, shown in review';