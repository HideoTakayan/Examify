-- Drop legacy coursework tables no longer used by the current online exam system.
-- The current grading flow stores results in exam_sessions and grading_assignments.

DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
