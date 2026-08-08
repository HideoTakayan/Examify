-- Add num_versions to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS num_versions INTEGER NOT NULL DEFAULT 2 CHECK (num_versions >= 1 AND num_versions <= 4);