-- Add final_score to term_student_enrollments
ALTER TABLE term_student_enrollments 
ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2);
