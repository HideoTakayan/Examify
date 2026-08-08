-- Exam Collaborators: allows multiple teachers to co-own/grade an exam
-- Role 'owner' = full access (including delete); 'grader' = view + grade essays only

CREATE TABLE IF NOT EXISTS exam_collaborators (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    teacher_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'grader' CHECK (role IN ('owner', 'grader')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_ec_exam    ON exam_collaborators(exam_id);
CREATE INDEX IF NOT EXISTS idx_ec_teacher ON exam_collaborators(teacher_id);

COMMENT ON TABLE exam_collaborators IS 'Teacher collaborators on an exam — owner has full access, grader can view and grade only';