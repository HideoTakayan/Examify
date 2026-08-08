-- Exam Sharing: allows multiple teachers to co-own/grade an exam
-- and Grading Assignments: assigns teachers to grade specific exams/sessions

-- Exam share: who can access an exam beyond the creator
CREATE TABLE IF NOT EXISTS exam_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'grader' CHECK (role IN ('viewer', 'grader', 'co-owner')),
    assigned_by UUID NOT NULL REFERENCES accounts(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_exam_shares_exam    ON exam_shares(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_shares_teacher ON exam_shares(shared_with);

-- Grading assignments: which teacher is assigned to grade which session
CREATE TABLE IF NOT EXISTS grading_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES accounts(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graded_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    UNIQUE(exam_session_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_grading_assign_exam    ON grading_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_grading_assign_teacher ON grading_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grading_assign_session ON grading_assignments(exam_session_id);